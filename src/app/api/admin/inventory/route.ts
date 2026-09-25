import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const [catalogItems, movements] = await Promise.all([
      pgQuery(`SELECT ci.id, ci.sku, ci.name, ci.description, ci.brand,
        ci.item_type, ci.unit_of_measure, ci.taxable, ci.active, ci.pos_enabled,
        ci.ecommerce_enabled, ci.purchasable, ci.sellable, ci.created_at,
        COALESCE((SELECT SUM(m.quantity) FROM public.erp_inventory_movements m WHERE m.sku_id = ci.sku_id), 0)::text AS stock_on_hand,
        (SELECT unit_cost::text FROM public.erp_inventory_movements WHERE sku_id = ci.sku_id ORDER BY occurred_at DESC LIMIT 1) AS unit_cost
        FROM public.commerce_catalog_items ci
        WHERE ci.tenant_id = $1
        ORDER BY ci.name ASC
        LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT m.id, m.movement_type, m.quantity::text, m.unit_cost::text,
        m.total_cost::text, m.source_type, m.reference, m.reason, m.occurred_at,
        ci.name AS item_name, ci.sku AS item_sku
        FROM public.erp_inventory_movements m
        LEFT JOIN public.commerce_catalog_items ci ON ci.sku_id = m.sku_id
        WHERE m.tenant_id = $1
        ORDER BY m.occurred_at DESC LIMIT 100`, [TENANT_ID()]),
    ]);
    return NextResponse.json({ catalogItems, movements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
