import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

// ============================================================================
// /api/admin/refunds
//   GET  — list all commerce_refunds + commerce_disputes (joined with orders)
//   POST — process a refund via Stripe + record in commerce_payments
// ============================================================================

export async function GET() {
  const gate = await requireAdminApi();
  if (gate) return gate;

  const rows = await withPg(async (client) => {
    const tenant = TENANT_ID();

    // Fetch commerce_refunds joined with commerce_sales for customer info
    const { rows: refunds } = await client.query(`
      SELECT r.id::text, r.refund_number, r.sale_id::text AS sale_id,
             r.amount, r.reason, r.status, r.refund_method,
             r.processor_reference, r.created_at::text AS created_at,
             r.processed_at::text AS processed_at,
             s.customer_id::text AS customer_id,
             s.metadata->>'customer_email' AS customer_email
      FROM public.commerce_refunds r
      LEFT JOIN public.commerce_sales s ON s.id = r.sale_id
      WHERE r.tenant_id = $1
      ORDER BY r.created_at DESC
    `, [tenant]);

    // Fetch commerce_disputes
    const { rows: disputes } = await client.query(`
      SELECT d.id::text, d.dispute_number, d.refund_id::text AS refund_id,
             d.payment_id::text AS payment_id, d.sale_id::text AS sale_id,
             d.reason, d.status, d.amount, d.processor_dispute_id,
             d.created_at::text AS created_at
      FROM public.commerce_disputes d
      WHERE d.tenant_id = $1
      ORDER BY d.created_at DESC
    `, [tenant]);

    // Fetch commerce_refund_lines for each refund
    const refundIds = refunds.map((r: any) => r.id);
    let linesByRefund = new Map<string, any[]>();
    if (refundIds.length > 0) {
      const { rows: lines } = await client.query(
        `SELECT rl.id::text, rl.refund_id::text AS refund_id, rl.sale_line_id::text AS sale_line_id,
                rl.quantity, rl.amount, rl.restock, rl.disposition,
                sl.description AS item_name
         FROM public.commerce_refund_lines rl
         LEFT JOIN public.commerce_sale_lines sl ON sl.id = rl.sale_line_id
         WHERE rl.refund_id::text = ANY($1::text[])`,
        [refundIds],
      );
      for (const l of lines) {
        const arr = linesByRefund.get(l.refund_id) || [];
        arr.push(l);
        linesByRefund.set(l.refund_id, arr);
      }
    }

    return {
      refunds: refunds.map((r: any) => ({
        ...r,
        lines: linesByRefund.get(r.id) || [],
      })),
      disputes,
    };
  });

  return NextResponse.json(rows || { refunds: [], disputes: [] });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;

  let body: any; try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = parseFloat(String(body.amount || "0"));
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  }
  const reason = String(body.reason || "requested_by_customer");

  // Try Stripe refund if the Stripe SDK is available
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && (body.paymentIntentId || body.chargeId)) {
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey);
      const refundParams: any = { amount: Math.round(amount * 100), reason };
      if (body.paymentIntentId) refundParams.payment_intent = body.paymentIntentId;
      if (body.chargeId) refundParams.charge = body.chargeId;
      const refund = await stripe.refunds.create(refundParams);
      // Record in commerce_payments
      await withPg(async (client) => {
        const tenant = TENANT_ID();
        try {
          await client.query("SAVEPOINT refund_sp");
          await client.query(
            `INSERT INTO public.commerce_payments
               (tenant_id, customer_id, amount, status, currency, processor_transaction_id, external_reference, created_at)
             VALUES ($1::uuid, $2, $3::numeric, 'refunded', 'USD', $4, $5, now())`,
            [tenant, body.customerId || null, amount.toFixed(2), refund.id, `refund_${reason}`],
          );
          await platformAudit(client, {
            action: "refund.processed",
            targetType: "commerce_payment",
            targetId: refund.id,
            actorRole: "admin",
            metadata: { amount, reason, customerId: body.customerId || null },
          });
          await client.query("RELEASE SAVEPOINT refund_sp");
        } catch (dbErr) {
          console.warn("[api/admin/refunds POST] commerce_payments insert failed (non-fatal):", dbErr instanceof Error ? dbErr.message : dbErr);
          await client.query("ROLLBACK TO SAVEPOINT refund_sp").catch(() => {});
        }
      }).catch(() => {});
      return NextResponse.json({ ok: true, refundId: refund.id, amount, status: refund.status });
    } catch (stripeErr: any) {
      console.error("[api/admin/refunds POST] Stripe refund failed:", stripeErr?.message);
      return NextResponse.json({ error: `Stripe refund failed: ${stripeErr?.message}` }, { status: 502 });
    }
  }

  // No Stripe payment intent — just record the refund in the ledger
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    await client.query("BEGIN");
    try {
      const ins = await client.query(
        `INSERT INTO public.commerce_payments
           (tenant_id, customer_id, amount, status, currency, external_reference, created_at)
         VALUES ($1::uuid, $2, $3::numeric, 'refunded', 'USD', $4, now()) RETURNING id::text`,
        [tenant, body.customerId || null, amount.toFixed(2), `manual_refund_${reason}`],
      );
      try {
        await client.query("SAVEPOINT audit_sp");
        await platformAudit(client, {
          action: "refund.processed",
          targetType: "commerce_payment",
          targetId: ins.rows[0].id,
          actorRole: "admin",
          metadata: { amount, reason, customerId: body.customerId || null, manual: true },
        });
        await client.query("RELEASE SAVEPOINT audit_sp");
      } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, paymentId: ins.rows[0].id, amount, status: "refunded" }, { status: 201 });
    } catch (e: any) {
      await client.query("ROLLBACK").catch(() => {});
      return NextResponse.json({ error: e?.message }, { status: 500 });
    }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
