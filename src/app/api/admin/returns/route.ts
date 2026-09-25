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
    const filter = req.nextUrl.searchParams.get("filter") || "";
    // Query orders with return-eligible statuses (cancelled, refunded)
    let sql = `SELECT id, customer_email, email, total_amount, status, payment_status,
      fulfillment_status, created_at, updated_at
      FROM public.commerce_orders
      WHERE tenant_id = $1 AND status IN ('cancelled', 'refunded', 'partial_refund')`;
    const params: string[] = [TENANT_ID()];
    if (filter === 'action_required') sql += ` AND payment_status = 'refunded' AND fulfillment_status IS NULL`;
    if (filter === 'completed') sql += ` AND status = 'refunded'`;
    sql += ` ORDER BY created_at DESC LIMIT 200`;

    const returns = await pgQuery(sql, params);
    return NextResponse.json({ returns, total: returns.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
