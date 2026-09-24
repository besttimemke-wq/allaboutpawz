import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";
export async function GET(req: NextRequest) {
  const g = await requireAdminApi(); if (g) return g;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  return withPg(async (c) => {
    const where = ["tenant_id = $1"]; const params: any[] = [TENANT_ID()]; let pi = 2;
    if (customerId) { where.push(`customer_id = $${pi}::uuid`); params.push(customerId); pi++; }
    const r = await c.query(`SELECT id::text, customer_id::text, pet_id::text, alert_type, body, is_active, created_at FROM public.crm_permanent_alerts WHERE ${where.join(" AND ")} ORDER BY created_at DESC`, params);
    return NextResponse.json({ alerts: r.rows, total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
