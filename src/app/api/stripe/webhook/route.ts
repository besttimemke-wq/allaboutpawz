import { NextRequest } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { fulfillOrderFromSession } from "@/app/api/checkout/route"
import { sendBookingConfirmation, sendPaymentReceipt } from "@/lib/email"
import { enrollCustomer } from "@/lib/auth/enroll-customer"
import { syncCrmAppointment, writeCommercePayment, withPg, platformAudit, TENANT_ID, parseMoney } from "@/lib/crm/enterprise"
import { captureServerEvent, logAnalyticsEvent } from "@/lib/analytics-server"

// The owner's escrow registry + payment ledger — all money events land in HIS
// tables (never a parallel payments row):
//   commerce_payments (PAY-<bookingId8> / PAY-<orderId8>, deterministic → replay-safe)
//   commerce_deposits (DEP-<bookingId8>, payment_id → the commerce_payments row)
// The appointment registry (crm_appointments) is synced from the booking row
// on every state change this handler makes.
async function writeCommerceDeposit(opts: {
  depositNumber: string
  crmCustomerId: string
  amount: number
  notes: string
  paymentIntentId: string
  paymentId: string | null
}) {
  await withPg(async (client) => {
    // Link the registry row to the ledger row when one already exists.
    if (opts.paymentId) {
      const updated = await client.query(
        `UPDATE public.commerce_deposits
           SET payment_id = $3::uuid, collected_at = now(), status = 'held', method = 'card'
         WHERE tenant_id = $1 AND deposit_number = $2
         RETURNING id::text`,
        [TENANT_ID(), opts.depositNumber, opts.paymentId],
      )
      if (updated.rows[0]) return
    }
    await client.query(
      `INSERT INTO public.commerce_deposits
         (tenant_id, deposit_number, customer_id, amount, currency, collected_at, method, status, notes, deposit_type, payment_id)
       VALUES ($1, $2, $3::uuid, $4, 'USD', now(), 'card', 'held', $5, 'booking', $6::uuid)
       ON CONFLICT DO NOTHING`,
      [TENANT_ID(), opts.depositNumber, opts.crmCustomerId, opts.amount, opts.notes, opts.paymentId],
    )
  })
}

