// api-recommendations — cross-sell carousels.
// GET params: product_id (uuid) or slug.
// Returns: { also_bought[5] (same primary category, different product),
//            also_viewed[5] (same brand, different product) }.
// Cards use the global product card contract.
//
// Live-schema grounded (Oct 2026): products / product_variants / product_media /
// product_nodes / product_reviews.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function pubKey(): string {
  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

function badgeFor(p: any, price: number, compareAt: number | null): string | null {
  if (p.is_sale || (compareAt != null && compareAt > price)) return "SALE";
  if (p.is_salon_favorite) return "SALON FAVORITE";
  if (p.is_new) return "NEW";
  if (p.is_best_seller) return "BEST SELLER";
  return null;
}

async function cardsFor(sb: any, ids: string[]) {
  if (!ids.length) return [];
  const { data: prods, error: pErr } = await sb.from("products")
    .select("id,slug,name,title,brand,is_sale,is_salon_favorite,is_new,is_best_seller").in("id", ids).eq("status", "published");
  if (pErr) throw new Error("products: " + pErr.message);
  const out = [];
  for (const p of prods || []) {
    const { data: vs } = await sb.from("product_variants")
      .select("price,compare_at_price,in_stock").eq("product_id", p.id).eq("status", "active");
    const prices = (vs || []).map((v: any) => Number(v.price)).filter((n: number) => Number.isFinite(n) && n > 0);
    if (!prices.length) continue;
    const price = Math.min(...prices);
    const cas = (vs || []).map((v: any) => (v.compare_at_price != null ? Number(v.compare_at_price) : null))
      .filter((n: any): n is number => n != null && Number.isFinite(n) && n > price);
    const compareAt = cas.length ? Math.min(...cas) : null;
    const { data: imgs } = await sb.from("product_media").select("url")
      .eq("product_id", p.id).eq("media_type", "image").order("sort_order", { ascending: true }).limit(1);
    out.push({
      id: p.id, slug: p.slug, name: p.title || p.name, brand: p.brand,
      image: imgs && imgs.length ? imgs[0].url : null,
      badge: badgeFor(p, price, compareAt),
      price, compare_at_price: compareAt,
      in_stock: (vs || []).some((v: any) => v.in_stock),
    });
  }
  return out;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", pubKey());
    const q = new URL(req.url).searchParams;
    const productId = (q.get("product_id") || "").trim();
    const slug = (q.get("slug") || "").trim();
    if (!productId && !slug) {
      return new Response(JSON.stringify({ error: "product_id or slug required" }), { status: 400, headers: corsHeaders });
    }

    let pq = sb.from("products").select("id,brand").eq("status", "published");
    pq = productId ? pq.eq("id", productId) : pq.eq("slug", slug);
    const { data: prod, error: pErr } = await pq.maybeSingle();
    if (pErr) throw new Error("products: " + pErr.message);
    if (!prod) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: corsHeaders });
    }

    // also_bought: same primary node, different product.
    let alsoBought: any[] = [];
    const { data: pn } = await sb.from("product_nodes").select("node_id").eq("product_id", prod.id).eq("is_primary", true).limit(1);
    const primaryNode = (pn && pn[0]?.node_id) || (await sb.from("product_nodes").select("node_id").eq("product_id", prod.id).limit(1)).data?.[0]?.node_id;
    if (primaryNode) {
      const { data: sibs } = await sb.from("product_nodes").select("product_id").eq("node_id", primaryNode).neq("product_id", prod.id).limit(12);
      const sibIds = [...new Set((sibs || []).map((r: any) => r.product_id))].slice(0, 5);
      alsoBought = await cardsFor(sb, sibIds);
    }

    // also_viewed: same brand, different product.
    let alsoViewed: any[] = [];
    if (prod.brand) {
      const { data: brandProds } = await sb.from("products").select("id")
        .eq("status", "published").eq("brand", prod.brand).neq("id", prod.id).limit(5);
      alsoViewed = await cardsFor(sb, (brandProds || []).map((r: any) => r.id));
    }

    return new Response(JSON.stringify({ also_bought: alsoBought, also_viewed: alsoViewed }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
