import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery, pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const { sku, quantity, binLocation, reason } = await req.json();
    if (!sku || !quantity) return NextResponse.json({ error: "sku and quantity required" }, { status: 400 });

    // Find the catalog item's sku_id
    const items = await pgQuery(`SELECT sku_id FROM public.commerce_catalog_items WHERE sku = $1 AND tenant_id = $2`, [sku, TENANT_ID()]);
    if (items.length === 0) return NextResponse.json({ error: "SKU not found" }, { status: 404 });
    const skuId = items[0].sku_id;

    // Create inventory movement
    await pgExec(`INSERT INTO public.erp_inventory_movements (id, tenant_id, movement_type, sku_id, quantity, unit_cost, source_type, reason, occurred_at)
      VALUES (gen_random_uuid(), $1, 'receipt', $2, $3, 0, 'manual_restock', $4, now())`,
      [TENANT_ID(), skuId, quantity, reason || 'restock']);

    // Update bin location if provided
    if (binLocation) {
      await pgExec(`UPDATE public.commerce_catalog_items SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{bin_location}', to_jsonb($1::text)) WHERE sku = $2 AND tenant_id = $3`,
        [binLocation, sku, TENANT_ID()]);
    }

    return NextResponse.json({ ok: true, message: `Restocked ${quantity} units of ${sku}`, skuId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
