import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const { id } = await params;
    const [orders, items] = await Promise.all([
      pgQuery(`SELECT id, customer_email, email, total_amount, shipping_address, fulfillment_method, created_at FROM public.commerce_orders WHERE id = $1 AND tenant_id = $2`, [id, TENANT_ID()]),
      pgQuery(`SELECT name, quantity, unit_price FROM public.commerce_order_items WHERE order_id = $1`, [id]),
    ]);
    if (orders.length === 0) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ order: orders[0], items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
