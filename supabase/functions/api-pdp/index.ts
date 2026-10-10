// api-pdp — ENTERPRISE VERSION
// Product detail page API reading from enterprise tables
// GET params: slug (preferred) or id.
// Returns: product, variants[], images[], brand, reviews, breadcrumbs, price_range, in_stock.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

let _markup: number | null = null;
async function getMarkup(sb: any): Promise<number> {
  if (_markup) return _markup;
  try {
    const { data } = await sb.from("app_settings").select("value").eq("key", "pricing.markup_multiplier").single();
    _markup = data ? parseFloat(JSON.parse(data.value)) : 2.00;
  } catch { _markup = 2.00; }
  return _markup;
}
async function applyMarkup(sb: any, price: number): Promise<number> {
  const m = await getMarkup(sb);
  return Math.round(price * m * 100) / 100;
}

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

    // Find catalog item by slug (in metadata) or id
    // Use filter for JSONB field access
    let itemQuery = sb.from("commerce_catalog_items")
      .select("id, sku_id, item_type, sku, name, description, short_description, brand, metadata")
      .eq("active", true).eq("sellable", true);
    if (slug) {
      itemQuery = itemQuery.filter("metadata->>slug", "eq", slug);
    } else {
      itemQuery = itemQuery.eq("id", id);
    }
    const { data: item, error: iErr } = await itemQuery.maybeSingle();
    if (iErr) throw new Error("catalog: " + iErr.message);
    if (!item) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: corsHeaders });
    }

    const skuId = (item as any).sku_id;
    const meta = (item as any).metadata || {};

    // Get SKU with variant details
    const { data: sku, error: sErr } = await sb.from("erp_product_skus")
      .select("id, product_id, unit_price, uom, erp_product_variants!inner(id, name, attributes)")
      .eq("id", skuId).single();
    if (sErr) throw new Error("sku: " + sErr.message);

    // Get all variants for this product (for variant selector)
    const { data: allSkus } = await sb.from("erp_product_skus")
      .select("id, sku, unit_price, erp_product_variants!inner(id, name, attributes)")
      .eq("product_id", (sku as any).product_id).eq("is_active", true);

    // Get images
    const { data: media } = await sb.from("commerce_product_media")
      .select("url, alt_text, sort_order").eq("catalog_item_id", (item as any).id)
      .order("sort_order", { ascending: true });

    // Get product details from erp_products
    const { data: erpProd } = await sb.from("erp_products")
      .select("id, name, description, brand, metadata")
      .eq("id", (sku as any).product_id).single();

    // Get reviews
    const { data: reviews } = await sb.from("reviews")
      .select("id, author_name, rating, title, body, created_at")
      .eq("product_id", (sku as any).product_id).eq("is_published", true)
      .order("created_at", { ascending: false }).limit(20);

    // Build breadcrumbs from taxonomy_node_ids
    const breadcrumbs = [];
    const nodeIds: string[] = meta.taxonomy_node_ids || [];
    if (nodeIds.length) {
      const { data: nodes } = await sb.from("taxonomy_nodes")
        .select("id, slug, name, display_name, parent_id, path")
        .in("id", nodeIds.slice(0, 5));
      // Use first node's path for breadcrumbs
      const node = (nodes || [])[0];
      if (node) {
        // Walk up parents
        const byId = new Map((nodes || []).map((n: any) => [n.id, n]));
        let cur = node;
        const trail = [cur];
        while (cur.parent_id) {
          const { data: parent } = await sb.from("taxonomy_nodes")
            .select("id, slug, name, display_name, parent_id, path")
            .eq("id", cur.parent_id).single();
          if (!parent) break;
          trail.unshift(parent);
          cur = parent;
          if (trail.length > 5) break;
        }
        for (const t of trail) {
          breadcrumbs.push({ slug: t.slug, name: t.display_name || t.name, path: t.path });
        }
      }
    }

    // Build variants array
    const variants = [];
    for (const s of allSkus || []) {
      const attrs = (s as any).erp_product_variants?.attributes || {};
      const price = await applyMarkup(sb, Number((s as any).unit_price) || 0);
      variants.push({
        id: (s as any).id,
        sku: (s as any).sku,
        name: (s as any).erp_product_variants?.name || 'Default',
        size: attrs.option_size || null,
        color: attrs.option_color || null,
        price,
        compare_at_price: attrs.compare_at_price ? await applyMarkup(sb, Number(attrs.compare_at_price)) : null,
        in_stock: attrs.in_stock !== false,
        stock_quantity: attrs.stock_quantity || null,
      });
    }

    const prices = variants.map(v => v.price).filter(p => p > 0);
    const priceRange = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;

    const reviewList = reviews || [];
    const avgRating = reviewList.length
      ? Math.round((reviewList.reduce((s, r) => s + Number((r as any).rating), 0) / reviewList.length) * 10) / 10
      : null;

    return new Response(JSON.stringify({
      product: {
        id: (item as any).id,
        sku: (item as any).sku,
        name: (item as any).name,
        brand: (item as any).brand,
        description: (item as any).description || (erpProd as any)?.description,
        short_description: (item as any).short_description,
        slug: meta.slug,
        item_type: (item as any).item_type,
        is_new: meta.is_new || false,
        is_sale: meta.is_sale || false,
        is_best_seller: meta.is_best_seller || false,
        is_salon_favorite: meta.is_salon_favorite || false,
      },
      variants,
      images: (media || []).map((m: any) => ({ url: m.url, alt: m.alt_text })),
      reviews: { avg: avgRating, count: reviewList.length, list: reviewList },
      breadcrumbs,
      price_range: priceRange,
      in_stock: variants.some(v => v.in_stock),
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
