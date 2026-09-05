import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { callbackBase } from "@/lib/site-url"

const salonNotifyTo = "notifications@confirmation.aapawz.com"

function bookingRequestHtml(name: string, dog: string, service: string, date: string, time: string) {
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a">
    <p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Request Received</p>
    <h1 style="font-size:28px;line-height:1.1;margin:8px 0 0">Hi ${name},</h1>
    <p style="font-style:italic;color:#9a7b3c;font-size:20px;margin:4px 0 16px">From Pawz to PAWfection</p>
    <p>We received your appointment request. Here are the details:</p>
    <div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0">
      <p><strong>Dog:</strong> ${dog}</p>
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Requested Date:</strong> ${date}</p>
      <p><strong>Requested Time:</strong> ${time}</p>
    </div>
    <p>Once your deposit is processed, we'll send you a confirmation email with all the details.</p>
  </body></html>`
}

function bookingSalonNotificationHtml(name: string, dog: string, service: string, date: string, time: string, email: string, phone: string) {
  return `<!doctype html><html><body style="font-family:sans-serif;max-width:560px;margin:auto;color:#1a1a1a">
    <h2 style="color:#9a7b3c">New appointment request</h2>
    <p><strong>${name}</strong> requested an appointment for <strong>${dog}</strong>.</p>
    <div style="background:#f6f6f6;border-left:3px solid #9a7b3c;padding:12px;margin:12px 0">
      <p><strong>Service:</strong> ${service}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
    </div>
    <p style="font-size:13px">Email: ${email || "—"}<br/>Phone: ${phone || "—"}</p>
    <a href="https://aapawz.com/admin/bookings" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;text-decoration:none;font-size:12px;font-weight:700;text-transform:uppercase">Review in Operations</a>
  </body></html>`
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

  // 2. Persist the grooming profile (permanent dog profile — NOT appointment-specific)
  //    Only create if it doesn't already exist for this dog.
  if (dogId && groomingProfile) {
    try {
      const existingProfiles = (await repo.list("dog_grooming_profiles")) as any[]
      const existing = existingProfiles.find((p) => p.dogId === dogId)
      const profileData: any = {
        dogId,
        coatTypeId: groomingProfile.coatTypeId || null,
        coatTextureId: groomingProfile.coatTextureId || null,
        coatLengthId: groomingProfile.coatLengthId || null,
        coatConditionId: groomingProfile.coatConditionId || null,
        sheddingLevel: groomingProfile.sheddingLevel || null,
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
    html: bookingSalonNotificationHtml(ownerName, dogName, serviceName || service || "", date, time, email || "", phone || ""),
    relatedBookingId: booking?.id,
  }).catch(() => {})

  // 5. If consultation (no deposit), just return success
  if (bookingType === "CONSULTATION") {
    return NextResponse.json({ bookingId: booking?.id, type: "consultation", url: `${callbackBase(req)}/book/consultation?success=consultation` })
  }

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
      success_url: `${origin}/book/appointment?success=booking`,
      cancel_url: `${origin}/book?cancelled=1`,
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

    // 8. Create a payment record (pending until webhook confirms)
    try {
      await repo.create("payments", {
        bookingId: booking?.id || null,
        customerId: customerId || null,
        stripeCheckoutSessionId: session.id,
        amount: "$25.00",
        type: "deposit",
        status: "pending",
      })
    } catch (e: any) {
      console.error("[booking checkout] payment record failed:", e.message)
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, bookingId: booking?.id })
  } catch (e: any) {
    console.error("[booking checkout]", e)
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 })
  }
}
