import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { syncCrmAppointment } from "@/lib/crm/enterprise"
import { priceCart, centsToDollars, sizeTierFromWeight, weightRangeLabel } from "@/lib/booking/pricing"
import { setCustomerSignal } from "@/lib/booking/status"
import { checkSlotAvailable } from "@/lib/booking/availability"

// ============================================================================
// POST /api/bookings/checkout — the last step of the 5-step booking flow.
//
// The client sends ONLY what it knows: the pet, the chosen services (ids +
// quantities), the slot, and the payment choice (FULL or DEPOSIT). The
// server is the authority on everything else:
//
//   • the session (ANY signed-in identity — the booking flow is a public
//     site flow; customers, staff, and the owner testing their own salon
//     all book through it; the customer & dog records are scoped by email)
//   • the customer & dog records (find-or-create, userId back-linked)
//   • every price, the tax, and the total (re-priced from service_items)
//   • slot availability (double-booking protection at write time)
//
// The booking is created PENDING_PAYMENT and a Stripe Checkout Session is
// issued for the FULL total or the $25 deposit. Payment flips the booking
// to CONFIRMED — via the Stripe webhook and/or the /api/bookings/status
// verifier (both idempotent).
// ============================================================================

const salonNotifyTo = "notifications@confirmation.aapawz.com"
const DEPOSIT_CENTS = 2500

let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

// Where the browser actually is — Stripe must return the customer to the
// page they booked on (production: aapawz.com; previews: the preview host).
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

