import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const body = await req.json();
    const { action, ...payload } = body;
    switch (action) {
      case 'add_location': {
        const { name, code, timezone } = payload;
        await pgExec(`INSERT INTO public.crm_locations (id, tenant_id, name, code, timezone, country, is_active) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'US', true)`, [TENANT_ID(), name, code, timezone || 'America/Chicago']);
        return NextResponse.json({ ok: true });
      }
      case 'toggle_online_booking': {
        const { location_id, enabled } = payload;
        await pgExec(`UPDATE public.crm_operating_hours SET accepts_online_booking = $1 WHERE location_id = $2::uuid AND tenant_id = $3`, [enabled, location_id, TENANT_ID()]);
        return NextResponse.json({ ok: true });
      }
      case 'clock_in': {
        const { staff_id } = payload;
        await pgExec(`INSERT INTO public.crm_staff_time_clock_entries (id, tenant_id, staff_id, clock_in, source) VALUES (gen_random_uuid(), $1, $2::uuid, now(), 'manual')`, [TENANT_ID(), staff_id]);
        return NextResponse.json({ ok: true });
      }
      case 'clock_out': {
        const { entry_id } = payload;
        await pgExec(`UPDATE public.crm_staff_time_clock_entries SET clock_out = now() WHERE id = $1::uuid AND tenant_id = $2 AND clock_out IS NULL`, [entry_id, TENANT_ID()]);
        return NextResponse.json({ ok: true });
      }
      case 'add_incident_report': {
        const { staff_id, severity, description } = payload;
        await pgExec(`INSERT INTO public.crm_staff_incident_reports (id, tenant_id, staff_id, severity, description, created_at) VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, now())`, [TENANT_ID(), staff_id, severity, description]);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
