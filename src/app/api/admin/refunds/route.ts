import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

// POST /api/admin/refunds — process a refund via Stripe.
// Body: { paymentIntentId?, chargeId?, amount, reason, customerId? }
// Creates a Stripe refund. Also records the refund in commerce_payments
// (status='refunded') for the accounting ledger.
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
