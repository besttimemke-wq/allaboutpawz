import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendEmail, sendAppointmentRescheduled, sendAppointmentCanceled, sendPreCheckIn } from "@/lib/email"
import { sessionForPortal } from "@/lib/portal-session-scope"
import {
  bookingSignal,
  signalLabel,
  amountDueCents,
  abandonStaleBookings,
  recomputeCustomerSignal,
  setCustomerSignal,
  totalCentsOf,
} from "@/lib/booking/status"
import { centsToDollars } from "@/lib/booking/pricing"
import { checkSlotAvailable } from "@/lib/booking/availability"

// ============================================================================
// /api/customer/appointments — the customer's own appointment registry.
//
//   GET   → their bookings with REAL signals (pending / booked / paid /
//           abandoned / cancelled / completed), upcoming & past, amounts.
//   POST  → the self-service actions — the customer controls their own
//           destiny: reschedule, cancel, pay (deposit / balance / full),
//           and save the post-booking questionnaire.
//
// Session-scoped to the customer portal. Every write re-validates server-side
// (slot availability on reschedule; ownership on every action).
// ============================================================================

const salonNotifyTo = "notifications@confirmation.aapawz.com"
const DEPOSIT_CENTS = 2500

let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

function requestOrigin(req: NextRequest): string {
  const referer = req.headers.get("referer")
  if (referer) {
    try {
      const u = new URL(referer)
      const host = u.hostname.toLowerCase()
      if (u.protocol === "https:" && host !== "localhost" && !host.startsWith("127.")) return u.origin
    } catch { /* fall through */ }
  }
  const xfh = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim().toLowerCase()
  if (xfh) {
    const proto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase()
    return `${proto === "http" ? "http" : "https"}://${xfh}`
  }
  return (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://aapawz.com").replace(/\/$/, "")
}

function parseItems(json: any): any[] {
  if (!json) return []
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : [] } catch { return [] }
}

function publicBooking(b: any, dog: any) {
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
    dogId: b.dogId || null,
    breed: b.breed || dog?.breedName || null,
    photoUrl: dog?.photoUrl || null,
    service: b.service,
    items: parseItems(b.itemsJson),
    subtotal: b.subtotalCents ? centsToDollars(Number(b.subtotalCents)) : null,
    tax: b.taxCents ? centsToDollars(Number(b.taxCents)) : null,
    total: totalC > 0 ? centsToDollars(totalC) : b.servicePrice || null,
    paidCents: paidC,
    paid: paidC > 0 ? centsToDollars(paidC) : null,
    balanceDue: totalC > 0 ? centsToDollars(Math.max(0, totalC - paidC)) : null,
    amountDueCents: amountDueCents(b),
    depositCents: totalC > 0 ? Math.min(DEPOSIT_CENTS, totalC) : DEPOSIT_CENTS,
    notes: b.notes || "",
    questionnaireComplete: !!b.questionnaireJson,
    createdAt: b.createdAt,
  }
}

// The payments a booking still needs from the customer right now.
function payableCents(b: any): number {
  const signal = bookingSignal(b)
  const total = totalCentsOf(b)
  const paid = Number(b.paidCents || 0)
  if (total <= 0) return 0
  if (signal === "pending") {
    // Unpaid: honor the pay mode they chose (deposit bookings pay $25 now).
    return b.payMode === "FULL" ? total : Math.min(DEPOSIT_CENTS, total)
  }
  if (signal === "booked") return Math.max(0, total - paid)
  return 0
}

// Reschedule + cancellation customer emails ride the ENTERPRISE senders
// (sendAppointmentRescheduled / sendAppointmentCanceled → branded
// design-system frames). The inline Georgia HTML below is retired.

