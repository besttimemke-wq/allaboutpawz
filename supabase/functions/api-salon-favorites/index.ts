// api-salon-favorites — premium tier API.
// GET params: limit (default 12, max 48).
// Returns { total, products[] } for "The Salon Edit" slider and the
// /collections/salon-favorites/ grid: best sellers first, then highest price
// (premium positioning — expensive items lead).
//
// Live-schema grounded (Oct 2026): products / product_variants / product_media.

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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", pubKey());
    const q = new URL(req.url).searchParams;
    const limit = Math.min(48, Math.max(1, parseInt(q.get("limit") || "12", 10) || 12));

    const { data: prods, error: pErr } = await sb.from("products")
      .select("id,slug,name,title,brand,is_sale,is_salon_favorite,is_new,is_best_seller")
      .eq("status", "published").eq("is_salon_favorite", true).limit(limit * 2);
    if (pErr) throw new Error("products: " + pErr.message);

    const cards = [];
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
      const badge = (p.is_sale || (compareAt != null && compareAt > price)) ? "SALE"
        : p.is_salon_favorite ? "SALON FAVORITE"
        : p.is_new ? "NEW" : p.is_best_seller ? "BEST SELLER" : null;
      cards.push({
        id: p.id, slug: p.slug, name: p.title || p.name, brand: p.brand,
        image: imgs && imgs.length ? imgs[0].url : null, badge,
        price, compare_at_price: compareAt,
        in_stock: (vs || []).some((v: any) => v.in_stock),
        _best: !!p.is_best_seller,
      });
    }

    // Best sellers first, then highest price (premium positioning).
    cards.sort((a, b) => (b._best ? 1 : 0) - (a._best ? 1 : 0) || b.price - a.price);
    const page = cards.slice(0, limit).map(({ _best, ...c }: any) => c);

    return new Response(JSON.stringify({ total: cards.length, products: page }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
