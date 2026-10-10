// api-recommendations — ENTERPRISE VERSION
// Returns cross-sell (same category) and upsell (same brand) products
// GET params: product_id (catalog item id) or sku_id, limit (default 10)

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
    const productId = (q.get("product_id") || "").trim();
    const skuId = (q.get("sku_id") || "").trim();
    const limit = Math.min(20, Math.max(1, parseInt(q.get("limit") || "10")));

    if (!productId && !skuId) {
      return new Response(JSON.stringify({ error: "product_id or sku_id required" }), { status: 400, headers: corsHeaders });
    }

    // Get the reference product
    let refQuery = sb.from("commerce_catalog_items")
      .select("id, sku_id, brand, metadata")
      .eq("active", true);
    if (productId) refQuery = refQuery.eq("id", productId);
    else refQuery = refQuery.eq("sku_id", skuId);
    const { data: ref } = await refQuery.maybeSingle();
    if (!ref) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: corsHeaders });
    }

    const refMeta = (ref as any).metadata || {};
    const refNodes: string[] = refMeta.taxonomy_node_ids || [];
    const refBrand = (ref as any).brand;
    const markup = await getMarkup(sb);

    // Cross-sell: same category (shared taxonomy nodes)
    let crossSell: any[] = [];
    if (refNodes.length) {
      const { data: items } = await sb.from("commerce_catalog_items")
        .select("id, sku_id, name, brand, metadata, erp_product_skus!inner(unit_price)")
        .eq("active", true).eq("sellable", true).eq("ecommerce_enabled", true)
        .neq("id", (ref as any).id)
        .limit(limit * 3);
      for (const item of items || []) {
        const nodes: string[] = (item as any).metadata?.taxonomy_node_ids || [];
        if (nodes.some(n => refNodes.includes(n))) {
          const price = Math.round(Number((item as any).erp_product_skus?.unit_price || 0) * markup * 100) / 100;
          if (price > 0) {
            crossSell.push({
              id: (item as any).id, name: (item as any).name, brand: (item as any).brand,
              price, slug: (item as any).metadata?.slug,
            });
          }
        }
        if (crossSell.length >= limit) break;
      }
    }

    // Upsell: same brand, different product
    let upsell: any[] = [];
    if (refBrand) {
      const { data: items } = await sb.from("commerce_catalog_items")
        .select("id, sku_id, name, brand, metadata, erp_product_skus!inner(unit_price)")
        .eq("active", true).eq("sellable", true).eq("ecommerce_enabled", true)
        .eq("brand", refBrand).neq("id", (ref as any).id)
        .limit(limit);
      for (const item of items || []) {
        const price = Math.round(Number((item as any).erp_product_skus?.unit_price || 0) * markup * 100) / 100;
        if (price > 0) {
          upsell.push({
            id: (item as any).id, name: (item as any).name, brand: (item as any).brand,
            price, slug: (item as any).metadata?.slug,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      cross_sell: crossSell.slice(0, limit),
      upsell: upsell.slice(0, limit),
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
