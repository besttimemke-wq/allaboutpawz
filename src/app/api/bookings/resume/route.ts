import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { withPg } from "@/lib/crm/enterprise"
import { callbackBase } from "@/lib/site-url"

// ============================================================================
// POST /api/bookings/resume  { bookingId?: string, email?: string }
// ----------------------------------------------------------------------------
// Abandoned-deposit recovery. When a customer bounces off the Stripe deposit
// checkout (cancel/back/close), the booking already exists in PAYMENT_PENDING
// with the dog, grooming profile, and CRM rows intact — this endpoint reopens
// a FRESH Stripe Checkout Session for the SAME booking (no duplicate rows) so
// they can finish paying. Lookup order: explicit bookingId, else the most
// recent PAYMENT_PENDING booking for the email.
// ============================================================================

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}
const DEPOSIT_AMOUNT = 2500 // $25.00 in cents

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const bookingId = String(body?.bookingId || "").trim() || null
    const email = String(body?.email || "").trim().toLowerCase() || null

    if (!bookingId && !email) {
      return NextResponse.json({ error: "bookingId or email is required" }, { status: 400 })
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Payments are not configured. Set STRIPE_SECRET_KEY in .env." }, { status: 503 })
    }

    // 1. Find the resumable booking — PAYMENT_PENDING and not already paid.
    //    (A session the webhook marked ABANDONED is still resumable — the
    //    customer is HERE, so hand them a fresh session.)
    const booking = await withPg(async (client) => {
      let rows: any[] = []
      if (bookingId) {
        const r = await client.query(
          `SELECT * FROM public.bookings WHERE id = $1 LIMIT 1`,
          [bookingId],
        )
        rows = r.rows
      }
      if (!rows[0] && email) {
        const r = await client.query(
          `SELECT * FROM public.bookings
           WHERE lower(email) = $1 AND status = 'PAYMENT_PENDING'
           ORDER BY "createdAt" DESC LIMIT 1`,
          [email],
        )
        rows = r.rows
      }
      return rows[0] || null
    }).catch(() => null)

    if (!booking) {
      return NextResponse.json({ error: "No pending booking found to resume." }, { status: 404 })
    }
    if (booking.status === "CONFIRMED" || booking.paymentStatus === "PAID") {
      return NextResponse.json({ error: "This booking is already confirmed — nothing to pay." }, { status: 409 })
    }

    // 2. Fresh Stripe session, same metadata contract as the original checkout.
    const origin = callbackBase(req)
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "Grooming Deposit — All About Pawz" },
          unit_amount: DEPOSIT_AMOUNT,
        },
        quantity: 1,
      }],
      success_url: `${origin}/book/appointment?success=booking&booking_id=${booking.id}`,
      cancel_url: `${origin}/book/appointment?cancelled=1`,
      metadata: {
        bookingId: String(booking.id),
        type: "booking_deposit",
        customerId: booking.customerId || "",
        dogId: booking.dogId || "",
        ownerName: booking.ownerName || "",
        dogName: booking.dogName || "",
        resumed: "1",
      },
    })

    // 3. Point the booking at the new session + reopen the pending payment row.
    await withPg(async (client) => {
      await client.query(
        `UPDATE public.bookings
         SET "stripeCheckoutSessionId" = $2, "paymentStatus" = 'UNPAID', "updatedAt" = now()
         WHERE id = $1`,
        [String(booking.id), session.id],
      )
      await client.query(
        `UPDATE public.commerce_payments
         SET status = 'pending', external_reference = $2
         WHERE payment_number = $1`,
        [`PAY-${String(booking.id).slice(0, 8).toUpperCase()}`, session.id],
      ).catch(() => {/* payment row is best-effort */})
    })

    return NextResponse.json({ url: session.url, sessionId: session.id, bookingId: booking.id })
  } catch (err: any) {
    console.error("[POST /api/bookings/resume]", err?.message)
    return NextResponse.json({ error: err?.message || "Resume failed" }, { status: 500 })
  }
}
