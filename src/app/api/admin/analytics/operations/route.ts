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
    const [groomerPerf, inventoryTurnover] = await Promise.all([
      pgQuery(`SELECT s.id AS staff_id, s.display_name,
        count(a.*)::text AS appointment_count,
        count(*) FILTER (WHERE a.status = 'completed')::text AS completed_count,
        count(*) FILTER (WHERE a.status = 'cancelled')::text AS cancellation_count,
        count(*) FILTER (WHERE a.status = 'no_show')::text AS no_show_count,
        COALESCE(SUM(a.total::numeric), 0)::text AS total_revenue,
        CASE WHEN count(a.*) > 0 THEN (count(*) FILTER (WHERE a.status = 'completed')::numeric / count(a.*) * 100)::text ELSE '0' END AS completion_rate
        FROM public.crm_staff s
        LEFT JOIN public.crm_appointments a ON a.assigned_groomer_id = s.id AND a.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1 AND s.is_active = true
        GROUP BY s.id, s.display_name
        ORDER BY appointment_count DESC`, [TENANT_ID()]),
      pgQuery(`SELECT
        (SELECT count(*)::text FROM public.commerce_catalog_items WHERE tenant_id = $1) AS total_items,
        (SELECT count(*)::text FROM public.erp_inventory_movements WHERE tenant_id = $1) AS total_movements,
        COALESCE((SELECT SUM(quantity)::text FROM public.erp_inventory_movements WHERE tenant_id = $1), '0') AS total_stock_value,
        (SELECT count(*)::text FROM public.commerce_catalog_items ci WHERE ci.tenant_id = $1 AND COALESCE((SELECT SUM(quantity) FROM public.erp_inventory_movements m WHERE m.sku_id = ci.sku_id), 0) < 10) AS low_stock_count`, [TENANT_ID()]),
    ]);

    const it = inventoryTurnover[0] || {};
    return NextResponse.json({
      groomerPerformance: groomerPerf.map((g: any) => ({
        staff_id: g.staff_id, display_name: g.display_name,
        appointment_count: Number(g.appointment_count) || 0,
        completed_count: Number(g.completed_count) || 0,
        cancellation_count: Number(g.cancellation_count) || 0,
        no_show_count: Number(g.no_show_count) || 0,
        total_revenue: Number(g.total_revenue) || 0,
        completion_rate: Number(g.completion_rate) || 0,
      })),
      inventoryTurnover: {
        total_items: Number(it.total_items) || 0,
        total_movements: Number(it.total_movements) || 0,
        total_stock_value: Number(it.total_stock_value) || 0,
        low_stock_count: Number(it.low_stock_count) || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
