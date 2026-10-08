// api-pdp — Product detail page API.
// GET params: slug (preferred) or id.
// Returns: product, variants[], images[], brand, reviews{avg,count,list[]},
//          breadcrumbs[] (root -> leaf via product_nodes primary + parent walk),
//          price_range, in_stock.
//
// Live-schema grounded (Oct 2026): products / product_variants / product_media /
// product_nodes / taxonomy_nodes / brands / product_reviews.

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
    const slug = (q.get("slug") || "").trim();
    const id = (q.get("id") || "").trim();
    if (!slug && !id) {
      return new Response(JSON.stringify({ error: "slug or id required" }), { status: 400, headers: corsHeaders });
    }

    let prodQuery = sb.from("products").select(
      "id,slug,name,title,handle,brand,brand_id,short_description,description_html,details,specifications,directions,warnings,tags,pet,fulfillment_type,is_new,is_sale,is_best_seller,is_salon_favorite"
    ).eq("status", "published");
    prodQuery = slug ? prodQuery.eq("slug", slug) : prodQuery.eq("id", id);
    const { data: prod, error: pErr } = await prodQuery.maybeSingle();
    if (pErr) throw new Error("products: " + pErr.message);
    if (!prod) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: corsHeaders });
    }

    const [varRes, medRes, revRes, pnRes, brandRes] = await Promise.all([
      sb.from("product_variants").select("id,sku,variant_title,option_size,option_color,price,compare_at_price,in_stock,stock_quantity,weight_grams")
        .eq("product_id", prod.id).eq("status", "active").order("price", { ascending: true }),
      sb.from("product_media").select("url,alt_text,sort_order,variant_id")
        .eq("product_id", prod.id).eq("media_type", "image").order("sort_order", { ascending: true }),
      sb.from("product_reviews").select("author,rating,title,body,verified,createdAt")
        .eq("productId", prod.id).eq("visible", true).order("createdAt", { ascending: false }).limit(20),
      sb.from("product_nodes").select("node_id,is_primary").eq("product_id", prod.id),
      prod.brand_id
        ? sb.from("brands").select("id,name,slug,logo_url").eq("id", prod.brand_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (varRes.error) throw new Error("product_variants: " + varRes.error.message);
    if (medRes.error) throw new Error("product_media: " + medRes.error.message);
    if (revRes.error) throw new Error("product_reviews: " + revRes.error.message);

    const variants = varRes.data || [];
    const prices = variants.map((v: any) => Number(v.price)).filter((n: number) => Number.isFinite(n) && n > 0);
    const reviews = revRes.data || [];
    const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + (Number(r.rating) || 0), 0) / reviews.length : null;

    // Breadcrumb: primary node, walk up via parent_id.
    let breadcrumbs: any[] = [];
    const pnRows = pnRes.data || [];
    const primary = pnRows.find((r: any) => r.is_primary) || pnRows[0];
    if (primary) {
      const { data: allNodes } = await sb.from("taxonomy_nodes")
        .select("id,name,display_name,slug,parent_id").eq("status", "published");
      const byId = new Map((allNodes || []).map((n: any) => [n.id, n]));
      let cur = byId.get(primary.node_id);
      const trail = [];
      while (cur) { trail.unshift({ slug: cur.slug, name: cur.display_name || cur.name }); cur = cur.parent_id ? byId.get(cur.parent_id) : undefined; }
      breadcrumbs = trail;
    }

    return new Response(JSON.stringify({
      product: {
        id: prod.id, slug: prod.slug, name: prod.title || prod.name,
        brand: prod.brand, short_description: prod.short_description,
        description_html: prod.description_html, details: prod.details,
        specifications: prod.specifications, directions: prod.directions, warnings: prod.warnings,
        tags: prod.tags, pet: prod.pet, fulfillment_type: prod.fulfillment_type,
        is_new: prod.is_new, is_sale: prod.is_sale,
        is_best_seller: prod.is_best_seller, is_salon_favorite: prod.is_salon_favorite,
      },
      variants: variants.map((v: any) => ({
        id: v.id, sku: v.sku, title: v.variant_title,
        size: v.option_size, color: v.option_color,
        price: Number(v.price), compare_at_price: v.compare_at_price != null ? Number(v.compare_at_price) : null,
        in_stock: !!v.in_stock, stock_quantity: v.stock_quantity,
        cta: v.in_stock ? "ADD_TO_CART" : "NOTIFY_ME",
      })),
      images: (medRes.data || []).map((m: any) => ({ url: m.url, alt: m.alt_text })),
      brand: brandRes.data || null,
      reviews: {
        avg: avg != null ? Math.round(avg * 10) / 10 : null,
        count: reviews.length,
        list: reviews.map((r: any) => ({ author: r.author, rating: r.rating, title: r.title, body: r.body, verified: r.verified })),
      },
      breadcrumbs,
      price_range: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      in_stock: variants.some((v: any) => v.in_stock),
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
