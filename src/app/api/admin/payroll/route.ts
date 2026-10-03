import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

function num(v: any): number { return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100; }

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30") || 30, 365);
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const r = await client.query(
      `SELECT s.id::text AS staff_id, s.display_name, s.first_name, s.last_name, s.email, s.role, s.is_groomer, s.is_active, s.color_label, s.hire_date,
        (SELECT count(*)::int FROM public.crm_appointments a WHERE a.tenant_id = s.tenant_id AND a.assigned_groomer_id = s.id AND a.completed_at IS NOT NULL AND a.completed_at >= now() - ($2 || ' days')::interval) AS appointment_count,
        (SELECT COALESCE(SUM(a.total), 0)::numeric FROM public.crm_appointments a WHERE a.tenant_id = s.tenant_id AND a.assigned_groomer_id = s.id AND a.completed_at IS NOT NULL AND a.completed_at >= now() - ($2 || ' days')::interval) AS gross_revenue,
        (SELECT COALESCE(SUM(cp.tip_amount), 0)::numeric FROM public.commerce_payments cp WHERE cp.tenant_id = s.tenant_id AND cp.staff_id = s.id AND cp.status IN ('succeeded','captured') AND cp.created_at >= now() - ($2 || ' days')::interval) AS tips_earned
       FROM public.crm_staff s WHERE s.tenant_id = $1 ORDER BY s.is_active DESC, s.is_groomer DESC, s.display_name`,
      [tenant, String(days)],
    );
    const staff = r.rows.map((row: any) => {
      const gross = num(row.gross_revenue);
      const commissionRate = 0.5;
      const commissionOwed = num(gross * commissionRate);
      const tipsEarned = num(row.tips_earned);
      return {
        id: row.staff_id, name: row.display_name, role: row.role, isGroomer: !!row.is_groomer, isActive: !!row.is_active,
        appointmentCount: Number(row.appointment_count) || 0, grossRevenue: gross, commissionRate, commissionOwed, tipsEarned, netPay: num(commissionOwed + tipsEarned),
      };
    });
    return NextResponse.json({ staff, totals: { staffCount: staff.length, totalAppointments: staff.reduce((s: number, r: any) => s + r.appointmentCount, 0), totalGross: num(staff.reduce((s: number, r: any) => s + r.grossRevenue, 0)), totalCommission: num(staff.reduce((s: number, r: any) => s + r.commissionOwed, 0)), totalTips: num(staff.reduce((s: number, r: any) => s + r.tipsEarned, 0)), totalNet: num(staff.reduce((s: number, r: any) => s + r.netPay, 0)) }, days });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
