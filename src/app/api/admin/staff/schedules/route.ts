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
    const [shifts, templates, clockEntries] = await Promise.all([
      pgQuery(`SELECT ss.id, ss.staff_id, ss.location_id, ss.shift_date, ss.starts_at,
        ss.ends_at, ss.break_minutes, ss.role, ss.status, ss.is_overtime,
        ss.checked_in_at, ss.checked_out_at, ss.notes,
        s.display_name AS staff_name, l.name AS location_name
        FROM public.crm_staff_shifts ss
        LEFT JOIN public.crm_staff s ON s.id = ss.staff_id
        LEFT JOIN public.crm_locations l ON l.id = ss.location_id
        WHERE ss.tenant_id = $1
        ORDER BY ss.shift_date DESC, ss.starts_at ASC LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT id, name, location_id, day_of_week, starts_at, ends_at,
        break_minutes, role, required_headcount, color_label, is_active,
        effective_from, effective_to
        FROM public.crm_shift_templates
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY day_of_week, starts_at LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT tc.id, tc.staff_id, tc.clock_in, tc.clock_out, tc.source,
        tc.notes, tc.created_at, s.display_name AS staff_name
        FROM public.crm_staff_time_clock_entries tc
        LEFT JOIN public.crm_staff s ON s.id = tc.staff_id
        WHERE tc.tenant_id = $1
        ORDER BY tc.clock_in DESC LIMIT 50`, [TENANT_ID()]),
    ]);
    return NextResponse.json({ shifts, templates, clockEntries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
