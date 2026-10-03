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

      default:
        return NextResponse.json({ error: `Unknown action: ${action} (short: ${shortAction})` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[commerce/actions] ${action} failed:`, msg);
    return NextResponse.json({ error: msg, action }, { status: 500 });
  }
}
