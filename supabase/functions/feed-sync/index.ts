// feed-sync — scheduled supplier feed sync (pg_cron every 6h via pg_net).
// ?source=<name> syncs one feed (admin "Sync now"); without it, all 8 sync.
//
// Pipeline: pull products.json (paginated) -> upsert stg_feed ->
// STRICT mapping (normalize_product_type -> supplier_category_mapping;
// misses -> quarantine, never guessed) -> upsert brands/products/
// product_variants/product_media/product_nodes -> refresh sources +
// taxonomy_nodes.product_count.
//
// Live-schema grounded (Oct 2026). Service-role client (writes).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const TENANT_ID = "b2a3b20c-9816-5518-92db-f9395c063acd"; // All About Pawz

const SOURCES = [
  { name: "petdropshipper", base: "https://petdropshipper.com/products.json?limit=250&page=" },
  { name: "bigbarker", base: "https://bigbarker.com/products.json?limit=250&page=" },
  { name: "earthbath", base: "https://earthbath.com/products.json?limit=250&page=" },
  { name: "groomerdepot", base: "https://groomerdepot.com/products.json?limit=250&page=" },
  { name: "iconicpet", base: "https://iconicpet.com/products.json?limit=250&page=" },
  { name: "kittymansions", base: "https://kittymansions.com/products.json?limit=250&page=" },
  { name: "warrenlondon", base: "https://warrenlondon.com/products.json?limit=250&page=" },
  { name: "bestfriendsbysheri", base: "https://bestfriendsbysheri.com/products.json?limit=250&page=" },
];

const PAGE_LIMIT = 250;
const BATCH = 500;
const POLITE_MS = 250;
const ROOT_ALIAS: Record<string, string> = { "small animal": "small pet" };

// Mirrors SQL normalize_product_type(): lowercase -> '&' to 'and' ->
// runs of non-alphanumeric to one space -> trim.
function norm(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "product";
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
async function fetchWithRetry(url: string, tries = 5): Promise<Response> {
  let res: Response | null = null;
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (supplier-feed-sync)" } });
    if (res.status !== 429) return res;
    await sleep(2000 * (i + 1) + Math.random() * 1000);
  }
  return res!;
}
function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}
function toNum(x: any): number | null {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : null;
}
// Salon Favorite rule (spec Part 10): premium price tiers.
function salonFavorite(supplier: string, vendor: string, minPrice: number | null): boolean {
  if (minPrice == null) return false;
  const v = (vendor || "").toLowerCase();
  if (supplier === "bigbarker" || v.includes("big barker")) return minPrice >= 100;
  if (supplier === "bestfriendsbysheri") return minPrice >= 50;
  if (supplier === "warrenlondon" || supplier === "earthbath") return minPrice >= 40;
  return false;
}

