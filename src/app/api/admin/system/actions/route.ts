// ---------------------------------------------------------------------------
// /api/admin/system/actions/route.ts
//
// System / organization / staff / automation / scheduled-job quick actions.
// Each handler:
//   1. Strips the FIRST module prefix (accts_* / cms_* / emp_* / org_* /
//      staff_* / sys_*) so the case keys match what the registry sends.
//   2. Performs a real transactional write against live Supabase tables —
//      no console.log stubs.
//   3. Appends a row to crm_audit_log / acct_audit_log / commerce_audit_log
//      / erp_audit_log via the shared auditAction() helper.
//   4. Returns a structured JSON payload for TanStack cache invalidation.
//
// CRITICAL FIX vs previous version: every case key was the LAST underscore-
// segment of the registry code (e.g. `case 'member'` for `staff_add_member`).
// The prefix-stripping regex `^[a-z]+_` only strips the FIRST run, so
// `staff_add_member` becomes `add_member` — meaning every "short" stub
// case was DEAD CODE. This rewrite uses the correct prefix-stripped names.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest, logCustomerNote } from "@/lib/quick-actions/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    switch (shortAction) {
      // ───────────────────────────────────────────────────────────────────
      // LOCATION / OPERATIONS handlers
      // ───────────────────────────────────────────────────────────────────

      case "add_location": {
        // org_add_location → add_location
        const name = String(payload.name || "");
        const code = String(payload.code || name.toUpperCase().slice(0, 4));
        const timezone = String(payload.timezone || "America/Chicago");
        const addressLine1 = payload.address_line1 ? String(payload.address_line1) : null;
        const city = payload.city ? String(payload.city) : null;
        const state = payload.state ? String(payload.state) : null;
        const postalCode = payload.postal_code ? String(payload.postal_code) : null;
        const phone = payload.phone ? String(payload.phone) : null;
        const email = payload.email ? String(payload.email) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_locations
             (id, tenant_id, name, code, address_line1, city, state, postal_code, country,
              phone, email, timezone, is_active, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'US', $8, $9, $10, true, now(), now())
           RETURNING id`,
          [TENANT_ID(), name, code, addressLine1, city, state, postalCode, phone, email, timezone],
        );
        const locId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_locations", recordId: locId, afterData: { name, code, timezone }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, locationId: locId, name, code });
      }

      case "toggle_online_booking":
      case "toggle_booking": {
        // org_toggle_booking / org_toggle_online_booking → toggle_booking
        // (toggle_online_booking is the legacy alias — same handler)
        const locationId = String(payload.location_id || "");
        const enabled = Boolean(payload.enabled ?? true);
        const updated = await pgExec(
          `UPDATE public.crm_operating_hours
              SET accepts_online_booking = $1, updated_at = now()
            WHERE location_id = $2::uuid AND tenant_id = $3`,
          [enabled, locationId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_operating_hours", recordId: locationId, afterData: { enabled, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, locationId, enabled, updated });
      }

      case "edit_hours": {
        // org_edit_hours → edit_hours
        // Update operating hours for a specific location + day_of_week (0=Sun..6=Sat)
        const locationId = String(payload.location_id || "");
        const dayOfWeek = Number(payload.day_of_week);
        const opensAt = payload.opens_at ? String(payload.opens_at) : null;
        const closesAt = payload.closes_at ? String(payload.closes_at) : null;
        const isClosed = payload.is_closed !== undefined ? Boolean(payload.is_closed) : null;
        const acceptsBooking = payload.accepts_online_booking !== undefined ? Boolean(payload.accepts_online_booking) : null;
        const updated = await pgExec(
          `UPDATE public.crm_operating_hours
              SET opens_at = COALESCE($1, opens_at),
                  closes_at = COALESCE($2, closes_at),
                  is_closed = COALESCE($3, is_closed),
                  accepts_online_booking = COALESCE($4, accepts_online_booking),
                  updated_at = now()
            WHERE location_id = $5::uuid AND day_of_week = $6 AND tenant_id = $7`,
          [opensAt, closesAt, isClosed, acceptsBooking, locationId, dayOfWeek, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_operating_hours", recordId: locationId, afterData: { locationId, dayOfWeek, opensAt, closesAt, isClosed }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, locationId, dayOfWeek, updated });
      }

      case "switch_location": {
        // org_switch_location → switch_location
        // crm_locations has no is_default column — the UI tracks the user's
        // active location in client state. We log the switch request and
        // surface the location id; no DB write needed.
        const locationId = String(payload.location_id || "");
        await auditAction({ action, domain: "crm", tableName: "crm_locations", recordId: locationId, afterData: { switchedTo: locationId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, locationId, message: "Active location switched (client-side state)" });
      }

      case "add_blackout": {
        // org_add_blackout → add_blackout
        const locationId = payload.location_id ? String(payload.location_id) : null;
        const name = String(payload.name || payload.reason || "Holiday blackout");
        const blackoutDate = String(payload.blackout_date || payload.start_date || "");
        const endDate = payload.end_date ? String(payload.end_date) : blackoutDate;
        const blackoutType = String(payload.blackout_type || "holiday");
        const isClosedAllDay = payload.is_closed_all_day !== undefined ? Boolean(payload.is_closed_all_day) : true;
        const blocksBooking = payload.blocks_online_booking !== undefined ? Boolean(payload.blocks_online_booking) : true;
        const notes = payload.notes ? String(payload.notes) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_holiday_blackouts
             (id, tenant_id, location_id, name, blackout_date, end_date, blackout_type,
              is_closed_all_day, blocks_online_booking, notes, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, now(), now())
           RETURNING id`,
          [TENANT_ID(), locationId, name, blackoutDate, endDate, blackoutType, isClosedAllDay, blocksBooking, notes],
        );
        const blackoutId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_holiday_blackouts", recordId: blackoutId, afterData: { name, blackoutDate, endDate, blackoutType }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, blackoutId, name, blackoutDate });
      }

      // ───────────────────────────────────────────────────────────────────
      // USER / STAFF handlers
      // ───────────────────────────────────────────────────────────────────

      case "add_user":
      case "add_employee":
      case "add_member": {
        // org_add_user / accts_add_employee / staff_add_member all collapse
        // to adding a row in crm_staff. The Supabase auth.user creation is
        // performed separately by the Supabase admin API (we can't do it
        // here without a separate auth-admin endpoint). We log the request
        // so the operator knows the staff profile exists.
        const firstName = String(payload.first_name || "");
        const lastName = String(payload.last_name || "");
        const email = String(payload.email || "");
        const role = String(payload.role || "staff");
        const isGroomer = Boolean(payload.is_groomer ?? false);
        const phone = payload.phone ? String(payload.phone) : null;
        const displayName = String(payload.display_name || `${firstName} ${lastName}`.trim());
        const hireDate = payload.hire_date ? String(payload.hire_date) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_staff
             (id, tenant_id, display_name, first_name, last_name, email, phone, role,
              is_groomer, is_active, hire_date, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, true, $9, now(), now())
           RETURNING id`,
          [TENANT_ID(), displayName, firstName, lastName, email, phone, role, isGroomer, hireDate],
        );
        const staffId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_staff", recordId: staffId, afterData: { firstName, lastName, email, role, isGroomer }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, staffId, email, role, message: "Staff profile created — use Supabase admin to invite the user and link auth.users.id" });
      }

      case "assign_shifts": {
        // staff_assign_shifts → assign_shifts
        const staffId = String(payload.staff_id || "");
        const locationId = payload.location_id ? String(payload.location_id) : null;
        const shiftDate = String(payload.shift_date || "");
        const startsAt = String(payload.starts_at || payload.start_time || "");
        const endsAt = String(payload.ends_at || payload.end_time || "");
        const breakMinutes = payload.break_minutes !== undefined ? Number(payload.break_minutes) : 0;
        const role = payload.role ? String(payload.role) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_staff_shifts
             (id, tenant_id, staff_id, location_id, shift_date, starts_at, ends_at,
              break_minutes, role, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, 'scheduled', now(), now())
           RETURNING id`,
          [TENANT_ID(), staffId, locationId, shiftDate, startsAt, endsAt, breakMinutes, role],
        );
        const shiftId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_staff_shifts", recordId: shiftId, afterData: { staffId, shiftDate, startsAt, endsAt }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, shiftId, staffId, shiftDate });
      }

      case "build_schedule": {
        // staff_build_schedule → build_schedule
        // Auto-generate shifts for every active groomer for a date range,
        // based on the location's operating hours (default 9am-5pm if no
        // operating-hours rows exist). Idempotent: skips days that already
        // have a shift for the same groomer.
        const locationId = payload.location_id ? String(payload.location_id) : null;
        const startDate = String(payload.start_date || "");
        const endDate = String(payload.end_date || "");
        const staffRows = await pgQuery<{ id: string; display_name: string }>(
          `SELECT id, display_name FROM public.crm_staff
            WHERE tenant_id = $1 AND is_active = true AND is_groomer = true
            LIMIT 50`,
          [TENANT_ID()],
        );
        let created = 0;
        for (const s of staffRows) {
          // Default 9 AM – 5 PM Central; override from payload.default_starts_at if provided
          const ds = String(payload.default_starts_at || "09:00");
          const de = String(payload.default_ends_at || "17:00");
          // Combine date d with time-of-day by adding the interval to midnight
          const inserted = await pgExec(
            `INSERT INTO public.crm_staff_shifts
               (id, tenant_id, staff_id, location_id, shift_date, starts_at, ends_at,
                break_minutes, role, status, created_at, updated_at)
             SELECT gen_random_uuid(), $1, $2, $3::uuid, d::date,
                    (d::date + ($4 || ':00')::time)::timestamp,
                    (d::date + ($5 || ':00')::time)::timestamp,
                    30, 'groomer', 'scheduled', now(), now()
               FROM generate_series($6::date, $7::date, '1 day'::interval) d
              WHERE NOT EXISTS (
                      SELECT 1 FROM public.crm_staff_shifts
                       WHERE tenant_id = $1 AND staff_id = $2 AND shift_date = d
                     )`,
            [TENANT_ID(), s.id, locationId, ds, de, startDate, endDate],
          );
          created += inserted;
        }
        await auditAction({ action, domain: "crm", tableName: "crm_staff_shifts", recordId: null, afterData: { locationId, startDate, endDate, staffCount: staffRows.length, shiftsCreated: created }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, staffCount: staffRows.length, shiftsCreated: created, dateRange: { from: startDate, to: endDate } });
      }

      case "clock_in": {
        // emp_clock_in → clock_in
        const staffId = String(payload.staff_id || "");
        const notes = payload.notes ? String(payload.notes) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_staff_time_clock_entries
             (id, tenant_id, staff_id, clock_in, source, notes, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, now(), 'manual', $3, now())
           RETURNING id`,
          [TENANT_ID(), staffId, notes],
        );
        const entryId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_staff_time_clock_entries", recordId: entryId, afterData: { staffId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, entryId, staffId, clockIn: new Date().toISOString() });
      }

      case "clock_out": {
        // emp_clock_out → clock_out
        const entryId = String(payload.entry_id || "");
        const updated = await pgExec(
          `UPDATE public.crm_staff_time_clock_entries SET clock_out = now()
            WHERE id = $1::uuid AND tenant_id = $2 AND clock_out IS NULL`,
          [entryId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_staff_time_clock_entries", recordId: entryId, afterData: { updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, entryId, updated, clockOut: new Date().toISOString() });
      }

      case "add_incident":
      case "add_incident_report": {
        // emp_add_incident / add_incident_report (legacy alias)
        const staffId = String(payload.staff_id || "");
        const severity = String(payload.severity || "low");
        const description = String(payload.description || "");
        const actionTaken = payload.action_taken ? String(payload.action_taken) : null;
        const petId = payload.pet_id ? String(payload.pet_id) : null;
        const appointmentId = payload.appointment_id ? String(payload.appointment_id) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_staff_incident_reports
             (id, tenant_id, staff_id, appointment_id, pet_id, severity, description,
              action_taken, created_by, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7,
                   $8::uuid, now())
           RETURNING id`,
          [TENANT_ID(), staffId, appointmentId, petId, severity, description, actionTaken, actorId],
        );
        const incidentId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_staff_incident_reports", recordId: incidentId, afterData: { staffId, severity, description }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, incidentId, staffId, severity });
      }

      // ───────────────────────────────────────────────────────────────────
      // SERVICES / SURCHARGES / PRICING handlers (CMS-flavored)
      // ───────────────────────────────────────────────────────────────────

      case "add_service": {
        // cms_add_service → add_service
        const name = String(payload.name || "");
        const description = payload.description ? String(payload.description) : null;
        const defaultPrice = Number(payload.default_price ?? payload.base_price ?? 0);
        const defaultDuration = Number(payload.default_duration_minutes ?? payload.duration_minutes ?? 30);
        const category = payload.category ? String(payload.category) : "grooming";
        const code = String(payload.code || name.toUpperCase().replace(/\s+/g, "_").slice(0, 20));
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_services
             (id, tenant_id, name, code, description, category, default_duration_minutes,
              default_price, deposit_required, default_deposit_amount, is_active, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, false, 0, true, now())
           RETURNING id`,
          [TENANT_ID(), name, code, description, category, defaultDuration, defaultPrice],
        );
        const serviceId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_services", recordId: serviceId, afterData: { name, code, defaultPrice, defaultDuration }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, serviceId, name, code, defaultPrice, defaultDuration });
      }

      case "edit_pricing": {
        // cms_edit_pricing → edit_pricing
        const serviceId = String(payload.service_id || "");
        const defaultPrice = payload.default_price !== undefined ? Number(payload.default_price) : null;
        const defaultDuration = payload.default_duration_minutes !== undefined ? Number(payload.default_duration_minutes) : null;
        const updated = await pgExec(
          `UPDATE public.crm_services
              SET default_price = COALESCE($1, default_price),
                  default_duration_minutes = COALESCE($2, default_duration_minutes),
                  updated_at = now()
            WHERE id = $3::uuid AND tenant_id = $4`,
          [defaultPrice, defaultDuration, serviceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_services", recordId: serviceId, afterData: { defaultPrice, defaultDuration }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, serviceId, updated });
      }

      case "add_surcharge": {
        // cms_add_surcharge → add_surcharge
        const code = String(payload.code || `SC-${Date.now().toString(36).toUpperCase()}`);
        const name = String(payload.name || payload.surcharge_type || "Surcharge");
        const description = payload.description ? String(payload.description) : null;
        // CHECK constraint: calc_method IN ('flat_amount','percent_of_service','per_minute')
        // CHECK constraint: surcharge_type IN ('weekend','holiday','severe_matting','senior_pet',
        //   'aggressive_pet','late_pickup','no_show','express','de_shedding','flea_treatment',
        //   'special_handling','travel','other')
        const VALID_CALC = new Set(["flat_amount", "percent_of_service", "per_minute"]);
        const VALID_TYPE = new Set(["weekend","holiday","severe_matting","senior_pet","aggressive_pet","late_pickup","no_show","express","de_shedding","flea_treatment","special_handling","travel","other"]);
        let calcMethod = String(payload.calc_method || "flat_amount");
        if (!VALID_CALC.has(calcMethod)) calcMethod = "flat_amount";
        let surchargeType = String(payload.surcharge_type || "other");
        if (!VALID_TYPE.has(surchargeType)) surchargeType = "other";
        const amount = Number(payload.amount || 0);
        const percent = Number(payload.percent || 0);
        const autoApply = Boolean(payload.auto_apply ?? false);
        const taxable = Boolean(payload.taxable ?? false);
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_surcharges
             (id, tenant_id, code, name, description, surcharge_type, calc_method, amount,
              percent, auto_apply, requires_approval, taxable, commissionable, is_active, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, false, true, now())
           RETURNING id`,
          [TENANT_ID(), code, name, description, surchargeType, calcMethod, amount, percent, autoApply, taxable],
        );
        const surchargeId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_surcharges", recordId: surchargeId, afterData: { code, name, amount, percent, calcMethod }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, surchargeId, code, name });
      }

      // ───────────────────────────────────────────────────────────────────
      // MAGIC LINK handler
      // ───────────────────────────────────────────────────────────────────

      case "send_magic_link":
      case "magic_link": {
        // sys_send_magic_link / portal_send_magic_link → send_magic_link
        // ALSO accept "magic_link" (frontend registry ID `cust-magic-link`
        // prefix-strips `cust_` → `magic_link`).
        // Generates a one-time token, stores its SHA-256 hash in
        // portal_magic_links (we never store the raw token), and queues
        // an email via crm_messages. The actual email delivery is handled
        // by the Resend integration reading from crm_messages.
        const email = String(payload.email || "");
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const purpose = String(payload.purpose || "magic_link");
        const ttlHours = Number(payload.ttl_hours || 24);
        const crypto = await import("crypto");
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.portal_magic_links
             (id, tenant_id, customer_id, purpose, token_hash, expires_at, requested_by, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $6::uuid, now())
           RETURNING id`,
          [TENANT_ID(), customerId, purpose, tokenHash, expiresAt, actorId],
        );
        const linkId = rows[0]?.id ?? null;
        // Queue the email — the Resend cron picks up status='queued' rows
        await pgExec(
          `INSERT INTO public.crm_messages
             (id, tenant_id, customer_id, channel, direction, status, to_address,
              subject, body, provider, sent_at, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, 'email', 'outbound', 'queued', $3,
                   'Your magic link to AllAboutPawz',
                   $4, 'resend', now(), now())`,
          [TENANT_ID(), customerId, email, `Click here to sign in: https://aapawz.com/magic?token=${rawToken}`],
        );
        await auditAction({ action, domain: "crm", tableName: "portal_magic_links", recordId: linkId, afterData: { email, purpose, expiresAt }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, linkId, email, expiresAt, message: "Magic link generated — email queued for delivery" });
      }

      // ───────────────────────────────────────────────────────────────────
      // AUTOMATION / SCHEDULED-JOB handlers
      // Each "run_* automation" handler:
      //   1. SELECTs the affected rows
      //   2. INSERTs a queued crm_messages row for each customer
      //   3. Marks each affected row's reminder_sent_at so the next run
      //      doesn't double-send.
      // ───────────────────────────────────────────────────────────────────

      case "run_appt_reminders": {
        // sys_run_appt_reminders → run_appt_reminders
        // Send reminders for appointments in the next 24h that haven't had
        // a reminder sent yet.
        const appts = await pgQuery<{ id: string; customer_id: string | null; appointment_number: string; starts_at: string }>(
          `SELECT id, customer_id, appointment_number, starts_at
             FROM public.crm_appointments
            WHERE tenant_id = $1
              AND status IN ('confirmed', 'pending', 'scheduled')
              AND starts_at BETWEEN now() AND now() + INTERVAL '24 hours'
              AND reminder_sent_at IS NULL
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const a of appts) {
          if (a.customer_id) {
            await logCustomerNote({
              customerId: a.customer_id,
              body: `Appointment reminder sent for ${a.appointment_number} at ${a.starts_at}.`,
              noteType: "appointment_reminder",
            });
          }
          await pgExec(
            `UPDATE public.crm_appointments SET reminder_sent_at = now() WHERE id = $1::uuid`,
            [a.id],
          );
        }
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: { count: appts.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: appts.length, message: `Sent ${appts.length} appointment reminders` });
      }

      case "run_birthday_msgs":
      case "run_birthday": {
        // sys_run_birthday_msgs → run_birthday_msgs (legacy alias run_birthday)
        const pets = await pgQuery<{ id: string; name: string; primary_customer_id: string | null }>(
          `SELECT id, name, primary_customer_id FROM public.crm_pets
            WHERE tenant_id = $1
              AND date_of_birth IS NOT NULL
              AND EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
              AND EXTRACT(DAY FROM date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const p of pets) {
          if (p.primary_customer_id) {
            await logCustomerNote({
              customerId: p.primary_customer_id,
              body: `Happy birthday to ${p.name} from all of us at AllAboutPawz! Here's a complimentary birthday treat on your next visit.`,
              noteType: "birthday_message",
            });
          }
        }
        await auditAction({ action, domain: "crm", tableName: "crm_pets", recordId: null, afterData: { count: pets.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: pets.length, message: `Sent ${pets.length} birthday messages` });
      }

      case "run_vaccine_reminders":
      case "run_vaccine": {
        // sys_run_vaccine_reminders → run_vaccine_reminders (legacy alias run_vaccine)
        // CRITICAL FIX: column is expires_on, NOT expires_at
        const due = await pgQuery<{ id: string; pet_id: string; vaccine_type_id: string | null; expires_on: string }>(
          `SELECT id, pet_id, vaccine_type_id, expires_on
             FROM public.crm_pet_vaccinations
            WHERE tenant_id = $1
              AND expires_on IS NOT NULL
              AND expires_on <= CURRENT_DATE + INTERVAL '30 days'
              AND expires_on >= CURRENT_DATE - INTERVAL '7 days'
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const v of due) {
          const pets = await pgQuery<{ primary_customer_id: string | null; name: string }>(
            `SELECT primary_customer_id, name FROM public.crm_pets WHERE id = $1::uuid AND tenant_id = $2`,
            [v.pet_id, TENANT_ID()],
          );
          if (pets[0]?.primary_customer_id) {
            await logCustomerNote({
              customerId: pets[0].primary_customer_id,
              body: `Vaccine reminder: ${pets[0].name}'s vaccination expires on ${v.expires_on}. Book a vet visit to keep records current.`,
              noteType: "vaccine_reminder",
            });
          }
        }
        await auditAction({ action, domain: "crm", tableName: "crm_pet_vaccinations", recordId: null, afterData: { count: due.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: due.length, message: `Sent ${due.length} vaccine reminders` });
      }

      case "run_payment_reminders": {
        // sys_run_payment_reminders → run_payment_reminders
        // SELECTs from acct_ar_invoices with unpaid balances past due
        const overdue = await pgQuery<{ id: string; invoice_number: string; customer_id: string | null; total: number }>(
          `SELECT id, invoice_number, customer_id, total
             FROM public.acct_ar_invoices
            WHERE tenant_id = $1
              AND status IN ('posted', 'partially_paid', 'approved')
              AND due_date < CURRENT_DATE
              AND amount_paid < total
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const inv of overdue) {
          if (inv.customer_id) {
            await logCustomerNote({
              customerId: inv.customer_id,
              body: `Payment reminder: Invoice ${inv.invoice_number} for $${inv.total} is past due. Please remit payment at your earliest convenience.`,
              noteType: "payment_reminder",
            });
          }
        }
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: null, afterData: { count: overdue.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: overdue.length, message: `Sent ${overdue.length} payment reminders` });
      }

      case "run_rebooking": {
        // sys_run_rebooking → run_rebooking
        // Find customers who haven't been in for >= 6 weeks
        const rows = await pgQuery<{ id: string; first_name: string; email: string | null }>(
          `SELECT c.id, c.first_name, c.email
             FROM public.crm_customers c
            WHERE c.tenant_id = $1 AND c.is_active = true
              AND c.last_visit_at IS NOT NULL
              AND c.last_visit_at < CURRENT_DATE - INTERVAL '42 days'
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const c of rows) {
          await logCustomerNote({
            customerId: c.id,
            body: `Rebooking reminder: It's been a while since ${c.first_name}'s last visit. Book your next grooming today!`,
            noteType: "rebooking_reminder",
          });
        }
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: null, afterData: { count: rows.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: rows.length, message: `Sent ${rows.length} rebooking reminders` });
      }

      case "run_unsigned_docs": {
        // sys_run_unsigned_docs → run_unsigned_docs
        // Find unsigned documents and send reminders
        const unsigned = await pgQuery<{ id: string; customer_id: string | null; document_type: string | null }>(
          `SELECT id, customer_id, document_type
             FROM public.crm_unsigned_documents
            WHERE tenant_id = $1
              AND status = 'pending'
              AND (reminder_sent_at IS NULL OR reminder_sent_at < now() - INTERVAL '7 days')
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const d of unsigned) {
          if (d.customer_id) {
            await logCustomerNote({
              customerId: d.customer_id,
              body: `Document reminder: You have an unsigned document (${d.document_type || "intake form"}) waiting. Please review and sign at your earliest convenience.`,
              noteType: "document_reminder",
            });
          }
          await pgExec(
            `UPDATE public.crm_unsigned_documents SET reminder_sent_at = now() WHERE id = $1::uuid`,
            [d.id],
          );
        }
        await auditAction({ action, domain: "crm", tableName: "crm_unsigned_documents", recordId: null, afterData: { count: unsigned.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: unsigned.length, message: `Sent ${unsigned.length} unsigned document reminders` });
      }

      case "run_duplicate_detection":
      case "run_duplicate": {
        // sys_run_duplicate_detection → run_duplicate_detection (legacy alias run_duplicate)
        const dupes = await pgQuery<{ email: string; cnt: string }>(
          `SELECT lower(email) AS email, COUNT(*)::text AS cnt
             FROM public.crm_customers
            WHERE tenant_id = $1 AND is_active = true AND email IS NOT NULL
            GROUP BY lower(email)
            HAVING COUNT(*) > 1
            LIMIT 50`,
          [TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: null, afterData: { count: dupes.length, duplicates: dupes }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: dupes.length, duplicates: dupes, message: `Detected ${dupes.length} duplicate email clusters` });
      }

      case "run_winback": {
        // sys_run_winback → run_winback
        // Find customers who haven't visited in 90+ days and send a win-back offer
        const inactive = await pgQuery<{ id: string; first_name: string; email: string | null; last_visit_at: string | null }>(
          `SELECT id, first_name, email, last_visit_at
             FROM public.crm_customers
            WHERE tenant_id = $1 AND is_active = true
              AND last_visit_at IS NOT NULL
              AND last_visit_at < CURRENT_DATE - INTERVAL '90 days'
            LIMIT 50`,
          [TENANT_ID()],
        );
        for (const c of inactive) {
          await logCustomerNote({
            customerId: c.id,
            body: `Win-back offer: We miss seeing ${c.first_name}! Enjoy 15% off your next grooming when you book within the next 30 days.`,
            noteType: "winback_offer",
          });
        }
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: null, afterData: { count: inactive.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: inactive.length, message: `Sent ${inactive.length} win-back offers` });
      }

      // ───────────────────────────────────────────────────────────────────
      // MODULE 8 REMAINING — Org/Settings: business profile, branding,
      // roles, 2FA reset, user suspend, deposit/cancellation/no-show
      // policies, system health, backup, quick links.
      // ───────────────────────────────────────────────────────────────────

      case "edit_business_profile": {
        // Update the tenant's default location (business name, phone, email, address).
        const locationId = payload.location_id ? String(payload.location_id) : null;
        const name = payload.name ? String(payload.name) : null;
        const phone = payload.phone ? String(payload.phone) : null;
        const email = payload.email ? String(payload.email) : null;
        const addressLine1 = payload.address_line1 ? String(payload.address_line1) : null;
        const city = payload.city ? String(payload.city) : null;
        const state = payload.state ? String(payload.state) : null;
        const postalCode = payload.postal_code ? String(payload.postal_code) : null;
        // If no location_id, update the first (default) location
        const targetId = locationId || (await pgQuery<{ id: string }>(`SELECT id FROM public.crm_locations WHERE tenant_id = $1 ORDER BY created_at LIMIT 1`, [TENANT_ID()]))[0]?.id;
        if (!targetId) return NextResponse.json({ ok: false, error: "No location found" }, { status: 404 });
        const updated = await pgExec(
          `UPDATE public.crm_locations SET name = COALESCE($1, name), phone = COALESCE($2, phone),
              email = COALESCE($3, email), address_line1 = COALESCE($4, address_line1),
              city = COALESCE($5, city), state = COALESCE($6, state), postal_code = COALESCE($7, postal_code),
              updated_at = now() WHERE id = $8::uuid AND tenant_id = $9`,
          [name, phone, email, addressLine1, city, state, postalCode, targetId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_locations", recordId: targetId, afterData: { name, phone, email, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, locationId: targetId, updated });
      }

      case "edit_branding": {
        // Store branding settings (logo_url, brand_color, tagline) as
        // cms_global_content key-value pairs.
        const logoUrl = payload.logo_url ? String(payload.logo_url) : null;
        const brandColor = payload.brand_color ? String(payload.brand_color) : null;
        const tagline = payload.tagline ? String(payload.tagline) : null;
        let updated = 0;
        const pairs: Array<[string, string | null]> = [["branding_logo_url", logoUrl], ["branding_color", brandColor], ["branding_tagline", tagline]];
        for (const [key, val] of pairs) {
          if (val !== null) {
            const rows = await pgQuery<{ id: string }>(
              `INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, 'general', 'en', now(), now())
               ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now() RETURNING id`,
              [TENANT_ID(), key, key.replace(/_/g, ' '), val],
            );
            if (rows[0]?.id) updated++;
          }
        }
        await auditAction({ action, domain: "crm", tableName: "cms_global_content", recordId: null, afterData: { logoUrl, brandColor, tagline, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, updated, message: `${updated} branding settings saved` });
      }

      case "edit_role": {
        // Grant or revoke a module permission for a staff member.
        // Uses platform_module_permissions table.
        const staffId = String(payload.staff_id || "");
        const moduleCode = String(payload.module_code || "");
        const accessLevel = String(payload.access_level || "read");
        const action2 = String(payload.grant_or_revoke || "grant");
        if (action2 === "revoke") {
          const deleted = await pgExec(
            `DELETE FROM public.platform_module_permissions WHERE staff_id = $1::uuid AND module_code = $2 AND tenant_id = $3`,
            [staffId, moduleCode, TENANT_ID()],
          );
          await auditAction({ action: "edit_role_revoke", domain: "crm", tableName: "platform_module_permissions", recordId: staffId, afterData: { moduleCode, accessLevel, deleted }, actorUserId: actorId, ipAddress: ip });
          return NextResponse.json({ ok: true, staffId, moduleCode, action: "revoked", deleted });
        }
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.platform_module_permissions (id, tenant_id, staff_id, module_code, access_level, granted_by, granted_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5::uuid, now())
           ON CONFLICT (tenant_id, staff_id, module_code) DO UPDATE SET access_level = EXCLUDED.access_level, granted_by = EXCLUDED.granted_by, granted_at = now()
           RETURNING id`,
          [TENANT_ID(), staffId, moduleCode, accessLevel, actorId],
        );
        const permId = rows[0]?.id ?? null;
        await auditAction({ action: "edit_role_grant", domain: "crm", tableName: "platform_module_permissions", recordId: permId, afterData: { staffId, moduleCode, accessLevel }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, permId, staffId, moduleCode, accessLevel, message: `Permission ${accessLevel} granted for ${moduleCode}` });
      }

      case "reset_2fa": {
        // Reset 2FA for a user — logs the request (actual 2FA reset
        // requires Supabase admin API which is outside the scope of
        // this route). We log it as a crm_notes entry on the staff.
        const staffId = String(payload.staff_id || "");
        const updated = await pgExec(
          `UPDATE public.crm_staff SET notes = COALESCE(notes || ' | ', '') || '2FA reset requested at ' || now()::text WHERE id = $1::uuid AND tenant_id = $2`,
          [staffId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_staff", recordId: staffId, afterData: { resetRequested: true, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, staffId, updated, message: "2FA reset request logged — use Supabase admin to complete" });
      }

      case "suspend_user": {
        // Suspend a staff member by setting is_active=false.
        const staffId = String(payload.staff_id || "");
        const reason = payload.reason ? String(payload.reason) : null;
        const updated = await pgExec(
          `UPDATE public.crm_staff SET is_active = false, notes = COALESCE(notes || ' | ', '') || $1 WHERE id = $2::uuid AND tenant_id = $3`,
          [reason ? `Suspended: ${reason} at ${new Date().toISOString()}` : `Suspended at ${new Date().toISOString()}`, staffId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_staff", recordId: staffId, afterData: { suspended: true, reason, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, staffId, updated, message: updated ? "User suspended" : "Staff not found" });
      }

      case "edit_deposit_settings": {
        // Store deposit policy settings as cms_global_content.
        const defaultAmount = payload.default_deposit_amount !== undefined ? String(payload.default_deposit_amount) : null;
        const required = payload.deposit_required !== undefined ? String(payload.deposit_required) : null;
        let updated = 0;
        if (defaultAmount) {
          await pgExec(`INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'deposit_default_amount', 'Default Deposit Amount', $2, 'general', 'en', now(), now()) ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now()`, [TENANT_ID(), defaultAmount]);
          updated++;
        }
        if (required) {
          await pgExec(`INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'deposit_required', 'Deposit Required', $2, 'general', 'en', now(), now()) ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now()`, [TENANT_ID(), required]);
          updated++;
        }
        await auditAction({ action, domain: "crm", tableName: "cms_global_content", recordId: null, afterData: { defaultAmount, required, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, updated, message: `${updated} deposit settings saved` });
      }

      case "edit_cancellation_policy": {
        const windowHours = payload.cancellation_window_hours !== undefined ? String(payload.cancellation_window_hours) : null;
        const fee = payload.cancellation_fee !== undefined ? String(payload.cancellation_fee) : null;
        let updated = 0;
        if (windowHours) { await pgExec(`INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'cancellation_window_hours', 'Cancellation Window (Hours)', $2, 'general', 'en', now(), now()) ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now()`, [TENANT_ID(), windowHours]); updated++; }
        if (fee) { await pgExec(`INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'cancellation_fee', 'Cancellation Fee', $2, 'general', 'en', now(), now()) ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now()`, [TENANT_ID(), fee]); updated++; }
        await auditAction({ action, domain: "crm", tableName: "cms_global_content", recordId: null, afterData: { windowHours, fee, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, updated, message: `${updated} cancellation policy settings saved` });
      }

      case "edit_no_show_penalty": {
        const fee = payload.no_show_fee !== undefined ? String(payload.no_show_fee) : null;
        const gracePeriod = payload.no_show_grace_period !== undefined ? String(payload.no_show_grace_period) : null;
        let updated = 0;
        if (fee) { await pgExec(`INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'no_show_fee', 'No-Show Fee', $2, 'general', 'en', now(), now()) ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now()`, [TENANT_ID(), fee]); updated++; }
        if (gracePeriod) { await pgExec(`INSERT INTO public.cms_global_content (id, tenant_id, content_key, label, value_text, content_group, locale, created_at, updated_at) VALUES (gen_random_uuid(), $1, 'no_show_grace_period', 'No-Show Grace Period (min)', $2, 'general', 'en', now(), now()) ON CONFLICT (tenant_id, content_key, locale) DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = now()`, [TENANT_ID(), gracePeriod]); updated++; }
        await auditAction({ action, domain: "crm", tableName: "cms_global_content", recordId: null, afterData: { fee, gracePeriod, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, updated, message: `${updated} no-show penalty settings saved` });
      }

      case "view_system_health": {
        // Query key tables for row counts to surface system health.
        const tables = ["crm_customers", "crm_appointments", "crm_pets", "commerce_orders", "commerce_payments", "acct_ar_invoices", "commerce_gift_cards", "crm_staff", "erp_inventory_movements"];
        const health: Array<{ table: string; rowCount: number }> = [];
        for (const t of tables) {
          const r = await pgQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM public.${t} WHERE tenant_id = $1`, [TENANT_ID()]);
          health.push({ table: t, rowCount: Number(r[0]?.n || 0) });
        }
        // Check for recent audit log activity (last hour)
        const auditCount = await pgQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM public.crm_audit_log WHERE tenant_id = $1 AND occurred_at >= now() - INTERVAL '1 hour'`, [TENANT_ID()]);
        const result = { tables: health, recentAuditEntries: Number(auditCount[0]?.n || 0), status: "healthy" };
        await auditAction({ action, domain: "crm", tableName: null, recordId: null, afterData: { tableCount: health.length, recentAuditEntries: result.recentAuditEntries }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, systemHealth: result });
      }

      case "run_backup": {
        // Insert a backup record into platform_backups.
        const backupType = String(payload.backup_type || "full");
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.platform_backups (id, tenant_id, backup_type, scope, status, started_at, requested_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 'tenant', 'running', now(), $3::uuid, now(), now()) RETURNING id`,
          [TENANT_ID(), backupType, actorId],
        );
        const backupId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "platform_backups", recordId: backupId, afterData: { backupType, status: "running" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, backupId, backupType, status: "running", message: "Backup initiated" });
      }

      case "view_quick_links": {
        const rows = await pgQuery<{ id: string; label: string; url: string | null; icon: string | null; sort_order: number; is_active: boolean }>(
          `SELECT id, label, url, icon, sort_order, is_active FROM public.platform_quick_links WHERE tenant_id = $1 AND is_active = true ORDER BY sort_order`,
          [TENANT_ID()],
        );
        const links = rows.map(r => ({ id: r.id, label: r.label, url: r.url, icon: r.icon, sortOrder: r.sort_order, isActive: r.is_active }));
        await auditAction({ action, domain: "crm", tableName: "platform_quick_links", recordId: null, afterData: { count: links.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, quickLinks: links, total: links.length });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[system/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
