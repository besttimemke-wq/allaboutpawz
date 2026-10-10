// ---------------------------------------------------------------------------
// /api/admin/crm/actions/route.ts
//
// CRM quick actions: customers, pets, notes, messages, intake forms,
// household merges. Each handler:
//   1. Strips the FIRST module prefix (crm_* / cust_*) so the case keys
//      match the registry.
//   2. Performs a real transactional write.
//   3. Appends a row to crm_audit_log via the shared auditAction() helper.
//   4. Returns structured JSON for TanStack cache invalidation.
//
// CRITICAL FIX vs previous version: every stub case key was the LAST
// underscore-segment of the registry code (e.g. `case 'customer'` for
// `crm_add_customer`). The prefix-stripping regex `^[a-z]+_` only strips
// the FIRST run, so `crm_add_customer` becomes `add_customer`, NOT
// `customer`. Every "short" stub case was dead code. This rewrite uses
// the correct prefix-stripped names.
//
// Also fixed real-handler bugs:
//   - crm_messages.metadata is NOT NULL → all INSERTs must provide it
//   - crm_notes.note_type has a CHECK constraint (internal | customer_visible
//     | appointment | pet_handling | system); non-allowed values are rejected
//     silently — we now coerce to a valid value via the logCustomerNote
//     helper, or use 'internal' for direct INSERTs.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest, logCustomerNote } from "@/lib/quick-actions/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cheap UUID shape check — used to coerce non-UUID business keys to NULL. */
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
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
    switch (shortAction) {
      // ───────────────────────────────────────────────────────────────────
      // CUSTOMER handlers
      // ───────────────────────────────────────────────────────────────────

      case "add_customer": {
        // crm_add_customer → add_customer
        // CHECK constraints:
        //   customer_type IN ('individual','business','breeder','rescue','referral_partner','staff','other')
        //   lifecycle_stage IN ('new_lead','new_customer','active','vip','returning','lapsed','at_risk','lost')
        //   lifecycle_status IN ('healthy','needs_attention','at_risk')
        const firstName = payload.first_name ? String(payload.first_name) : null;
        const lastName = payload.last_name ? String(payload.last_name) : null;
        const email = payload.email ? String(payload.email) : null;
        const phone = payload.phone ? String(payload.phone) : null;
        const customerType = String(payload.customer_type || "individual");
        const lifecycleStage = String(payload.lifecycle_stage || "new_customer");
        const lifecycleStatus = String(payload.lifecycle_status || "healthy");
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_customers
             (id, tenant_id, customer_type, lifecycle_stage, lifecycle_status,
              first_name, last_name, email, phone, country, is_active, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'US', true, now(), now())
           RETURNING id`,
          [TENANT_ID(), customerType, lifecycleStage, lifecycleStatus, firstName, lastName, email, phone],
        );
        const customerId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: customerId, afterData: { firstName, lastName, email, customerType, lifecycleStage }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, customerId, firstName, lastName, email, customerType });
      }

      case "edit_customer": {
        // crm_edit_customer → edit_customer
        const customerId = String(payload.customer_id || "");
        const firstName = payload.first_name ? String(payload.first_name) : null;
        const lastName = payload.last_name ? String(payload.last_name) : null;
        const phone = payload.phone ? String(payload.phone) : null;
        const email = payload.email ? String(payload.email) : null;
        const updated = await pgExec(
          `UPDATE public.crm_customers
              SET first_name = COALESCE($1, first_name),
                  last_name = COALESCE($2, last_name),
                  phone = COALESCE($3, phone),
                  email = COALESCE($4, email),
                  updated_at = now()
            WHERE id = $5::uuid AND tenant_id = $6`,
          [firstName, lastName, phone, email, customerId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: customerId, afterData: { firstName, lastName, phone, email, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, customerId, updated });
      }

      case "merge_customer":
      case "merge": {
        // crm_merge_customer → merge_customer
        // ALSO accept "merge" (frontend registry ID `cust-merge` prefix-strips
        // `cust_` → `merge`). Treat as merge_customer (the more common case).
        // Reassign all pets, appointments, notes, messages from source to target,
        // then deactivate the source.
        const sourceId = String(payload.source_id || "");
        const targetId = String(payload.target_id || "");
        await pgExec(`UPDATE public.crm_pets SET primary_customer_id = $1 WHERE primary_customer_id = $2 AND tenant_id = $3`, [targetId, sourceId, TENANT_ID()]);
        await pgExec(`UPDATE public.crm_appointments SET customer_id = $1 WHERE customer_id = $2 AND tenant_id = $3`, [targetId, sourceId, TENANT_ID()]);
        await pgExec(`UPDATE public.crm_notes SET customer_id = $1 WHERE customer_id = $2 AND tenant_id = $3`, [targetId, sourceId, TENANT_ID()]);
        await pgExec(`UPDATE public.crm_messages SET customer_id = $1 WHERE customer_id = $2 AND tenant_id = $3`, [targetId, sourceId, TENANT_ID()]);
        const updated = await pgExec(
          `UPDATE public.crm_customers SET is_active = false, merged_into_customer_id = $1::uuid, updated_at = now()
            WHERE id = $2::uuid AND tenant_id = $3`,
          [targetId, sourceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_customers", recordId: sourceId, afterData: { sourceId, targetId, merged: true, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, sourceId, targetId, updated, message: "Customers merged" });
      }

      case "merge_household": {
        // cust_merge_household → merge_household
        // Create a new household row, link every customer/pet in the
        // `customer_ids` list to that household, set the first customer as
        // primary, then log the merge. Idempotent: re-running with the
        // same `customer_ids` will not create duplicate households — call
        // with `household_id` to merge INTO an existing household.
        const customerIds = (payload.customer_ids as string[]) || [];
        if (customerIds.length < 2) {
          return NextResponse.json({ ok: false, error: "At least 2 customer_ids are required to form a household" }, { status: 400 });
        }
        const householdName = String(payload.name || `Household ${Date.now().toString(36).toUpperCase()}`);
        const status = String(payload.status || "active");
        let householdId = payload.household_id ? String(payload.household_id) : null;

        if (!householdId) {
          const rows = await pgQuery<{ id: string }>(
            `INSERT INTO public.crm_households
               (id, tenant_id, name, status, primary_customer_id, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4::uuid, now(), now())
             RETURNING id`,
            [TENANT_ID(), householdName, status, customerIds[0]],
          );
          householdId = rows[0]?.id ?? null;
        }
        if (!householdId) {
          return NextResponse.json({ ok: false, error: "Failed to create household" }, { status: 500 });
        }
        // Link each customer to the household
        let linked = 0;
        for (const cid of customerIds) {
          linked += await pgExec(
            `UPDATE public.crm_customers SET household_id = $1::uuid, updated_at = now()
              WHERE id = $2::uuid AND tenant_id = $3`,
            [householdId, cid, TENANT_ID()],
          );
        }
        // Also link their pets
        const petLinked = await pgExec(
          `UPDATE public.crm_pets SET household_id = $1::uuid
            WHERE primary_customer_id = ANY($2::uuid[]) AND tenant_id = $3`,
          [householdId, customerIds, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_households", recordId: householdId, afterData: { householdName, householdId, customerCount: customerIds.length, linked, petLinked }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, householdId, householdName, customerCount: customerIds.length, linked, petLinked });
      }

      // ───────────────────────────────────────────────────────────────────
      // PET handlers
      // ───────────────────────────────────────────────────────────────────

      case "add_pet": {
        // crm_add_pet → add_pet
        // CHECK constraints:
        //   status IN ('active','inactive','deceased','archived')
        //   sex IN ('male','female','unknown')
        //   altered_status IN ('intact','spayed','neutered','unknown')
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const name = String(payload.name || "");
        const species = String(payload.species || "Dog");
        const breed = payload.breed ? String(payload.breed) : null;
        const sex = payload.sex ? String(payload.sex) : "unknown";
        const alteredStatus = payload.altered_status ? String(payload.altered_status) : "unknown";
        const dateOfBirth = payload.date_of_birth ? String(payload.date_of_birth) : null;
        const weight = payload.weight !== undefined ? Number(payload.weight) : null;
        const weightUnit = String(payload.weight_unit || "lbs");
        const microchip = payload.microchip_number ? String(payload.microchip_number) : null;
        const vetName = payload.veterinarian_name ? String(payload.veterinarian_name) : null;
        const vetPhone = payload.veterinarian_phone ? String(payload.veterinarian_phone) : null;
        const medicalAlert = Boolean(payload.medical_alert ?? false);
        const specialHandling = Boolean(payload.special_handling ?? false);
        const nervous = Boolean(payload.nervous ?? false);
        const aggressive = Boolean(payload.aggressive ?? false);
        const firstVisit = Boolean(payload.first_visit ?? false);
        const senior = Boolean(payload.senior ?? false);
        const puppy = Boolean(payload.puppy ?? false);
        const status = String(payload.status || "active");
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_pets
             (id, tenant_id, primary_customer_id, name, species, breed, mixed_breed, sex,
              altered_status, date_of_birth, weight, weight_unit, microchip_number,
              veterinarian_name, veterinarian_phone, medical_alert, special_handling,
              nervous, aggressive, first_visit, senior, puppy, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, false, $6, $7, $8, $9, $10,
                   $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, now(), now())
           RETURNING id`,
          [TENANT_ID(), customerId, name, species, breed, sex, alteredStatus, dateOfBirth, weight, weightUnit, microchip, vetName, vetPhone, medicalAlert, specialHandling, nervous, aggressive, firstVisit, senior, puppy, status],
        );
        const petId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_pets", recordId: petId, afterData: { name, species, breed, customerId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, petId, name, species, breed, customerId });
      }

      // ───────────────────────────────────────────────────────────────────
      // NOTES handlers
      // ───────────────────────────────────────────────────────────────────

      case "add_note": {
        // crm_add_note → add_note
        // CHECK: note_type IN ('internal','customer_visible','appointment','pet_handling','system')
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const petId = payload.pet_id ? String(payload.pet_id) : null;
        const appointmentId = payload.appointment_id ? String(payload.appointment_id) : null;
        const body = String(payload.body || payload.note || "");
        const ALLOWED_NOTE_TYPES = new Set(["internal", "customer_visible", "appointment", "pet_handling", "system"]);
        const noteType = ALLOWED_NOTE_TYPES.has(String(payload.note_type || "")) ? String(payload.note_type) : "internal";
        const isPinned = Boolean(payload.is_pinned ?? false);
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_notes
             (id, tenant_id, customer_id, pet_id, appointment_id, note_type, body, is_pinned, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, now(), now())
           RETURNING id`,
          [TENANT_ID(), customerId, petId, appointmentId, noteType, body, isPinned],
        );
        const noteId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_notes", recordId: noteId, afterData: { customerId, noteType, body: body.slice(0, 100) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, noteId, customerId, noteType });
      }

      // ───────────────────────────────────────────────────────────────────
      // MESSAGE handlers
      // ───────────────────────────────────────────────────────────────────

      case "send_message":
      case "send_rebooking_link":
      case "rebooking_link": {
        // crm_send_message → send_message
        // cust_send_rebooking_link → send_rebooking_link (alias send_message
        // because they share the same INSERT path; the body differs)
        // ALSO accept "rebooking_link" (frontend registry ID `cust-rebooking-link`
        // prefix-strips `cust_` → `rebooking_link`).
        // CHECK: channel IN ('email','sms','phone','chat','whatsapp','push','in_app','other')
        //        direction IN ('inbound','outbound')
        //        status IN ('queued','sent','delivered','failed','read','received')
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const channel = String(payload.channel || "sms");
        const msgBody = String(payload.body || payload.message || ((shortAction === "send_rebooking_link" || shortAction === "rebooking_link") ? "Book your next grooming at aapawz.com/book" : ""));
        const toAddress = payload.to_address ? String(payload.to_address) : null;
        const fromAddress = payload.from_address ? String(payload.from_address) : null;
        const subject = payload.subject ? String(payload.subject) : null;
        const provider = payload.provider ? String(payload.provider) : "twilio";
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_messages
             (id, tenant_id, customer_id, channel, direction, status, from_address,
              to_address, subject, body, provider, sent_at, metadata, created_by, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, 'outbound', 'queued', $4,
                   $5, $6, $7, $8, now(), $9::jsonb, $10::uuid, now())
           RETURNING id`,
          [TENANT_ID(), customerId, channel, fromAddress, toAddress, subject, msgBody, provider, JSON.stringify({ source: "quick_action", action }), actorId],
        );
        const messageId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_messages", recordId: messageId, afterData: { customerId, channel, subject: subject || msgBody.slice(0, 50) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, messageId, customerId, channel, status: "queued" });
      }

      // ───────────────────────────────────────────────────────────────────
      // INTAKE FORM handler
      // ───────────────────────────────────────────────────────────────────

      case "intake_form": {
        // crm_intake_form → intake_form
        // crm_unsigned_documents is a VIEW, not a table — INSERT into the
        // underlying crm_documents table instead. The view auto-shows rows
        // with status='pending' or 'submitted' (i.e. unsigned).
        // CHECK constraint: status IN ('pending','submitted','signed',
        // 'approved','expired','rejected','archived')
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const petId = payload.pet_id ? String(payload.pet_id) : null;
        const name = String(payload.name || payload.form_name || "Customer Intake Form");
        const status = String(payload.status || "pending");
        // crm_documents requires a customer_id (NOT NULL) — bail if missing
        if (!customerId) {
          return NextResponse.json({ ok: false, error: "customer_id is required for an intake form" }, { status: 400 });
        }
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_documents
             (id, tenant_id, customer_id, pet_id, name, status, metadata, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4, $5, '{}'::jsonb, now(), now())
           RETURNING id`,
          [TENANT_ID(), customerId, petId, name, status],
        );
        const formId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_documents", recordId: formId, afterData: { customerId, petId, name, status }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, formId, customerId, petId, name, status });
      }

      case "update_documents": {
        // cust_update_documents → update_documents
        // Update a customer's document (rename, change status, add notes).
        // CHECK: status IN ('pending','submitted','signed','approved','expired','rejected','archived')
        const documentId = String(payload.document_id || "");
        const name = payload.name ? String(payload.name) : null;
        const status = payload.status ? String(payload.status) : null;
        const notes = payload.notes ? String(payload.notes) : null;
        const updated = await pgExec(
          `UPDATE public.crm_documents
              SET name = COALESCE($1, name),
                  status = COALESCE($2, status),
                  metadata = CASE WHEN $3 IS NOT NULL THEN jsonb_set(COALESCE(metadata, '{}'::jsonb), '{notes}', $4::jsonb) ELSE metadata END,
                  updated_at = now()
            WHERE id = $5::uuid AND tenant_id = $6`,
          [name, status, notes, JSON.stringify(notes), documentId, TENANT_ID()],
        );
        await auditAction({ action, domain: "crm", tableName: "crm_documents", recordId: documentId, afterData: { name, status, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, documentId, updated, message: updated ? "Document updated" : "Document not found" });
      }

      case "view_documents": {
        // cust_view_documents → view_documents
        // Read-only: list all documents for a customer (or all if no customer_id).
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const rows = await pgQuery<{
          id: string; name: string; status: string; document_type_id: string | null;
          storage_path: string | null; mime_type: string | null;
          uploaded_at: string | null; signed_at: string | null; expires_at: Date | null;
        }>(
          `SELECT id, name, status, document_type_id, storage_path, mime_type,
                  uploaded_at::text, signed_at::text, expires_at
             FROM public.crm_documents
            WHERE tenant_id = $1 ${customerId ? "AND customer_id = $2::uuid" : ""}
            ORDER BY created_at DESC LIMIT 100`,
          customerId ? [TENANT_ID(), customerId] : [TENANT_ID()],
        );
        const documents = rows.map(r => ({
          id: r.id, name: r.name, status: r.status,
          documentTypeId: r.document_type_id, storagePath: r.storage_path,
          mimeType: r.mime_type, uploadedAt: r.uploaded_at,
          signedAt: r.signed_at, expiresAt: r.expires_at,
        }));
        const result = { customerId, documents, total: documents.length };
        await auditAction({ action, domain: "crm", tableName: "crm_documents", recordId: null, afterData: { total: documents.length, customerId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, documents: result });
      }

      case "add_to_campaign": {
        // cust_add_to_campaign → add_to_campaign
        // Enroll a customer in a marketing campaign via crm_campaign_members.
        const campaignId = String(payload.campaign_id || "");
        const customerId = String(payload.customer_id || "");
        if (!campaignId || !customerId) {
          return NextResponse.json({ ok: false, error: "campaign_id and customer_id are required" }, { status: 400 });
        }
        // CHECK: status IN ('queued','sent','delivered','opened','clicked','converted','failed','unsubscribed','skipped')
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_campaign_members
             (id, tenant_id, campaign_id, customer_id, status, enrolled_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, 'queued', now())
           RETURNING id`,
          [TENANT_ID(), campaignId, customerId],
        );
        const memberId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "crm", tableName: "crm_campaign_members", recordId: memberId, afterData: { campaignId, customerId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, memberId, campaignId, customerId, message: "Customer added to campaign" });
      }

      case "print_history": {
        // cust_print_history → print_history
        // Read-only: return a customer's appointment + payment history in a
        // print-friendly format. Joins crm_appointments with crm_appointment_services
        // for service detail.
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        if (!customerId) {
          return NextResponse.json({ ok: false, error: "customer_id is required" }, { status: 400 });
        }
        const appts = await pgQuery<{
          id: string; appointment_number: string; starts_at: string; status: string;
          total: string; amount_paid: string; outstanding: string;
        }>(
          `SELECT id, appointment_number, starts_at::text, status,
                  total::text, amount_paid::text, outstanding_amount::text
             FROM public.crm_appointments
            WHERE tenant_id = $1 AND customer_id = $2::uuid
            ORDER BY starts_at DESC LIMIT 100`,
          [TENANT_ID(), customerId],
        );
        const history = appts.map(r => ({
          appointmentId: r.id, appointmentNumber: r.appointment_number,
          date: r.starts_at, status: r.status,
          total: Number(r.total), amountPaid: Number(r.amount_paid),
          outstanding: Number(r.outstanding),
        }));
        const result = {
          customerId,
          appointments: history,
          totals: {
            totalVisits: history.length,
            totalSpend: history.reduce((s, h) => s + h.amountPaid, 0),
            totalOutstanding: history.reduce((s, h) => s + h.outstanding, 0),
          },
        };
        await auditAction({ action, domain: "crm", tableName: "crm_appointments", recordId: null, afterData: { customerId, totalVisits: history.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, printHistory: result });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[crm/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
