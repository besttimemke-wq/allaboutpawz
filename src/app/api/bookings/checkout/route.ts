import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { bookingNotificationHtml } from "@/lib/email/templates/internal"
import { detailsCard, eyebrow, h1, noteBox, p, taglineFlourish, frame, esc } from "@/lib/email/design"
import { callbackBase } from "@/lib/site-url"
import { syncCrmAppointment, writeCommercePayment, withPg, TENANT_ID } from "@/lib/crm/enterprise"
import { captureServerEvent, logAnalyticsEvent } from "@/lib/analytics-server"
import { friendlyDbError } from "@/lib/db-errors"

const salonNotifyTo = "booking@aapawz.com"

function bookingRequestHtml(name: string, dog: string, service: string, date: string, time: string) {
  const first = String(name || "").split(/\s+/)[0] || "there"
  return frame({
    preheader: `Request received — ${dog ? `${esc(dog)}'s ` : ""}appointment is in our queue.`,
    body: [
      eyebrow("Request received"),
      h1(`We got it, ${esc(first)}`),
      taglineFlourish(),
      p(`Thanks for booking with All About Pawz — here's what you asked for. The moment your $25 deposit clears, we'll email a full confirmation with everything you need.`),
      detailsCard("Your request", [
        ...(dog ? [{ label: "Dog", value: esc(dog) }] : []),
        { label: "Service", value: esc(service) },
        { label: "Requested date", value: esc(date || "—") },
        { label: "Requested time", value: esc(time || "—") },
      ]),
      noteBox(`Deposit not showing as paid? Keep an eye out for a <strong style="color:#1a1a1a">Finish your booking</strong> email — it picks up exactly where you left off, nothing gets re-typed.`),
    ].join(""),
    reason: `You're receiving this because you just submitted a booking request at aapawz.com.`,
  })
}

