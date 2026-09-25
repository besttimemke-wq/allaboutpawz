import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

function toUiStaff(row: any) {
  return {
    id: String(row.id),
    tenant_id: row.tenant_id,
    user_id: row.user_id ?? null,
    display_name: row.display_name ?? "—",
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    role: row.role ?? "staff",
    is_groomer: !!row.is_groomer,
    is_active: !!row.is_active,
    default_location_id: row.default_location_id ?? null,
    color_label: row.color_label ?? null,
    hire_date: row.hire_date ? String(row.hire_date).slice(0, 10) : null,
    termination_date: row.termination_date ? String(row.termination_date).slice(0, 10) : null,
    notes: row.notes ?? null,
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
    image_url: row.image_url ?? null,
    bio: row.bio ?? null,
    service_specialties: row.service_specialties ?? [],
    certifications: row.certifications ?? [],
    show_on_website: !!row.show_on_website,
    max_daily_appointments: row.max_daily_appointments ?? null,
    appointment_count_today: Number(row.today_appointment_count ?? 0),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100") || 100, 500);

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["s.tenant_id = $1", "s.is_active = true"];
    const params: any[] = [tenant];
    let pi = 2;
    if (search) { where.push(`(s.display_name ILIKE $${pi} OR s.email ILIKE $${pi} OR s.role ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
    const r = await client.query(
      `SELECT s.*, (SELECT count(*)::int FROM public.crm_appointments a WHERE a.tenant_id = s.tenant_id AND a.assigned_groomer_id = s.id AND DATE(a.starts_at) = CURRENT_DATE AND a.status NOT IN ('cancelled','no_show')) AS today_appointment_count FROM public.crm_staff s WHERE ${where.join(" AND ")} ORDER BY s.is_groomer DESC, s.display_name LIMIT $${pi}`,
      [...params, limit],
    );
    return NextResponse.json({ staff: r.rows.map(toUiStaff), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
