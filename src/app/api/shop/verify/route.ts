import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"

// GET /api/shop/verify?session_id=cs_test_…
//
// Called by the shop success screen right after Stripe redirects back.
// Retrieves the session directly from Stripe (server-side) and, when the
// payment is complete, marks the order PAID + sends the receipt email —
// idempotently (only when the order isn't already PAID). This makes order
// fulfillment work even before the Stripe webhook endpoint is registered;
// when the webhook IS live it runs the same transition first and this
// becomes a no-op confirmation.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured." }, { status: 503 })
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    const paid = session.payment_status === "paid"

    const orderId = session.metadata?.orderId
    let order: any = null
    if (orderId) order = await repo.get("orders", orderId)

    if (paid && order && order.paymentStatus !== "PAID") {
      await repo.update("orders", orderId, {
        status: "PAID",
        paymentStatus: "PAID",
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : "",
      } as any)
      order = { ...order, status: "PAID", paymentStatus: "PAID" }

      // Receipt email (non-fatal)
      const { sendPaymentReceipt } = await import("@/lib/email")
      const email = session.customer_details?.email || session.customer_email || ""
      if (email) {
        sendPaymentReceipt({
          customerId: session.metadata?.customerId,
          amount: order.subtotal || "",
          type: "order",
          email,
        }).catch(() => {})
      }

      // Activity log (non-fatal)
      try {
        await repo.create("activity_log", {
          entity: "order",
          entityId: orderId,
          action: "order_paid",
          summary: `Order ${orderId.slice(0, 8)}… paid via Stripe (${session.id.slice(0, 14)}…)`,
        })
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      paid,
      orderId: orderId || null,
      status: order?.status || "PENDING",
      amount: order?.subtotal || null,
    })
  } catch (e: any) {
    console.error("[shop/verify]", e)
    return NextResponse.json({ error: e.message || "Could not verify session" }, { status: 500 })
  }
}
