import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const { id } = await params;
    const body = await req.json();
    const { refundAmount, restockInventory } = body;
    await pgExec(`UPDATE public.commerce_orders SET status = 'refunded', payment_status = 'refunded', updated_at = now() WHERE id = $1 AND tenant_id = $2`, [id, TENANT_ID()]);
    await pgExec(`INSERT INTO public.crm_funnel_events (id, tenant_id, event_type, entity_type, entity_id, metadata)
      VALUES (gen_random_uuid(), $1, 'refund_processed', 'order', $2, $3::jsonb)`,
      [TENANT_ID(), id, JSON.stringify({ refundAmount, restockInventory, processed_at: new Date().toISOString() })]);
    return NextResponse.json({ ok: true, message: `Refund processed for order ${id}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
