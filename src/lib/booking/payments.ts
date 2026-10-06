import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { buildBookingIcs } from "@/lib/booking/ics"
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
// ---------------------------------------------------------------------------

const DEPOSIT_CENTS = 2500

function confirmedHtml(name: string, dog: string, date: string, time: string, items: string[], total: string, paid: string, balance: string) {
  const itemList = items.map((i) => `<p style="margin:2px 0">${i}</p>`).join("")
  const balanceLine = Number(balance.replace(/[^0-9.]/g, "")) > 0
    ? `<p><strong>Balance at the salon:</strong> ${balance}</p>`
    : `<p><strong>Paid in full</strong> — nothing owed at the visit.</p>`
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a">
    <p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Appointment Confirmed</p>
    <h1 style="font-size:28px;line-height:1.1;margin:8px 0 0">You're booked, ${name}!</h1>
    <p style="font-style:italic;color:#9a7b3c;font-size:20px;margin:4px 0 16px">From Pawz to PAWfection</p>
    <div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0">
      <p><strong>Dog:</strong> ${dog}</p>
      <p><strong>Date:</strong> ${date} at ${time}</p>
      <p style="margin-bottom:2px"><strong>Services:</strong></p>${itemList}
      <p><strong>Total (with tax):</strong> ${total}</p>
      <p><strong>Paid now:</strong> ${paid}</p>
      ${balanceLine}
    </div>
    <p>Need to change anything? Manage your appointment any time from <a href="https://aapawz.com/customer/appointments" style="color:#9a7b3c">your portal</a>.</p>
  </body></html>`
}

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
  if (confirms && String(booking.status || "").toUpperCase() !== "CONFIRMED") {
    try {
      const items = Array.isArray(parseItems(booking.itemsJson)) ? parseItems(booking.itemsJson) : []
      const itemLines = items.length
        ? items.map((l: any) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""} — ${centsToDollars(Number(l.lineCents) || 0)}`)
        : [`${booking.service || "Grooming"} — ${booking.servicePrice || ""}`]
      if (booking.email) {
        // The .ics attachment — Google/Apple/Outlook recognize the email as
        // a calendar event and offer to save the appointment.
        const icsContent = buildBookingIcs({
          bookingId: booking.id,
          dogName: booking.dogName,
          serviceNames: items.length > 0 ? items.map((l: any) => String(l.name)) : [booking.service || "Grooming"],
          date: booking.date || "",
          time: booking.time || "",
          durationMinutes: 120,
          totalDisplay: totalCents > 0 ? centsToDollars(totalCents) : booking.servicePrice || "",
          balanceDisplay: centsToDollars(Math.max(0, totalCents - newPaid)),
        })
        await sendEmail({
          to: booking.email,
          template: "booking_confirmed",
          subject: "Your appointment is confirmed — All About Pawz",
          html: confirmedHtml(
            booking.ownerName || "there",
            booking.dogName || "your pup",
            booking.date || "",
            booking.time || "",
            itemLines,
            totalCents > 0 ? centsToDollars(totalCents) : booking.servicePrice || "",
            centsToDollars(opts.amountCents),
            centsToDollars(Math.max(0, totalCents - newPaid)),
          ),
          relatedBookingId: booking.id,
          attachments: [
            {
              filename: "all-about-pawz-appointment.ics",
              content: Buffer.from(icsContent, "utf8").toString("base64"),
            },
          ],
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
