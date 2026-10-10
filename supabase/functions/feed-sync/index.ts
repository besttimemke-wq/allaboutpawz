// feed-sync — ENTERPRISE VERSION
// Writes directly to enterprise tables: erp_products, erp_product_variants,
// erp_product_skus, commerce_catalog_items, commerce_product_media
// Pipeline: pull products.json -> upsert stg_feed -> STRICT mapping ->
// upsert enterprise tables -> refresh sources.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const TENANT_ID = "b2a3b20c-9816-5518-92db-f9395c063acd";

async function getSetting(sb: any, key: string, fallback: string): Promise<string> {
  const { data } = await sb.from("app_settings").select("value").eq("key", key).single();
  return data ? JSON.parse(data.value) : fallback;
}

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

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "product";
}
function norm(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
async function fetchWithRetry(url: string, tries = 5): Promise<Response> {
  let res: Response | null = null;
  for (let i = 0; i < tries; i++) {
    res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (supplier-feed-sync)" } });
    if (res.status !== 429) return res;
    await sleep(2000 * (i + 1));
  }
  return res!;
}

// Upsert a single product to enterprise tables
async function upsertEnterpriseProduct(sb: any, feed: any, supplierId: string, nodeIds: string[]) {
  const sourceProductId = `${feed.supplier}:${feed.source_product_id}`;
  const slug = slugify(feed.title || "product");

  // 1. Upsert erp_products
  const { data: erpProd, error: epErr } = await sb.from("erp_products").upsert({
    tenant_id: TENANT_ID,
    source_product_id: sourceProductId,
    product_type: "supplier_dropship",
    name: feed.title,
    description: feed.description || feed.title,
    brand: feed.vendor || "",
    is_inventory_item: false, // dropship
    is_sellable: true,
    is_purchasable: true,
    base_uom: "EA",
    is_active: true,
    metadata: {
      fulfillment_type: "supplier_dropship",
      supplier_id: supplierId,
      slug,
      handle: feed.handle,
      taxonomy_node_ids: nodeIds,
      is_professional: false,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,source_product_id" }).select("id").single();
  if (epErr) throw new Error(`erp_products: ${epErr.message}`);
  const erpProductId = (erpProd as any).id;

  // 2. Upsert erp_product_variants (one per feed variant)
  for (const v of feed.variants || []) {
    const { data: variant, error: vErr } = await sb.from("erp_product_variants").upsert({
      tenant_id: TENANT_ID,
      product_id: erpProductId,
      name: v.title || "Default",
      attributes: {
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        in_stock: v.in_stock,
        stock_quantity: v.stock_quantity,
        option_size: v.option_size,
        option_color: v.option_color,
        weight_lb: v.weight,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,product_id,name" }).select("id").single();
    if (vErr) throw new Error(`erp_product_variants: ${vErr.message}`);
    const variantId = (variant as any).id;

    // 3. Upsert erp_product_skus
    const { data: sku, error: sErr } = await sb.from("erp_product_skus").upsert({
      tenant_id: TENANT_ID,
      product_id: erpProductId,
      variant_id: variantId,
      sku: v.sku || `${sourceProductId}-${variantId.slice(0, 8)}`,
      uom: "EA",
      unit_price: v.price || 0,
      is_active: (v.price || 0) > 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,variant_id" }).select("id").single();
    if (sErr) throw new Error(`erp_product_skus: ${sErr.message}`);
    const skuId = (sku as any).id;

    // 4. Upsert commerce_catalog_items
    const { error: cErr } = await sb.from("commerce_catalog_items").upsert({
      tenant_id: TENANT_ID,
      sku_id: skuId,
      item_type: "dropship",
      sku: v.sku,
      name: feed.title,
      description: feed.description,
      short_description: (feed.description || "").substring(0, 150),
      brand: feed.vendor,
      unit_of_measure: "EA",
      taxable: true,
      active: (v.price || 0) > 0,
      ecommerce_enabled: true,
      purchasable: true,
      sellable: (v.price || 0) > 0,
      metadata: {
        erp_product_id: erpProductId,
        fulfillment_type: "supplier_dropship",
        supplier_id: supplierId,
        source_product_id: sourceProductId,
        slug,
        taxonomy_node_ids: nodeIds,
      },
      updated_at: new Date().toISOString(),
    }, { onConflict: "sku_id" });
    if (cErr) throw new Error(`commerce_catalog_items: ${cErr.message}`);

    // 5. Upsert commerce_product_media
    for (let i = 0; i < (feed.images || []).length; i++) {
      await sb.from("commerce_product_media").upsert({
        tenant_id: TENANT_ID,
        catalog_item_id: (await sb.from("commerce_catalog_items").select("id").eq("sku_id", skuId).single()).data?.id,
        media_type: "image",
        url: feed.images[i],
        sort_order: i,
        is_primary: i === 0,
      }, { onConflict: "catalog_item_id,url" });
    }
  }
}

serve(async (req: Request) => {
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const q = new URL(req.url).searchParams;
    const sourceFilter = q.get("source");

    const syncEnabled = await getSetting(sb, "sync.enabled", "true");
    if (syncEnabled !== "true") {
      return new Response(JSON.stringify({ skipped: "sync disabled" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const src of SOURCES) {
      if (sourceFilter && src.name !== sourceFilter) continue;

      try {
        let page = 1;
        let hasMore = true;
        let synced = 0;

        while (hasMore) {
          const res = await fetchWithRetry(`${src.base}${page}`);
          if (!res.ok) {
            if (res.status === 429) {
              results.push({ source: src.name, status: "rate_limited" });
              break;
            }
            throw new Error(`HTTP ${res.status}`);
          }

          const data = await res.json();
          const products = data.products || [];
          if (!products.length) { hasMore = false; break; }

          for (const p of products) {
            // Map category via supplier_category_mapping
            const { data: mapping } = await sb.from("supplier_category_mapping")
              .select("taxonomy_node_id")
              .eq("supplier", src.name)
              .eq("normalized_type", norm(p.product_type || ""))
              .single();

            if (!mapping) {
              // Quarantine unmapped
              await sb.from("quarantine").insert({
                tenant_id: TENANT_ID,
                supplier: src.name,
                source_product_id: String(p.id),
                title: p.title,
                reason: "no_category_mapping",
                raw_data: p,
              });
              continue;
            }

            const nodeIds = [(mapping as any).taxonomy_node_id];
            await upsertEnterpriseProduct(sb, {
              supplier: src.name,
              source_product_id: String(p.id),
              title: p.title,
              handle: p.handle,
              description: p.body_html,
              vendor: p.vendor,
              images: (p.images || []).map((img: any) => img.src),
              variants: (p.variants || []).map((v: any) => ({
                sku: v.sku,
                title: v.title,
                price: parseFloat(v.price) || 0,
                compare_at_price: parseFloat(v.compare_at_price) || null,
                in_stock: v.inventory_quantity > 0,
                stock_quantity: v.inventory_quantity,
                option_size: v.option1,
                option_color: v.option2,
                weight: v.weight,
              })),
            }, src.name, nodeIds);
            synced++;
          }

          page++;
          if (page > 20) hasMore = false; // safety
          await sleep(250);
        }

        results.push({ source: src.name, status: "ok", synced });
      } catch (e) {
        results.push({ source: src.name, status: "error", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
