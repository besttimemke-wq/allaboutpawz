// api-salon-favorites — ENTERPRISE VERSION
// Returns products flagged as salon favorites (premium tier)
// GET params: limit (default 20), page (default 1)

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
    const limit = Math.min(50, Math.max(1, parseInt(q.get("limit") || "20")));
    const page = Math.max(1, parseInt(q.get("page") || "1"));
    const markup = await getMarkup(sb);

    // Get salon favorite items from enterprise tables
    const { data: items, error } = await sb.from("commerce_catalog_items")
      .select(`
        id, sku_id, name, brand, metadata,
        erp_product_skus!inner(unit_price),
        commerce_product_media(url)
      `)
      .eq("active", true).eq("sellable", true).eq("ecommerce_enabled", true)
      .eq("metadata->>is_salon_favorite", "true")
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw new Error("catalog: " + error.message);

    const products = [];
    for (const item of items || []) {
      const price = Math.round(Number((item as any).erp_product_skus?.unit_price || 0) * markup * 100) / 100;
      if (price <= 0) continue;
      const media = (item as any).commerce_product_media || [];
      products.push({
        id: (item as any).id,
        name: (item as any).name,
        brand: (item as any).brand,
        price,
        image: media[0]?.url || null,
        slug: (item as any).metadata?.slug,
        badge: "SALON FAVORITE",
      });
    }

    return new Response(JSON.stringify({
      products, page,
      total: products.length,
    }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 500, headers: corsHeaders });
  }
});
