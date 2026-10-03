// ---------------------------------------------------------------------------
// /api/admin/commerce/actions/route.ts
//
// Commerce / inventory / purchase orders / fulfillment / coupons quick
// actions. Each handler:
//   1. Strips the FIRST module prefix (accts_* / apt_* / crm_* / fulfill_*
//      / order_* / po_*) so the case keys match the registry.
//   2. Performs a real transactional write.
//   3. Appends a row to commerce_audit_log / erp_audit_log.
//   4. Returns structured JSON for TanStack cache invalidation.
//
// CRITICAL FIX vs previous version: every stub case key was the LAST
// underscore-segment of the registry code (e.g. `case 'coupons'` for
// `accts_register_coupons`). The prefix-stripping regex `^[a-z]+_` only
// strips the FIRST run, so `accts_register_coupons` becomes
// `register_coupons`, NOT `coupons`. Every "short" stub case was dead
// code. This rewrite uses the correct prefix-stripped names.
//
// Also fixed real-handler bugs:
//   - erp_inventory_movements.movement_type CHECK enum: 'receipt' invalid
//     (use 'purchase_receipt'); metadata jsonb is NOT NULL
//   - erp_purchase_orders.status CHECK enum: 'ordered' invalid
//     (use 'sent' for new POs, 'received' for receipts); subtotal/tax_total/
//     shipping_total/total are NOT NULL
//   - commerce_inventory_events has no `reference` or `occurred_at` columns
//     (use `payload` jsonb and rely on `created_at` default)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgExec, pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";
import { auditAction, getActorIdFromRequest } from "@/lib/quick-actions/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cheap UUID shape check — used to coerce non-UUID business keys (e.g.
 * "PAY-AB12", "order-test-1") to NULL for tables whose entity_id column
 * is UUID-typed. */
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
      // INVENTORY handlers
      // ───────────────────────────────────────────────────────────────────

      case "restock_inventory":
      case "add_inventory":
      case "restock": {
        // inv_restock_inventory / apt_add_inventory
        // ALSO accept "restock" (frontend registry ID `order-restock`
        // prefix-strips `order_` → `restock`).
        // INSERT a new inventory movement (purchase receipt or adjustment).
        // CHECK constraint: movement_type IN (erp_inventory_movement_type)
        // We accept 'receive' | 'purchase_receipt' | 'adjustment' from the
        // caller and default to 'purchase_receipt'.
        const VALID_MOVEMENT = new Set([
          "opening","purchase_receipt","sale","return","transfer","adjustment",
          "damage","scrap","count_adjustment","reservation","reservation_release",
          "allocation","deallocation","pick","unpick","pack","unpack","ship",
          "receive","putaway","cycle_count","reclassification","cost_adjustment",
        ]);
        let movementType = String(payload.movement_type || "purchase_receipt");
        if (!VALID_MOVEMENT.has(movementType)) movementType = "purchase_receipt";
        const skuId = String(payload.sku_id || "");
        const warehouseId = payload.warehouse_id ? String(payload.warehouse_id) : null;
        const quantity = Number(payload.quantity || 0);
        const unitCost = Number(payload.unit_cost ?? payload.cost ?? 0);
        const reason = payload.reason ? String(payload.reason) : "manual_restock";
        const reference = payload.reference ? String(payload.reference) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.erp_inventory_movements
             (id, tenant_id, movement_type, sku_id, warehouse_id, quantity,
              unit_cost, source_type, reference, reason, metadata, performed_by, occurred_at, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4::uuid, $5, $6,
                   'manual', $7, $8, '{}'::jsonb, $9::uuid, now(), now())
           RETURNING id`,
          [TENANT_ID(), movementType, skuId, warehouseId, quantity, unitCost, reference, reason, actorId],
        );
        const movementId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "erp", tableName: "erp_inventory_movements", recordId: movementId, afterData: { movementType, skuId, quantity, unitCost, reason }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, movementId, movementType, skuId, quantity, unitCost });
      }

      // ───────────────────────────────────────────────────────────────────
      // PURCHASE ORDER handlers
      // ───────────────────────────────────────────────────────────────────

      case "create_po": {
        // order_create_po / po_create → create_po
        // CHECK constraint: status IN ('draft','pending_approval','approved',
        // 'sent','partially_received','received','closed','cancelled')
        const vendorId = String(payload.vendor_id || "");
        const warehouseId = payload.warehouse_id ? String(payload.warehouse_id) : null;
        const poNumber = String(payload.po_number || `PO-${Date.now().toString(36).toUpperCase()}`);
        const currency = String(payload.currency || "USD");
        const expectedDate = payload.expected_date ? String(payload.expected_date) : null;
        const expectedTotal = Number(payload.expected_total ?? payload.total ?? 0);
        const lineItems = (payload.line_items as Array<{ subtotal?: number; quantity?: number; unit_cost?: number }>) || [];
        const subtotal = lineItems.length
          ? lineItems.reduce((s, i) => s + Number(i.subtotal ?? (Number(i.quantity || 0) * Number(i.unit_cost || 0))), 0)
          : expectedTotal;
        const taxTotal = Number(payload.tax_total ?? 0);
        const shippingTotal = Number(payload.shipping_total ?? 0);
        const total = subtotal + taxTotal + shippingTotal;
        const notes = payload.notes ? String(payload.notes) : null;
        const rows = await pgQuery<{ id: string }>(
          `INSERT INTO public.erp_purchase_orders
             (id, tenant_id, po_number, vendor_id, warehouse_id, status, order_date,
              expected_date, currency, subtotal, tax_total, shipping_total, total,
              notes, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4::uuid, 'sent', CURRENT_DATE,
                  $5, $6, $7, $8, $9, $10, $11, $12::uuid, now(), now())
           RETURNING id`,
          [TENANT_ID(), poNumber, vendorId, warehouseId, expectedDate, currency, subtotal, taxTotal, shippingTotal, total, notes, actorId],
        );
        const poId = rows[0]?.id ?? null;
        await auditAction({ action, domain: "erp", tableName: "erp_purchase_orders", recordId: poId, afterData: { poNumber, vendorId, total }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, poId, poNumber, vendorId, total, status: "sent" });
      }

      case "receive_po":
      case "receive": {
        // po_receive → receive (legacy alias receive_po)
        const poId = String(payload.po_id || "");
        const updated = await pgExec(
          `UPDATE public.erp_purchase_orders
              SET status = 'received', updated_at = now()
            WHERE id = $1::uuid AND tenant_id = $2`,
          [poId, TENANT_ID()],
        );
        // Also insert a purchase-receipt inventory movement for each line item
        // if the caller provides them.
        const receivedItems = (payload.received_items as Array<{ sku_id?: string; quantity?: number; unit_cost?: number }>) || [];
        let movementCount = 0;
        for (const ri of receivedItems) {
          const skuId = ri.sku_id ? String(ri.sku_id) : null;
          const qty = Number(ri.quantity || 0);
          const cost = Number(ri.unit_cost || 0);
          if (!skuId || qty <= 0) continue;
          await pgExec(
            `INSERT INTO public.erp_inventory_movements
               (id, tenant_id, movement_type, sku_id, quantity, unit_cost, source_type,
                reference, reason, metadata, performed_by, occurred_at, created_at)
             VALUES (gen_random_uuid(), $1, 'purchase_receipt', $2::uuid, $3, $4,
                     'purchase_order', $5, 'PO receipt', '{}'::jsonb, $6::uuid, now(), now())`,
            [TENANT_ID(), skuId, qty, cost, poId, actorId],
          );
          movementCount++;
        }
        await auditAction({ action, domain: "erp", tableName: "erp_purchase_orders", recordId: poId, afterData: { status: "received", movementCount }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, poId, updated, status: "received", movementCount });
      }

      case "create_po_status": {
        // Future-proof: update PO status (e.g. cancel, send, close)
        const poId = String(payload.po_id || "");
        const status = String(payload.status || "draft");
        const updated = await pgExec(
          `UPDATE public.erp_purchase_orders SET status = $1, updated_at = now()
            WHERE id = $2::uuid AND tenant_id = $3`,
          [status, poId, TENANT_ID()],
        );
        await auditAction({ action, domain: "erp", tableName: "erp_purchase_orders", recordId: poId, afterData: { status, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, poId, status, updated });
      }

      // ───────────────────────────────────────────────────────────────────
      // ORDER handlers
      // ───────────────────────────────────────────────────────────────────

      case "create_order":
      case "create": {
        // order_create → create (legacy alias create_order)
        // CRITICAL: po_create (from frontend `po-create`) ALSO strips to
        // "create" because the prefix-strip `^[a-z]+_` matches `po_`. To
        // avoid creating an order when the user wanted a PO, dispatch
        // based on the original action_code here.
        if (action === "po_create" || action === "po_create_po" || action === "po-create") {
          // Route to the create_po handler logic by re-dispatching via the
          // full action_code. We can't `goto` in JS, so duplicate the PO
          // creation logic inline. (Mirrors case "create_po" above.)
          const vendorId = String(payload.vendor_id || "");
          const warehouseId = payload.warehouse_id ? String(payload.warehouse_id) : null;
          const poNumber = String(payload.po_number || `PO-${Date.now().toString(36).toUpperCase()}`);
          const currency = String(payload.currency || "USD");
          const expectedDate = payload.expected_date ? String(payload.expected_date) : null;
          const expectedTotal = Number(payload.expected_total ?? payload.total ?? 0);
          const lineItems = (payload.line_items as Array<{ subtotal?: number; quantity?: number; unit_cost?: number }>) || [];
          const subtotal = lineItems.length
            ? lineItems.reduce((s, i) => s + Number(i.subtotal ?? (Number(i.quantity || 0) * Number(i.unit_cost || 0))), 0)
            : expectedTotal;
          const taxTotal = Number(payload.tax_total ?? 0);
          const shippingTotal = Number(payload.shipping_total ?? 0);
          const total = subtotal + taxTotal + shippingTotal;
          const notes = payload.notes ? String(payload.notes) : null;
          const poRows = await pgQuery<{ id: string }>(
            `INSERT INTO public.erp_purchase_orders
               (id, tenant_id, po_number, vendor_id, warehouse_id, status, order_date,
                expected_date, currency, subtotal, tax_total, shipping_total, total,
                notes, created_by, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4::uuid, 'sent', CURRENT_DATE,
                    $5, $6, $7, $8, $9, $10, $11, $12::uuid, now(), now())
             RETURNING id`,
            [TENANT_ID(), poNumber, vendorId, warehouseId, expectedDate, currency, subtotal, taxTotal, shippingTotal, total, notes, actorId],
          );
          const poId = poRows[0]?.id ?? null;
          await auditAction({ action, domain: "erp", tableName: "erp_purchase_orders", recordId: poId, afterData: { poNumber, vendorId, total }, actorUserId: actorId, ipAddress: ip });
          return NextResponse.json({ ok: true, poId, poNumber, vendorId, total, status: "sent" });
        }
        const customerEmail = String(payload.customer_email || "");
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        const totalAmount = Number(payload.total_amount ?? 0);
        const subtotal = Number(payload.subtotal ?? totalAmount);
        const fulfillmentMethod = payload.fulfillment_method ? String(payload.fulfillment_method) : "local_pickup";
        const fulfillmentStatus = payload.fulfillment_status ? String(payload.fulfillment_status) : "pending";
        const status = String(payload.status || "draft");
        const paymentStatus = String(payload.payment_status || "unpaid");
        const orderId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        await pgExec(
          `INSERT INTO public.commerce_orders
             (id, tenant_id, customer_email, customer_id, email, subtotal, total_amount,
              status, payment_status, fulfillment_status, fulfillment_method, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $3, $5, $6, $7, $8, $9, $10, now(), now())`,
          [orderId, TENANT_ID(), customerEmail, customerId, subtotal, totalAmount, status, paymentStatus, fulfillmentStatus, fulfillmentMethod],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: orderId, afterData: { orderId, customerEmail, totalAmount, status }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, customerEmail, totalAmount, status });
      }

      case "advance_fulfillment_stage":
      case "advance": {
        // fulfill_advance → advance (legacy alias advance_fulfillment_stage)
        // CHECK constraint: commerce_orders.fulfillment_status — text, no enum
        // (per probe). Accept any reasonable value.
        const orderId = String(payload.order_id || "");
        const status = String(payload.status || payload.fulfillment_status || "released");
        const updated = await pgExec(
          `UPDATE public.commerce_orders
              SET fulfillment_status = $1, updated_at = now()
            WHERE id = $2 AND tenant_id = $3`,
          [status, orderId, TENANT_ID()],
        );
        // Also log a fulfillment event. Schema: commerce_fulfillment_events
        // (id, tenant_id, fulfillment_id, order_id uuid, event_type NOT NULL,
        //  old_status, new_status, payload jsonb NOT NULL, created_at).
        // Note: NO occurred_at column; created_at defaults to now().
        // order_id is UUID-typed — coerce non-UUIDs to NULL (the audit log
        // still captures which business key was affected).
        const orderIdUuid = isUuid(orderId) ? orderId : null;
        await pgExec(
          `INSERT INTO public.commerce_fulfillment_events
             (id, tenant_id, order_id, event_type, new_status, payload, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4, $5::jsonb, now())`,
          [TENANT_ID(), orderIdUuid, `fulfillment_${status}`, status, JSON.stringify({ orderId, status, at: new Date().toISOString() })],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: isUuid(orderId) ? orderId : null, afterData: { fulfillmentStatus: status, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, fulfillmentStatus: status, updated });
      }

      case "checkout": {
        // crm_checkout → checkout
        // Mark an order as paid + captured; record a commerce_payment row
        // linked to the order via sale_id (commerce_sales).
        const orderId = String(payload.order_id || "");
        const amount = Number(payload.amount || 0);
        const method = payload.method ? String(payload.method) : "cash";
        // Look up the default cash payment method
        const methodRows = await pgQuery<{ id: string }>(
          `SELECT id FROM public.commerce_payment_methods
            WHERE tenant_id = $1 AND active = true AND method_type = $2
            ORDER BY (code = 'manual_cash') DESC, id LIMIT 1`,
          [TENANT_ID(), method],
        );
        const methodId = methodRows[0]?.id ?? null;
        if (!methodId) {
          return NextResponse.json({ ok: false, error: `No active ${method} payment method configured` }, { status: 400 });
        }
        const payNum = `PAY-${Date.now().toString(36).toUpperCase()}`;
        await pgExec(
          `UPDATE public.commerce_orders
              SET status = 'paid', payment_status = 'paid', updated_at = now()
            WHERE id = $1 AND tenant_id = $2`,
          [orderId, TENANT_ID()],
        );
        await pgExec(
          `INSERT INTO public.commerce_payments
             (id, tenant_id, payment_number, payment_method_id, amount, currency, status, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3::uuid, $4, 'USD', 'succeeded', now())`,
          [TENANT_ID(), payNum, methodId, amount],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: orderId, afterData: { amount, method, payNum }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, amount, paymentNumber: payNum, method, status: "paid" });
      }

      // ───────────────────────────────────────────────────────────────────
      // SHIPPING / ALERTS handlers
      // ───────────────────────────────────────────────────────────────────

      case "shipping_label":
      case "label": {
        // fulfill_shipping_label → shipping_label (legacy alias label)
        // commerce_inventory_events schema: id, tenant_id, sku_id, warehouse_id,
        // location_id, movement_id, event_type (text NOT NULL), quantity,
        // source_type, source_id (uuid), payload (jsonb NOT NULL), created_at
        const orderId = payload.order_id ? String(payload.order_id) : null;
        const skuId = payload.sku_id ? String(payload.sku_id) : null;
        await pgExec(
          `INSERT INTO public.commerce_inventory_events
             (id, tenant_id, sku_id, event_type, source_type, payload, created_at)
           VALUES (gen_random_uuid(), $1, $2::uuid, 'shipping_label_requested',
                   'order', $3::jsonb, now())`,
          [TENANT_ID(), skuId, JSON.stringify({ orderId, requestedAt: new Date().toISOString() })],
        );
        await auditAction({ action, domain: "commerce", tableName: "commerce_inventory_events", recordId: null, afterData: { orderId, skuId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, message: "Shipping label request logged — use /api/admin/shipping to purchase label" });
      }

      case "resend_alert":
      case "alert": {
        // fulfill_resend_alert → resend_alert (legacy alias alert)
        // crm_funnel_events.event_type has a CHECK constraint allowing only:
        // website_visit | account_created | intake_started | intake_completed |
        // booking_started | booking_completed.
        // "alert_resent" is not allowed — instead, we log a system note
        // against the customer (when customer_id is provided) and write
        // a generic activity_log row.
        const orderId = payload.order_id ? String(payload.order_id) : null;
        const customerId = payload.customer_id ? String(payload.customer_id) : null;
        // activity_log: id text default uuid, entity, entityId, action, summary,
        // actor, createdAt, tenant_id (NOT NULL). No CHECK on action.
        await pgExec(
          `INSERT INTO public.activity_log
             (entity, "entityId", action, summary, actor, "createdAt", tenant_id)
           VALUES ('order', $1, 'alert_resent', $2, 'system', now(), $3)`,
          [orderId, `Resent alert for order ${orderId}`, TENANT_ID()],
        );
        if (customerId) {
          await pgExec(
            `INSERT INTO public.crm_notes (id, tenant_id, customer_id, note_type, body, is_pinned)
             VALUES (gen_random_uuid(), $1, $2::uuid, 'system', $3, false)`,
            [TENANT_ID(), customerId, `Alert resent for order ${orderId}`],
          );
        }
        await auditAction({ action, domain: "crm", tableName: "activity_log", recordId: null, afterData: { orderId, customerId }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, orderId, message: "Alert resent (logged to activity_log + crm_notes)" });
      }

      // ───────────────────────────────────────────────────────────────────
      // COUPONS / DISCOUNTS handlers
      // ───────────────────────────────────────────────────────────────────

      case "register_coupons": {
        // accts_register_coupons → register_coupons
        // commerce_coupons: id, tenant_id, promotion_id, code (NOT NULL),
        // customer_id, usage_limit, usage_count (NOT NULL), status (NOT NULL),
        // valid_from, valid_to
        const coupons = (payload.coupons as Array<{
          code: string;
          promotion_id?: string;
          customer_id?: string;
          usage_limit?: number;
          valid_from?: string;
          valid_to?: string;
        }>) || [];
        // Single-coupon convenience path
        if (coupons.length === 0 && payload.code) {
          coupons.push({
            code: String(payload.code),
            promotion_id: payload.promotion_id ? String(payload.promotion_id) : undefined,
            customer_id: payload.customer_id ? String(payload.customer_id) : undefined,
            usage_limit: payload.usage_limit !== undefined ? Number(payload.usage_limit) : undefined,
            valid_from: payload.valid_from ? String(payload.valid_from) : undefined,
            valid_to: payload.valid_to ? String(payload.valid_to) : undefined,
          });
        }
        const results: Array<{ code: string; couponId: string | null }> = [];
        for (const c of coupons) {
          const rows = await pgQuery<{ id: string }>(
            `INSERT INTO public.commerce_coupons
               (id, tenant_id, promotion_id, code, customer_id, usage_limit, usage_count,
                status, valid_from, valid_to)
             VALUES (gen_random_uuid(), $1, $2::uuid, $3, $4::uuid, $5, 0, 'active', $6, $7)
             RETURNING id`,
            [TENANT_ID(), c.promotion_id || null, c.code, c.customer_id || null, c.usage_limit || null, c.valid_from || null, c.valid_to || null],
          );
          results.push({ code: c.code, couponId: rows[0]?.id ?? null });
        }
        await auditAction({ action, domain: "commerce", tableName: "commerce_coupons", recordId: null, afterData: { count: results.length, coupons: results }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: results.length, coupons: results });
      }

      case "register_discounts": {
        // accts_register_discounts → register_discounts
        // We use commerce_promotions (the umbrella table for both discounts
        // and promotions). Required NOT NULL columns: code, name, promotion_type,
        // value, active, rules (jsonb), actions (jsonb).
        const discounts = (payload.discounts as Array<{
          code: string;
          name: string;
          promotion_type?: string;
          value?: number;
          minimum_subtotal?: number;
          maximum_discount?: number;
          start_at?: string;
          end_at?: string;
          usage_limit?: number;
        }>) || [];
        // Single-discount convenience path
        if (discounts.length === 0 && payload.code) {
          discounts.push({
            code: String(payload.code),
            name: String(payload.name || payload.code),
            promotion_type: payload.promotion_type ? String(payload.promotion_type) : "fixed_amount",
            value: payload.value !== undefined ? Number(payload.value) : 0,
            minimum_subtotal: payload.minimum_subtotal !== undefined ? Number(payload.minimum_subtotal) : undefined,
            maximum_discount: payload.maximum_discount !== undefined ? Number(payload.maximum_discount) : undefined,
            start_at: payload.start_at ? String(payload.start_at) : undefined,
            end_at: payload.end_at ? String(payload.end_at) : undefined,
            usage_limit: payload.usage_limit !== undefined ? Number(payload.usage_limit) : undefined,
          });
        }
        const results: Array<{ code: string; promotionId: string | null }> = [];
        for (const d of discounts) {
          const rows = await pgQuery<{ id: string }>(
            `INSERT INTO public.commerce_promotions
               (id, tenant_id, code, name, promotion_type, value, minimum_subtotal,
                maximum_discount, start_at, end_at, usage_limit, usage_count, active, rules, actions)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, true, '{}'::jsonb, '{}'::jsonb)
             RETURNING id`,
            [TENANT_ID(), d.code, d.name, d.promotion_type || "fixed_amount", d.value || 0, d.minimum_subtotal || 0, d.maximum_discount || 0, d.start_at || null, d.end_at || null, d.usage_limit || null],
          );
          results.push({ code: d.code, promotionId: rows[0]?.id ?? null });
        }
        await auditAction({ action, domain: "commerce", tableName: "commerce_promotions", recordId: null, afterData: { count: results.length, discounts: results }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, count: results.length, discounts: results });
      }

      // ───────────────────────────────────────────────────────────────────
      // RETURNS — review, track, view. Uses erp_return_authorizations
      // (the RMA table) + erp_return_lines for itemized breakdowns.
      // ───────────────────────────────────────────────────────────────────

      case "review_return": {
        // order_review_return → review_return
        // Update a return authorization's status + notes. The admin
        // inspects the return and either approves (status='inspection')
        // or rejects (status='rejected').
        // erp_return_status enum: requested, approved, awaiting_package,
        // in_transit, received, inspection, approved_for_refund,
        // rejected, restocked, refunded, exchanged, completed, cancelled
        const rmaId = String(payload.rma_id || payload.return_id || "");
        const decision = String(payload.decision || "inspection");
        const notes = payload.notes ? String(payload.notes) : null;
        // Validate the decision against the enum
        const VALID_DECISIONS = new Set(["inspection", "approved_for_refund", "rejected", "restocked", "completed", "cancelled"]);
        const newStatus = VALID_DECISIONS.has(decision) ? decision : "inspection";
        const updated = await pgExec(
          `UPDATE public.erp_return_authorizations
              SET status = $1::erp_return_status, notes = COALESCE($2, notes),
                  approved_at = CASE WHEN $1 IN ('approved_for_refund','restocked','completed') THEN now() ELSE approved_at END,
                  updated_at = now()
            WHERE id = $3::uuid AND tenant_id = $4`,
          [newStatus, notes, rmaId, TENANT_ID()],
        );
        await auditAction({ action, domain: "erp", tableName: "erp_return_authorizations", recordId: rmaId, afterData: { newStatus, notes, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, rmaId, newStatus, updated, message: updated ? `Return ${newStatus}` : "Return not found" });
      }

      case "track_return": {
        // order_track_return → track_return
        // Read-only: return the RMA status + key dates so the admin can
        // see where the return is in the pipeline.
        const rmaId = String(payload.rma_id || payload.return_id || "");
        const rows = await pgQuery<{
          id: string; rma_number: string; status: string; order_id: string;
          requested_at: string; approved_at: string | null; received_at: string | null; completed_at: string | null;
        }>(
          `SELECT id, rma_number, status::text, order_id,
                  requested_at::text, approved_at::text, received_at::text, completed_at::text
             FROM public.erp_return_authorizations
            WHERE id = $1::uuid AND tenant_id = $2`,
          [rmaId, TENANT_ID()],
        );
        if (rows.length === 0) {
          return NextResponse.json({ ok: false, error: "Return not found" }, { status: 404 });
        }
        const r = rows[0];
        const result = {
          rmaId: r.id, rmaNumber: r.rma_number, status: r.status, orderId: r.order_id,
          requestedAt: r.requested_at, approvedAt: r.approved_at,
          receivedAt: r.received_at, completedAt: r.completed_at,
        };
        await auditAction({ action, domain: "erp", tableName: "erp_return_authorizations", recordId: rmaId, afterData: { status: r.status }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, returnTracking: result });
      }

      case "view_return": {
        // order_view_return → view_return
        // Read-only: return the full RMA details + itemized return lines
        // (sku, qty requested/received/approved).
        const rmaId = String(payload.rma_id || payload.return_id || "");
        const rmaRows = await pgQuery<{
          id: string; rma_number: string; status: string; order_id: string;
          crm_customer_id: string | null; reason_code: string | null;
          requested_at: string; approved_at: string | null; received_at: string | null;
          completed_at: string | null; notes: string | null;
        }>(
          `SELECT id, rma_number, status::text, order_id, crm_customer_id,
                  reason_code, requested_at::text, approved_at::text, received_at::text,
                  completed_at::text, notes
             FROM public.erp_return_authorizations
            WHERE id = $1::uuid AND tenant_id = $2`,
          [rmaId, TENANT_ID()],
        );
        if (rmaRows.length === 0) {
          return NextResponse.json({ ok: false, error: "Return not found" }, { status: 404 });
        }
        const r = rmaRows[0];
        // Get the return line items
        const lineRows = await pgQuery<{
          id: string; sku_id: string; quantity_requested: string;
          quantity_received: string; quantity_approved: string;
        }>(
          `SELECT id, sku_id, quantity_requested::text, quantity_received::text, quantity_approved::text
             FROM public.erp_return_lines
            WHERE rma_id = $1::uuid AND tenant_id = $2`,
          [rmaId, TENANT_ID()],
        );
        const lines = lineRows.map(l => ({
          lineId: l.id, skuId: l.sku_id,
          quantityRequested: Number(l.quantity_requested),
          quantityReceived: Number(l.quantity_received),
          quantityApproved: Number(l.quantity_approved),
        }));
        const result = {
          rmaId: r.id, rmaNumber: r.rma_number, status: r.status, orderId: r.order_id,
          customerId: r.crm_customer_id, reasonCode: r.reason_code,
          requestedAt: r.requested_at, approvedAt: r.approved_at,
          receivedAt: r.received_at, completedAt: r.completed_at, notes: r.notes,
          lines,
        };
        await auditAction({ action, domain: "erp", tableName: "erp_return_authorizations", recordId: rmaId, afterData: { status: r.status, lineCount: lines.length }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, returnDetails: result });
      }

      // ───────────────────────────────────────────────────────────────────
      // INVENTORY EXPORTS — CSV stock levels + ledger movement log
      // ───────────────────────────────────────────────────────────────────

      case "export_csv":
      case "inv_export_csv": {
        // inv_export_csv → export_csv
        // Return current stock levels from erp_inventory_balances as a
        // structured array (the frontend can render as a CSV download).
        const rows = await pgQuery<{
          id: string; sku_id: string; warehouse_id: string | null;
          on_hand: string; reserved: string; allocated: string;
          picked: string; packed: string; in_transit: string;
          unit_cost: string; inventory_status: string;
        }>(
          `SELECT id, sku_id, warehouse_id,
                  on_hand::text, reserved::text, allocated::text,
                  picked::text, packed::text, in_transit::text,
                  unit_cost::text, inventory_status::text
             FROM public.erp_inventory_balances
            WHERE tenant_id = $1
            ORDER BY sku_id`,
          [TENANT_ID()],
        );
        const inventory = rows.map(r => ({
          id: r.id, skuId: r.sku_id, warehouseId: r.warehouse_id,
          onHand: Number(r.on_hand), reserved: Number(r.reserved),
          allocated: Number(r.allocated), picked: Number(r.picked),
          packed: Number(r.packed), inTransit: Number(r.in_transit),
          available: Number(r.on_hand) - Number(r.reserved) - Number(r.allocated),
          unitCost: Number(r.unit_cost),
          inventoryValue: Number(r.on_hand) * Number(r.unit_cost),
          inventoryStatus: r.inventory_status,
        }));
        const result = {
          totalSkus: inventory.length,
          totalOnHand: inventory.reduce((s, r) => s + r.onHand, 0),
          totalValue: inventory.reduce((s, r) => s + r.inventoryValue, 0),
          inventory,
        };
        await auditAction({ action, domain: "erp", tableName: "erp_inventory_balances", recordId: null, afterData: { totalSkus: inventory.length, totalValue: result.totalValue }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, csvData: result });
      }

      case "inv_export_ledger":
      case "export_ledger": {
        // inv_export_ledger → export_ledger
        // Return the full inventory movement history from erp_inventory_movements.
        // This is the stock ledger — every receipt, sale, transfer, adjustment.
        const rows = await pgQuery<{
          id: string; movement_type: string; sku_id: string; warehouse_id: string | null;
          quantity: string; unit_cost: string; total_cost: string | null;
          source_type: string | null; source_id: string | null;
          reference: string | null; reason: string | null;
          occurred_at: string;
        }>(
          `SELECT id, movement_type::text, sku_id, warehouse_id,
                  quantity::text, unit_cost::text, total_cost::text,
                  source_type, source_id, reference, reason, occurred_at::text
             FROM public.erp_inventory_movements
            WHERE tenant_id = $1
            ORDER BY occurred_at DESC LIMIT 500`,
          [TENANT_ID()],
        );
        const movements = rows.map(r => ({
          id: r.id, movementType: r.movement_type, skuId: r.sku_id,
          warehouseId: r.warehouse_id, quantity: Number(r.quantity),
          unitCost: Number(r.unit_cost), totalCost: Number(r.total_cost || 0),
          sourceType: r.source_type, sourceId: r.source_id,
          reference: r.reference, reason: r.reason, occurredAt: r.occurred_at,
        }));
        const result = {
          totalMovements: movements.length,
          totalQuantity: movements.reduce((s, m) => s + Math.abs(m.quantity), 0),
          totalCost: movements.reduce((s, m) => s + Math.abs(m.totalCost), 0),
          movements,
        };
        await auditAction({ action, domain: "erp", tableName: "erp_inventory_movements", recordId: null, afterData: { totalMovements: movements.length, totalQuantity: result.totalQuantity }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, ledgerData: result });
      }

      // ───────────────────────────────────────────────────────────────────
      // FULFILLMENT PRINT ACTIONS — packing slip, batch slips, postage
      // labels. These return structured data the frontend renders as a
      // printable view or PDF. Uses erp_orders + erp_order_lines for
      // line-item detail and commerce_orders for shipping info.
      // ───────────────────────────────────────────────────────────────────

      case "packing_slip": {
        // order_packing_slip → packing_slip
        // Generate a single packing slip: order header + line items.
        const orderId = String(payload.order_id || "");
        // Try erp_orders first (UUID-based, has line items)
        const erpRows = await pgQuery<{
          id: string; order_number: string; status: string;
          order_date: string; customer_email: string | null; customer_phone: string | null;
          fulfillment_method: string; total: string;
        }>(
          `SELECT id, order_number, status::text, order_date::text,
                  customer_email, customer_phone, fulfillment_method::text, total::text
             FROM public.erp_orders
            WHERE id = $1::uuid AND tenant_id = $2`,
          [orderId, TENANT_ID()],
        );
        if (erpRows.length > 0) {
          const o = erpRows[0];
          const lineRows = await pgQuery<{
            id: string; sku_id: string; description: string | null;
            quantity: string; unit_price: string;
          }>(
            `SELECT id, sku_id, description, quantity::text, unit_price::text
               FROM public.erp_order_lines
              WHERE order_id = $1::uuid AND tenant_id = $2
              ORDER BY id`,
            [orderId, TENANT_ID()],
          );
          const lines = lineRows.map(l => ({
            lineId: l.id, skuId: l.sku_id, description: l.description,
            quantity: Number(l.quantity), unitPrice: Number(l.unit_price),
            lineTotal: Number(l.quantity) * Number(l.unit_price),
          }));
          await auditAction({ action, domain: "erp", tableName: "erp_orders", recordId: orderId, afterData: { orderNumber: o.order_number, lineCount: lines.length }, actorUserId: actorId, ipAddress: ip });
          return NextResponse.json({ ok: true, packingSlip: {
            orderId: o.id, orderNumber: o.order_number, status: o.status,
            orderDate: o.order_date, customerEmail: o.customer_email,
            customerPhone: o.customer_phone, fulfillmentMethod: o.fulfillment_method,
            total: Number(o.total), lines, lineCount: lines.length,
          }});
        }
        // Fallback to commerce_orders (text-based ID)
        const coRows = await pgQuery<{ id: string; customer_email: string | null; total_amount: string; status: string; fulfillment_status: string }>(
          `SELECT id, customer_email, total_amount::text, status, fulfillment_status
             FROM public.commerce_orders WHERE id = $1 AND tenant_id = $2`,
          [orderId, TENANT_ID()],
        );
        if (coRows.length === 0) {
          return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
        }
        const co = coRows[0];
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: orderId, afterData: { lineCount: 0 }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, packingSlip: {
          orderId: co.id, orderNumber: co.id, status: co.status,
          fulfillmentStatus: co.fulfillment_status, customerEmail: co.customer_email,
          total: Number(co.total_amount), lines: [], lineCount: 0,
        }});
      }

      case "batch_slips": {
        // fulfill_batch_slips → batch_slips
        // Generate packing slips for multiple orders at once. If no
        // order_ids provided, selects all orders in 'released' or
        // 'picking' or 'packing' fulfillment status.
        const orderIds = (payload.order_ids as string[]) || null;
        let orders: Array<{ id: string; order_number: string; status: string; customer_email: string | null; total: string }> = [];
        if (orderIds && orderIds.length > 0) {
          const rows = await pgQuery<{ id: string; order_number: string; status: string; customer_email: string | null; total: string }>(
            `SELECT id, order_number, status::text, customer_email, total::text
               FROM public.erp_orders
              WHERE tenant_id = $1 AND id = ANY($2::uuid[])
              ORDER BY order_date DESC`,
            [TENANT_ID(), orderIds],
          );
          orders = rows as any[];
        } else {
          // Auto-select orders needing fulfillment
          const rows = await pgQuery<{ id: string; order_number: string; status: string; customer_email: string | null; total: string }>(
            `SELECT id, order_number, status::text, customer_email, total::text
               FROM public.erp_orders
              WHERE tenant_id = $1 AND status IN ('released','picking','packing','partially_shipped')
              ORDER BY order_date DESC LIMIT 50`,
            [TENANT_ID()],
          );
          orders = rows as any[];
        }
        // For each order, get its lines
        const slips = [];
        for (const o of orders) {
          const lineRows = await pgQuery<{ id: string; sku_id: string; description: string | null; quantity: string; unit_price: string }>(
            `SELECT id, sku_id, description, quantity::text, unit_price::text
               FROM public.erp_order_lines
              WHERE order_id = $1::uuid AND tenant_id = $2 ORDER BY id`,
            [o.id, TENANT_ID()],
          );
          slips.push({
            orderId: o.id, orderNumber: o.order_number, status: o.status,
            customerEmail: o.customer_email, total: Number(o.total),
            lines: lineRows.map(l => ({
              lineId: l.id, skuId: l.sku_id, description: l.description,
              quantity: Number(l.quantity), unitPrice: Number(l.unit_price),
            })),
            lineCount: lineRows.length,
          });
        }
        const result = { slipCount: slips.length, totalLines: slips.reduce((s, sl) => s + sl.lineCount, 0), slips };
        await auditAction({ action, domain: "erp", tableName: "erp_orders", recordId: null, afterData: { slipCount: slips.length, totalLines: result.totalLines }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, batchSlips: result });
      }

      case "postage":
      case "print_postage":
      case "print_postage_labels": {
        // fulfill_postage → postage
        // Generate postage label data: carrier, tracking number,
        // shipping address from commerce_orders.
        const orderId = String(payload.order_id || "");
        // Try commerce_orders first (has tracking_number, carrier, shipping_address)
        const coRows = await pgQuery<{
          id: string; tracking_number: string | null; carrier: string | null;
          shipping_address: string | null; fulfillment_method: string | null;
          customer_email: string | null; total_amount: string;
          fulfillment_status: string;
        }>(
          `SELECT id, tracking_number, carrier, shipping_address,
                  fulfillment_method, customer_email, total_amount::text,
                  fulfillment_status
             FROM public.commerce_orders
            WHERE id = $1 AND tenant_id = $2`,
          [orderId, TENANT_ID()],
        );
        if (coRows.length === 0) {
          return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
        }
        const o = coRows[0];
        // Parse shipping_address if it's JSON
        let shippingAddress: Record<string, unknown> | null = null;
        try {
          if (o.shipping_address) shippingAddress = JSON.parse(o.shipping_address);
        } catch { shippingAddress = { raw: o.shipping_address }; }
        const result = {
          orderId: o.id, carrier: o.carrier, trackingNumber: o.tracking_number,
          fulfillmentMethod: o.fulfillment_method, fulfillmentStatus: o.fulfillment_status,
          customerEmail: o.customer_email, total: Number(o.total_amount),
          shippingAddress,
        };
        await auditAction({ action, domain: "commerce", tableName: "commerce_orders", recordId: orderId, afterData: { carrier: o.carrier, trackingNumber: o.tracking_number }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, postageLabel: result });
      }

      case "edit_vendor": {
        // po_edit_vendor → edit_vendor
        // Update a vendor's contact info, payment terms, or active status.
        const vendorId = String(payload.vendor_id || "");
        const name = payload.name ? String(payload.name) : null;
        const email = payload.email !== undefined ? String(payload.email) : null;
        const phone = payload.phone !== undefined ? String(payload.phone) : null;
        const taxIdentifier = payload.tax_identifier !== undefined ? String(payload.tax_identifier) : null;
        const paymentTerms = payload.payment_terms !== undefined ? String(payload.payment_terms) : null;
        const currency = payload.currency !== undefined ? String(payload.currency) : null;
        const isActive = payload.is_active !== undefined ? Boolean(payload.is_active) : null;
        const updated = await pgExec(
          `UPDATE public.erp_vendors
              SET name = COALESCE($1, name),
                  email = COALESCE($2, email),
                  phone = COALESCE($3, phone),
                  tax_identifier = COALESCE($4, tax_identifier),
                  payment_terms = COALESCE($5, payment_terms),
                  currency = COALESCE($6, currency),
                  is_active = COALESCE($7, is_active),
                  updated_at = now()
            WHERE id = $8::uuid AND tenant_id = $9`,
          [name, email, phone, taxIdentifier, paymentTerms, currency, isActive, vendorId, TENANT_ID()],
        );
        await auditAction({ action, domain: "erp", tableName: "erp_vendors", recordId: vendorId, afterData: { name, email, phone, updated }, actorUserId: actorId, ipAddress: ip });
        return NextResponse.json({ ok: true, vendorId, updated, message: updated ? "Vendor updated" : "Vendor not found" });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[commerce/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
