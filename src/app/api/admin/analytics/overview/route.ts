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
    const rows = await pgQuery<{
      total_revenue: string; total_appointments: string; active_customers: string;
      average_ticket: string; completion_rate: string; total_orders: string;
      total_payments: string; active_staff: string; inventory_movements: string;
    }>(`SELECT
      COALESCE(SUM(CASE WHEN o.status IN ('confirmed','paid','fulfilled') THEN o.total_amount::numeric ELSE 0 END), 0)::text AS total_revenue,
      (SELECT count(*)::text FROM public.crm_appointments WHERE tenant_id = $1) AS total_appointments,
      (SELECT count(*)::text FROM public.crm_customers WHERE tenant_id = $1 AND is_active = true) AS active_customers,
      COALESCE(AVG(CASE WHEN o.status IN ('confirmed','paid','fulfilled') THEN o.total_amount::numeric END), 0)::text AS average_ticket,
      CASE WHEN COUNT(a.*) > 0 THEN (COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::numeric / COUNT(a.*) * 100)::text ELSE '0' END AS completion_rate,
      count(DISTINCT o.id)::text AS total_orders,
      (SELECT count(*)::text FROM public.commerce_payments WHERE tenant_id = $1) AS total_payments,
      (SELECT count(*)::text FROM public.crm_staff WHERE tenant_id = $1 AND is_active = true) AS active_staff,
      (SELECT count(*)::text FROM public.erp_inventory_movements WHERE tenant_id = $1) AS inventory_movements
      FROM public.commerce_orders o
      LEFT JOIN public.crm_appointments a ON a.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1`, [TENANT_ID()]);

    const k = rows[0] || {};
    return NextResponse.json({
      total_revenue: Number(k.total_revenue) || 0,
      total_appointments: Number(k.total_appointments) || 0,
      active_customers: Number(k.active_customers) || 0,
      average_ticket: Number(k.average_ticket) || 0,
      completion_rate: Number(k.completion_rate) || 0,
      total_orders: Number(k.total_orders) || 0,
      total_payments: Number(k.total_payments) || 0,
      active_staff: Number(k.active_staff) || 0,
      inventory_movements: Number(k.inventory_movements) || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
