import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery, pgExec } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/crm/appointments — list appointments with JOINs for
// customer name, groomer name, location name, pet names, service names.
// Optional ?status= filter, ?startDate= / ?endDate= range filter.
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const status = req.nextUrl.searchParams.get("status") || "";
    const startDate = req.nextUrl.searchParams.get("startDate") || "";
    const endDate = req.nextUrl.searchParams.get("endDate") || "";

    let sql = `
      SELECT
        a.id, a.tenant_id, a.customer_id, a.location_id, a.assigned_groomer_id,
        a.appointment_number, a.starts_at, a.ends_at, a.checked_in_at,
        a.started_at, a.completed_at, a.status, a.cancellation_reason,
        a.no_show_reason, a.service_type_confirmed, a.payment_method_confirmed,
        a.deposit_amount::text, a.subtotal::text, a.tax_total::text,
        a.total::text, a.amount_paid::text, a.outstanding_amount::text,
        a.currency, a.source_channel, a.booking_outcome,
        a.reminder_sent_at, a.pickup_notification_sent_at,
        a.processed_payment_sent_at, a.thank_you_sent_at,
        a.internal_notes, a.customer_notes, a.created_at, a.updated_at,
        -- Joined fields
        COALESCE(c.preferred_name, c.first_name || ' ' || c.last_name, 'Unknown') AS customer_name,
        s.display_name AS groomer_name,
        l.name AS location_name
      FROM public.crm_appointments a
      LEFT JOIN public.crm_customers c ON c.id = a.customer_id
      LEFT JOIN public.crm_staff s ON s.id = a.assigned_groomer_id
      LEFT JOIN public.crm_locations l ON l.id = a.location_id
      WHERE a.tenant_id = $1
    `;
    const params: (string | number)[] = [TENANT_ID()];
    let pIdx = 2;

    if (status) {
      sql += ` AND a.status = $${pIdx++}`;
      params.push(status);
    }
    if (startDate) {
      sql += ` AND a.starts_at >= $${pIdx++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND a.starts_at <= $${pIdx++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY a.starts_at DESC LIMIT 200`;

    const appointments = await pgQuery(sql, params);

    // Fetch pet names + service names for each appointment in a single query
    const apptIds = appointments.map((a: any) => a.id);
    let petNamesMap: Record<string, string[]> = {};
    let serviceNamesMap: Record<string, string[]> = {};

    if (apptIds.length > 0) {
      const petRows = await pgQuery(
        `SELECT ap.appointment_id, p.name AS pet_name
         FROM public.crm_appointment_pets ap
         JOIN public.crm_pets p ON p.id = ap.pet_id
         WHERE ap.appointment_id = ANY($1::uuid[])`,
        [apptIds],
      );
      for (const r of petRows) {
        (petNamesMap[r.appointment_id] ||= []).push(r.pet_name);
      }

      const svcRows = await pgQuery(
        `SELECT aps.appointment_id, svc.name AS service_name
         FROM public.crm_appointment_services aps
         JOIN public.crm_services svc ON svc.id = aps.service_id
         WHERE aps.appointment_id = ANY($1::uuid[])`,
        [apptIds],
      );
      for (const r of svcRows) {
        (serviceNamesMap[r.appointment_id] ||= []).push(r.service_name);
      }
    }

    const enriched = appointments.map((a: any) => ({
      ...a,
      pet_names: petNamesMap[a.id]?.join(", ") || null,
      service_names: serviceNamesMap[a.id]?.join(", ") || null,
    }));

    return NextResponse.json({ appointments: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/admin/crm/appointments — update status, assign groomer, etc.
export async function PATCH(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const body = await req.json();
    const { id, status, assigned_groomer_id, internal_notes, customer_notes } = body;

    if (!id) return NextResponse.json({ error: "Appointment id required." }, { status: 400 });

    const updates: string[] = [];
    const params: (string | null)[] = [];
    let pIdx = 1;

    if (status !== undefined) {
      updates.push(`status = $${pIdx++}`);
      params.push(status);
      // Record status history
      await pgExec(
        `INSERT INTO public.crm_appointment_status_history (id, tenant_id, appointment_id, to_status, changed_at)
         VALUES (gen_random_uuid(), $1, $2::uuid, $3, now())`,
        [TENANT_ID(), id, status],
      );
    }
    if (assigned_groomer_id !== undefined) {
      updates.push(`assigned_groomer_id = $${pIdx++}`);
      params.push(assigned_groomer_id || null);
    }
    if (internal_notes !== undefined) {
      updates.push(`internal_notes = $${pIdx++}`);
      params.push(internal_notes);
    }
    if (customer_notes !== undefined) {
      updates.push(`customer_notes = $${pIdx++}`);
      params.push(customer_notes);
    }

    if (updates.length === 0) return NextResponse.json({ error: "No fields to update." }, { status: 400 });

    updates.push(`updated_at = now()`);
    params.push(id);

    const affected = await pgExec(
      `UPDATE public.crm_appointments SET ${updates.join(", ")} WHERE id = $${pIdx}::uuid AND tenant_id = $${pIdx + 1}`,
      [...params, TENANT_ID()],
    );

    return NextResponse.json({ ok: true, affected });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