// POST /api/bookings/checkout
// Creates the booking in PAYMENT_PENDING, persists the grooming profile + request,
// creates a Stripe Checkout Session for the $25 deposit, and creates a payment record.
// The webhook (/api/stripe/webhook) is the only thing that flips the booking to CONFIRMED.
// Lazy Stripe client — constructed on first use so the route module loads even
// before STRIPE_SECRET_KEY is set in .env. The POST handler below checks the
// key and returns a clear error if payments aren't configured yet.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}
const DEPOSIT_AMOUNT = 2500 // $25.00 in cents

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    bookingType, ownerName, phone, email, address,
    dogName, breedId, breedName, size,
    date, time, service, serviceName,
    notes, groomerId, groomerName,
    servicePrice, depositAmount, balanceDue,
    customerId, dogId,
    groomingProfile, groomingRequest,
  } = body

  if (!ownerName || !dogName || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // 1. Create the booking in PAYMENT_PENDING — linked to customer and dog
  const booking = (await repo.create("bookings", {
    ownerName, dogName, breed: breedName, size: (size || "").split(" ")[0],
    service: serviceName || service || "", date, time,
    phone, email, address, notes,
    groomerId, status: "PAYMENT_PENDING",
    bookingType: bookingType || "BOOKING",
    servicePrice: servicePrice || "",
    depositAmount: depositAmount || "$25.00",
    balanceDue: balanceDue || "",
    paymentStatus: "UNPAID",
    customerId: customerId || null,
    dogId: dogId || null,
  })) as any

  // 1b. The owner's appointment registry — the booking's existence populates
  //     crm_customers / crm_pets / crm_appointments (status precheck) the
  //     moment it is created. Non-fatal — checkout proceeds regardless.
  if (booking?.id) {
    try {
      await syncCrmAppointment(booking)
    } catch (e: any) {
      console.error("[booking checkout] crm_appointments sync failed:", e.message)
    }
  }

  // 2. Persist the grooming profile (permanent dog profile — NOT appointment-specific)
  //    Only create if it doesn't already exist for this dog.
  if (dogId && groomingProfile) {
    try {
      const existingProfiles = (await repo.list("dog_grooming_profiles")) as any[]
      const existing = existingProfiles.find((p) => p.dogId === dogId)
      const profileData: any = {
        dogId,
        // tenant_id is NOT NULL on the enterprise tables — without it the
        // insert 400s (23502) and every coat/handling field silently vanished
        // (non-fatal try/catch) while the customer paid. Same fix below for
        // the grooming-request row.
        tenant_id: TENANT_ID(),
        coatTypeId: groomingProfile.coatTypeId || null,
        coatTextureId: groomingProfile.coatTextureId || null,
        coatLengthId: groomingProfile.coatLengthId || null,
        coatConditionId: groomingProfile.coatConditionId || null,
        // The wizard sends sheddingLevelId (the lookup id) — the column keeps
        // the id as text, consistent with every other id column on this table.
        sheddingLevel: groomingProfile.sheddingLevelId || groomingProfile.sheddingLevel || null,
        currentHaircutStyleId: groomingProfile.currentHaircutStyleId || null,
        currentBodyLengthId: groomingProfile.currentBodyLengthId || null,
        temperament: groomingProfile.temperament || null,
        nailHandling: groomingProfile.nailHandling || null,
        faceHandling: groomingProfile.faceHandling || null,
        feetHandling: groomingProfile.feetHandling || null,
        earHandling: groomingProfile.earHandling || null,
        dryerHandling: groomingProfile.dryerHandling || null,
        clipperHandling: groomingProfile.clipperHandling || null,
        handlingNotes: groomingProfile.handlingNotes || null,
        groomingNotes: groomingProfile.groomingNotes || null,
        ownerNotes: groomingProfile.ownerNotes || null,
      }
      if (existing) {
        // Update the permanent profile
        await repo.update("dog_grooming_profiles", existing.id, profileData)
      } else {
        await repo.create("dog_grooming_profiles", profileData)
      }
    } catch (e: any) {
      console.error("[booking checkout] grooming profile save failed:", e.message)
    }
  }

  // 3. Persist the appointment-specific grooming request (separate from the permanent profile)
  //    This is what the owner requested for THIS appointment — never overwrites the dog profile.
  let groomingRequestId: string | null = null
  if (booking?.id && groomingRequest) {
    try {
      const gr = (await repo.create("appointment_grooming_requests", {
        bookingId: booking.id,
        tenant_id: TENANT_ID(),
        styleId: groomingRequest.styleId || null,
        bodyLengthId: groomingRequest.bodyLengthId || null,
        bodyStyleId: groomingRequest.bodyStyleId || null,
        legStyleId: groomingRequest.legStyleId || null,
        faceStyleId: groomingRequest.faceStyleId || null,
        headStyleId: groomingRequest.headStyleId || null,
        earStyleId: groomingRequest.earStyleId || null,
        tailStyleId: groomingRequest.tailStyleId || null,
        feetStyleId: groomingRequest.feetStyleId || null,
        sanitaryService: groomingRequest.sanitaryService || null,
        nailService: groomingRequest.nailService || null,
        pawPadService: groomingRequest.pawPadService || null,
        earService: groomingRequest.earService || null,
        teethService: groomingRequest.teethService || null,
        desheddingService: groomingRequest.desheddingService || null,
        coatTechnique: groomingRequest.coatTechnique || null,
        specialInstructions: groomingRequest.specialInstructions || null,
      })) as any
      groomingRequestId = gr?.id || null

      // Link the grooming request to the booking
      if (groomingRequestId) {
        await repo.update("bookings", booking.id, { groomingRequestId })
      }
    } catch (e: any) {
      console.error("[booking checkout] grooming request save failed:", e.message)
    }
  }

  // 4. Send "request received" email (NOT confirmation — that fires on webhook)
  sendEmail({
    customerId,
    to: email || salonNotifyTo,
    template: "booking_request_received",
    subject: "We received your appointment request — All About Pawz",
    html: bookingRequestHtml(ownerName, dogName, serviceName || service || "", date, time),
    relatedBookingId: booking?.id,
  }).catch(() => {})

  // Also notify salon staff
  sendEmail({
    customerId,
    to: salonNotifyTo,
    template: "booking_notification",
    subject: `New appointment request — ${ownerName} (${dogName})`,
    html: bookingNotificationHtml({
      ownerName,
      dogName: dogName || undefined,
      service: serviceName || service || "Grooming appointment",
      date: date || undefined,
      time: time || undefined,
      email: email || "",
      phone: phone || "",
    }),
    relatedBookingId: booking?.id,
  }).catch(() => {})

  // 5. If consultation (no deposit), just return success
  if (bookingType === "CONSULTATION") {
    return NextResponse.json({ bookingId: booking?.id, type: "consultation", url: `${callbackBase(req)}/book/consultation?success=consultation` })
  }

  // 5b. Authoritative funnel event — the appointment booking exists in
  //     PAYMENT_PENDING awaiting the $25 deposit (server-side, independent
  //     of cookie consent). Fail-safe: neither helper ever throws; the wrap
  //     is belt-and-braces so analytics can NEVER break checkout.
  try {
    const props = {
      status: "PAYMENT_PENDING",
      booking_id: booking?.id || null,
      service: serviceName || service || null,
      dog_name: dogName || null,
      flow: "appointment",
    }
    await logAnalyticsEvent({ event: "booking_created", data: props, page: "/book/appointment" })
    if (email) {
      await captureServerEvent({ event: "booking_created", distinctId: email, properties: props })
    }
  } catch { /* analytics must never break checkout */ }

  // 6. Create Stripe Checkout Session for the $25 deposit
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: "Payments are not configured yet. Set STRIPE_SECRET_KEY in .env to enable the $25 deposit checkout.",
    }, { status: 503 })
  }
  const origin = callbackBase(req)
  try {
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
      // The real booking id rides back on the success return so the client
      // can use it as the purchase transaction_id.
      success_url: booking?.id
        ? `${origin}/book/appointment?success=booking&booking_id=${booking.id}`
        : `${origin}/book/appointment?success=booking`,
      cancel_url: `${origin}/book/appointment?cancelled=1`,
      metadata: {
        bookingId: booking?.id || "",
        type: "booking_deposit",
        customerId: customerId || "",
        dogId: dogId || "",
        ownerName, dogName,
      },
    })

    // 7. Save the Stripe session ID on the booking
    if (booking?.id) {
      await repo.update("bookings", booking.id, { stripeCheckoutSessionId: session.id })
    }

    // 8. The pending payment row — commerce_payments on the owner's table
    //    (PAY-<bookingId8>, deterministic). The webhook flips it to
    //    succeeded and links commerce_deposits.payment_id to it.
    try {
      if (booking?.id) {
        await withPg((client) =>
          writeCommercePayment(client, {
            paymentNumber: `PAY-${String(booking.id).slice(0, 8).toUpperCase()}`,
            amount: 25,
            status: "pending",
            externalReference: session.id,
          }),
        )
      }
    } catch (e: any) {
      console.error("[booking checkout] commerce_payments row failed:", e.message)
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, bookingId: booking?.id })
  } catch (e: any) {
    // Visitor-safe copy — raw Stripe/Postgres payloads stay in server logs.
    const friendly = friendlyDbError(e, "booking")
    return NextResponse.json({ error: friendly.error }, { status: 500 })
  }
}
