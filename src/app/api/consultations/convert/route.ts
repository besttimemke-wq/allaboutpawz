import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"

// POST /api/consultations/convert
// Converts a consultation into a customer + dog + appointment.
// If the consultation already has a customerId, uses that customer.
// Otherwise, creates a customer from the consultation's name/email/phone.
// Then creates a booking in CONFIRMED status (staff-created, no deposit needed).
// Lazy Stripe client — module-level init would crash when env keys aren't set yet.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

export async function POST(req: NextRequest) {
  const { consultationId, service, date, time, groomerId } = await req.json()

  if (!consultationId) return NextResponse.json({ error: "consultationId required" }, { status: 400 })

  // 1. Get the consultation
  const consultation = (await repo.get("consultations", consultationId)) as any
  if (!consultation) return NextResponse.json({ error: "Consultation not found" }, { status: 404 })

  let customerId = consultation.customerId
  let dogId = consultation.dogId

  // 2. If no customer linked, create one from the consultation data
  if (!customerId && consultation.email) {
    // Check if a customer with this email already exists
    const allCustomers = (await repo.list("customers")) as any[]
    const existing = allCustomers.find((c) => c.email === consultation.email)

    if (existing) {
      customerId = existing.id
    } else {
      // Create new customer in Supabase + Stripe
      const nameParts = (consultation.name || "").split(" ")
      const firstName = nameParts[0] || ""
      const lastName = nameParts.slice(1).join(" ") || ""

      let stripeCustomerId: string | null = null
      try {
        if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set")
        const stripeCustomer = await getStripe().customers.create({
          email: consultation.email,
          name: consultation.name || undefined,
          phone: consultation.phone || undefined,
        })
        stripeCustomerId = stripeCustomer.id
      } catch (e: any) {
        console.error("[convert] Stripe customer creation failed:", e.message)
      }

      const customer = (await repo.create("customers", {
        firstName, lastName,
        email: consultation.email,
        phone: consultation.phone || null,
        stripeCustomerId,
      })) as any
      customerId = customer?.id || null
    }
  }

  // 3. If no dog linked, create one from the consultation data
  if (!dogId && consultation.dogName && customerId) {
    const dog = (await repo.create("dogs", {
      customerId,
      name: consultation.dogName,
      breedName: consultation.breed || null,
    })) as any
    dogId = dog?.id || null
  }

  // 4. Create the booking (staff-created → CONFIRMED, no deposit required)
  const booking = (await repo.create("bookings", {
    ownerName: consultation.name || "",
    dogName: consultation.dogName || "",
    breed: consultation.breed || null,
    service: service || "Consultation Follow-up",
    date: date || null,
    time: time || null,
    phone: consultation.phone || null,
    email: consultation.email || null,
    notes: consultation.concerns || null,
    groomerId: groomerId || null,
    status: "CONFIRMED",
    bookingType: "BOOKING",
    paymentStatus: "UNPAID",
    customerId,
    dogId,
  })) as any

  // 5. Update the consultation status to CONVERTED
  await repo.update("consultations", consultationId, { status: "CONVERTED" })

  // 6. Log activity
  try {
    await repo.create("activity_log", {
      entity: "consultation", entityId: consultationId, action: "converted",
      summary: `Consultation converted to appointment for ${consultation.name}`,
    })
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    customerId,
    dogId,
    bookingId: booking?.id,
    consultationId,
  })
}
