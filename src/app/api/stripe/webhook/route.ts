import { NextRequest } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { fulfillOrderFromSession } from "@/app/api/checkout/route"
import { sendBookingConfirmation, sendPaymentReceipt } from "@/lib/email"

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

        // 1. Confirm the booking
        if (bookingId) {
          await repo.update("bookings", bookingId, {
            status: "CONFIRMED",
            paymentStatus: "DEPOSIT_PAID",
            stripePaymentIntentId: paymentIntentId,
          })
        }

        // 2. Update the payment record to "paid"
        let paymentRecord: any = null
        try {
          const payments = (await repo.list("payments")) as any[]
          paymentRecord = payments.find((p) => p.stripeCheckoutSessionId === session.id)
          if (paymentRecord) {
            await repo.update("payments", paymentRecord.id, {
              status: "paid",
              stripePaymentIntentId: paymentIntentId,
            })
          }
        } catch { /* ignore */ }

        // 3. Get the booking details for the confirmation email
        let booking: any = null
        if (bookingId) {
          booking = await repo.get("bookings", bookingId)
        }

        // 4. Get the customer for the email
        let customer: any = null
        if (customerId) {
          customer = await repo.get("customers", customerId)
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
