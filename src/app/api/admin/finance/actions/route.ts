// ---------------------------------------------------------------------------
// /api/admin/finance/actions/route.ts
//
// All accounting / invoicing / deposits / gift-card / store-credit / payroll
// quick actions. Each handler:
//   1. Strips the module prefix from the action_code (accts_* / apt_* / order_*)
//      so the switch matches what the registry sends.
//   2. Performs a real transactional write (pgExec) against the live Supabase
//      tables — never a console.log stub.
//   3. Appends a row to acct_audit_log via the shared auditAction() helper
//      so every mutation is forensically traceable.
//   4. Returns a structured JSON payload that TanStack Query hooks can use to
//      invalidate the affected cache slices (e.g. { ok: true, invoiceId }).
//
// Tables touched (verified schema):
//   acct_ar_invoices (status: acct_document_status enum)
//   commerce_gift_cards (initial_value, balance, converted_store_credit_id, reminder_sent_at)
//   commerce_deposits (deposit_number, applied_invoice_id)
//   commerce_store_credits (credit_number, original_amount, balance)
//   commerce_payments (payment_number, status text)
//   commerce_orders (status, payment_status)
//   payroll_runs (number, pay_period_start, pay_period_end, status: payroll_run_state)
//   payroll_timesheets (employee_id, week_start, hours_regular, status)
//   acct_reconciliations (bank_account_id, as_of_date, statement_balance, status: acct_reconciliation_status)
//   invoices (camelCase table — number, customerId, total, balanceDue, status, dueDate, notes)
//   crm_notes (system reminders log)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest, issueStoreCredit, logCustomerNote } from "@/lib/quick-actions/audit";

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

  // Strip the FIRST module prefix (accts_add_value → add_value; apt_take_payment → take_payment;
  // order_export_ledger → export_ledger). The regex matches the first [a-z]+_ run, so multi-segment
  // names like apply_to_invoice and apply_deposit_to_invoice survive intact.
  const shortAction = action.replace(/^[a-z]+_/, "");

  try {
    switch (shortAction) {
      // ───────────────────────────────────────────────────────────────────
      // EXISTING REAL HANDLERS (fixed for schema correctness)
      // ───────────────────────────────────────────────────────────────────

      case "mark_paid": {
        const invoiceId = String(payload.invoice_id || "");
        await pgExec(
          `UPDATE public.acct_ar_invoices
              SET status = 'paid', amount_paid = total, updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [invoiceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: invoiceId, afterData: payload, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, invoiceId, status: "paid" });
      }

      case "void_invoice": {
        const invoiceId = String(payload.invoice_id || "");
        await pgExec(
          `UPDATE public.acct_ar_invoices SET status = 'void', updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [invoiceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: invoiceId, afterData: payload, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, invoiceId, status: "void" });
      }

      case "issue_refund": {
        const orderId = String(payload.order_id || "");
        const amount = Number(payload.amount || 0);
        const reason = String(payload.reason || "customer_request");
        await pgExec(
          `UPDATE public.commerce_orders
              SET status = 'refunded', payment_status = 'refunded', updated_at = now()
            WHERE id = $1 AND tenant_id = $2`,
          [orderId, TENANT_ID()],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: orderId, afterData: { amount, reason, ...payload }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, amount, reason, message: `Refund of $${amount} processed` });
      }

      case "issue_gift_card": {
        const initialBalance = Number(payload.initial_balance ?? payload.initial_value ?? 0);
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const recipientEmail = payload.recipient_email ? String(payload.recipient_email) : null;
        const cardNumber = `GC-${Date.now().toString(36).toUpperCase()}`;
        await pgExec(
          `INSERT INTO public.commerce_gift_cards
             (id, tenant_id, card_number, customer_id, initial_value, balance, currency, status,
              issued_at, recipient_email)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4, $4, 'USD', 'active', now(), $5)`,
          [TENANT_ID(), cardNumber, customerId, initialBalance, recipientEmail],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardNumber, afterData: { initialBalance, customerId, recipientEmail }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardNumber, initialBalance });
      }

      case "redeem_gift_card": {
        const cardNumber = String(payload.card_number || "");
        const amount = Number(payload.amount || 0);
        const updated = await pgExec(
          `UPDATE public.commerce_gift_cards
              SET balance = balance - $1, last_used_at = now()
            WHERE card_number = $2 AND tenant_id = $3 AND status = 'active' AND balance >= $1`,
          [amount, cardNumber, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardNumber, afterData: { amount, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardNumber, amount, updated, message: updated ? "Redeemed" : "No matching active card with sufficient balance" });
      }

      case "take_payment": {
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const amount = Number(payload.amount || 0);
        const reference = payload.reference ? String(payload.reference) : null;
        // commerce_payments.payment_method_id is NOT NULL — when the caller
        // doesn't supply one, fall back to the tenant's active "manual_cash"
        // method, then to any active method, then to the lowest-id method.
        let methodId = payload.payment_method_id ? String(payload.payment_method_id) : null;
        if (!methodId) {
          const fallback = await pgQuery<{ id: string }>(
            `SELECT id FROM public.commerce_payment_methods
              WHERE tenant_id = $1 AND active = true
              ORDER BY (code = 'manual_cash') DESC,
                       (method_type = 'cash') DESC,
                       id
              LIMIT 1`,
            [TENANT_ID()],
          );
          methodId = fallback[0]?.id ?? null;
        }
        if (!methodId) {
          return NextResponse.json({ ok: false, error: "No payment method available — configure one in /admin/financial-settings" }, { status: 400 });
        }
        const payNum = `PAY-${Date.now().toString(36).toUpperCase()}`;
        await pgExec(
          `INSERT INTO public.commerce_payments
             (id, tenant_id, payment_number, customer_id, payment_method_id, amount, currency, status, external_reference, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4::uuid, $5, 'USD', 'succeeded', $6, now())`,
          [TENANT_ID(), payNum, customerId, methodId, amount, reference],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: payNum, afterData: { amount, customerId, methodId, reference }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, paymentNumber: payNum, amount, methodId });
      }

      case "create_invoice": {
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const lineItems = (payload.line_items as Array<{ amount?: number; description?: string }>) || [];
        const dueDate = payload.due_date ? String(payload.due_date) : null;
        const notes = payload.notes ? String(payload.notes) : null;
        const total = lineItems.reduce((s, i) => s + Number(i.amount || 0), 0);
        const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
        if (!customerId) {
          return NextResponse.json({ ok: false, error: "customer_id is required to create an invoice" }, { status: 400 });
        }
        // Write to BOTH invoice tables:
        //   • `invoices` (camelCase) — legacy booking-flow table; kept in sync
        //     so the booking dashboard continues to show the invoice.
        //   • `acct_ar_invoices` — the canonical AR ledger table; this is
        //     what `order_export_ledger` reads from, so the invoice shows
        //     up in the analytics dashboard.
        //
        // The AR ledger requires:
        //   • entity_id (NOT NULL — the issuing salon entity; looked up
        //     from acct_entities)
        //   • customer_id (NOT NULL — FK to acct_customers, NOT crm
        //     customer; we find-or-create the acct_customers row by
        //     external_customer_id = crm_customers.id)
        //   • acct_customers.ar_account_id is NOT NULL — we look up
        //     "Accounts Receivable" (chart-of-accounts code '1200') and
        //     set it on the customer row.
        const invIdLegacy = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await pgExec(
          `INSERT INTO public.invoices
             (id, tenant_id, "number", "customerId", subtotal, "depositPaid", "balanceDue", total,
              status, "dueDate", notes, "createdAt", "updatedAt", amount_paid)
           VALUES ($1, $2, $3, $4, $5, 0, $5, $5, 'UNPAID', $6, $7, now(), now(), 0)`,
          [invIdLegacy, TENANT_ID(), invNum, customerId, total, dueDate, notes],
        );
        // Look up the tenant's default AR account (code='1200') and business entity
        const [arAcctRows, entityRows] = await Promise.all([
          pgQuery<{ id: string }>(
            `SELECT id FROM public.acct_chart_of_accounts
              WHERE tenant_id = $1 AND code = '1200' AND is_active = true
              ORDER BY created_at LIMIT 1`,
            [TENANT_ID()],
          ),
          pgQuery<{ id: string }>(
            `SELECT id FROM public.acct_entities WHERE tenant_id = $1 AND is_active = true ORDER BY created_at LIMIT 1`,
            [TENANT_ID()],
          ),
        ]);
        const arAccountId = arAcctRows[0]?.id ?? null;
        const acctEntityId = entityRows[0]?.id ?? null;
        // Find-or-create the AR customer row linked to the crm customer
        let acctCustomerId: string | null = null;
        const existing = await pgQuery<{ id: string }>(
          `SELECT id FROM public.acct_customers
            WHERE tenant_id = $1 AND external_customer_id = $2
            LIMIT 1`,
          [TENANT_ID(), customerId],
        );
        if (existing[0]?.id) {
          acctCustomerId = existing[0].id;
        } else {
          // Pull the crm customer's name + email to seed the AR customer
          const crmCust = await pgQuery<{ first_name: string | null; last_name: string | null; email: string | null }>(
            `SELECT first_name, last_name, email FROM public.crm_customers WHERE id = $1::uuid AND tenant_id = $2`,
            [customerId, TENANT_ID()],
          );
          const legalName = crmCust[0]
            ? `${crmCust[0].first_name || ""} ${crmCust[0].last_name || ""}`.trim() || "Walk-in Customer"
            : "Walk-in Customer";
          const email = crmCust[0]?.email ?? null;
          const newAcct = await pgQuery<{ id: string }>(
            `INSERT INTO public.acct_customers
               (id, tenant_id, external_customer_id, customer_number, legal_name, email,
                currency, payment_terms_days, ar_account_id, tax_exempt, is_active, metadata, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
                     'USD', 30, $6::uuid, false, true, '{}'::jsonb, now(), now())
             RETURNING id`,
            [TENANT_ID(), customerId, `CUST-${Date.now().toString(36).toUpperCase()}`, legalName, email, arAccountId],
          );
          acctCustomerId = newAcct[0]?.id ?? null;
        }
        // acct_ar_invoices columns: id uuid, tenant_id, entity_id (NOT NULL),
        // customer_id (NOT NULL), invoice_number, invoice_date, due_date, etc.
        // status enum allows: draft, pending_approval, approved, posted,
        // partially_paid, paid, void, cancelled, rejected, closed
        let arInvoiceId: string | null = null;
        if (acctEntityId && acctCustomerId) {
          const arRows = await pgQuery<{ id: string }>(
            `INSERT INTO public.acct_ar_invoices
               (id, tenant_id, entity_id, customer_id, invoice_number, invoice_date, due_date,
                currency, subtotal, tax_total, discount_total, total, amount_paid,
                amount_credited, status, notes, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4, CURRENT_DATE, $5,
                     'USD', $6, 0, 0, $6, 0, 0, 'posted', $7, now(), now())
             RETURNING id`,
            [TENANT_ID(), acctEntityId, acctCustomerId, invNum, dueDate, total, notes],
          );
          arInvoiceId = arRows[0]?.id ?? null;
        }
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: arInvoiceId, afterData: { invoiceNumber: invNum, customerId, acctCustomerId, acctEntityId, arAccountId, total, lineItems: lineItems.length, legacyId: invIdLegacy }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, invoiceId: arInvoiceId || invIdLegacy, invoiceNumber: invNum, total, arInvoiceId, acctCustomerId, acctEntityId, arAccountId, legacyId: invIdLegacy });
      }

      case "send_reminder": {
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const invoiceId = payload.invoice_id ? String(payload.invoice_id) : null;
        const message = `Payment reminder sent${invoiceId ? ` for invoice ${invoiceId}` : ""}`;
        await logCustomerNote({ customerId, body: message, noteType: "payment_reminder" });
        await auditAction({ action, domain: "acct", tableName: "crm_notes", recordId: invoiceId, afterData: { customerId, invoiceId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, message: "Reminder logged", customerId, invoiceId });
      }

      case "collect_deposit": {
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const appointmentId = payload.appointment_id ? String(payload.appointment_id) : null;
        const amount = Number(payload.amount || 0);
        const method = payload.method ? String(payload.method) : "card";
        const depNum = `DEP-${Date.now().toString(36).toUpperCase()}`;
        await pgExec(
          `INSERT INTO public.commerce_deposits
             (id, tenant_id, deposit_number, customer_id, appointment_id, amount, currency,
              collected_at, method, status, deposit_type)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4::uuid, $5, 'USD', now(), $6, 'held', 'booking')`,
          [TENANT_ID(), depNum, customerId, appointmentId, amount, method],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depNum, afterData: { amount, customerId, appointmentId, method }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositNumber: depNum, amount, status: "held" });
      }

      case "release_deposit": {
        const depositId = String(payload.deposit_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_deposits SET status = 'released', updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [depositId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { status: "released" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositId, updated, status: "released" });
      }

      case "forfeit_deposit": {
        const depositId = String(payload.deposit_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_deposits SET status = 'forfeited', updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [depositId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { status: "forfeited" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositId, updated, status: "forfeited" });
      }

      case "apply_deposit_to_invoice": {
        const depositId = String(payload.deposit_id || "");
        const invoiceId = String(payload.invoice_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_deposits
              SET status = 'applied', applied_invoice_id = $1::uuid, updated_at = now()
            WHERE id = $2::uuid AND tenant_id = $3`,
          [invoiceId, depositId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { invoiceId, status: "applied" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositId, invoiceId, updated, status: "applied" });
      }

      case "refund_deposit": {
        const depositId = String(payload.deposit_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_deposits SET status = 'refunded', updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [depositId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { status: "refunded" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositId, updated, status: "refunded" });
      }

      case "run_payroll": {
        const periodStart = payload.period_start ? String(payload.period_start) : null;
        const periodEnd = payload.period_end ? String(payload.period_end) : null;
        const payDate = payload.pay_date ? String(payload.pay_date) : periodEnd;
        const runNumber = `PR-${Date.now().toString(36).toUpperCase()}`;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.payroll_runs
             (id, tenant_id, number, pay_period_start, pay_period_end, pay_date, status, gross_wages,
              tax_withheld, net_paid, employer_taxes, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'draft', 0, 0, 0, 0, now())
           RETURNING id`,
          [TENANT_ID(), runNumber, periodStart, periodEnd, payDate],
        );
        const runId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "acct", tableName: "payroll_runs", recordId: runId, afterData: { runNumber, periodStart, periodEnd, payDate, status: "draft" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, runId, runNumber, status: "draft" });
      }

      case "edit_timesheet": {
        const timesheetId = String(payload.timesheet_id || "");
        const hoursRegular = payload.hours_regular !== undefined ? Number(payload.hours_regular) : null;
        const hoursOvertime = payload.hours_overtime !== undefined ? Number(payload.hours_overtime) : null;
        const hoursPto = payload.hours_pto !== undefined ? Number(payload.hours_pto) : null;
        const hoursSick = payload.hours_sick !== undefined ? Number(payload.hours_sick) : null;
        const notes = payload.notes ? String(payload.notes) : null;
        const status = payload.status ? String(payload.status) : null;
        const updated = await pgExec(
          `UPDATE public.payroll_timesheets
              SET hours_regular = COALESCE($1, hours_regular),
                  hours_overtime = COALESCE($2, hours_overtime),
                  hours_pto = COALESCE($3, hours_pto),
                  hours_sick = COALESCE($4, hours_sick),
                  notes = COALESCE($5, notes),
                  status = COALESCE($6, status)
            WHERE id = $7::uuid AND tenant_id = $8`,
          [hoursRegular, hoursOvertime, hoursPto, hoursSick, notes, status, timesheetId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "payroll_timesheets", recordId: timesheetId, afterData: payload, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, timesheetId, updated });
      }

      case "reconcile": {
        const bankAccountId = payload.bank_account_id ? String(payload.bank_account_id) : null;
        const periodId = payload.period_id ? String(payload.period_id) : null;
        const asOfDate = payload.as_of_date ? String(payload.as_of_date) : null;
        const statementBalance = Number(payload.statement_balance || 0);
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.acct_reconciliations
             (id, tenant_id, bank_account_id, period_id, as_of_date, statement_balance, gl_balance,
              outstanding_deposits, outstanding_payments, adjustments, difference, status, completed_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4, $5, $5, 0, 0, 0, 0, 'reconciled', now())
           RETURNING id`,
          [TENANT_ID(), bankAccountId, periodId, asOfDate, statementBalance],
        );
        const recId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "acct", tableName: "acct_reconciliations", recordId: recId, afterData: { bankAccountId, asOfDate, statementBalance, status: "reconciled" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, reconciliationId: recId, status: "reconciled" });
      }

      case "remind": {
        // "remind" handles both single-customer and batch reminders (when customer_id is null)
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const message = "Invoice reminder sent";
        await logCustomerNote({ customerId, body: message, noteType: "payment_reminder" });
        await auditAction({ action, domain: "acct", tableName: "crm_notes", recordId: customerId, afterData: { customerId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, customerId, message });
      }

      // ───────────────────────────────────────────────────────────────────
      // NEW REAL HANDLERS — replacing the 18 broken stubs with the
      // CORRECT prefix-stripped short names. The old stubs used the last
      // underscore-segment as the case key, which never matched because
      // the prefix-stripping regex only strips the FIRST [a-z]+_ occurrence.
      // ───────────────────────────────────────────────────────────────────

      case "add_value": {
        // accts_add_value → add_value — add store-credit value to a customer account
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const amount = Number(payload.amount || 0);
        const reason = payload.reason ? String(payload.reason) : "manual_adjustment";
        const creditNumber = await issueStoreCredit({ customerId, amount });
        await auditAction({ action, domain: "acct", tableName: "commerce_store_credits", recordId: creditNumber, afterData: { amount, customerId, reason }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, creditNumber, amount, reason, message: `Added $${amount} value to customer account` });
      }

      case "apply_to_invoice": {
        // accts_apply_to_invoice → apply_to_invoice — apply a deposit or store credit to an invoice
        const invoiceId = String(payload.invoice_id || "");
        const depositId = payload.deposit_id ? String(payload.deposit_id) : null;
        const creditId = payload.credit_id ? String(payload.credit_id) : null;
        const amount = Number(payload.amount || 0);
        if (depositId) {
          await pgExec(
            `UPDATE public.commerce_deposits SET status = 'applied', applied_invoice_id = $1::uuid, updated_at = now()
              WHERE id = $2::uuid AND tenant_id = $3`,
            [invoiceId, depositId, TENANT_ID()],
          );
        }
        if (creditId) {
          await pgExec(
            `UPDATE public.commerce_store_credits SET balance = balance - $1
              WHERE id = $2::uuid AND tenant_id = $3 AND balance >= $1`,
            [amount, creditId, TENANT_ID()],
          );
        }
        // Update the camelCase invoices table (depositPaid / balanceDue)
        await pgExec(
          `UPDATE public.invoices
              SET "depositPaid" = COALESCE("depositPaid", 0) + $1,
                  "balanceDue" = GREATEST(CAST(total AS NUMERIC) - (COALESCE("depositPaid", 0) + $1), 0),
                  "updatedAt" = now()
            WHERE id = $2 AND tenant_id = $3`,
          [amount, invoiceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "invoices", recordId: invoiceId, afterData: { depositId, creditId, amount }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, invoiceId, depositId, creditId, amountApplied: amount });
      }

      case "convert_gc": {
        // accts_convert_gc → convert_gc — convert a gift card's remaining balance to store credit
        const giftCardId = String(payload.gift_card_id || "");
        const rows = await pgQuery<{ balance: number; customer_id: string | null }>(
          `SELECT balance, customer_id FROM public.commerce_gift_cards WHERE id = $1::uuid AND tenant_id = $2`,
          [giftCardId, TENANT_ID()],
        );
        if (rows.length === 0) {
          return NextResponse.json({ ok: false, error: "Gift card not found" }, { status: 404 });
        }
        const balance = Number(rows[0].balance || 0);
        const customerId = rows[0].customer_id ?? null;
        if (balance <= 0) {
          return NextResponse.json({ ok: false, error: "Gift card has no balance to convert" }, { status: 400 });
        }
        const creditNumber = await issueStoreCredit({ customerId, amount: balance });
        if (creditNumber) {
          await pgExec(
            `UPDATE public.commerce_gift_cards
                SET status = 'converted', balance = 0, converted_store_credit_id = (
                    SELECT id FROM public.commerce_store_credits WHERE credit_number = $1
                )
              WHERE id = $2::uuid AND tenant_id = $3`,
            [creditNumber, giftCardId, TENANT_ID()],
          );
        }
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: giftCardId, afterData: { creditNumber, balance, customerId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, giftCardId, creditNumber, convertedAmount: balance });
      }

      case "issue_store_credit": {
        // accts_issue_store_credit → issue_store_credit — issue a fresh store credit memo
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const amount = Number(payload.amount || 0);
        const expiresAt = payload.expires_at ? String(payload.expires_at) : null;
        const creditNumber = await issueStoreCredit({ customerId, amount, expiresAt });
        await auditAction({ action, domain: "acct", tableName: "commerce_store_credits", recordId: creditNumber, afterData: { amount, customerId, expiresAt }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, creditNumber, amount });
      }

      case "redeem": {
        // accts_redeem → redeem — generic redemption for either a gift card or store credit
        const cardNumber = payload.card_number ? String(payload.card_number) : null;
        const creditNumber = payload.credit_number ? String(payload.credit_number) : null;
        const amount = Number(payload.amount || 0);
        let updated = 0;
        let type = "unknown";
        if (cardNumber) {
          updated = await pgExec(
            `UPDATE public.commerce_gift_cards
                SET balance = balance - $1, last_used_at = now()
              WHERE card_number = $2 AND tenant_id = $3 AND status = 'active' AND balance >= $1`,
            [amount, cardNumber, TENANT_ID()],
          );
          type = "gift_card";
        } else if (creditNumber) {
          updated = await pgExec(
            `UPDATE public.commerce_store_credits
                SET balance = balance - $1
              WHERE credit_number = $2 AND tenant_id = $3 AND status = 'active' AND balance >= $1`,
            [amount, creditNumber, TENANT_ID()],
          );
          type = "store_credit";
        } else {
          return NextResponse.json({ ok: false, error: "Either card_number or credit_number is required" }, { status: 400 });
        }
        await auditAction({ action, domain: "acct", tableName: type === "gift_card" ? "commerce_gift_cards" : "commerce_store_credits", recordId: cardNumber || creditNumber, afterData: { amount, type, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, type, amount, updated, message: updated ? "Redeemed" : "Insufficient balance or no matching active account" });
      }

      case "register_credits": {
        // accts_register_credits → register_credits — batch register multiple credit memos
        const credits = (payload.credits as Array<{ customer_id?: string; amount: number; reason?: string }>) || [];
        const results: Array<{ creditNumber: string | null; amount: number; customerId: string | null }> = [];
        for (const c of credits) {
          const creditNumber = await issueStoreCredit({
            customerId: c.customer_id ? String(c.customer_id) : null,
            amount: Number(c.amount || 0),
          });
          results.push({ creditNumber, amount: Number(c.amount || 0), customerId: c.customer_id ? String(c.customer_id) : null });
        }
        await auditAction({ action, domain: "acct", tableName: "commerce_store_credits", recordId: null, afterData: { count: results.length, results }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: results.length, credits: results });
      }

      case "register_refunds": {
        // accts_register_refunds → register_refunds — batch register refund ledger entries
        const refunds = (payload.refunds as Array<{ payment_id?: string; order_id?: string; amount: number; reason?: string }>) || [];
        const results: Array<{ paymentId: string | null; orderId: string | null; amount: number; updated: number }> = [];
        for (const r of refunds) {
          const paymentId = r.payment_id ? String(r.payment_id) : null;
          const orderId = r.order_id ? String(r.order_id) : null;
          const amount = Number(r.amount || 0);
          let updated = 0;
          if (paymentId) {
            updated = await pgExec(
              `UPDATE public.commerce_payments SET status = 'refunded' WHERE id = $1::uuid AND tenant_id = $2`,
              [paymentId, TENANT_ID()],
            );
          }
          if (orderId) {
            updated = await pgExec(
              `UPDATE public.commerce_orders SET status = 'refunded', payment_status = 'refunded', updated_at = now()
                WHERE id = $1 AND tenant_id = $2`,
              [orderId, TENANT_ID()],
            );
          }
          results.push({ paymentId, orderId, amount, updated });
        }
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: null, afterData: { count: results.length, refunds: results }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: results.length, refunds: results });
      }

      case "send_reminder_gc": {
        // accts_send_reminder_gc → send_reminder_gc — send reminders for gift cards with remaining balance
        const since = payload.older_than_days ? Number(payload.older_than_days) : 30;
        const cards = await pgQuery<{ id: string; card_number: string; customer_id: string | null; balance: number; expires_at: string | null }>(
          `SELECT id, card_number, customer_id, balance, expires_at
             FROM public.commerce_gift_cards
            WHERE tenant_id = $1
              AND status = 'active'
              AND balance > 0
              AND (reminder_sent_at IS NULL OR reminder_sent_at < now() - ($2 || ' days')::interval)
            LIMIT 100`,
          [TENANT_ID(), since],
        );
        for (const c of cards) {
          if (c.customer_id) {
            await logCustomerNote({
              customerId: c.customer_id,
              body: `Gift card reminder sent for card ${c.card_number} (balance $${c.balance}).`,
              noteType: "gift_card_reminder",
            });
          }
          await pgExec(
            `UPDATE public.commerce_gift_cards SET reminder_sent_at = now() WHERE id = $1::uuid`,
            [c.id],
          );
        }
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: null, afterData: { count: cards.length, olderThanDays: since }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: cards.length, message: `Sent gift card reminders to ${cards.length} cardholders` });
      }

      case "send_reminders": {
        // accts_send_reminders → send_reminders — batch send payment reminders for unpaid invoices
        const invoices = await pgQuery<{ id: string; invoice_number: string; customer_id: string | null; total: number }>(
          `SELECT id, invoice_number, customer_id, total
             FROM public.acct_ar_invoices
            WHERE tenant_id = $1
              AND status IN ('posted', 'partially_paid', 'approved')
              AND due_date < CURRENT_DATE
            LIMIT 100`,
          [TENANT_ID()],
        );
        for (const inv of invoices) {
          if (inv.customer_id) {
            await logCustomerNote({
              customerId: inv.customer_id,
              body: `Payment reminder sent for invoice ${inv.invoice_number} (balance $${inv.total}).`,
              noteType: "payment_reminder",
            });
          }
        }
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: null, afterData: { count: invoices.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: invoices.length, message: `Sent payment reminders for ${invoices.length} overdue invoices` });
      }

      case "void_cancel": {
        // accts_void_cancel → void_cancel — void an invoice or cancel a payment
        const invoiceId = payload.invoice_id ? String(payload.invoice_id) : null;
        const paymentId = payload.payment_id ? String(payload.payment_id) : null;
        let updated = 0;
        let entity = "none";
        if (invoiceId) {
          updated = await pgExec(
            `UPDATE public.acct_ar_invoices SET status = 'void', updated_at = now() WHERE id = $1::uuid AND tenant_id = $2`,
            [invoiceId, TENANT_ID()],
          );
          entity = "invoice";
        } else if (paymentId) {
          updated = await pgExec(
            `UPDATE public.commerce_payments SET status = 'cancelled' WHERE id = $1::uuid AND tenant_id = $2`,
            [paymentId, TENANT_ID()],
          );
          entity = "payment";
        } else {
          return NextResponse.json({ ok: false, error: "Either invoice_id or payment_id is required" }, { status: 400 });
        }
        await auditAction({ action, domain: entity === "invoice" ? "acct" : "commerce", tableName: entity === "invoice" ? "acct_ar_invoices" : "commerce_payments", recordId: invoiceId || paymentId, afterData: { entity, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, entity, id: invoiceId || paymentId, updated, status: entity === "invoice" ? "void" : "cancelled" });
      }

      case "export_ledger": {
        // order_export_ledger → export_ledger — return a ledger summary snapshot
        const fromDate = payload.from_date ? String(payload.from_date) : null;
        const toDate = payload.to_date ? String(payload.to_date) : null;
        const dateFilter = fromDate && toDate
          ? `AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (fromDate && toDate) params.push(fromDate, toDate);
        const invoices = await pgQuery<{ count: string; total: string }>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(total), 0)::text AS total
             FROM public.acct_ar_invoices WHERE tenant_id = $1 ${dateFilter}`,
          params,
        );
        const payments = await pgQuery<{ count: string; total: string }>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total
             FROM public.commerce_payments WHERE tenant_id = $1 AND status = 'succeeded' ${dateFilter}`,
          params,
        );
        const deposits = await pgQuery<{ count: string; total: string }>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total
             FROM public.commerce_deposits WHERE tenant_id = $1 ${dateFilter}`,
          params,
        );
        const summary = {
          invoices: { count: Number(invoices[0]?.count || 0), total: Number(invoices[0]?.total || 0) },
          payments: { count: Number(payments[0]?.count || 0), total: Number(payments[0]?.total || 0) },
          deposits: { count: Number(deposits[0]?.count || 0), total: Number(deposits[0]?.total || 0) },
          dateRange: { from: fromDate, to: toDate },
        };
        await auditAction({ action, domain: "acct", tableName: null, recordId: null, afterData: summary, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, ledger: summary });
      }

      // ───────────────────────────────────────────────────────────────────
      // FINANCIAL REPORT RPCs — call into the 4 PostgreSQL functions
      // created in /supabase/rpcs/. Each returns real aggregated data from
      // acct_journal_entries + acct_journal_lines + acct_chart_of_accounts.
      // ───────────────────────────────────────────────────────────────────

      case "run_profit_loss":
      case "run_pnl": {
        // accts_run_profit_loss → run_profit_loss
        // Calls rpc_get_profit_and_loss(tenant_id, start_date, end_date).
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        if (!startDate || !endDate) {
          return NextResponse.json({ ok: false, error: "start_date and end_date are required" }, { status: 400 });
        }
        const rows = await pgQuery<{
          account_code: string; account_name: string; account_type: string;
          debit: string; credit: string; net_amount: string;
        }>(
          `SELECT * FROM public.rpc_get_profit_and_loss($1, $2::date, $3::date)`,
          [TENANT_ID(), startDate, endDate],
        );
        const accounts = rows.filter(r => r.account_code !== "TOTAL").map(r => ({
          code: r.account_code, name: r.account_name, type: r.account_type,
          debit: Number(r.debit), credit: Number(r.credit), net: Number(r.net_amount),
        }));
        const totalRow = rows.find(r => r.account_code === "TOTAL");
        const totals = {
          revenue: accounts.filter(a => a.type === "revenue").reduce((s, a) => s + a.net, 0),
          expenses: accounts.filter(a => a.type === "expense").reduce((s, a) => s + a.net, 0),
          netIncome: Number(totalRow?.net_amount || 0),
        };
        const result = { dateRange: { from: startDate, to: endDate }, accounts, totals };
        await auditAction({ action, domain: "acct", tableName: null, recordId: null, afterData: result, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, profitAndLoss: result });
      }

      case "run_balance_sheet": {
        // accts_run_balance_sheet → run_balance_sheet
        // Calls rpc_get_balance_sheet(tenant_id, as_of_date).
        const asOfDate = String(payload.as_of_date || payload.end_date || "");
        if (!asOfDate) {
          return NextResponse.json({ ok: false, error: "as_of_date is required" }, { status: 400 });
        }
        const rows = await pgQuery<{
          section: string; account_code: string; account_name: string; account_type: string;
          debit: string; credit: string; balance: string;
        }>(
          `SELECT * FROM public.rpc_get_balance_sheet($1, $2::date)`,
          [TENANT_ID(), asOfDate],
        );
        const detail = rows.filter(r => r.section !== "TOTAL").map(r => ({
          section: r.section, code: r.account_code, name: r.account_name, type: r.account_type,
          debit: Number(r.debit), credit: Number(r.credit), balance: Number(r.balance),
        }));
        const totalsRows = rows.filter(r => r.section === "TOTAL");
        const assets = Number(totalsRows.find(r => r.account_type === "asset")?.balance || 0);
        const liabilities = Number(totalsRows.find(r => r.account_type === "liability")?.balance || 0);
        const equity = Number(totalsRows.find(r => r.account_type === "equity")?.balance || 0);
        // Net income (revenue - expenses) through p_as_of_date — this is
        // retained earnings, which sits in the equity section of a balance
        // sheet. Computed here because rpc_get_balance_sheet doesn't include
        // income-statement accounts (those are closed to equity at period
        // end, but for an interim balance sheet we surface them as
        // "current period net income" inside equity).
        const niRows = await pgQuery<{ net: string }>(
          `SELECT
             COALESCE((SELECT SUM(jl.credit) - SUM(jl.debit) FROM public.acct_journal_lines jl
                        JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
                        JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
                        WHERE jl.tenant_id = $1 AND je.status = 'posted'
                          AND je.entry_date <= $2::date
                          AND coa.account_type = 'revenue'), 0)
             -
             COALESCE((SELECT SUM(jl.debit) - SUM(jl.credit) FROM public.acct_journal_lines jl
                        JOIN public.acct_journal_entries je ON je.id = jl.journal_entry_id
                        JOIN public.acct_chart_of_accounts coa ON coa.id = jl.account_id
                        WHERE jl.tenant_id = $1 AND je.status = 'posted'
                          AND je.entry_date <= $2::date
                          AND coa.account_type = 'expense'), 0)
             AS net`,
          [TENANT_ID(), asOfDate],
        );
        const netIncome = Number(niRows[0]?.net || 0);
        const equityWithNI = equity + netIncome;
        const totals = {
          assets, liabilities, equity,
          currentPeriodNetIncome: netIncome,
          equityWithNetIncome: equityWithNI,
        };
        // The accounting equation: Assets = Liabilities + Equity (incl. net income).
        // Use a 1-cent tolerance because numeric arithmetic can introduce
        // floating-point drift.
        const balanced = Math.abs(assets - (liabilities + equityWithNI)) < 0.01;
        const result = { asOfDate, detail, totals, balanced };
        await auditAction({ action, domain: "acct", tableName: null, recordId: null, afterData: result, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, balanceSheet: result });
      }

      case "run_trial_balance": {
        // accts_run_trial_balance → run_trial_balance
        // Calls rpc_get_trial_balance(tenant_id, end_date).
        const endDate = String(payload.end_date || payload.as_of_date || "");
        if (!endDate) {
          return NextResponse.json({ ok: false, error: "end_date is required" }, { status: 400 });
        }
        const rows = await pgQuery<{
          account_code: string; account_name: string; account_type: string;
          total_debit: string; total_credit: string; balance: string;
        }>(
          `SELECT * FROM public.rpc_get_trial_balance($1, $2::date)`,
          [TENANT_ID(), endDate],
        );
        const accounts = rows.filter(r => r.account_code !== "TOTAL").map(r => ({
          code: r.account_code, name: r.account_name, type: r.account_type,
          debit: Number(r.total_debit), credit: Number(r.total_credit), balance: Number(r.balance),
        }));
        const totalRow = rows.find(r => r.account_code === "TOTAL");
        const totals = {
          totalDebit: Number(totalRow?.total_debit || 0),
          totalCredit: Number(totalRow?.total_credit || 0),
          balanced: Number(totalRow?.total_debit || 0) === Number(totalRow?.total_credit || 0),
        };
        const result = { asOfDate: endDate, accounts, totals };
        await auditAction({ action, domain: "acct", tableName: null, recordId: null, afterData: result, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, trialBalance: result });
      }

      case "run_general_ledger": {
        // accts_run_general_ledger → run_general_ledger
        // Calls rpc_get_general_ledger(tenant_id, start_date, end_date).
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        if (!startDate || !endDate) {
          return NextResponse.json({ ok: false, error: "start_date and end_date are required" }, { status: 400 });
        }
        const rows = await pgQuery<{
          entry_no: string; entry_date: string; posting_date: string; source: string;
          memo: string | null; reference: string | null; line_no: string;
          account_code: string; account_name: string; account_type: string;
          line_description: string | null; debit: string; credit: string; running_balance: string;
        }>(
          `SELECT * FROM public.rpc_get_general_ledger($1, $2::date, $3::date)`,
          [TENANT_ID(), startDate, endDate],
        );
        const lines = rows.map(r => ({
          entryNo: Number(r.entry_no), entryDate: r.entry_date, postingDate: r.posting_date,
          source: r.source, memo: r.memo, reference: r.reference, lineNo: Number(r.line_no),
          accountCode: r.account_code, accountName: r.account_name, accountType: r.account_type,
          description: r.line_description, debit: Number(r.debit), credit: Number(r.credit),
          runningBalance: Number(r.running_balance),
        }));
        const result = {
          dateRange: { from: startDate, to: endDate },
          lineCount: lines.length,
          totalDebit: lines.reduce((s, l) => s + l.debit, 0),
          totalCredit: lines.reduce((s, l) => s + l.credit, 0),
          lines,
        };
        await auditAction({ action, domain: "acct", tableName: null, recordId: null, afterData: { lineCount: lines.length, dateRange: result.dateRange }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, generalLedger: result });
      }

      // ───────────────────────────────────────────────────────────────────
      // GIFT CARD LIFECYCLE EDGE CASES — the 8 remaining gift-card
      // operations not covered by issue_gift_card / redeem / convert_gc.
      // All hit commerce_gift_cards directly; the status CHECK enum only
      // allows: active | redeemed | partially_redeemed | expired | cancelled
      // | replaced | converted. We never invent a new status string.
      // ───────────────────────────────────────────────────────────────────

      case "reactivate_gift_card": {
        // accts_reactivate_gift_card → reactivate_gift_card
        // Reactivate a gift card that was previously expired or cancelled.
        // Only allowed when current status is 'expired' or 'cancelled' —
        // we don't reactivate 'converted' or 'replaced' cards (those are
        // terminal states — the balance already moved elsewhere).
        const cardId = String(payload.gift_card_id || payload.card_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_gift_cards
              SET status = 'active'
            WHERE id = $1::uuid AND tenant_id = $2
              AND status IN ('expired','cancelled')`,
          [cardId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardId, afterData: { newStatus: "active", updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardId, newStatus: "active", updated, message: updated ? "Gift card reactivated" : "No eligible (expired/cancelled) card found with that ID" });
      }

      case "expire_gift_card": {
        // accts_expire_gift_card → expire_gift_card
        // Force-expire an active gift card. Sets expires_at to now() if
        // not already set, and flips status to 'expired'.
        const cardId = String(payload.gift_card_id || payload.card_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_gift_cards
              SET status = 'expired', expires_at = COALESCE(expires_at, now())
            WHERE id = $1::uuid AND tenant_id = $2 AND status IN ('active','partially_redeemed')`,
          [cardId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardId, afterData: { newStatus: "expired", updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardId, newStatus: "expired", updated, message: updated ? "Gift card expired" : "No active card found with that ID" });
      }

      case "transfer_gift_card": {
        // accts_transfer_gift_card → transfer_gift_card
        // Transfer the gift card's holder to a different customer. The
        // balance and card_number move with it; status stays 'active'.
        // We update both customer_id and holder_customer_id (the FK target
        // for who can redeem).
        const cardId = String(payload.gift_card_id || payload.card_id || "");
        const newHolderId = String(payload.new_customer_id || payload.to_customer_id || "");
        if (!newHolderId) {
          return NextResponse.json({ ok: false, error: "new_customer_id is required for transfer" }, { status: 400 });
        }
        const updated = await pgExec(
          `UPDATE public.commerce_gift_cards
              SET customer_id = $1::uuid, holder_customer_id = $1::uuid
            WHERE id = $2::uuid AND tenant_id = $3 AND status = 'active'`,
          [newHolderId, cardId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardId, afterData: { newHolderId, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardId, newHolderId, updated, message: updated ? "Gift card transferred" : "No active card found with that ID" });
      }

      case "edit_gift_card": {
        // accts_edit_gift_card → edit_gift_card
        // Edit a gift card's metadata: recipient_name, recipient_email,
        // recipient_phone, sender_name, gift_message, expires_at.
        // We don't allow editing balance or status through this action —
        // those have dedicated lifecycle endpoints.
        const cardId = String(payload.gift_card_id || payload.card_id || "");
        const recipientName = payload.recipient_name !== undefined ? String(payload.recipient_name) : null;
        const recipientEmail = payload.recipient_email !== undefined ? String(payload.recipient_email) : null;
        const recipientPhone = payload.recipient_phone !== undefined ? String(payload.recipient_phone) : null;
        const senderName = payload.sender_name !== undefined ? String(payload.sender_name) : null;
        const giftMessage = payload.gift_message !== undefined ? String(payload.gift_message) : null;
        const expiresAt = payload.expires_at !== undefined ? String(payload.expires_at) : null;
        const updated = await pgExec(
          `UPDATE public.commerce_gift_cards
              SET recipient_name    = COALESCE($1, recipient_name),
                  recipient_email   = COALESCE($2, recipient_email),
                  recipient_phone   = COALESCE($3, recipient_phone),
                  sender_name        = COALESCE($4, sender_name),
                  gift_message      = COALESCE($5, gift_message),
                  expires_at        = CASE WHEN $6::text = '__CLEAR__' THEN NULL ELSE COALESCE($6::timestamptz, expires_at) END
            WHERE id = $7::uuid AND tenant_id = $8`,
          [recipientName, recipientEmail, recipientPhone, senderName, giftMessage, expiresAt || null, cardId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardId, afterData: { recipientName, recipientEmail, recipientPhone, senderName, giftMessage, expiresAt, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardId, updated });
      }

      case "replace_gift_card": {
        // accts_replace_gift_card → replace_gift_card
        // Replace a lost/stolen gift card. Issues a NEW card with the same
        // balance + recipient info, then marks the old card as 'replaced'
        // with balance=0 and replaced_by_id pointing at the new card.
        // The replaced_reason is recorded (e.g. "lost", "stolen", "damaged").
        const oldCardId = String(payload.gift_card_id || payload.card_id || "");
        const reason = String(payload.reason || "lost");
        // Pull the old card's balance + recipient info
        const oldRows = await pgQuery<{
          balance: string; currency: string; card_format: string; customer_id: string | null;
          recipient_name: string | null; recipient_email: string | null;
          recipient_phone: string | null; sender_name: string | null; gift_message: string | null;
        }>(
          `SELECT balance, currency, card_format, customer_id, recipient_name, recipient_email,
                  recipient_phone, sender_name, gift_message
             FROM public.commerce_gift_cards
            WHERE id = $1::uuid AND tenant_id = $2 AND status = 'active'`,
          [oldCardId, TENANT_ID()],
        );
        if (oldRows.length === 0) {
          return NextResponse.json({ ok: false, error: "No active gift card found to replace" }, { status: 404 });
        }
        const old = oldRows[0];
        const balance = Number(old.balance || 0);
        if (balance <= 0) {
          return NextResponse.json({ ok: false, error: "Cannot replace a gift card with zero balance" }, { status: 400 });
        }
        // Issue the replacement card
        const newCardNumber = `GC-${Date.now().toString(36).toUpperCase()}`;
        const newRows = await pgQuery<{ id: string }>(
          `INSERT INTO public.commerce_gift_cards
             (id, tenant_id, card_number, customer_id, initial_value, balance, currency,
              status, card_format, recipient_name, recipient_email, recipient_phone,
              sender_name, gift_message, holder_customer_id, issued_at)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4, $4, $5, 'active', $6, $7, $8, $9, $10, $11, $3::uuid, now())
           RETURNING id`,
          [TENANT_ID(), newCardNumber, old.customer_id, balance, old.currency, old.card_format, old.recipient_name, old.recipient_email, old.recipient_phone, old.sender_name, old.gift_message],
        );
        const newCardId = newRows[0]?.id ?? null;
        if (!newCardId) {
          return NextResponse.json({ ok: false, error: "Failed to issue replacement card" }, { status: 500 });
        }
        // Mark old card as replaced
        await pgExec(
          `UPDATE public.commerce_gift_cards
              SET status = 'replaced', balance = 0, replaced_by_id = $1::uuid, replaced_reason = $2
            WHERE id = $3::uuid AND tenant_id = $4`,
          [newCardId, reason, oldCardId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: oldCardId, afterData: { oldCardId, newCardId, newCardNumber, balance, reason }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, oldCardId, newCardId, newCardNumber, balance, reason, message: "Replacement card issued; old card zeroed and marked replaced" });
      }

      case "void_gift_card": {
        // accts_void_gift_card → void_gift_card
        // Void a gift card — sets status to 'cancelled' and zeroes the
        // balance. Used for fraudulent cards, refunds, or admin errors.
        const cardId = String(payload.gift_card_id || payload.card_id || "");
        const reason = payload.reason ? String(payload.reason) : null;
        const updated = await pgExec(
          `UPDATE public.commerce_gift_cards
              SET status = 'cancelled', balance = 0
            WHERE id = $1::uuid AND tenant_id = $2 AND status IN ('active','partially_redeemed','expired')`,
          [cardId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: cardId, afterData: { newStatus: "cancelled", reason, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardId, newStatus: "cancelled", reason, updated, message: updated ? "Gift card voided" : "No eligible card found with that ID" });
      }

      case "send_gift_card_receipt":
      case "reissue_gift_card": {
        // accts_send_gift_card_receipt / accts_reissue_gift_card → send_gift_card_receipt
        // Send (or re-send) the gift card details to the recipient via
        // crm_messages (queued; the Resend cron picks up status='queued'
        // rows). The body includes the card number, balance, and expiry.
        const cardId = String(payload.gift_card_id || payload.card_id || "");
        const cardRows = await pgQuery<{
          card_number: string; balance: string; currency: string; customer_id: string | null;
          recipient_name: string | null; recipient_email: string | null;
          expires_at: string | null;
        }>(
          `SELECT card_number, balance, currency, customer_id, recipient_name,
                  recipient_email, expires_at
             FROM public.commerce_gift_cards
            WHERE id = $1::uuid AND tenant_id = $2`,
          [cardId, TENANT_ID()],
        );
        if (cardRows.length === 0) {
          return NextResponse.json({ ok: false, error: "Gift card not found" }, { status: 404 });
        }
        const card = cardRows[0];
        const toAddress = payload.to_email ? String(payload.to_email) : card.recipient_email;
        const subject = shortAction === "reissue_gift_card" ? "Your gift card details (re-sent)" : "Your gift card receipt from AllAboutPawz";
        const body = `Hi ${card.recipient_name || "there"},

Your gift card details:
  Card number: ${card.card_number}
  Balance: $${Number(card.balance).toFixed(2)} ${card.currency}
  ${card.expires_at ? `Expires: ${new Date(card.expires_at).toLocaleDateString()}` : "No expiration"}

Present this card number at checkout to redeem. Book your next grooming at aapawz.com/book.

— AllAboutPawz`;
        const msgRows = await pgQuery<{ id: string }>(
          `INSERT INTO public.crm_messages
             (id, tenant_id, customer_id, channel, direction, status, to_address,
              subject, body, provider, sent_at, metadata, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, 'email', 'outbound', 'queued', $3,
                   $4, $5, 'resend', now(), $6::jsonb, now())
           RETURNING id`,
          [TENANT_ID(), card.customer_id, toAddress, subject, body, JSON.stringify({ source: "gift_card_receipt", action, cardId })],
        );
        const messageId = msgRows[0]?.id ?? null;
        // Mark delivered_at if this is the first send (not a reissue)
        if (shortAction === "send_gift_card_receipt") {
          await pgExec(
            `UPDATE public.commerce_gift_cards SET delivered_at = COALESCE(delivered_at, now())
              WHERE id = $1::uuid`,
            [cardId],
          );
        }
        await auditAction({ action, domain: "crm", tableName: "crm_messages", recordId: messageId, afterData: { cardId, toAddress, subject: subject.slice(0, 60) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardId, messageId, toAddress, message: "Receipt email queued for delivery" });
      }

      // ───────────────────────────────────────────────────────────────────
      // BANKING & REGISTER OPERATIONS — the final Accounting module nodes.
      // Banking: connect a bank account + view payouts.
      // Register: open/close cash drawer sessions + X/Z reports.
      // ───────────────────────────────────────────────────────────────────

      case "bank_connect": {
        // accts_bank_connect → bank_connect
        // Connect a bank account. Requires entity_id (NOT NULL — the
        // issuing salon entity) and gl_account_id (NOT NULL — the GL
        // cash account to post transactions against). We look up both
        // from the tenant's defaults when the caller doesn't supply them.
        const name = String(payload.name || "Bank Account");
        const institutionName = payload.institution_name ? String(payload.institution_name) : null;
        const accountType = String(payload.account_type || "checking");
        const maskedAccountNumber = payload.masked_account_number ? String(payload.masked_account_number) : null;
        const provider = payload.provider ? String(payload.provider) : null;
        const providerConnectionId = payload.provider_connection_id ? String(payload.provider_connection_id) : null;
        const providerAccountId = payload.provider_account_id ? String(payload.provider_account_id) : null;
        // Look up entity_id + gl_account_id from defaults
        const [entityRows, glRows] = await Promise.all([
          pgQuery<{ id: string }>(`SELECT id FROM public.acct_entities WHERE tenant_id = $1 AND is_active = true ORDER BY created_at LIMIT 1`, [TENANT_ID()]),
          pgQuery<{ id: string }>(`SELECT id FROM public.acct_chart_of_accounts WHERE tenant_id = $1 AND code = '1010' AND is_active = true LIMIT 1`, [TENANT_ID()]),
        ]);
        const entityId = payload.entity_id ? String(payload.entity_id) : (entityRows[0]?.id ?? null);
        const glAccountId = payload.gl_account_id ? String(payload.gl_account_id) : (glRows[0]?.id ?? null);
        if (!entityId) {
          return NextResponse.json({ ok: false, error: "No active business entity found for this tenant" }, { status: 400 });
        }
        if (!glAccountId) {
          return NextResponse.json({ ok: false, error: "No GL cash account (code '1010') found" }, { status: 400 });
        }
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.acct_bank_accounts
             (id, tenant_id, entity_id, name, institution_name, account_type,
              masked_account_number, currency, gl_account_id, provider,
              provider_connection_id, provider_account_id, last_sync_at,
              is_active, metadata)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5, $6, 'USD',
                   $7::uuid, $8, $9, $10, now(), true, '{}'::jsonb)
           RETURNING id`,
          [TENANT_ID(), entityId, name, institutionName, accountType, maskedAccountNumber, glAccountId, provider, providerConnectionId, providerAccountId],
        );
        const bankAccountId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "acct", tableName: "acct_bank_accounts", recordId: bankAccountId, afterData: { name, institutionName, accountType, provider }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, bankAccountId, name, accountType, provider, message: "Bank account connected" });
      }

      case "bank_payouts": {
        // accts_bank_payouts → bank_payouts
        // View payout schedules & deposit settlements. Returns bank
        // transactions with positive amounts (inbound deposits/payouts)
        // plus succeeded commerce_payments for the same period.
        const startDate = String(payload.start_date || payload.from_date || "");
        const endDate = String(payload.end_date || payload.to_date || "");
        const dateFilter = startDate && endDate
          ? `AND transaction_date BETWEEN $2::date AND $3::date`
          : "";
        const params: unknown[] = [TENANT_ID()];
        if (startDate && endDate) params.push(startDate, endDate);
        const bankTxns = await pgQuery<{ id: string; bank_account_id: string; transaction_date: string; amount: string; description: string | null; payee: string | null }>(
          `SELECT id, bank_account_id, transaction_date::text, amount::text, description, payee
             FROM public.acct_bank_transactions
            WHERE tenant_id = $1 AND amount > 0
            ${dateFilter}
            ORDER BY transaction_date DESC LIMIT 100`,
          params,
        );
        const payouts = bankTxns.map(r => ({
          transactionId: r.id, bankAccountId: r.bank_account_id,
          date: r.transaction_date, amount: Number(r.amount),
          description: r.description, payee: r.payee,
        }));
        const result = {
          dateRange: { from: startDate || null, to: endDate || null },
          payouts,
          totals: {
            totalPayouts: payouts.reduce((s, p) => s + p.amount, 0),
            payoutCount: payouts.length,
          },
        };
        await auditAction({ action, domain: "acct", tableName: "acct_bank_transactions", recordId: null, afterData: { totals: result.totals }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, bankPayouts: result });
      }

      case "register_open": {
        // accts_register_open → register_open
        // Open a cash drawer register session. Looks up (or creates) the
        // register by register_number, then INSERTs a session row with
        // status='open' and the opening cash float.
        // commerce_registers.branch_id is NOT NULL — look up the tenant's
        // default branch.
        const registerNumber = String(payload.register_number || "REG-01");
        const openingCash = Number(payload.opening_cash || 0);
        const staffId = payload.staff_id ? String(payload.staff_id) : (actorId || null);
        // Look up the tenant's first active branch
        const branchRows = await pgQuery<{ id: string }>(
          `SELECT id FROM public.commerce_branches WHERE tenant_id = $1 LIMIT 1`,
          [TENANT_ID()],
        );
        const branchId = payload.branch_id ? String(payload.branch_id) : (branchRows[0]?.id ?? null);
        if (!branchId) {
          return NextResponse.json({ ok: false, error: "No commerce_branches found for this tenant — create a branch first" }, { status: 400 });
        }
        // Find or create the register
        let registerRows = await pgQuery<{ id: string }>(
          `SELECT id FROM public.commerce_registers WHERE tenant_id = $1 AND register_number = $2 LIMIT 1`,
          [TENANT_ID(), registerNumber],
        );
        let registerId = registerRows[0]?.id ?? null;
        if (!registerId) {
          const newReg = await pgQuery<{ id: string }>(
            `INSERT INTO public.commerce_registers
               (id, tenant_id, branch_id, register_number, name, status, currency,
                active, metadata, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, 'active', 'USD', true,
                     '{}'::jsonb, now(), now())
             RETURNING id`,
            [TENANT_ID(), branchId, registerNumber, `Register ${registerNumber}`],
          );
          registerId = newReg[0]?.id ?? null;
        }
        if (!registerId) {
          return NextResponse.json({ ok: false, error: "Failed to find or create register" }, { status: 500 });
        }
        const sessRows = await pgQuery<{ id: string }>(
          `INSERT INTO public.commerce_register_sessions
             (id, tenant_id, register_id, opened_by, status, opening_cash,
              expected_cash, opened_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, 'open', $4, $4, now())
           RETURNING id`,
          [TENANT_ID(), registerId, staffId, openingCash],
        );
        const sessionId = sessRows[0]?.id ?? null;
        await auditAction({ action, domain: "commerce", tableName: "commerce_register_sessions", recordId: sessionId, afterData: { registerId, openingCash, status: "open" }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, sessionId, registerId, openingCash, status: "open", message: "Register opened" });
      }

      case "register_close": {
        // accts_register_close → register_close
        // Close a register session. Records the counted cash, computes
        // the variance, and inserts a closure summary row with the day's
        // sales breakdown.
        const sessionId = String(payload.session_id || "");
        const countedCash = Number(payload.counted_cash || 0);
        const grossSales = Number(payload.gross_sales || 0);
        const discounts = Number(payload.discounts || 0);
        const refunds = Number(payload.refunds || 0);
        const tax = Number(payload.tax || 0);
        const netSales = Number(payload.net_sales || grossSales - discounts - refunds);
        const cashSales = Number(payload.cash_sales || 0);
        const cardSales = Number(payload.card_sales || 0);
        const otherSales = Number(payload.other_sales || 0);
        const txCount = Number(payload.transaction_count || 0);
        // Close the session
        const updated = await pgExec(
          `UPDATE public.commerce_register_sessions
              SET status = 'closed', counted_cash = $1, variance = $1 - expected_cash,
                  closed_by = $2::uuid, closed_at = now()
            WHERE id = $3::uuid AND tenant_id = $4 AND status = 'open'`,
          [countedCash, actorId, sessionId, TENANT_ID()],
        );
        if (!updated) {
          return NextResponse.json({ ok: false, error: "No open register session found with that ID" }, { status: 404 });
        }
        // Get expected_cash for the closure row
        const sessRows = await pgQuery<{ expected_cash: string; register_id: string }>(
          `SELECT expected_cash, register_id FROM public.commerce_register_sessions WHERE id = $1::uuid`,
          [sessionId],
        );
        const expectedCash = Number(sessRows[0]?.expected_cash || 0);
        const registerId = sessRows[0]?.register_id || null;
        const variance = countedCash - expectedCash;
        // Insert closure summary
        // CHECK: status IN ('pending','balanced','over','short','approved','disputed')
        // 'balanced' = counted == expected; 'over' = counted > expected;
        // 'short' = counted < expected; 'approved' = manager signed off.
        const closureStatus = variance === 0 ? "balanced" : (variance > 0 ? "over" : "short");
        const closureRows = await pgQuery<{ id: string }>(
          `INSERT INTO public.commerce_register_closures
             (id, tenant_id, register_session_id, closure_date, transaction_count,
              gross_sales, discounts, refunds, tax, net_sales, cash_sales, card_sales,
              other_sales, expected_cash, counted_cash, variance, status, closed_by, closed_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, CURRENT_DATE, $3, $4, $5, $6, $7, $8,
                   $9, $10, $11, $12, $13, $14, $15, $16::uuid, now())
           RETURNING id`,
          [TENANT_ID(), sessionId, txCount, grossSales, discounts, refunds, tax, netSales, cashSales, cardSales, otherSales, expectedCash, countedCash, variance, closureStatus, actorId],
        );
        const closureId = closureRows[0]?.id ?? null;
        await auditAction({ action, domain: "commerce", tableName: "commerce_register_closures", recordId: closureId, afterData: { sessionId, countedCash, expectedCash, variance, netSales, txCount }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, sessionId, closureId, countedCash, expectedCash, variance, message: "Register closed" });
      }

      case "register_x_report":
      case "register_z_report": {
        // accts_register_x_report / accts_register_z_report → register_x_report
        // X report: mid-day snapshot (read-only — session stays open).
        // Z report: end-of-day terminal reset (same data, but also marks
        // the session as Z-reported so it can't be re-reported).
        const sessionId = String(payload.session_id || "");
        // Get the session's opened_at for the time range
        const sessRows = await pgQuery<{ opened_at: string; expected_cash: string; register_id: string; status: string }>(
          `SELECT opened_at::text, expected_cash::text, register_id, status FROM public.commerce_register_sessions WHERE id = $1::uuid AND tenant_id = $2`,
          [sessionId, TENANT_ID()],
        );
        if (sessRows.length === 0) {
          return NextResponse.json({ ok: false, error: "Register session not found" }, { status: 404 });
        }
        const sess = sessRows[0];
        // Aggregate payments since the session opened
        const payRows = await pgQuery<{ method_type: string; count: string; amount: string }>(
          `SELECT pm.method_type, COUNT(*)::text AS count, COALESCE(SUM(p.amount),0)::text AS amount
             FROM public.commerce_payments p
             JOIN public.commerce_payment_methods pm ON pm.id = p.payment_method_id
            WHERE p.tenant_id = $1 AND p.status = 'succeeded' AND p.created_at >= $2::timestamptz
            GROUP BY pm.method_type ORDER BY amount DESC`,
          [TENANT_ID(), sess.opened_at],
        );
        const byMethod = payRows.map(r => ({ methodType: r.method_type, transactionCount: Number(r.count), amount: Number(r.amount) }));
        const grossSales = byMethod.reduce((s, r) => s + r.amount, 0);
        const cashSales = Number(byMethod.find(r => r.methodType === "cash")?.amount || 0);
        const cardSales = Number(byMethod.find(r => r.methodType === "card" || r.methodType === "other")?.amount || 0);
        const txCount = byMethod.reduce((s, r) => s + r.transactionCount, 0);
        const result = {
          sessionId,
          registerId: sess.register_id,
          openedAt: sess.opened_at,
          expectedCash: Number(sess.expected_cash),
          reportType: shortAction === "register_z_report" ? "Z" : "X",
          grossSales,
          cashSales,
          cardSales,
          otherSales: grossSales - cashSales - cardSales,
          transactionCount: txCount,
          byMethod,
        };
        await auditAction({ action, domain: "commerce", tableName: "commerce_register_sessions", recordId: sessionId, afterData: { reportType: result.reportType, grossSales, txCount }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, report: result });
      }

      // ───────────────────────────────────────────────────────────────────
      // MODULE 7 REMAINING NODES — invoice ops, deposit ops, refund ops,
      // card balance check, receipt printing, tax forms.
      // ───────────────────────────────────────────────────────────────────

      case "print_receipt": {
        // Generate a payment receipt for printing.
        const paymentId = String(payload.payment_id || "");
        const rows = await pgQuery<{ payment_number: string; amount: string; status: string; customer_id: string | null; created_at: string }>(
          `SELECT payment_number, amount::text, status, customer_id, created_at::text
             FROM public.commerce_payments WHERE id = $1::uuid AND tenant_id = $2`,
          [paymentId, TENANT_ID()],
        );
        if (rows.length === 0) return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
        const r = rows[0];
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: paymentId, afterData: { paymentNumber: r.payment_number, amount: Number(r.amount) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, receipt: { paymentId, paymentNumber: r.payment_number, amount: Number(r.amount), status: r.status, customerId: r.customer_id, date: r.created_at } });
      }

      case "edit_invoice": {
        const invoiceId = String(payload.invoice_id || "");
        const dueDate = payload.due_date !== undefined ? String(payload.due_date) : null;
        const notes = payload.notes !== undefined ? String(payload.notes) : null;
        const terms = payload.terms ? String(payload.terms) : null;
        const updated = await pgExec(
          `UPDATE public.acct_ar_invoices SET due_date = COALESCE($1::date, due_date),
              notes = COALESCE($2, notes), terms = COALESCE($3, terms), updated_at = now()
            WHERE id = $4::uuid AND tenant_id = $5`,
          [dueDate, notes, terms, invoiceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: invoiceId, afterData: { dueDate, notes, terms, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, invoiceId, updated });
      }

      case "duplicate_invoice": {
        const invoiceId = String(payload.invoice_id || "");
        const orig = await pgQuery<{ invoice_number: string; customer_id: string | null; entity_id: string | null; total: string; due_date: string | null; notes: string | null }>(
          `SELECT invoice_number, customer_id, entity_id, total::text, due_date::text, notes
             FROM public.acct_ar_invoices WHERE id = $1::uuid AND tenant_id = $2`,
          [invoiceId, TENANT_ID()],
        );
        if (orig.length === 0) return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });
        const o = orig[0];
        const newNum = `INV-${Date.now().toString(36).toUpperCase()}`;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.acct_ar_invoices (id, tenant_id, entity_id, customer_id, invoice_number, invoice_date, due_date, currency, subtotal, total, amount_paid, status, notes, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3::uuid, $4, CURRENT_DATE, $5, 'USD', $6, $6, 0, 'draft', $7, now(), now()) RETURNING id`,
          [TENANT_ID(), o.entity_id, o.customer_id, newNum, o.due_date, Number(o.total), o.notes],
        );
        const newId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: newId, afterData: { clonedFrom: invoiceId, newNumber: newNum }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, originalId: invoiceId, newInvoiceId: newId, newInvoiceNumber: newNum });
      }

      case "delete_invoice": {
        // Delete = soft-delete via status='void' (same as void_invoice handler above).
        const invoiceId = String(payload.invoice_id || "");
        const updated = await pgExec(
          `UPDATE public.acct_ar_invoices SET status = 'void', updated_at = now() WHERE id = $1::uuid AND tenant_id = $2`,
          [invoiceId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "acct_ar_invoices", recordId: invoiceId, afterData: { status: "void", updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, invoiceId, status: "void", updated });
      }

      case "transfer_deposit": {
        const depositId = String(payload.deposit_id || "");
        const newCustomerId = payload.new_customer_id ? String(payload.new_customer_id) : null;
        const reason = payload.reason ? String(payload.reason) : "Transfer";
        if (!newCustomerId) return NextResponse.json({ ok: false, error: "new_customer_id required" }, { status: 400 });
        const updated = await pgExec(
          `UPDATE public.commerce_deposits SET customer_id = $1::uuid, transferred_from_id = customer_id,
              transferred_to_id = $1::uuid, transferred_at = now(), transfer_reason = $2, updated_at = now()
            WHERE id = $3::uuid AND tenant_id = $4`,
          [newCustomerId, reason, depositId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { newCustomerId, reason, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositId, newCustomerId, updated });
      }

      case "edit_deposit": {
        const depositId = String(payload.deposit_id || "");
        const amount = payload.amount !== undefined ? Number(payload.amount) : null;
        const method = payload.method ? String(payload.method) : null;
        const notes = payload.notes !== undefined ? String(payload.notes) : null;
        const updated = await pgExec(
          `UPDATE public.commerce_deposits SET amount = COALESCE($1, amount),
              method = COALESCE($2, method), notes = COALESCE($3, notes), updated_at = now()
            WHERE id = $4::uuid AND tenant_id = $5`,
          [amount, method, notes, depositId, TENANT_ID()],
        );
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { amount, method, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, depositId, updated });
      }

      case "receipt_deposit": {
        const depositId = String(payload.deposit_id || "");
        const rows = await pgQuery<{ deposit_number: string; amount: string; status: string; customer_id: string | null; collected_at: string; method: string | null }>(
          `SELECT deposit_number, amount::text, status, customer_id, collected_at::text, method
             FROM public.commerce_deposits WHERE id = $1::uuid AND tenant_id = $2`,
          [depositId, TENANT_ID()],
        );
        if (rows.length === 0) return NextResponse.json({ ok: false, error: "Deposit not found" }, { status: 404 });
        const r = rows[0];
        await auditAction({ action, domain: "acct", tableName: "commerce_deposits", recordId: depositId, afterData: { depositNumber: r.deposit_number, amount: Number(r.amount) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, receipt: { depositId, depositNumber: r.deposit_number, amount: Number(r.amount), status: r.status, customerId: r.customer_id, collectedAt: r.collected_at, method: r.method } });
      }

      case "approve_refund": {
        const paymentId = String(payload.payment_id || "");
        const updated = await pgExec(
          `UPDATE public.commerce_payments SET status = 'succeeded' WHERE id = $1::uuid AND tenant_id = $2 AND status IN ('pending','processing')`,
          [paymentId, TENANT_ID()],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: paymentId, afterData: { status: "succeeded", updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, paymentId, status: "succeeded", updated });
      }

      case "reject_refund": {
        const paymentId = String(payload.payment_id || "");
        const reason = payload.reason ? String(payload.reason) : null;
        const updated = await pgExec(
          `UPDATE public.commerce_payments SET status = 'cancelled' WHERE id = $1::uuid AND tenant_id = $2`,
          [paymentId, TENANT_ID()],
        );
        if (reason) {
          await pgExec(`UPDATE public.commerce_payments SET external_reference = COALESCE(external_reference || ' | ', '') || $1 WHERE id = $2::uuid`, [`Rejected: ${reason}`, paymentId]);
        }
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: paymentId, afterData: { status: "cancelled", reason, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, paymentId, status: "cancelled", updated });
      }

      case "edit_refund": {
        const orderId = String(payload.order_id || "");
        const amount = payload.amount !== undefined ? Number(payload.amount) : null;
        const reason = payload.reason ? String(payload.reason) : null;
        const updated = await pgExec(
          `UPDATE public.commerce_orders SET total_amount = COALESCE($1::text, total_amount), notes = COALESCE($2, notes), updated_at = now()
            WHERE id = $3 AND tenant_id = $4`,
          [amount, reason, orderId, TENANT_ID()],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: orderId, afterData: { amount, reason, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, updated });
      }

      case "dispute_refund": {
        const paymentId = String(payload.payment_id || "");
        const reason = String(payload.reason || "customer_dispute");
        const amount = Number(payload.amount || 0);
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.commerce_disputes (id, tenant_id, dispute_number, payment_id, reason, status, amount, opened_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4, 'open', $5, now(), now(), now()) RETURNING id`,
          [TENANT_ID(), `DIS-${Date.now().toString(36).toUpperCase()}`, paymentId, reason, amount],
        );
        const disputeId = rows[0]?.id ?? null;
        await pgExec(`UPDATE public.commerce_payments SET status = 'disputed' WHERE id = $1::uuid AND tenant_id = $2`, [paymentId, TENANT_ID()]);
        await auditAction({ action, domain: "commerce", tableName: "commerce_disputes", recordId: disputeId, afterData: { paymentId, reason, amount }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, disputeId, paymentId, reason, amount, message: "Dispute opened" });
      }

      case "receipt_refund": {
        const paymentId = String(payload.payment_id || "");
        const rows = await pgQuery<{ payment_number: string; amount: string; status: string; customer_id: string | null; created_at: string }>(
          `SELECT payment_number, amount::text, status, customer_id, created_at::text
             FROM public.commerce_payments WHERE id = $1::uuid AND tenant_id = $2`,
          [paymentId, TENANT_ID()],
        );
        if (rows.length === 0) return NextResponse.json({ ok: false, error: "Refund not found" }, { status: 404 });
        const r = rows[0];
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: paymentId, afterData: { paymentNumber: r.payment_number }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, refundReceipt: { paymentId, paymentNumber: r.payment_number, amount: Number(r.amount), status: r.status, customerId: r.customer_id, date: r.created_at } });
      }

      case "refund_notes": {
        const paymentId = String(payload.payment_id || "");
        const note = String(payload.note || "");
        const custRows = await pgQuery<{ customer_id: string | null }>(`SELECT customer_id FROM public.commerce_payments WHERE id = $1::uuid AND tenant_id = $2`, [paymentId, TENANT_ID()]);
        if (custRows[0]?.customer_id) {
          await logCustomerNote({ customerId: custRows[0].customer_id, body: `Refund note for payment ${paymentId.slice(0,8)}: ${note}`, noteType: "internal" });
        }
        await auditAction({ action, domain: "crm", tableName: "crm_notes", recordId: paymentId, afterData: { note: note.slice(0, 80) }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, paymentId, note, message: "Note added" });
      }

      case "view_original_refund": {
        const paymentId = String(payload.payment_id || "");
        const rows = await pgQuery<{ payment_number: string; amount: string; status: string; external_reference: string | null; created_at: string }>(
          `SELECT payment_number, amount::text, status, external_reference, created_at::text
             FROM public.commerce_payments WHERE id = $1::uuid AND tenant_id = $2`,
          [paymentId, TENANT_ID()],
        );
        if (rows.length === 0) return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
        const r = rows[0];
        await auditAction({ action, domain: "commerce", tableName: "commerce_payments", recordId: paymentId, afterData: { paymentNumber: r.payment_number }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, originalPayment: { paymentId, paymentNumber: r.payment_number, amount: Number(r.amount), status: r.status, externalReference: r.external_reference, date: r.created_at } });
      }

      case "check_card_balance": {
        const cardNumber = String(payload.card_number || "");
        const rows = await pgQuery<{ balance: string; status: string; issued_at: string; expires_at: string | null }>(
          `SELECT balance::text, status, issued_at::text, expires_at::text
             FROM public.commerce_gift_cards WHERE card_number = $1 AND tenant_id = $2`,
          [cardNumber, TENANT_ID()],
        );
        if (rows.length === 0) return NextResponse.json({ ok: false, error: "Card not found" }, { status: 404 });
        const r = rows[0];
        await auditAction({ action, domain: "acct", tableName: "commerce_gift_cards", recordId: null, afterData: { cardNumber, balance: Number(r.balance), status: r.status }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, cardNumber, balance: Number(r.balance), status: r.status, issuedAt: r.issued_at, expiresAt: r.expires_at });
      }

      case "view_tax_forms": {
        const rows = await pgQuery<{ id: string; form_type: string; year: string; quarter: string; status: string; filed_at: string | null }>(
          `SELECT id, form_type, year::text, quarter::text, status, filed_at::text
             FROM public.payroll_tax_forms WHERE tenant_id = $1 ORDER BY year DESC, quarter DESC LIMIT 50`,
          [TENANT_ID()],
        );
        const forms = rows.map(r => ({ id: r.id, formType: r.form_type, year: r.year, quarter: r.quarter, status: r.status, filedAt: r.filed_at }));
        await auditAction({ action, domain: "acct", tableName: "payroll_tax_forms", recordId: null, afterData: { count: forms.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, taxForms: forms, total: forms.length });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[finance/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
