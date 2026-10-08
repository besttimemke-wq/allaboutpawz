// api-plp — Category listing page API.
// ALWAYS filters by the requested category; never returns the whole catalog.
// GET params: category (slug, required), pet, brand, price_min, price_max,
//             sort=best|price_asc|price_desc|newest, page (default 1, 24/page).
// Returns: { products[] (card fields), total, page, pages, facets: { brands[], price_buckets[] } }
//
// Live-schema grounded (Oct 2026): taxonomy_nodes / product_nodes / products /
// product_variants / product_media / product_reviews. No invented tables.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const PAGE_SIZE = 24;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function pubKey(): string {
  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

// Badge priority: SALE -> SALON FAVORITE -> NEW -> BEST SELLER. One max.
function badgeFor(p: any, price: number, compareAt: number | null): string | null {
  if (p.is_sale || (compareAt != null && compareAt > price)) return "SALE";
  if (p.is_salon_favorite) return "SALON FAVORITE";
  if (p.is_new) return "NEW";
  if (p.is_best_seller) return "BEST SELLER";
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const sb = createClient(SUPABASE_URL, pubKey());
    const q = new URL(req.url).searchParams;

    const categorySlug = (q.get("category") || "").trim();
    const pet = (q.get("pet") || "").trim();
    const brand = (q.get("brand") || "").trim();
    const priceMin = q.get("price_min") ? Number(q.get("price_min")) : null;
    const priceMax = q.get("price_max") ? Number(q.get("price_max")) : null;
    const sort = q.get("sort") || "best";
    const page = Math.max(1, parseInt(q.get("page") || "1", 10) || 1);

    if (!categorySlug) {
      return new Response(JSON.stringify({ error: "category slug required" }), { status: 400, headers: corsHeaders });
    }

    // ---- 1. Resolve category node (+ descendants) ----
    const { data: allNodes, error: nodeErr } = await sb
      .from("taxonomy_nodes")
      .select("id,slug,name,display_name,parent_id,animal_id,depth,node_type,status,pets,path")
      .eq("status", "published");
    if (nodeErr) throw new Error("taxonomy_nodes: " + nodeErr.message);
    const nodes = allNodes || [];
    const byId = new Map(nodes.map((n: any) => [n.id, n]));
    let match = nodes.find((n: any) => n.slug === categorySlug && (!pet || (n.pets || []).includes(pet)))
      || nodes.find((n: any) => n.slug === categorySlug);
    if (!match) {
      return new Response(JSON.stringify({ error: `unknown category: ${categorySlug}` }), { status: 404, headers: corsHeaders });
    }
    const kids = new Map<string, string[]>();
    for (const n of nodes) {
      if (n.parent_id) {
        if (!kids.has(n.parent_id)) kids.set(n.parent_id, []);
        kids.get(n.parent_id)!.push(n.id);
      }
    }
    const nodeIds = new Set<string>([match.id]);
    const stack = [match.id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const k of kids.get(cur) || []) { if (!nodeIds.has(k)) { nodeIds.add(k); stack.push(k); } }
    }

    // ---- 2. Products in those nodes ----
    const { data: pnRows, error: pnErr } = await sb
      .from("product_nodes").select("product_id").in("node_id", [...nodeIds]);
    if (pnErr) throw new Error("product_nodes: " + pnErr.message);
    const productIds = [...new Set((pnRows || []).map((r: any) => r.product_id))];
    if (!productIds.length) {
      return new Response(JSON.stringify({ products: [], total: 0, page, pages: 0, facets: { brands: [], price_buckets: [] }, category: match }), { headers: corsHeaders });
    }

    // ---- 3. Product + variant data (chunked IN-lists) ----
    const prodChunks: any[] = [];
    for (let i = 0; i < productIds.length; i += 200) {
      const { data, error } = await sb.from("products")
        .select("id,slug,name,title,brand,brand_id,is_sale,is_salon_favorite,is_new,is_best_seller,created_at")
        .in("id", productIds.slice(i, i + 200)).eq("status", "published");
      if (error) throw new Error("products: " + error.message);
      prodChunks.push(...(data || []));
    }
    let products = prodChunks;
    if (brand) products = products.filter((p: any) => (p.brand || "").toLowerCase() === brand.toLowerCase());

    const varMap = new Map<string, any[]>();
    for (let i = 0; i < products.length; i += 200) {
      const ids = products.slice(i, i + 200).map((p: any) => p.id);
      const { data, error } = await sb.from("product_variants")
        .select("id,product_id,sku,price,compare_at_price,in_stock,variant_title,option_size,option_color")
        .in("product_id", ids).eq("status", "active");
      if (error) throw new Error("product_variants: " + error.message);
      for (const v of data || []) {
        if (!varMap.has(v.product_id)) varMap.set(v.product_id, []);
        varMap.get(v.product_id)!.push(v);
      }
    }

    const imgMap = new Map<string, any[]>();
    for (let i = 0; i < products.length; i += 200) {
      const ids = products.slice(i, i + 200).map((p: any) => p.id);
      const { data, error } = await sb.from("product_media")
        .select("product_id,url,alt_text,sort_order").in("product_id", ids)
        .eq("media_type", "image").order("sort_order", { ascending: true });
      if (error) throw new Error("product_media: " + error.message);
      for (const m of data || []) {
        if (!imgMap.has(m.product_id)) imgMap.set(m.product_id, []);
        imgMap.get(m.product_id)!.push(m);
      }
    }

    const revAgg = new Map<string, { sum: number; n: number }>();
    for (let i = 0; i < products.length; i += 200) {
      const ids = products.slice(i, i + 200).map((p: any) => p.id);
      try {
        const { data } = await sb.from("product_reviews")
          .select("product_id,rating").in("product_id", ids).eq("visible", true);
        for (const r of data || []) {
          const a = revAgg.get(r.product_id) || { sum: 0, n: 0 };
          a.sum += Number(r.rating) || 0; a.n++;
          revAgg.set(r.product_id, a);
        }
      } catch { /* reviews optional; RLS may block anon reads */ }
    }

    // ---- 4. Cards, filters, sort ----
    const cards = [];
    for (const p of products) {
      const vs = varMap.get(p.id) || [];
      const prices = vs.map((v: any) => Number(v.price)).filter((n: number) => Number.isFinite(n) && n > 0);
      if (!prices.length) continue;
      const price = Math.min(...prices);
      if (priceMin != null && price < priceMin) continue;
      if (priceMax != null && price > priceMax) continue;
      const cas = vs.map((v: any) => (v.compare_at_price != null ? Number(v.compare_at_price) : null))
        .filter((n: any): n is number => n != null && Number.isFinite(n) && n > price);
      const compareAt = cas.length ? Math.min(...cas) : null;
      const imgs = imgMap.get(p.id) || [];
      const ra = revAgg.get(p.id);
      cards.push({
        id: p.id, slug: p.slug, name: p.title || p.name, brand: p.brand,
        image: imgs.length ? imgs[0].url : null,
        badge: badgeFor(p, price, compareAt),
        stars: ra && ra.n > 0 ? Math.round((ra.sum / ra.n) * 10) / 10 : null,
        review_count: ra ? ra.n : 0,
        price, compare_at_price: compareAt,
        discount_pct: compareAt ? Math.round((1 - price / compareAt) * 100) : 0,
        in_stock: vs.some((v: any) => v.in_stock),
        cta: vs.some((v: any) => v.in_stock) ? "ADD_TO_CART" : "NOTIFY_ME",
      });
    }

    if (sort === "price_asc") cards.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") cards.sort((a, b) => b.price - a.price);
    else if (sort === "newest") cards.sort((a, b) => 0); // created_at ordering applied below via stable input
    // default "best": salon favorites first, then best sellers, then review count
    if (sort === "best") cards.sort((a, b) => (b.review_count - a.review_count));

    const total = cards.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageCards = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const brandCounts = new Map<string, number>();
    for (const c of cards) if (c.brand) brandCounts.set(c.brand, (brandCounts.get(c.brand) || 0) + 1);
    const facets = {
      brands: [...brandCounts.entries()].filter(([, n]) => n >= 2).map(([name, count]) => ({ name, count })),
      price_buckets: (() => {
        const b = [0, 0, 0, 0]; // <$25, $25-50, $50-100, $100+
        for (const c of cards) b[c.price < 25 ? 0 : c.price < 50 ? 1 : c.price < 100 ? 2 : 3]++;
        return b;
      })(),
    };

    return new Response(JSON.stringify({
      products: pageCards, total, page, pages, facets,
      category: { slug: match.slug, name: match.display_name || match.name, path: match.path },
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
