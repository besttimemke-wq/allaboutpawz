import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

function num(v: any): number { return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100; }

function toUiService(row: any) {
  return {
    id: String(row.id), name: row.name ?? "—", code: row.code ?? null,
    description: row.description ?? null, category: row.category ?? null,
    serviceCategory: row.service_category ?? null,
    defaultDurationMinutes: Number(row.default_duration_minutes ?? 0),
    defaultPrice: num(row.default_price),
    depositRequired: !!row.deposit_required,
    isActive: !!row.is_active, isAddOn: !!row.is_add_on,
    bookableOnline: !!row.bookable_online,
    imageUrl: row.image_url ?? null,
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["s.tenant_id = $1", "s.is_active = true"];
    const params: any[] = [tenant];
    let pi = 2;
    if (search) { where.push(`(s.name ILIKE $${pi} OR s.description ILIKE $${pi} OR s.category ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
    const r = await client.query(`SELECT s.* FROM public.crm_services s WHERE ${where.join(" AND ")} ORDER BY s.is_add_on ASC, s.category NULLS LAST, s.name LIMIT $${pi}`, [...params, limit]);
    return NextResponse.json({ services: r.rows.map(toUiService), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
