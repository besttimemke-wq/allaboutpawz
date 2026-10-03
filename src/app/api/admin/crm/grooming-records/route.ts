import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

function num(v: any): number { return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100; }

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["g.tenant_id = $1"]; const params: any[] = [tenant]; let pi = 2;
    if (customerId) { where.push(`g.customer_id = $${pi}::uuid`); params.push(customerId); pi++; }
    const r = await client.query(
      `SELECT g.*, p.name AS pet_name, p.breed AS pet_breed, p.species AS pet_species, c.first_name AS customer_first_name, c.last_name AS customer_last_name, s.display_name AS groomer_name, sv.name AS service_name, a.total AS appointment_total, a.payment_method_confirmed AS appointment_payment_status
       FROM public.crm_grooming_records g
       LEFT JOIN public.crm_pets p ON p.id = g.pet_id AND p.tenant_id = g.tenant_id
       LEFT JOIN public.crm_customers c ON c.id = g.customer_id AND c.tenant_id = g.tenant_id
       LEFT JOIN public.crm_staff s ON s.id = g.groomer_id AND s.tenant_id = g.tenant_id
       LEFT JOIN public.crm_services sv ON sv.id = g.recommended_next_service_id
       LEFT JOIN public.crm_appointments a ON a.id = g.appointment_id AND a.tenant_id = g.tenant_id
       WHERE ${where.join(" AND ")} ORDER BY g.completed_at DESC NULLS LAST LIMIT $${pi}`,
      [...params, limit],
    );
    return NextResponse.json({ records: r.rows.map((row: any) => ({ id: String(row.id), petName: row.pet_name ?? "—", breed: row.pet_breed ?? "—", date: row.completed_at ? new Date(row.completed_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—", serviceName: row.service_name ?? "Grooming", groomer: row.groomer_name ?? "—", amount: num(row.appointment_total ?? 0), status: String(row.appointment_payment_status||"").toLowerCase()==="paid"?"Paid":"Pending", cutDetails: row.services_summary || row.notes || "", customerName: [row.customer_first_name,row.customer_last_name].filter(Boolean).join(" ").trim()||"—" })), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