// Lazy Stripe client — module-level init would crash the route file when
// STRIPE_SECRET_KEY isn't set yet. Constructed on first authenticated use.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  if (!webhookSecret) {
    return new Response(JSON.stringify({ received: true, note: "STRIPE_WEBHOOK_SECRET not set" }), { status: 200, headers: { "Content-Type": "application/json" } })
  }
  const sig = req.headers.get("stripe-signature") || ""
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (e: any) {
    return new Response(JSON.stringify({ error: `Webhook signature failed: ${e.message}` }), { status: 400, headers: { "Content-Type": "application/json" } })
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session
      const type = session.metadata?.type

      if (type === "booking_deposit") {
        const bookingId = session.metadata?.bookingId
        const customerId = session.metadata?.customerId
        const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : ""

        // 1. Auto-enroll the customer FIRST (single login, exact-email join,
        //    crm_customers + portal_customer_accounts on the owner's tables).
        //    This is the real server-side event that creates the account —
        //    not the thank-you page. Non-fatal: a failure here must not block
        //    fulfillment (Stripe retries the event and everything converges
        //    because it is idempotent).
        let booking: any = null
        if (bookingId) booking = await repo.get("bookings", bookingId)
        let customer: any = null
        if (customerId) customer = await repo.get("customers", customerId)
        const enrollEmail = booking?.email || customer?.email || session.customer_details?.email
        let enrollResult: { crmCustomerId: string | null } | null = null
        if (enrollEmail) {
          try {
            enrollResult = await enrollCustomer({ email: enrollEmail, source: "booking", referenceId: bookingId })
          } catch (e: any) {
            console.error("[webhook] booking enroll failed:", e.message)
          }
        }

        // 2. Confirm the booking
        //    (pre-update state captured first — a replayed Stripe delivery
        //    sees the booking already CONFIRMED + DEPOSIT_PAID and skips the
        //    analytics below, keeping authoritative events replay-safe)
        const alreadyDepositPaid =
          booking?.status === "CONFIRMED" && booking?.paymentStatus === "DEPOSIT_PAID"
        if (bookingId) {
          await repo.update("bookings", bookingId, {
            status: "CONFIRMED",
            paymentStatus: "DEPOSIT_PAID",
            stripePaymentIntentId: paymentIntentId,
          })
          booking = booking
            ? { ...booking, status: "CONFIRMED", paymentStatus: "DEPOSIT_PAID", stripePaymentIntentId: paymentIntentId }
            : booking
        }

        // 2b. Authoritative analytics — the moment of truth: the deposit
        //     actually cleared (server-side, independent of cookie consent
        //     and of the thank-you page). purchase + booking_confirmed go to
        //     PostHog and the analytics_events log. Fail-safe by contract:
        //     neither helper ever throws, and the wrap is belt-and-braces so
        //     analytics can NEVER fail the payment flow.
        if (bookingId && !alreadyDepositPaid) {
          try {
            const distinctId =
              booking?.email || customer?.email || session.customer_details?.email || undefined
            const txnId = `PAY-${String(bookingId).slice(0, 8).toUpperCase()}`
            const purchaseProps = {
              transaction_id: txnId,
              value: 25,
              currency: "USD",
              items: [
                {
                  item_id: "booking_deposit",
                  item_name: `Grooming Deposit — ${booking?.dogName || booking?.service || "All About Pawz"}`,
                  price: 25,
                  quantity: 1,
                },
              ],
              booking_id: bookingId,
              service: booking?.service || null,
              dog_name: booking?.dogName || null,
              appointment_date: booking?.date || null,
              appointment_time: booking?.time || null,
              checkout_flow: "booking",
            }
            await captureServerEvent({ event: "purchase", distinctId, properties: purchaseProps })
            await logAnalyticsEvent({
              event: "purchase",
              data: purchaseProps,
              page: "/book/appointment",
              value: 25,
              currency: "USD",
            })
            const confirmedProps = {
              booking_id: bookingId,
              service: booking?.service || null,
              dog_name: booking?.dogName || null,
              date: booking?.date || null,
              time: booking?.time || null,
              deposit: 25,
              currency: "USD",
            }
            await captureServerEvent({ event: "booking_confirmed", distinctId, properties: confirmedProps })
            await logAnalyticsEvent({ event: "booking_confirmed", data: confirmedProps, page: "/book/appointment" })
          } catch { /* analytics must never fail the payment flow */ }
        }

        // 3. The payment ledger — commerce_payments (find-or-create by the
        //    deterministic payment number; a replayed event converges here).
        //    THE owner's table replaces the old app payments row.
        let paymentId: string | null = null
        if (bookingId) {
          try {
            paymentId = await withPg((client) =>
              writeCommercePayment(client, {
                paymentNumber: `PAY-${String(bookingId).slice(0, 8).toUpperCase()}`,
                amount: 25,
                status: "succeeded",
                customerId: enrollResult?.crmCustomerId || null,
                processorTransactionId: paymentIntentId || null,
                externalReference: session.id,
              }),
            )
          } catch (e: any) {
            console.error("[webhook] commerce_payments write failed:", e.message)
          }
        }

        // 4. The owner's escrow registry — commerce_deposits, now linked to
        //    the ledger row (payment_id). The booking reference rides in
        //    notes for the Deposits & Escrow join.
        if (enrollResult?.crmCustomerId && bookingId) {
          try {
            const depositNumber = `DEP-${String(bookingId).slice(0, 8).toUpperCase()}`
            const notes = JSON.stringify({ bookingId, service: booking?.service || null, dogName: booking?.dogName || null })
            await writeCommerceDeposit({
              depositNumber,
              crmCustomerId: enrollResult.crmCustomerId,
              amount: 25,
              notes,
              paymentIntentId,
              paymentId,
            })
          } catch (e: any) {
            console.error("[webhook] commerce_deposits write failed:", e.message)
          }
        }

        // 5. The appointment registry — crm_appointments + status history
        //    (precheck → confirmed, reason "deposit paid"). Non-fatal.
        if (booking) {
          try {
            await syncCrmAppointment(booking)
          } catch (e: any) {
            console.error("[webhook] crm_appointments sync failed:", e.message)
          }
        }

        // 5b. Real audit trail entry (his platform_audit_log).
        if (bookingId) {
          try {
            await withPg((client) =>
              platformAudit(client, {
                action: "payment.deposit.succeeded",
                targetType: "commerce_deposits",
                targetId: null,
                actorRole: "stripe_webhook",
                metadata: { bookingId, paymentNumber: `PAY-${String(bookingId).slice(0, 8).toUpperCase()}`, amount: 25 },
              }),
            )
          } catch { /* non-fatal */ }
        }

        // 6. Send confirmation email (triggered by webhook, NOT the success page)
        if (booking) {
          sendBookingConfirmation({
            customerId,
            ownerName: booking.ownerName,
            dogName: booking.dogName,
            service: booking.service,
            size: booking.size,
            date: booking.date,
            time: booking.time,
            email: booking.email || customer?.email,
            phone: booking.phone || customer?.phone,
            notes: booking.notes,
            bookingId: bookingId,
          }).catch((e: any) => console.error("[webhook] confirmation email failed:", e.message))

          // Send payment receipt
          if (booking.email || customer?.email) {
            sendPaymentReceipt({
              customerId,
              amount: "$25.00",
              type: "deposit",
              email: booking.email || customer?.email,
              bookingId,
            }).catch((e: any) => console.error("[webhook] receipt email failed:", e.message))
          }
        }

        // 7. Log activity
        try {
          await repo.create("activity_log", {
            entity: "booking", entityId: bookingId || "", action: "deposit_paid",
            summary: `Deposit paid for booking ${bookingId?.slice(0, 8) || ""}…`,
          })
        } catch { /* ignore */ }
      } else {
        // Product order
        const orderId = session.metadata?.orderId
        // Pre-fulfillment state — the natural replay dedupe for the analytics
        // below (a replayed delivery sees the order already PAID → no event).
        let alreadyPaid = false
        try {
          const before = orderId ? await repo.get("orders" as any, orderId) : null
          alreadyPaid = before?.paymentStatus === "PAID"
        } catch { /* ignore */ }
        await fulfillOrderFromSession(session)

        // 1. Auto-enroll the buyer FIRST — single login created after money
        //    moved, exact-email join, invite email sent by Supabase. The
        //    commerce_payments row below carries its crm_customers id.
        let crmCustomerId: string | null = null
        try {
          const order = orderId ? await repo.get("orders" as any, orderId) : null
          const enrollEmail = session.customer_details?.email || order?.email
          if (enrollEmail) {
            const enrollResult = await enrollCustomer({ email: enrollEmail, source: "purchase", referenceId: orderId })
            crmCustomerId = enrollResult.crmCustomerId
          }
        } catch (e: any) {
          console.error("[webhook] purchase enroll failed:", e.message)
        }

        // 2. Product revenue -> Accounting: the commerce_payments ledger row
        //    (PAY-<orderId8>) on the owner's table. Orders feed accounting;
        //    the deposit path above never touches this. Idempotent on replay.
        try {
          const order = orderId ? await repo.get("orders" as any, orderId) : null
          if (order && orderId) {
            const amount = parseMoney(order.total || order.subtotal || session.amount_total)
            if (amount > 0) {
              const paymentId = await withPg((client) =>
                writeCommercePayment(client, {
                  paymentNumber: `PAY-${String(orderId).slice(0, 8).toUpperCase()}`,
                  amount,
                  status: "succeeded",
                  customerId: crmCustomerId,
                  processorTransactionId: typeof session.payment_intent === "string" ? session.payment_intent : null,
                  externalReference: session.id,
                }),
              )
              if (paymentId) {
                await withPg((client) =>
                  platformAudit(client, {
                    action: "payment.order.succeeded",
                    targetType: "commerce_payments",
                    targetId: paymentId,
                    actorRole: "stripe_webhook",
                    metadata: { orderId, amount },
                  }),
                ).catch(() => {})
              }
            }
          }
        } catch (e: any) {
          console.error("[webhook] order payment row failed:", e.message)
        }

        // 3. Authoritative purchase analytics — fires only on the delivery
        //    that actually flipped the order to PAID (replays are deduped by
        //    the pre-fulfillment state above; when the /api/shop/verify route
        //    ran first, this branch never fires because the order is already
        //    PAID). Fail-safe: neither helper ever throws; the wrap is
        //    belt-and-braces so analytics can NEVER fail fulfillment.
        try {
          if (!alreadyPaid && orderId) {
            const order = await repo.get("orders" as any, orderId)
            // Mirror the commerce_payments ledger exactly: parseMoney of the
            // order total/subtotal display price → dollars.
            const value = parseMoney(order?.total || order?.subtotal || session.amount_total)
            const items = ((await repo.list("order_items" as any).catch(() => [])) as any[])
              .filter((it: any) => it.orderId === orderId)
              .map((it: any) => ({
                item_id: it.productId,
                item_name: it.name,
                price: parseMoney(it.unitPrice),
                quantity: Number(it.quantity) || 1,
              }))
            const distinctId = session.customer_details?.email || order?.email || undefined
            const props = {
              transaction_id: `PAY-${String(orderId).slice(0, 8).toUpperCase()}`,
              value,
              currency: "USD",
              items,
              order_id: orderId,
              checkout_flow: "shop",
            }
            await captureServerEvent({ event: "purchase", distinctId, properties: props })
            await logAnalyticsEvent({
              event: "purchase",
              data: props,
              page: "/shop",
              value,
              currency: "USD",
            })
          }
        } catch { /* analytics must never fail fulfillment */ }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent
      console.log("[webhook] payment failed:", intent.id)
      try {
        await withPg(async (client) => {
          await client.query(
            `UPDATE public.commerce_payments SET status = 'failed' WHERE tenant_id = $1 AND processor_transaction_id = $2`,
            [TENANT_ID(), intent.id],
          )
        })
      } catch { /* ignore */ }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      console.log("[webhook] refund:", charge.id)
      let paymentRowId: string | null = null
      try {
        await withPg(async (client) => {
          const updated = await client.query(
            `UPDATE public.commerce_payments SET status = 'refunded'
             WHERE tenant_id = $1 AND processor_transaction_id = $2
             RETURNING id::text`,
            [TENANT_ID(), charge.payment_intent],
          )
          paymentRowId = updated.rows[0]?.id || null
          // A refunded deposit releases its escrow registry row too.
          if (paymentRowId) {
            await client.query(
              `UPDATE public.commerce_deposits SET status = 'refunded', updated_at = now()
               WHERE tenant_id = $1 AND payment_id = $2::uuid`,
              [TENANT_ID(), paymentRowId],
            )
          }
        })
        // Log activity
        await repo.create("activity_log", {
          entity: "payment", entityId: paymentRowId || "", action: "refunded",
          summary: `Refund processed for ${charge.amount_refunded / 100} cents`,
        })
      } catch { /* ignore */ }
    } else if (event.type === "customer.updated") {
      const customer = event.data.object as Stripe.Customer
      console.log("[webhook] customer updated:", customer.id)
      // Update Supabase customer if linked
      try {
        const customers = (await repo.list("customers")) as any[]
        const local = customers.find((c) => c.stripeCustomerId === customer.id)
        if (local && customer.email && local.email !== customer.email) {
          await repo.update("customers", local.id, { email: customer.email })
        }
      } catch { /* ignore */ }
    }
  } catch (e: any) {
    console.error("[stripe webhook]", e)
  }
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } })
}
