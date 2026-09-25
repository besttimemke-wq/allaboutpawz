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
    const { action, appointment_id, ...payload } = body;
    if (!appointment_id) return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
    
    const statusMap: Record<string, string> = {
      check_in: 'checked_in', in_service: 'in_service', complete: 'completed',
      cancel: 'cancelled', no_show: 'no_show', hold: 'hold', confirm: 'confirmed',
    };
    const newStatus = statusMap[action];
    if (newStatus) {
      await pgExec(`UPDATE public.crm_appointments SET status = $1, updated_at = now() WHERE id = $2::uuid AND tenant_id = $3`, [newStatus, appointment_id, TENANT_ID()]);
      await pgExec(`INSERT INTO public.crm_appointment_status_history (id, tenant_id, appointment_id, to_status, changed_at) VALUES (gen_random_uuid(), $1, $2::uuid, $3, now())`, [TENANT_ID(), appointment_id, newStatus]);
      return NextResponse.json({ ok: true, status: newStatus });
    }
    if (action === 'send_reminder') {
      await pgExec(`UPDATE public.crm_appointments SET reminder_sent_at = now(), updated_at = now() WHERE id = $1::uuid AND tenant_id = $2`, [appointment_id, TENANT_ID()]);
      return NextResponse.json({ ok: true, message: 'Reminder sent' });
    }
    if (action === 'add_to_waitlist') {
      await pgExec(`INSERT INTO public.crm_waitlist (id, tenant_id, customer_id, status, created_at) VALUES (gen_random_uuid(), $1, $2, 'waiting', now())`, [TENANT_ID(), payload.customer_id]);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