serve(async (req: Request) => {
  const t0 = Date.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SEC = Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SEC) {
      return new Response(JSON.stringify({ error: "missing SUPABASE_URL / service key" }), { status: 500 });
    }
    const sb = createClient(SUPABASE_URL, SEC);
    const onlySource = new URL(req.url).searchParams.get("source");
    const targets = onlySource ? SOURCES.filter((s) => s.name === onlySource) : SOURCES;
    if (onlySource && !targets.length) {
      return new Response(JSON.stringify({ error: `unknown source: ${onlySource}` }), { status: 400 });
    }

    // ---- Reference data ----
    const [{ data: srcRows }, { data: mapRows }, { data: nodeRows }, { data: allL1 }] = await Promise.all([
      sb.from("sources").select("id,name").eq("tenant_id", TENANT_ID),
      sb.from("supplier_category_mapping").select("supplier,lookup_key,landing,primary_category,pet_scope,in_taxonomy"),
      sb.from("taxonomy_nodes").select("id,name,parent_id,animal_id,depth,status").eq("status", "published"),
      // L1s unfiltered by status: Dog|Cat root is draft but its children are published.
      sb.from("taxonomy_nodes").select("id,name").is("parent_id", null),
    ]);
    const srcIdByName = new Map((srcRows || []).map((r: any) => [r.name, r.id]));
    const mapByKey = new Map((mapRows || []).map((m: any) => [`${m.supplier}|${m.lookup_key}`, m]));
    // node lookup: root-animal|lower(name) -> node id (L3 preferred)
    const l1ById = new Map((allL1 || []).map((n: any) => [n.id, n.name]));
    const nodeByAnimalName = new Map<string, string>();
    for (const n of nodeRows || []) {
      const rootId = n.animal_id || n.id;
      const root = (l1ById.get(rootId) || "").toLowerCase();
      const key = `${root}|${(n.name || "").toLowerCase()}`;
      if (!nodeByAnimalName.has(key)) nodeByAnimalName.set(key, n.id);
    }
    const resolveNode = (petScope: string, primaryCategory: string): string | null => {
      const root = ROOT_ALIAS[(petScope || "").toLowerCase()] || (petScope || "").toLowerCase();
      return nodeByAnimalName.get(`${root}|${(primaryCategory || "").toLowerCase()}`) || null;
    };

    const summary: any = { placed: 0, quarantined: 0, skipped_discontinued: 0, per_source: {} };

    for (const src of targets) {
      const per: any = { fetched: 0, staged: 0, placed: 0, quarantined: 0, error: null };
      try {
        // Ensure source row exists.
        if (!srcIdByName.has(src.name)) {
          const { data } = await sb.from("sources").upsert(
            { tenant_id: TENANT_ID, name: src.name, type: "json", feed_url: src.base }, { onConflict: "name" }
          ).select("id").maybeSingle();
          if (data) srcIdByName.set(src.name, data.id);
        }

        // ---- Phase 1: pull ----
        const staged: any[] = [];
        let page = 1;
        for (;;) {
          const res = await fetchWithRetry(`${src.base}${page}`);
          if (!res.ok) throw new Error(`feed HTTP ${res.status} page ${page}`);
          const data = await res.json();
          const products = (data && data.products) || [];
          if (!products.length) break;
          per.fetched += products.length;
          for (const pr of products) {
            const tags: string[] = pr.tags || [];
            if (tags.some((t: any) => String(t).toLowerCase() === "discontinued")) { summary.skipped_discontinued++; continue; }
            const variants = pr.variants && pr.variants.length ? pr.variants : [{}];
            const images: string[] = (pr.images || []).map((im: any) => im.src).filter(Boolean);
            const spid = String(pr.id ?? "");
            for (const v of variants) {
              staged.push({
                supplier: src.name, source_product_id: spid, source_variant_id: String(v.id ?? `${spid}-0`),
                title: pr.title || "", handle: pr.handle || null, description_html: pr.body_html || null,
                vendor: (pr.vendor || "").trim(), product_type: pr.product_type || "", tags,
                variant_title: v.title || null, sku: v.sku != null && v.sku !== "" ? String(v.sku) : null,
                price: toNum(v.price), compare_at_price: toNum(v.compare_at_price),
                available: !!v.available, weight_grams: v.grams != null ? Number(v.grams) : null,
                image_urls: images,
              });
            }
          }
          if (products.length < PAGE_LIMIT) break;
          page++;
          await sleep(POLITE_MS);
        }

        // ---- Phase 2: stage (delete+insert per supplier; no unique-constraint dependency) ----
        await sb.from("stg_feed").delete().eq("supplier", src.name);
        for (const b of chunk(staged, BATCH)) {
          const { error } = await sb.from("stg_feed").insert(b);
          if (error) throw new Error("stg_feed: " + error.message);
        }
        per.staged = staged.length;

        // ---- Phase 3: strict map + place ----
        const byProduct = new Map<string, any[]>();
        for (const r of staged) {
          const k = `${r.supplier}|${r.source_product_id}`;
          if (!byProduct.has(k)) byProduct.set(k, []);
          byProduct.get(k)!.push(r);
        }

        // Brands present in this feed (insert missing only; no constraint dependency).
        const brandNames = [...new Set(staged.map((r) => r.vendor).filter(Boolean))];
        const brandIdByName = new Map<string, string>();
        if (brandNames.length) {
          const { data: existingBrands } = await sb.from("brands").select("id,name").in("name", brandNames);
          for (const b of existingBrands || []) brandIdByName.set(b.name, b.id);
          const missing = brandNames.filter((n) => !brandIdByName.has(n));
          if (missing.length) {
            // NOTE: brands insert as draft — the publish trigger requires a purchase
            // order + authorized seller, which doesn't exist for dropship suppliers yet.
            // Products still link via brand_id and carry the brand text for display.
            const { data: ins, error: bErr } = await sb.from("brands").insert(
              missing.map((n) => ({ tenant_id: TENANT_ID, name: n, slug: slugify(n), status: "draft", description: `Brand imported from supplier feed.` }))
            ).select("id,name");
            if (bErr) throw new Error("brands: " + bErr.message);
            for (const b of ins || []) brandIdByName.set(b.name, b.id);
          }
        }

        const supplierId = srcIdByName.get(src.name) || null;
        // Existing products for this supplier: update by id, never re-upsert by slug
        // (the slug-dedup trigger renames on collision, which would create dupes).
        const existingBySpid = new Map<string, string>();
        if (supplierId) {
          let off = 0;
          for (;;) {
            const { data } = await sb.from("products").select("id,source_product_id")
              .eq("supplier_id", supplierId).range(off, off + 999);
            if (!data || !data.length) break;
            for (const p of data as any[]) if (p.source_product_id) existingBySpid.set(String(p.source_product_id), p.id);
            off += 1000;
          }
        }
        let bi = 0;
        for (const [, rows] of byProduct) {
          bi++;
          const r0 = rows[0];
          const m = mapByKey.get(`${r0.supplier}|${norm(r0.product_type || "")}`);
          const qRow = {
            tenant_id: TENANT_ID, supplier: r0.supplier, source_product_id: r0.source_product_id,
            title: r0.title, brand: r0.vendor, supplier_product_type: r0.product_type || "",
            resolved: false,
          };
          const quarantineIt = async (reason: string) => {
            per.quarantined++; summary.quarantined++;
            const { data: exists } = await sb.from("quarantine").select("id")
              .eq("supplier", r0.supplier).eq("source_product_id", r0.source_product_id).limit(1);
            if (!exists || !exists.length) {
              await sb.from("quarantine").insert({ ...qRow, reason });
            }
          };
          if (!m || !m.in_taxonomy) {
            await quarantineIt(!m ? "no mapping row" : "in_taxonomy=false");
            continue;
          }
          const nodeId = resolveNode(m.pet_scope, m.primary_category);
          if (!nodeId) {
            await quarantineIt(`node not found: ${m.pet_scope}/${m.primary_category}`);
            continue;
          }

          const minPrice = rows.map((r: any) => r.price).filter((n: any) => n != null).sort((a: number, b: number) => a - b)[0] ?? null;
          const slug = slugify(r0.handle || `${r0.title}-${r0.source_product_id}`);
          const prodRow = {
            tenant_id: TENANT_ID, brand_id: brandIdByName.get(r0.vendor) || null,
            name: r0.title, title: r0.title, slug, handle: r0.handle,
            description_html: r0.description_html, brand: r0.vendor,
            category_id: nodeId, pet: m.pet_scope, fulfillment_type: "supplier_dropship",
            supplier_id: supplierId, source_product_id: r0.source_product_id,
            tags: r0.tags, status: "published", published_at: new Date().toISOString(),
            is_salon_favorite: salonFavorite(r0.supplier, r0.vendor, minPrice),
          };
          const { data: pUp, error: pErr } = existingBySpid.has(String(r0.source_product_id))
            ? await sb.from("products").update({ ...prodRow, slug: undefined }).eq("id", existingBySpid.get(String(r0.source_product_id))).select("id").maybeSingle()
            : await sb.from("products").insert(prodRow).select("id").maybeSingle();
          if (pErr) throw new Error("products: " + pErr.message);
          const pid = pUp.id;

          await sb.from("product_nodes").upsert(
            { product_id: pid, node_id: nodeId, is_primary: true }, { onConflict: "product_id,node_id" }
          );

          const seenSkus = new Set<string>();
          for (const b of chunk(rows, BATCH)) {
            const vRows = b.filter((r: any) => r.sku).map((r: any) => {
              seenSkus.add(r.sku);
              return {
                tenant_id: TENANT_ID, product_id: pid, sku: r.sku,
                variant_title: r.variant_title, price: r.price, compare_at_price: r.compare_at_price,
                in_stock: !!r.available, option_size: null, option_color: null,
                weight_grams: r.weight_grams, status: "active",
              };
            });
            if (vRows.length) {
              const { error } = await sb.from("product_variants").upsert(vRows, { onConflict: "tenant_id,sku" });
              if (error) throw new Error("product_variants: " + error.message);
            }
          }
          // Variants that vanished from the feed -> out of stock.
          if (seenSkus.size) {
            const { data: existing } = await sb.from("product_variants").select("id,sku").eq("product_id", pid);
            const gone = (existing || []).filter((v: any) => !seenSkus.has(v.sku)).map((v: any) => v.id);
            for (const gb of chunk(gone, 200)) {
              await sb.from("product_variants").update({ in_stock: false }).in("id", gb);
            }
          }

          // Media: replace with current feed images.
          await sb.from("product_media").delete().eq("product_id", pid);
          const imgs = r0.image_urls || [];
          if (imgs.length) {
            await sb.from("product_media").insert(imgs.map((u: string, i: number) => ({
              product_id: pid, media_type: "image", url: u, sort_order: i,
            })));
          }

          per.placed++; summary.placed++;
          // Clear any prior quarantine for this product now that it placed.
          await sb.from("quarantine").delete().eq("supplier", r0.supplier).eq("source_product_id", r0.source_product_id);
          if (bi % 50 === 0) await sleep(10);
        }

        await sb.from("sources").update({
          last_sync: new Date().toISOString(), product_count: per.placed, last_error: null,
        }).eq("name", src.name).eq("tenant_id", TENANT_ID);
      } catch (e) {
        per.error = String((e as Error).message || e);
        await sb.from("sources").update({ last_error: per.error }).eq("name", src.name).eq("tenant_id", TENANT_ID);
      }
      summary.per_source[src.name] = per;
    }

    // ---- Recompute taxonomy product counts ----
    const { data: allPN } = await sb.from("product_nodes").select("node_id");
    const counts = new Map<string, number>();
    for (const r of allPN || []) counts.set(r.node_id, (counts.get(r.node_id) || 0) + 1);
    for (const [nid, c] of counts) {
      await sb.from("taxonomy_nodes").update({ product_count: c }).eq("id", nid);
    }

    return new Response(JSON.stringify({ ok: true, ms: Date.now() - t0, ...summary }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500 });
  }
});
