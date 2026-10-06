// ---------------------------------------------------------------------------
// /api/admin/crm/appointments/actions/route.ts
//
// Appointment pipeline quick actions — all 12 status/operation handlers that
// the GlobalCommandPalette dispatches to via mutationKey: 'appointment:actions'.
//
// CHECK constraint on crm_appointments.status allows ONLY:
//   precheck | deposit_paid | scheduled | assigned | waiting_checkin |
//   confirmed | checked_in | in_service | hold | completed | no_show |
//   cancelled | rescheduled
//
// Every handler:
//   1. Strips the module prefix (apt_check_in → check_in)
//   2. Runs a real UPDATE/INSERT against crm_appointments
//   3. INSERTs into crm_appointment_status_history (from_status + to_status)
//   4. Appends to crm_audit_log via auditAction()
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest, logCustomerNote } from "@/lib/quick-actions/audit";
import { sendAppointmentCanceled, sendAppointmentRescheduled, sendAppointmentReminder } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Customer email context for an appointment — joins the CRM record to the
// customer + pets (+ the originating wizard booking for service details).
// ---------------------------------------------------------------------------
interface ApptEmailContext {
  email: string | null;
  firstName: string;
  ownerName: string;
  dogName: string | null;
  service: string;
  size: string | null;
  dateLabel: string;
  timeLabel: string | null;
}

