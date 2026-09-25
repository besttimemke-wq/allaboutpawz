import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery, pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const orders = await pgQuery(`SELECT id, customer_email, email, total_amount, status,
      fulfillment_status, fulfillment_method, tracking_number, carrier, tracking_status,
      shipping_address, created_at
      FROM public.commerce_orders
      WHERE tenant_id = $1
      ORDER BY created_at DESC LIMIT 200`, [TENANT_ID()]);

    const stages = {
      unfulfilled: orders.filter((o: any) => !o.fulfillment_status || o.fulfillment_status === 'pending' || o.fulfillment_status === 'UNFULFILLED'),
      ready_to_ship: orders.filter((o: any) => o.fulfillment_status === 'ready_to_ship'),
      local_pickup: orders.filter((o: any) => o.fulfillment_method === 'local_pickup' && o.fulfillment_status !== 'shipped' && o.fulfillment_status !== 'delivered'),
      shipped: orders.filter((o: any) => o.fulfillment_status === 'shipped'),
      delivered: orders.filter((o: any) => o.fulfillment_status === 'delivered'),
    };

    return NextResponse.json({
      counts: {
        unfulfilled: stages.unfulfilled.length,
        ready_to_ship: stages.ready_to_ship.length,
        local_pickup: stages.local_pickup.length,
        shipped: stages.shipped.length,
        delivered: stages.delivered.length,
        total: orders.length,
      },
      orders: orders.map((o: any) => ({ ...o, stage: !o.fulfillment_status || o.fulfillment_status === 'UNFULFILLED' || o.fulfillment_status === 'pending' ? 'unfulfilled' : o.fulfillment_status })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/fulfillment — batch status transition
export async function PATCH(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const { orderIds, status } = await req.json();
    if (!orderIds?.length || !status) return NextResponse.json({ error: "orderIds and status required" }, { status: 400 });

    const ids = orderIds.map((_: string, i: number) => `$${i + 2}`).join(",");
    const affected = await pgExec(
      `UPDATE public.commerce_orders SET fulfillment_status = $1, updated_at = now() WHERE id IN (${ids}) AND tenant_id = $${orderIds.length + 2}`,
      [status, ...orderIds, TENANT_ID()],
    );
    return NextResponse.json({ ok: true, affected, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
