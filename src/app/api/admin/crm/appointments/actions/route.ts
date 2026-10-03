import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
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
    if (shortAction === 'send_reminder') {
      await pgExec(`UPDATE public.crm_appointments SET reminder_sent_at = now(), updated_at = now() WHERE id = $1::uuid AND tenant_id = $2`, [appointment_id, TENANT_ID()]);
      return NextResponse.json({ ok: true, message: 'Reminder sent' });
    }
    if (shortAction === 'add_to_waitlist') {
      await pgExec(`INSERT INTO public.crm_waitlist (id, tenant_id, customer_id, status, created_at) VALUES (gen_random_uuid(), $1, $2, 'waiting', now())`, [TENANT_ID(), payload.customer_id]);
      return NextResponse.json({ ok: true });
    }
    if (shortAction === 'reschedule') {
      const { new_date, new_time } = payload;
      await pgExec(
        `UPDATE public.crm_appointments SET starts_at = $1, updated_at = now() WHERE id = $2::uuid AND tenant_id = $3`,
        [new_date ? `${new_date} ${new_time || '00:00'}` : null, appointment_id, TENANT_ID()],
      );
      await pgExec(
        `INSERT INTO public.crm_appointment_status_history (id, tenant_id, appointment_id, to_status, changed_at, notes) VALUES (gen_random_uuid(), $1, $2::uuid, 'rescheduled', now(), $3)`,
        [TENANT_ID(), appointment_id, `Rescheduled to ${new_date || '—'} ${new_time || ''}`],
      );
      return NextResponse.json({ ok: true, message: 'Appointment rescheduled' });
    }
    if (shortAction === 'duplicate') {
      const rows = await pgQuery(`SELECT * FROM public.crm_appointments WHERE id = $1::uuid AND tenant_id = $2`, [appointment_id, TENANT_ID()]);
      if (rows.length > 0) {
        const orig = rows[0] as any;
        await pgExec(
          `INSERT INTO public.crm_appointments (id, tenant_id, customer_id, location_id, assigned_groomer_id, starts_at, ends_at, status, service_type_confirmed, deposit_amount, subtotal, total, currency, source_channel, internal_notes, customer_notes)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'precheck', $7, $8, $9, $10, $11, $12, $13, $14)`,
          [TENANT_ID(), orig.customer_id, orig.location_id, orig.assigned_groomer_id, orig.starts_at, orig.ends_at, orig.service_type_confirmed, orig.deposit_amount, orig.subtotal, orig.total, orig.currency || 'USD', orig.source_channel, orig.internal_notes, orig.customer_notes],
        );
      }
      return NextResponse.json({ ok: true, message: 'Appointment duplicated' });
    }
    if (shortAction === 'follow_up') {
      await pgExec(
        `INSERT INTO public.crm_notes (id, tenant_id, customer_id, note_type, body, is_pinned)
         SELECT gen_random_uuid(), $1, customer_id, 'follow_up', 'Follow-up call needed for appointment', false
         FROM public.crm_appointments WHERE id = $2::uuid AND tenant_id = $1`,
        [TENANT_ID(), appointment_id],
      );
      return NextResponse.json({ ok: true, message: 'Follow-up logged' });
    }
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
