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
    const q = req.nextUrl.searchParams.get("q") || "";
    if (!q.trim() || q.trim().length < 2) return NextResponse.json({ results: [] });
    const term = `%${q.trim()}%`;
    const [customers, pets, appointments, orders] = await Promise.all([
      pgQuery(`SELECT id, first_name, last_name, email, phone FROM public.crm_customers WHERE tenant_id = $1 AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2) LIMIT 5`, [TENANT_ID(), term]),
      pgQuery(`SELECT id, name, species, breed FROM public.crm_pets WHERE tenant_id = $1 AND (name ILIKE $2 OR breed ILIKE $2 OR microchip_number ILIKE $2) LIMIT 5`, [TENANT_ID(), term]),
      pgQuery(`SELECT id, appointment_number, status, starts_at FROM public.crm_appointments WHERE tenant_id = $1 AND (appointment_number ILIKE $2 OR status ILIKE $2) LIMIT 5`, [TENANT_ID(), term]),
      pgQuery(`SELECT id, customer_email, total_amount, status FROM public.commerce_orders WHERE tenant_id = $1 AND (id::text ILIKE $2 OR customer_email ILIKE $2) LIMIT 5`, [TENANT_ID(), term]),
    ]);
    return NextResponse.json({
      results: [
        ...customers.map((c: any) => ({ type: 'customer', id: c.id, label: `${c.first_name} ${c.last_name}`, sub: c.email, icon: 'User' })),
        ...pets.map((p: any) => ({ type: 'pet', id: p.id, label: p.name, sub: `${p.species} ${p.breed || ''}`, icon: 'PawPrint' })),
        ...appointments.map((a: any) => ({ type: 'appointment', id: a.id, label: a.appointment_number || a.id.slice(0,8), sub: a.status, icon: 'Calendar' })),
        ...orders.map((o: any) => ({ type: 'order', id: o.id, label: o.id.slice(0,8), sub: `${o.customer_email} — $${o.total_amount}`, icon: 'ShoppingBag' })),
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