function requestReceivedHtml(name: string, dog: string, date: string, time: string, items: string[], total: string, payMode: "FULL" | "DEPOSIT") {
  const itemList = items.map((i) => `<p style="margin:2px 0">${i}</p>`).join("")
  const payLine = payMode === "FULL"
    ? `<p><strong>Payment:</strong> ${total} paid in full</p>`
    : `<p><strong>Payment:</strong> $25.00 deposit today — the remaining balance is due at the salon</p>`
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a">
    <p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Request Received</p>
    <h1 style="font-size:28px;line-height:1.1;margin:8px 0 0">Hi ${name},</h1>
    <p style="font-style:italic;color:#9a7b3c;font-size:20px;margin:4px 0 16px">From Pawz to PAWfection</p>
    <p>We received your appointment request. Here are the details:</p>
    <div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0">
      <p><strong>Dog:</strong> ${dog}</p>
      <p><strong>Date:</strong> ${date} at ${time}</p>
      <p style="margin-bottom:2px"><strong>Services:</strong></p>${itemList}
      <p><strong>Total (with tax):</strong> ${total}</p>
      ${payLine}
    </div>
    <p>Once your payment is processed, we'll send you a confirmation email with all the details. You can manage this appointment any time from <a href="https://aapawz.com/customer/appointments" style="color:#9a7b3c">your portal</a>.</p>
  </body></html>`
}

function salonNotificationHtml(name: string, email: string, phone: string, dog: string, breed: string, date: string, time: string, items: string[], total: string, payMode: string) {
  const itemList = items.map((i) => `<p style="margin:2px 0">${i}</p>`).join("")
  return `<!doctype html><html><body style="font-family:sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#9a7b3c">New appointment request</h2>
    <p><strong>${name}</strong> requested an appointment for <strong>${dog}</strong> (${breed}).</p>
    <div style="background:#f6f6f6;border-left:3px solid #9a7b3c;padding:12px;margin:12px 0">
      <p><strong>Date:</strong> ${date} at ${time}</p>
      <p style="margin-bottom:2px"><strong>Services:</strong></p>${itemList}
      <p><strong>Total (with tax):</strong> ${total} · <strong>Payment:</strong> ${payMode === "FULL" ? "pay in full" : "$25 deposit"}</p>
    </div>
    <p style="font-size:13px">Email: ${email || "—"}<br/>Phone: ${phone || "—"}</p>
    <a href="https://aapawz.com/admin/bookings" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;font-size:12px;font-weight:700;text-transform:uppercase">Review in Operations</a>
  </body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      dogId,
      dogName,
      breedId,
      breedName,
      birthDate,
      weightLbs,
      date,
      time,
      items,
      payMode,
      notes,
    } = body

    // 1. The session — the sign-up step happened; nobody books anonymously.
    //    Door-free (any role): a PUBLIC site flow must never bounce a
    //    signed-in identity back to a door — "never lose context".
    const { user } = await sessionForSiteFlow()
    if (!user) {
      return NextResponse.json(
        { error: "Your session has expired — sign back in to finish booking.", code: "NO_SESSION" },
        { status: 401 },
      )
    }
    const email = String(user.email || "").toLowerCase()
    const ownerName = String(user.name || email.split("@")[0])

    // 2. Input validation — the shape the 5-step flow produces.
    const weight = parseFloat(String(weightLbs || ""))
    if (!dogName || !breedName || !Number.isFinite(weight) || weight <= 0 || weight > 300) {
      return NextResponse.json({ error: "Tell us about your pup (name, breed, and weight)." }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Choose at least one service." }, { status: 400 })
    }
    if (!date || !time) {
      return NextResponse.json({ error: "Pick a date and time." }, { status: 400 })
    }
    const mode = payMode === "FULL" ? "FULL" : "DEPOSIT"

    // 3. The cart — re-priced from the live catalog. Client prices are
    //    display hints; these numbers are the truth.
    const { cart, unknownIds } = await priceCart(
      items.map((i: any) => ({ id: String(i.id), qty: Number(i.qty) || 1 })),
      weight,
    )
    if (!cart.packageLine) {
      return NextResponse.json({ error: "Choose a grooming package (Bath & Brush, Full Groom, or Deluxe Spa)." }, { status: 400 })
    }
    if (cart.totalCents <= 0) {
      return NextResponse.json({ error: "The cart is empty — choose a service." }, { status: 400 })
    }

    // 4. The slot — double-booking protection at write time.
    const slot = await checkSlotAvailable(String(date), String(time))
    if (!slot.ok) {
      return NextResponse.json({ error: slot.reason, code: "SLOT_TAKEN" }, { status: 409 })
    }

    // 5. The customer record — exists (the sign-up step created it); make
    //    sure the userId back-link is current so the portal finds them.
    const customers = (await repo.list("customers").catch(() => [])) as any[]
    let customer = customers.find((c) => String(c.email || "").toLowerCase() === email)
    if (!customer) {
      customer = await repo.create("customers", {
        firstName: ownerName.split(" ")[0] || "",
        lastName: ownerName.split(" ").slice(1).join(" ") || "",
        email,
        customerStatus: "PENDING",
      })
    }
    if (customer && !customer.userId) {
      await repo.update("customers", customer.id, { userId: user.authUserId }).catch(() => {})
    }

    // 6. The dog — this booking's pet, persisted as the customer's own.
    const sizeTier = sizeTierFromWeight(weight)
    let dog: any = null
    if (dogId) {
      const dogs = (await repo.list("dogs").catch(() => [])) as any[]
      dog = dogs.find((d) => d.id === dogId && d.customerId === customer?.id) || null
    }
    const dogData = {
      customerId: customer?.id || null,
      name: String(dogName),
      breedName: String(breedName),
      breedId: breedId ? String(breedId) : null,
      birthDate: birthDate ? String(birthDate) : null,
      weightLbs: String(weight),
      size: sizeTier,
    }
    if (dog) {
      dog = await repo.update("dogs", dog.id, dogData)
    } else {
      dog = await repo.create("dogs", dogData)
    }

    // 7. The booking — PENDING_PAYMENT with the full priced cart.
    const itemsJson = JSON.stringify(
      cart.lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, unitCents: l.unitCents, lineCents: l.lineCents })),
    )
    const packageName = cart.packageLine.name
    const deposit = Math.min(DEPOSIT_CENTS, cart.totalCents)
    const booking = (await repo.create("bookings", {
      ownerName,
      dogName: String(dogName),
      breed: String(breedName),
      breedId: breedId ? String(breedId) : null,
      birthDate: birthDate ? String(birthDate) : null,
      weightLbs: String(weight),
      service: packageName,
      size: sizeTier,
      date: String(date),
      time: String(time),
      notes: notes ? String(notes) : "",
      phone: customer?.phone || "",
      email,
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      bookingType: "BOOKING",
      servicePrice: centsToDollars(cart.packageLine.unitCents),
      depositAmount: centsToDollars(deposit),
      balanceDue: centsToDollars(mode === "FULL" ? 0 : Math.max(0, cart.totalCents - deposit)),
      itemsJson,
      subtotalCents: cart.subtotalCents,
      taxCents: cart.taxCents,
      totalCents: cart.totalCents,
      paidCents: 0,
      payMode: mode,
      customerId: customer?.id || null,
      dogId: dog?.id || null,
    })) as any

    // The CRM registry — best-effort, never blocks a booking.
    if (booking?.id) {
      try { await syncCrmAppointment(booking) } catch (e: any) { console.error("[checkout] crm sync failed:", e.message) }
    }

    // 8. Emails — request received (customer) + staff notification.
    const itemLines = cart.lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""} — ${centsToDollars(l.lineCents)}`)
    const totalDisplay = centsToDollars(cart.totalCents)
    sendEmail({
      customerId: customer?.id,
      to: email,
      template: "booking_request_received",
      subject: "We received your appointment request — All About Pawz",
      html: requestReceivedHtml(ownerName, String(dogName), String(date), String(time), itemLines, totalDisplay, mode),
      relatedBookingId: booking?.id,
    }).catch(() => {})
    sendEmail({
      customerId: customer?.id,
      to: salonNotifyTo,
      template: "booking_notification",
      subject: `New appointment request — ${ownerName} (${dogName})`,
      html: salonNotificationHtml(ownerName, email, customer?.phone || "", String(dogName), String(breedName), String(date), String(time), itemLines, totalDisplay, mode),
      relatedBookingId: booking?.id,
    }).catch(() => {})

    // 9. The customer's real signal — they started a booking.
    await setCustomerSignal(email, "PENDING").catch(() => {})

    // 10. Stripe — one session, the chosen amount.
    const stripe = getStripe()
    if (!stripe) {
      // Payments unconfigured: the booking still exists; the portal shows
      // its honest pending state and the salon can confirm in person.
      return NextResponse.json({
        bookingId: booking?.id,
        paymentReady: false,
        url: `${requestOrigin(req)}/book/appointment?success=booking&booking_id=${booking?.id}`,
      })
    }
    const payingFull = mode === "FULL"
    const amount = payingFull ? cart.totalCents : deposit
    const origin = requestOrigin(req)
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: payingFull ? "Grooming Appointment — Paid in Full" : "Grooming Appointment — Deposit",
              description: payingFull
                ? `${packageName} for ${dogName} · ${date} at ${time} (tax included)`
                : `Deposit for ${packageName} for ${dogName} · ${date} at ${time}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        customer_email: email,
        success_url: booking?.id
          ? `${origin}/book/appointment?success=booking&booking_id=${booking.id}`
          : `${origin}/book/appointment?success=booking`,
        cancel_url: `${origin}/book/appointment?cancelled=1`,
        metadata: {
          bookingId: booking?.id || "",
          type: "booking_payment",
          payMode: mode,
          totalCents: String(cart.totalCents),
          depositCents: String(deposit),
          customerEmail: email,
          customerId: customer?.id || "",
          dogId: dog?.id || "",
          ownerName,
          dogName: String(dogName),
        },
      })

      if (booking?.id) {
        await repo.update("bookings", booking.id, { stripeCheckoutSessionId: session.id })
      }

      return NextResponse.json({ url: session.url, sessionId: session.id, bookingId: booking?.id, paymentReady: true })
    } catch (e: any) {
      console.error("[booking checkout] stripe session failed:", e)
      return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[POST /api/bookings/checkout]", error)
    return NextResponse.json({ error: error.message || "Failed to create booking" }, { status: 500 })
  }
}
