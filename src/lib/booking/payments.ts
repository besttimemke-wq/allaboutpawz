import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendBookingConfirmation } from "@/lib/email"
import { syncCrmAppointment } from "@/lib/crm/enterprise"
import { setCustomerSignal, bookingSignal, totalCentsOf } from "@/lib/booking/status"
import { centsToDollars } from "@/lib/booking/pricing"

// ---------------------------------------------------------------------------
// applyBookingPayment — the ONE place a booking's payment state changes.
//
// Called by the Stripe webhook (checkout.session.completed) and by the
// /api/bookings/status verifier (authoritative Stripe re-read). Idempotent:
// a booking already paid at/above the session amount is left untouched, so
// webhook + verifier racing each other is safe.
//
// The confirmation email rides the enterprise sender — sendBookingConfirmation
// (branded design-system frame + the .ics calendar attachment + the salon's
// internal notification) — with the payment facts rendered as a card.
// ---------------------------------------------------------------------------

const DEPOSIT_CENTS = 2500

type PaymentResult =
  | { ok: true; booking: any; changed: boolean }
  | { ok: false; reason: string }

export async function applyBookingPayment(opts: {
  bookingId?: string | null
  stripeSessionId?: string | null
  amountCents: number
  paymentIntentId?: string | null
  sessionId: string
}): Promise<PaymentResult> {
  // Find the booking by session id first (authoritative link), then metadata id.
  let booking: any = null
  try {
    if (opts.stripeSessionId) {
      const rows = (await repo.list("bookings")) as any[]
      booking = rows.find((b) => b.stripeCheckoutSessionId === opts.stripeSessionId) || null
    }
    if (!booking && opts.bookingId) {
      booking = await repo.get("bookings", opts.bookingId)
    }
  } catch { /* read failure below */ }
  if (!booking?.id) return { ok: false, reason: "booking_not_found" }

  const totalCents = totalCentsOf(booking)
  const alreadyPaid = Number(booking.paidCents || 0)
  const depositCents = totalCents > 0 ? Math.min(DEPOSIT_CENTS, totalCents) : DEPOSIT_CENTS

  // Idempotency — a session that was already applied must not double-count.
  if (booking.stripePaymentIntentId && opts.paymentIntentId && booking.stripePaymentIntentId === opts.paymentIntentId) {
    return { ok: true, booking, changed: false }
  }

  const newPaid = Math.min(totalCents > 0 ? totalCents : opts.amountCents, alreadyPaid + Math.max(0, opts.amountCents))
  if (newPaid <= alreadyPaid && String(booking.status || "").toUpperCase() === "CONFIRMED") {
    return { ok: true, booking, changed: false }
  }

  // Payments equal to or above the deposit confirm the slot.
  const confirms = opts.amountCents >= depositCents || newPaid >= depositCents
  const paymentStatus = totalCents > 0 && newPaid >= totalCents ? "PAID_IN_FULL" : "DEPOSIT_PAID"

  const patch: Record<string, any> = {
    paidCents: newPaid,
    paymentStatus,
    stripePaymentIntentId: opts.paymentIntentId || booking.stripePaymentIntentId || null,
    balanceDue: centsToDollars(Math.max(0, totalCents - newPaid)),
  }
  if (confirms && bookingSignal(booking) !== "cancelled") {
    patch.status = "CONFIRMED"
  }

  const updated = await repo.update("bookings", booking.id, patch)

  // The customer's real signal — they booked.
  await setCustomerSignal(booking.email, "ACTIVE").catch(() => {})

  // The confirmation email — fires once, on the transition to confirmed.
  //  Branded design-system frame + .ics calendar attachment + the salon's
  //  internal notification, all from the one enterprise sender.
  if (confirms && String(booking.status || "").toUpperCase() !== "CONFIRMED") {
    try {
      const items = Array.isArray(parseItems(booking.itemsJson)) ? parseItems(booking.itemsJson) : []
      const itemLines = items.length
        ? items.map((l: any) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""} — ${centsToDollars(Number(l.lineCents) || 0)}`)
        : [`${booking.service || "Grooming"} — ${booking.servicePrice || ""}`]
      if (booking.email) {
        await sendBookingConfirmation({
          customerId: booking.customerId || undefined,
          ownerName: booking.ownerName || "there",
          dogName: booking.dogName,
          service: booking.service || "Grooming",
          size: booking.size,
          date: booking.date,
          time: booking.time,
          email: booking.email,
          phone: booking.phone || "",
          notes: booking.notes || "",
          bookingId: booking.id,
          // Full intake on the salon's copy (owner direction).
          breed: booking.breed || null,
          weightLbs: booking.weightLbs ?? null,
          birthDate: booking.birthDate || null,
          itemLines,
          promoCode: booking.promoCode || null,
          pointsRedeemed: Number(booking.pointsRedeemed || 0) > 0 ? Number(booking.pointsRedeemed) : null,
          total: totalCents > 0 ? centsToDollars(totalCents) : booking.servicePrice || "",
          payment: {
            items: itemLines,
            total: totalCents > 0 ? centsToDollars(totalCents) : booking.servicePrice || "",
            paid: centsToDollars(opts.amountCents),
            balance: centsToDollars(Math.max(0, totalCents - newPaid)),
          },
        })
      }
    } catch (e: any) { console.error("[applyBookingPayment] confirmation email failed:", e.message) }
  }

  // CRM registry — best-effort.
  try { if (updated) await syncCrmAppointment(updated) } catch { /* non-fatal */ }

  return { ok: true, booking: updated || booking, changed: true }
}

function parseItems(json: any): any[] {
  if (!json) return []
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : [] } catch { return [] }
}

// Retrieve a live Stripe session and apply its payment status to a booking —
// the authoritative re-read used by /api/bookings/status (real-time truth
// even when the webhook is late or missing).
export async function verifyAndApplyStripePayment(booking: any): Promise<{ booking: any; stripeSession: Stripe.Checkout.Session | null }> {
  if (!process.env.STRIPE_SECRET_KEY || !booking?.stripeCheckoutSessionId) return { booking, stripeSession: null }
  let session: Stripe.Checkout.Session | null = null
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    session = await stripe.checkout.sessions.retrieve(booking.stripeCheckoutSessionId)
  } catch (e: any) {
    console.error("[verifyStripePayment] retrieve failed:", e?.message)
    return { booking, stripeSession: null }
  }
  if (session?.payment_status === "paid") {
    const res = await applyBookingPayment({
      bookingId: booking.id,
      stripeSessionId: session.id,
      amountCents: Number(session.amount_total || 0),
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
      sessionId: session.id,
    })
    return { booking: res.ok ? res.booking : booking, stripeSession: session }
  }
  return { booking, stripeSession: session }
}
