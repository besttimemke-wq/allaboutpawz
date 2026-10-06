import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sessionForPortal } from "@/lib/portal-session-scope"
import { bookingSignal, signalLabel, amountDueCents, abandonStaleBookings, totalCentsOf } from "@/lib/booking/status"
import { verifyAndApplyStripePayment } from "@/lib/booking/payments"
import { centsToDollars } from "@/lib/booking/pricing"

// ============================================================================
// GET /api/bookings/status?bookingId=… — the authoritative post-payment check.
//
// Called by the confirmation panel the moment the customer returns from
// Stripe. Reads the LIVE Stripe session (not the local row) and, if it has
// been paid, applies the payment through the same idempotent applier the
// webhook uses — so the confirmation the customer sees is real even when
// the webhook is seconds late. Session-scoped: a booking answers only to
// its owner.
// ============================================================================

function publicBooking(b: any) {
  const items = (() => {
    try { const v = JSON.parse(b.itemsJson || "[]"); return Array.isArray(v) ? v : [] } catch { return [] }
  })()
  const signal = bookingSignal(b)
  const totalC = totalCentsOf(b)
  const paidC = Number(b.paidCents || 0)
  return {
    id: b.id,
    status: String(b.status || ""),
    signal,
    signalLabel: signalLabel(signal),
    paymentStatus: String(b.paymentStatus || ""),
    payMode: b.payMode || null,
    date: b.date,
    time: b.time,
    dogName: b.dogName,
    breed: b.breed,
    service: b.service,
    items,
    subtotalCents: Number(b.subtotalCents || 0),
    taxCents: Number(b.taxCents || 0),
    totalCents: totalC,
    paidCents: paidC,
    amountDueCents: amountDueCents(b),
    subtotal: b.subtotalCents ? centsToDollars(Number(b.subtotalCents)) : null,
    tax: b.taxCents ? centsToDollars(Number(b.taxCents)) : null,
    total: totalC > 0 ? centsToDollars(totalC) : b.servicePrice || null,
    paid: paidC > 0 ? centsToDollars(paidC) : null,
    balanceDue: totalC > 0 ? centsToDollars(Math.max(0, totalC - paidC)) : null,
    questionnaireComplete: !!b.questionnaireJson,
  }
}

export async function GET(req: NextRequest) {
  try {
    const bookingId = new URL(req.url).searchParams.get("bookingId")
    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 })

    // Session-scoped — the confirmation answers only to its owner.
    const { user } = await sessionForPortal("customer")
    if (!user) {
      return NextResponse.json({ error: "not_signed_in", code: "NO_SESSION" }, { status: 401 })
    }
    const email = String(user.email || "").toLowerCase()

    // Lazily sweep stale unpaid bookings (real signals stay honest).
    await abandonStaleBookings().catch(() => {})

    const booking = await repo.get("bookings", bookingId).catch(() => null)
    if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const bookingEmail = String(booking.email || "").toLowerCase()
    if (bookingEmail !== email) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    // Pending payment? Ask Stripe directly — the truth at this instant.
    let current = booking
    if (String(booking.status || "").toUpperCase() === "PENDING_PAYMENT" && booking.stripeCheckoutSessionId) {
      const verified = await verifyAndApplyStripePayment(booking)
      current = verified.booking
    }

    const res = NextResponse.json({ booking: publicBooking(current) })
    res.headers.set("Cache-Control", "no-store, max-age=0")
    return res
  } catch (err: any) {
    console.error("[GET /api/bookings/status]", err)
    return NextResponse.json({ error: err.message || "Status check failed" }, { status: 500 })
  }
}
