import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const body = await req.json();
    const { action, ...payload } = body;
    switch (action) {
      case 'restock_inventory': {
        const { sku_id, quantity, reason } = payload;
        await pgExec(`INSERT INTO public.erp_inventory_movements (id, tenant_id, movement_type, sku_id, quantity, unit_cost, source_type, reason, occurred_at) VALUES (gen_random_uuid(), $1, 'receipt', $2::uuid, $3, 0, 'manual_restock', $4, now())`, [TENANT_ID(), sku_id, quantity, reason || 'restock']);
        return NextResponse.json({ ok: true });
      }
      case 'advance_fulfillment_stage': {
        const { order_id, status } = payload;
        await pgExec(`UPDATE public.commerce_orders SET fulfillment_status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`, [status, order_id, TENANT_ID()]);
        return NextResponse.json({ ok: true, status });
      }
      case 'create_order': {
        const { customer_email, total_amount } = payload;
        await pgExec(`INSERT INTO public.commerce_orders (id, tenant_id, customer_email, email, total_amount, status, payment_status, fulfillment_status, created_at, updated_at) VALUES (gen_random_uuid()::text, $1, $2, $2, $3, 'pending', 'unpaid', 'pending', now(), now())`, [TENANT_ID(), customer_email, total_amount]);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
