import { NextRequest } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { fulfillOrderFromSession } from "@/app/api/checkout/route"
import { sendBookingConfirmation, sendPaymentReceipt } from "@/lib/email"
import { enrollCustomer } from "@/lib/auth/enroll-customer"
import pg from "pg"

// Writes the owner's commerce_deposits escrow registry row (find-or-create by
// deposit_number — deterministic off the booking id, so replays converge).
async function writeCommerceDeposit(opts: {
  depositNumber: string
  crmCustomerId: string
  amount: number
  notes: string
  paymentIntentId: string
}) {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION
  if (!cs) return
  const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    await client.query(
      `INSERT INTO public.commerce_deposits
         (tenant_id, deposit_number, customer_id, amount, currency, collected_at, method, status, notes, deposit_type)
       VALUES ($1, $2, $3::uuid, $4, 'USD', now(), 'card', 'held', $5, 'booking')
       ON CONFLICT DO NOTHING`,
      [TENANT_ID, opts.depositNumber, opts.crmCustomerId, opts.amount, opts.notes],
    )
  } finally {
    await client.end().catch(() => {})
  }
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
        if (bookingId) {
          await repo.update("bookings", bookingId, {
            status: "CONFIRMED",
            paymentStatus: "DEPOSIT_PAID",
            stripePaymentIntentId: paymentIntentId,
          })
        }

        // 3. Deposits & Escrow accounting entry — the payments row
        //    (type "deposit") is the transaction ledger entry: find-or-create,
        //    marked paid. No order row, no fake order — the operational
        //    booking data stays in Salon CRM. Idempotent on replay.
        try {
          const payments = (await repo.list("payments")) as any[]
          const paymentRecord = payments.find((p) => p.stripeCheckoutSessionId === session.id)
          if (paymentRecord) {
            await repo.update("payments", paymentRecord.id, {
              status: "paid",
              stripePaymentIntentId: paymentIntentId,
            })
          } else {
            await repo.create("payments", {
              bookingId: bookingId || null,
              customerId: customerId || null,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntentId,
              amount: "$25.00",
              type: "deposit",
              status: "paid",
            })
          }
        } catch { /* ignore */ }

        // 4. The owner's escrow registry table — commerce_deposits
        //    (customer_id -> crm_customers, deposit_number deterministic off
        //    the booking id so a replayed event finds the same row). The
        //    booking reference rides in notes for the Deposits & Escrow join.
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
            })
          } catch (e: any) {
            console.error("[webhook] commerce_deposits write failed:", e.message)
          }
        }

        // 5. Send confirmation email (triggered by webhook, NOT the success page)
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

        // 6. Log activity
        try {
          await repo.create("activity_log", {
            entity: "booking", entityId: bookingId || "", action: "deposit_paid",
            summary: `Deposit paid for booking ${bookingId?.slice(0, 8) || ""}…`,
          })
        } catch { /* ignore */ }
      } else {
        // Product order
        await fulfillOrderFromSession(session)
        const orderId = session.metadata?.orderId

        // Product revenue -> Accounting (Payments & Register): the payments
        // row (type "order") keyed off the order id. Orders feed accounting;
        // the deposit path above never touches this. Idempotent on replay.
        try {
          const order = orderId ? await repo.get("orders" as any, orderId) : null
          const payments = (await repo.list("payments")) as any[]
          const hasRow = payments.some((p) => p.orderId === orderId && p.type === "order")
          if (order && orderId && !hasRow) {
            await repo.create("payments", {
              orderId,
              customerId: order.customerId || null,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
              amount: order.subtotal || "",
              type: "order",
              status: "paid",
            })
          }
        } catch (e: any) {
          console.error("[webhook] order payment row failed:", e.message)
        }

        // Auto-enroll the buyer — single login created after money moved,
        // exact-email join, invite email sent by Supabase. Non-fatal.
        try {
          const order = orderId ? await repo.get("orders" as any, orderId) : null
          const enrollEmail = session.customer_details?.email || order?.email
          if (enrollEmail) {
            await enrollCustomer({ email: enrollEmail, source: "purchase", referenceId: orderId })
          }
        } catch (e: any) {
          console.error("[webhook] purchase enroll failed:", e.message)
        }
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent
      console.log("[webhook] payment failed:", intent.id)
      // Update payment record if exists
      try {
        const payments = (await repo.list("payments")) as any[]
        const payment = payments.find((p) => p.stripePaymentIntentId === intent.id)
        if (payment) {
          await repo.update("payments", payment.id, { status: "failed" })
        }
      } catch { /* ignore */ }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge
      console.log("[webhook] refund:", charge.id)
      try {
        const payments = (await repo.list("payments")) as any[]
        const payment = payments.find((p) => p.stripePaymentIntentId === charge.payment_intent)
        if (payment) {
          await repo.update("payments", payment.id, { status: "refunded" })
        }
        // Log activity
        await repo.create("activity_log", {
          entity: "payment", entityId: payment?.id || "", action: "refunded",
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
