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
    const range = req.nextUrl.searchParams.get("range") || "30";
    const [trends, paymentBreakdown, customerRetention] = await Promise.all([
      pgQuery(`SELECT DATE_TRUNC('day', o.created_at)::date::text AS date,
        SUM(o.total_amount::numeric)::text AS revenue,
        count(*)::text AS order_count
        FROM public.commerce_orders o
        WHERE o.tenant_id = $1 AND o.created_at >= now() - interval '${parseInt(range)} days'
        GROUP BY 1 ORDER BY 1 ASC LIMIT 90`, [TENANT_ID()]),
      pgQuery(`SELECT pm.name AS method_name, pm.method_type,
        SUM(p.amount::numeric)::text AS total_amount,
        count(*)::text AS count
        FROM public.commerce_payments p
        JOIN public.commerce_payment_methods pm ON pm.id = p.payment_method_id
        WHERE p.tenant_id = $1
        GROUP BY pm.name, pm.method_type
        ORDER BY total_amount DESC`, [TENANT_ID()]),
      pgQuery(`SELECT count(*)::text AS total_customers,
        AVG(lifetime_value)::text AS avg_lifetime_value,
        AVG(rebook_rate)::text AS avg_rebook_rate,
        AVG(no_show_rate)::text AS avg_no_show_rate,
        AVG(cancellation_rate)::text AS avg_cancellation_rate,
        count(*) FILTER (WHERE lifecycle_stage = 'vip')::text AS vip_customers,
        count(*) FILTER (WHERE lifecycle_status = 'at_risk')::text AS at_risk_customers
        FROM public.crm_customers WHERE tenant_id = $1 AND is_active = true`, [TENANT_ID()]),
    ]);

    const cr = customerRetention[0] || {};
    return NextResponse.json({
      trends: trends.map((t: any) => ({ date: t.date, revenue: Number(t.revenue) || 0, order_count: Number(t.order_count) || 0 })),
      paymentMethods: paymentBreakdown.map((p: any) => ({ method_name: p.method_name, method_type: p.method_type, total_amount: Number(p.total_amount) || 0, count: Number(p.count) || 0 })),
      customerRetention: {
        total_customers: Number(cr.total_customers) || 0,
        avg_lifetime_value: Number(cr.avg_lifetime_value) || 0,
        avg_rebook_rate: Number(cr.avg_rebook_rate) || 0,
        avg_no_show_rate: Number(cr.avg_no_show_rate) || 0,
        avg_cancellation_rate: Number(cr.avg_cancellation_rate) || 0,
        vip_customers: Number(cr.vip_customers) || 0,
        at_risk_customers: Number(cr.at_risk_customers) || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