async function apptEmailContext(appointmentId: string): Promise<ApptEmailContext | null> {
  const rows = await pgQuery<{
    starts_at: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    booking_service: string | null;
    booking_size: string | null;
    dog_name: string | null;
    pet_names: string | null;
  }>(
    `SELECT a.starts_at,
            c.first_name, c.last_name, c.email,
            b.service AS booking_service, b.size AS booking_size, b."dogName" AS dog_name,
            (SELECT string_agg(p.name, ', ') FROM public.crm_appointment_pets ap
               JOIN public.crm_pets p ON p.id = ap.pet_id AND p.tenant_id = a.tenant_id
              WHERE ap.appointment_id = a.id) AS pet_names
       FROM public.crm_appointments a
       LEFT JOIN public.crm_customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
       LEFT JOIN public.bookings b ON b.id::text = a.source_appointment_id
      WHERE a.id = $1::uuid AND a.tenant_id = $2`,
    [appointmentId, TENANT_ID()],
  );
  const r = rows[0];
  if (!r) return null;
  const startsAt = r.starts_at ? new Date(r.starts_at) : null;
  return {
    email: r.email || null,
    firstName: (r.first_name || "").trim(),
    ownerName: [r.first_name, r.last_name].filter(Boolean).join(" ").trim(),
    dogName: r.dog_name || r.pet_names || null,
    service: r.booking_service || "Grooming appointment",
    size: r.booking_size || null,
    dateLabel: startsAt
      ? startsAt.toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" })
      : "your appointment",
    timeLabel: startsAt
      ? startsAt.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" })
      : null,
  };
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  let action = "";
  let payload: Record<string, unknown> = {};
  let actorId: string | null = null;
  let ip: string | null = null;

  try {
    const body = await req.json();
    action = String(body.action || "");
    payload = body.payload ?? body;
    delete (payload as Record<string, unknown>).action;
    actorId = await getActorIdFromRequest(req);
    ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  } catch (e) {
    return NextResponse.json({ error: `Invalid request body: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  const shortAction = action.replace(/^[a-z]+_/, "");

  try {
    // ───────────────────────────────────────────────────────────────────
    // STATUS CHANGE HANDLERS — flip crm_appointments.status + record
    // the transition in crm_appointment_status_history.
    // ───────────────────────────────────────────────────────────────────

    // Map of action → new status (must match the CHECK enum exactly)
    const STATUS_MAP: Record<string, string> = {
      check_in: "checked_in",
      in_service: "in_service",
      complete: "completed",
      hold: "hold",
      no_show: "no_show",
      cancel: "cancelled",
      confirm: "confirmed",
    };

    if (STATUS_MAP[shortAction]) {
      const newStatus = STATUS_MAP[shortAction];
      const appointmentId = String(payload.appointment_id || "");
      if (!appointmentId) {
        return NextResponse.json({ ok: false, error: "appointment_id is required" }, { status: 400 });
      }
      // Fetch the current status for the history record
      const currentRows = await pgQuery<{ status: string; customer_id: string | null }>(
        `SELECT status, customer_id FROM public.crm_appointments WHERE id = $1::uuid AND tenant_id = $2`,
        [appointmentId, TENANT_ID()],
      );
      if (currentRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Appointment not found" }, { status: 404 });
      }
      const fromStatus = currentRows[0].status;
      const customerId = currentRows[0].customer_id;
      // Update the appointment status + relevant timestamp column
      // Map ACTION KEY (not status value) → timestamp column.
      // check_in → checked_in_at, in_service → started_at, complete → completed_at.
      // These keys MUST match the STATUS_MAP keys, NOT the status values.
      const timestampCol: Record<string, string> = {
        check_in: "checked_in_at",
        in_service: "started_at",
        complete: "completed_at",
      };
      const tsUpdate = timestampCol[shortAction] ? `, ${timestampCol[shortAction]} = now()` : "";
      // For no_show and cancel, capture the reason
      const reasonCol = shortAction === "no_show" ? ", no_show_reason = $4" : "";
      const reasonColCancel = shortAction === "cancel" ? ", cancellation_reason = $4" : "";
      const reason = (payload.reason ? String(payload.reason) : null);
      const params: unknown[] = [newStatus, appointmentId, TENANT_ID()];
      if (shortAction === "no_show" || shortAction === "cancel") params.push(reason);
      await pgExec(
        `UPDATE public.crm_appointments
            SET status = $1, updated_at = now()${tsUpdate}${reasonCol}${reasonColCancel}
          WHERE id = $2::uuid AND tenant_id = $3`,
        params,
      );
      // Record the status transition
      await pgExec(
        `INSERT INTO public.crm_appointment_status_history
           (id, tenant_id, appointment_id, from_status, to_status, changed_by, changed_at, reason)
         VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5::uuid, now(), $6)`,
        [TENANT_ID(), appointmentId, fromStatus, newStatus, actorId, reason],
      );
      // Log a customer note for significant transitions
      if (customerId && (shortAction === "complete" || shortAction === "cancel" || shortAction === "no_show")) {
        await logCustomerNote({
          customerId,
          body: `Appointment ${appointmentId.slice(0, 8)} → ${newStatus}${reason ? ` (${reason})` : ""}`,
          noteType: "appointment",
        });
      }
      await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: appointmentId, afterData: { fromStatus, toStatus: newStatus }, actorUserId: actorId, ipAddress: ip });

      // Branded cancellation email — fire-and-forget so the action never waits on mail.
      if (shortAction === "cancel" && customerId) {
        apptEmailContext(appointmentId)
          .then((ctx) => {
            if (!ctx?.email) return;
            return sendAppointmentCanceled({
              customerId,
              email: ctx.email,
              ownerName: ctx.ownerName,
              dogName: ctx.dogName,
              service: ctx.service,
              size: ctx.size,
              date: ctx.dateLabel,
              time: ctx.timeLabel,
              reason,
              canceledBy: "salon",
              bookingId: appointmentId,
            });
          })
          .catch((e) => console.error("[appointments/actions] cancel email failed:", e?.message));
      }

      // ─────────────────────────────────────────────────────────────────
      // PERKS — the appointment happened (salon marks it complete): post
      // the booking_completed points. The crm row links back to the
      // customer-facing booking via source_appointment_id; the amount is
      // the BOOKING's total (the register record). Idempotent on
      // (source='booking', source_id=booking.id) — completing twice never
      // double-posts.
      // ─────────────────────────────────────────────────────────────────
      if (shortAction === "complete" && newStatus === "completed") {
        try {
          const linkRows = await pgQuery<{ source_appointment_id: string | null }>(
            `SELECT source_appointment_id FROM public.crm_appointments WHERE id = $1::uuid AND tenant_id = $2`,
            [appointmentId, TENANT_ID()],
          );
          const bookingId = linkRows[0]?.source_appointment_id || null;
          if (bookingId) {
            const bookingRows = await pgQuery<{ email: string | null; total_cents: number | null }>(
              `SELECT email, totalCents as total_cents FROM public.bookings WHERE id = $1::text LIMIT 1`,
              [String(bookingId)],
            );
            const b = bookingRows[0];
            if (b?.email && (b.total_cents ?? 0) > 0) {
              const { earnForEmail } = await import("@/lib/perks");
              const earned = await earnForEmail({
                email: String(b.email),
                event: "booking_completed",
                amountCents: Number(b.total_cents),
                sourceId: String(bookingId),
                note: "grooming visit",
              });
              if (earned.posted) {
                console.log(`[appointments/actions] perks posted: +${earned.points} for booking ${bookingId}`);
              }
            }
          }
        } catch (e: any) {
          console.error("[appointments/actions] perks earn failed:", e?.message);
        }
      }
      return NextResponse.json({ ok: true, appointmentId, fromStatus, toStatus: newStatus });
    }

    // ───────────────────────────────────────────────────────────────────
    // NON-STATUS ACTIONS — reschedule, duplicate, send_reminder,
    // follow_up, add_to_waitlist. These don't fit the STATUS_MAP
    // pattern and need custom SQL.
    // ───────────────────────────────────────────────────────────────────

    switch (shortAction) {
      // We use a nested switch for the non-status actions. The status
      // actions are handled by the STATUS_MAP above and return early.

      case "reschedule": {
        const appointmentId = String(payload.appointment_id || "");
        const newStartsAt = String(payload.new_starts_at || payload.starts_at || "");
        const newEndsAt = payload.new_ends_at ? String(payload.new_ends_at) : (payload.ends_at ? String(payload.ends_at) : null);
        if (!appointmentId || !newStartsAt) {
          return NextResponse.json({ ok: false, error: "appointment_id and new_starts_at are required" }, { status: 400 });
        }
        // Capture the OLD slot (and email context) BEFORE the update so the
        // reschedule email can show old → new.
        const oldRows = await pgQuery<{ starts_at: string; customer_id: string | null }>(
          `SELECT starts_at, customer_id FROM public.crm_appointments WHERE id = $1::uuid AND tenant_id = $2`,
          [appointmentId, TENANT_ID()],
        );
        const oldStartsAt = oldRows[0]?.starts_at || null;
        const rescheduleCustomerId = oldRows[0]?.customer_id || null;
        const updated = await pgExec(
          `UPDATE public.crm_appointments
              SET starts_at = $1::timestamptz,
                  ends_at = COALESCE($2::timestamptz, ends_at),
                  status = 'rescheduled',
                  updated_at = now()
            WHERE id = $3::uuid AND tenant_id = $4`,
          [newStartsAt, newEndsAt, appointmentId, TENANT_ID()],
        );
        await pgExec(
          `INSERT INTO public.crm_appointment_status_history
             (id, tenant_id, appointment_id, to_status, changed_by, changed_at, reason)
           VALUES (gen_random_uuid(), $1, $2::uuid, 'rescheduled', $3::uuid, now(), $4)`,
          [TENANT_ID(), appointmentId, actorId, `Rescheduled to ${newStartsAt}`],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: appointmentId, afterData: { newStartsAt, newEndsAt, toStatus: "rescheduled", updated }, actorUserId: actorId, ipAddress: ip });

        // Branded reschedule confirmation (old → new) — fire-and-forget.
        if (rescheduleCustomerId) {
          apptEmailContext(appointmentId)
            .then((ctx) => {
              if (!ctx?.email) return;
              const oldDate = oldStartsAt
                ? new Date(oldStartsAt).toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric" })
                : "the original time";
              const oldTime = oldStartsAt
                ? new Date(oldStartsAt).toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit" })
                : null;
              return sendAppointmentRescheduled({
                customerId: rescheduleCustomerId,
                email: ctx.email,
                ownerName: ctx.ownerName,
                dogName: ctx.dogName,
                service: ctx.service,
                size: ctx.size,
                oldDate,
                oldTime,
                date: ctx.dateLabel,
                time: ctx.timeLabel,
                bookingId: appointmentId,
              });
            })
            .catch((e) => console.error("[appointments/actions] reschedule email failed:", e?.message));
        }
        return NextResponse.json({ ok: true, appointmentId, toStatus: "rescheduled", updated });
      }

      case "duplicate": {
        const appointmentId = String(payload.appointment_id || "");
        const origRows = await pgQuery<{
          customer_id: string | null; location_id: string | null; assigned_groomer_id: string | null;
          starts_at: string; ends_at: string; service_type_confirmed: string | null;
          deposit_amount: string | null; subtotal: string | null; total: string | null;
          currency: string | null; source_channel: string | null;
          internal_notes: string | null; customer_notes: string | null;
        }>(
          `SELECT customer_id, location_id, assigned_groomer_id, starts_at, ends_at,
                  service_type_confirmed, deposit_amount, subtotal, total, currency,
                  source_channel, internal_notes, customer_notes
             FROM public.crm_appointments WHERE id = $1::uuid AND tenant_id = $2`,
          [appointmentId, TENANT_ID()],
        );
        if (origRows.length === 0) {
          return NextResponse.json({ ok: false, error: "Appointment not found" }, { status: 404 });
        }
        const o = origRows[0];
        const cloneRows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_appointments
             (id, tenant_id, customer_id, location_id, assigned_groomer_id,
              appointment_number, starts_at, ends_at, status,
              service_type_confirmed, deposit_amount, subtotal, total, currency,
              source_channel, internal_notes, customer_notes, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4,
                  'APT-' || upper(to_hex(extract(epoch from now())::bigint)),
                  $5, $6, 'precheck',
                  $7, $8, $9, $10, $11, $12, $13, $14, now(), now())
           RETURNING id`,
          [TENANT_ID(), o.customer_id, o.location_id, o.assigned_groomer_id,
           o.starts_at, o.ends_at, o.service_type_confirmed,
           o.deposit_amount, o.subtotal, o.total, o.currency || "USD",
           o.source_channel, o.internal_notes, o.customer_notes],
        );
        const newId = cloneRows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: newId, afterData: { clonedFrom: appointmentId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, originalId: appointmentId, newAppointmentId: newId, message: "Appointment duplicated" });
      }

      case "send_reminder": {
        const appointmentId = String(payload.appointment_id || "");
        const updated = await pgExec(
          `UPDATE public.crm_appointments SET reminder_sent_at = now(), updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [appointmentId, TENANT_ID()],
        );
        // Log a customer-facing note about the reminder
        const custRows = await pgQuery<{ customer_id: string | null }>(
          `SELECT customer_id FROM public.crm_appointments WHERE id = $1::uuid AND tenant_id = $2`,
          [appointmentId, TENANT_ID()],
        );
        if (custRows[0]?.customer_id) {
          await logCustomerNote({
            customerId: custRows[0].customer_id,
            body: `Appointment reminder sent for ${appointmentId.slice(0, 8)}.`,
            noteType: "appointment",
          });
        }
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: appointmentId, afterData: { reminderSent: true, updated }, actorUserId: actorId, ipAddress: ip });

        // Actually SEND the branded reminder email — fire-and-forget.
        let reminderSent = false;
        if (custRows[0]?.customer_id) {
          try {
            const ctx = await apptEmailContext(appointmentId);
            if (ctx?.email) {
              const result = await sendAppointmentReminder({
                customerId: custRows[0].customer_id,
                email: ctx.email,
                ownerName: ctx.ownerName,
                dogName: ctx.dogName,
                service: ctx.service,
                size: ctx.size,
                date: ctx.dateLabel,
                time: ctx.timeLabel,
                bookingId: appointmentId,
              });
              reminderSent = result.ok;
            }
          } catch (e: any) {
            console.error("[appointments/actions] reminder email failed:", e?.message);
          }
        }
        return NextResponse.json({ ok: true, appointmentId, updated, reminderSent, message: reminderSent ? "Reminder email sent" : "Reminder logged (no email on file)" });
      }

      case "follow_up": {
        const appointmentId = String(payload.appointment_id || "");
        const noteBody = payload.note ? String(payload.note) : "Follow-up call needed for this appointment.";
        // crm_notes.note_type CHECK allows: internal, customer_visible, appointment, pet_handling, system
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_notes (id, tenant_id, customer_id, appointment_id, note_type, body, is_pinned)
           SELECT gen_random_uuid(), $1, customer_id, $2::uuid, 'appointment', $3, false
             FROM public.crm_appointments WHERE id = $2::uuid AND tenant_id = $1
           RETURNING id`,
          [TENANT_ID(), appointmentId, noteBody],
        );
        const noteId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_notes", recordId: noteId, afterData: { appointmentId, noteBody: noteBody.slice(0, 80) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, noteId, appointmentId, message: "Follow-up logged" });
      }

      case "add_to_waitlist": {
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const petId = payload.pet_id ? String(payload.pet_id) : null;
        const serviceId = payload.service_id ? String(payload.service_id) : null;
        const preferredDate = payload.preferred_date ? String(payload.preferred_date) : null;
        const notes = payload.notes ? String(payload.notes) : null;
        if (!customerId) {
          return NextResponse.json({ ok: false, error: "customer_id is required" }, { status: 400 });
        }
        // crm_waitlist columns: requested_start_at (not preferred_date), priority NOT NULL
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_waitlist
             (id, tenant_id, customer_id, pet_id, service_id, requested_start_at,
              notes, status, priority, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4::uuid, $5::timestamptz,
                   $6, 'waiting', 5, now(), now())
           RETURNING id`,
          [TENANT_ID(), customerId, petId, serviceId, preferredDate, notes],
        );
        const waitlistId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_waitlist", recordId: waitlistId, afterData: { customerId, petId, serviceId, preferredDate }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, waitlistId, customerId, message: "Added to waitlist" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[appointments/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