// ---------------------------------------------------------------------------
// GET — the registry
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { user } = await sessionForPortal("customer")
    if (!user) {
      return NextResponse.json({ error: "not_signed_in", code: "NO_SESSION" }, { status: 401 })
    }
    const email = String(user.email || "").toLowerCase()

    // Real signals stay honest — sweep stale unpaid checkouts on read.
    await abandonStaleBookings().catch(() => {})

    const [bookings, dogs, customers] = await Promise.all([
      repo.list("bookings").catch(() => []),
      repo.list("dogs").catch(() => []),
      repo.list("customers").catch(() => []),
    ])
    const customer = (customers as any[]).find(
      (c) => String(c.email || "").toLowerCase() === email || c.userId === user.authUserId,
    )

    const mine = (bookings as any[]).filter((b) => {
      const byEmail = String(b.email || "").toLowerCase() === email
      const byCustomer = customer && b.customerId === customer.id
      return byEmail || byCustomer
    })

    const today = new Date().toISOString().slice(0, 10)
    const now = Date.now()
    const enriched = mine.map((b) => publicBooking(b, (dogs as any[]).find((d) => d.id === b.dogId)))

    const upcoming = enriched
      .filter((b) => b.date >= today && !["cancelled", "abandoned"].includes(b.signal))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    const past = enriched
      .filter((b) => b.date < today || ["cancelled", "abandoned"].includes(b.signal))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))

    const res = NextResponse.json({
      customer: customer
        ? {
            id: customer.id,
            name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || user.name,
            email: customer.email,
            phone: customer.phone || "",
            status: customer.customerStatus || null,
          }
        : { name: user.name, email, phone: "" },
      upcoming,
      past,
      counts: {
        pending: enriched.filter((b) => b.signal === "pending").length,
        booked: enriched.filter((b) => b.signal === "booked").length,
        paid: enriched.filter((b) => b.signal === "paid").length,
        abandoned: enriched.filter((b) => b.signal === "abandoned").length,
        cancelled: enriched.filter((b) => b.signal === "cancelled").length,
        completed: enriched.filter((b) => b.signal === "completed").length,
      },
      generatedAt: now,
    })
    res.headers.set("Cache-Control", "no-store, max-age=0")
    return res
  } catch (err: any) {
    console.error("[GET /api/customer/appointments]", err)
    return NextResponse.json({ error: err.message || "Failed to load appointments" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST — self-service actions
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForPortal("customer")
    if (!user) {
      return NextResponse.json({ error: "not_signed_in", code: "NO_SESSION" }, { status: 401 })
    }
    const email = String(user.email || "").toLowerCase()
    const body = await req.json()
    const action = String(body.action || "")
    const bookingId = String(body.bookingId || "")

    if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 })

    const booking = await repo.get("bookings", bookingId).catch(() => null)
    if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 })
    if (String(booking.email || "").toLowerCase() !== email) {
      return NextResponse.json({ error: "not_found" }, { status: 404 })
    }

    // ---- RESCHEDULE ----
    if (action === "reschedule") {
      const date = String(body.date || "")
      const time = String(body.time || "")
      const slot = await checkSlotAvailable(date, time, booking.id)
      if (!slot.ok) return NextResponse.json({ error: slot.reason }, { status: 409 })

      const oldDate = booking.date
      const oldTime = booking.time
      const updated = await repo.update("bookings", booking.id, { date, time })

      sendAppointmentRescheduled({
        customerId: booking.customerId || undefined,
        email,
        ownerName: booking.ownerName || user.name,
        dogName: booking.dogName,
        service: booking.service || "Grooming",
        size: booking.size,
        oldDate,
        oldTime,
        date,
        time,
        bookingId: booking.id,
      }).catch(() => {})
      sendEmail({
        to: salonNotifyTo,
        template: "booking_notification",
        subject: `Rescheduled — ${booking.ownerName} (${booking.dogName}) → ${date} ${time}`,
        html: `<p><strong>${booking.ownerName}</strong> moved their appointment for <strong>${booking.dogName}</strong> from ${oldDate} ${oldTime} to <strong>${date} ${time}</strong>.</p>`,
        relatedBookingId: booking.id,
      }).catch(() => {})

      return NextResponse.json({ ok: true, booking: publicBooking(updated, null) })
    }

    // ---- CANCEL ----
    if (action === "cancel") {
      if (["cancelled", "completed"].includes(bookingSignal(booking))) {
        return NextResponse.json({ error: "This appointment is already cancelled." }, { status: 409 })
      }
      const updated = await repo.update("bookings", booking.id, { status: "CANCELLED" })

      // The honest customer signal after losing their booking.
      await recomputeCustomerSignal(email).catch(() => {})

      sendAppointmentCanceled({
        customerId: booking.customerId || undefined,
        email,
        ownerName: booking.ownerName || user.name,
        dogName: booking.dogName,
        service: booking.service || "Grooming",
        size: booking.size,
        date: booking.date || "",
        time: booking.time,
        canceledBy: "customer",
        bookingId: booking.id,
      }).catch(() => {})
      sendEmail({
        to: salonNotifyTo,
        template: "booking_notification",
        subject: `Cancelled — ${booking.ownerName} (${booking.dogName}) ${booking.date} ${booking.time}`,
        html: `<p><strong>${booking.ownerName}</strong> cancelled the appointment for <strong>${booking.dogName}</strong> on ${booking.date} at ${booking.time}.</p><p>Deposit handling: check whether a refund applies.</p>`,
        relatedBookingId: booking.id,
      }).catch(() => {})

      return NextResponse.json({ ok: true, booking: publicBooking(updated, null) })
    }

    // ---- PAY (deposit / balance / full) ----
    if (action === "pay") {
      const signal = bookingSignal(booking)
      if (!["pending", "booked"].includes(signal)) {
        return NextResponse.json({ error: "Nothing is owed on this appointment." }, { status: 409 })
      }
      const amount = payableCents(booking)
      if (amount <= 0) {
        return NextResponse.json({ error: "Nothing is owed on this appointment." }, { status: 409 })
      }
      const stripe = getStripe()
      if (!stripe) {
        return NextResponse.json({ error: "Payments are not configured. Please call the salon." }, { status: 503 })
      }
      const origin = requestOrigin(req)
      const isBalance = signal === "booked"
      const label = isBalance
        ? "Grooming Appointment — Remaining Balance"
        : booking.payMode === "FULL"
          ? "Grooming Appointment — Paid in Full"
          : "Grooming Appointment — Deposit"
      try {
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{
            price_data: {
              currency: "usd",
              product_data: {
                name: label,
                description: `${booking.service || "Grooming"} for ${booking.dogName} · ${booking.date} at ${booking.time}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          }],
          customer_email: email,
          success_url: `${origin}/customer/appointments?paid=1&booking_id=${booking.id}`,
          cancel_url: `${origin}/customer/appointments`,
          metadata: {
            bookingId: booking.id,
            type: "booking_payment",
            payMode: isBalance ? "BALANCE" : String(booking.payMode || "FULL"),
            totalCents: String(booking.totalCents || ""),
            customerEmail: email,
            ownerName: booking.ownerName || "",
            dogName: booking.dogName || "",
          },
        })
        await repo.update("bookings", booking.id, { stripeCheckoutSessionId: session.id })
        return NextResponse.json({ ok: true, url: session.url })
      } catch (e: any) {
        console.error("[customer/appointments pay]", e)
        return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 })
      }
    }

    // ---- QUESTIONNAIRE (post-booking — saves time at the visit) ----
    if (action === "questionnaire") {
      const answers = body.answers
      if (!answers || typeof answers !== "object") {
        return NextResponse.json({ error: "Answers required" }, { status: 400 })
      }
      const updated = await repo.update("bookings", booking.id, {
        questionnaireJson: JSON.stringify(answers),
        notes: [
          booking.notes || "",
          answers.healthNotes ? `Health: ${answers.healthNotes}` : "",
          answers.behaviorNotes ? `Behavior: ${answers.behaviorNotes}` : "",
          answers.groomingGoals ? `Grooming goals: ${answers.groomingGoals}` : "",
        ].filter(Boolean).join(" · "),
      })

      // Owner direction: everything captured goes to the salon inbox. The
      // stylist gets the full answer sheet; the customer gets a confirmation
      // that identifies the service and the date.
      sendPreCheckIn({
        customerId: booking.customerId || undefined,
        email,
        ownerName: booking.ownerName || user.name,
        dogName: booking.dogName,
        service: booking.service || "Grooming",
        date: booking.date,
        time: booking.time,
        bookingId: booking.id,
        answers: {
          vaccinationsCurrent: answers.vaccinationsCurrent,
          sameDayShots: answers.sameDayShots,
          muzzle: answers.muzzle,
          sedation: answers.sedation,
          healthNotes: answers.healthNotes,
          groomingGoals: answers.groomingGoals,
          behaviorNotes: answers.behaviorNotes,
          emergencyName: answers.emergencyName,
          emergencyPhone: answers.emergencyPhone,
          vetName: answers.vetName,
          vetPhone: answers.vetPhone,
          authorize: answers.authorize === true || answers.authorize === "true",
        },
      }).catch(() => {})

      return NextResponse.json({ ok: true, booking: publicBooking(updated, null) })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err: any) {
    console.error("[POST /api/customer/appointments]", err)
    return NextResponse.json({ error: err.message || "Action failed" }, { status: 500 })
  }
}
