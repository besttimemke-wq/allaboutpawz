import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { sendBookingRequest } from "@/lib/email"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { syncCrmAppointment } from "@/lib/crm/enterprise"
import { priceCart, centsToDollars, sizeTierFromWeight, weightRangeLabel, listBookableServiceItems } from "@/lib/booking/pricing"
import { setCustomerSignal } from "@/lib/booking/status"
import { checkSlotAvailable } from "@/lib/booking/availability"
import { isBathClubMember } from "@/lib/subscriptions"
import { validatePromo, recordRedemption, rejectionText } from "@/lib/promos"
import { perksBalance, redeemPoints } from "@/lib/perks"

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
//   • every price, the tax, and the total (re-priced from service_items —
//     at the Bath Club member ladder when the booker is an ACTIVE member)
//   • the promo code (re-validated server-side; the client discount is
//     never trusted) and the points redemption (balance-checked, capped)
//   • slot availability (double-booking protection at write time)
//
// The booking is created PENDING_PAYMENT and a Stripe Checkout Session is
// issued for the FULL total or the $25 deposit. Payment flips the booking
// to CONFIRMED — via the Stripe webhook and/or the /api/bookings/status
// verifier (both idempotent).
// ============================================================================

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
  return (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "https://www.aapawz.com").replace(/\/$/, "")
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
      promoCode,
      pointsToRedeem,
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
    //    display hints; these numbers are the truth. ACTIVE Bath Club
    //    members price at the member ladder.
    const member = await isBathClubMember(email).catch(() => false)
    const { cart, unknownIds } = await priceCart(
      items.map((i: any) => ({ id: String(i.id), qty: Number(i.qty) || 1 })),
      weight,
      { member },
    )
    if (!cart.packageLine) {
      return NextResponse.json({ error: "Choose a grooming package (Bath & Brush, Full Groom, or Deluxe Spa)." }, { status: 400 })
    }
    if (cart.totalCents <= 0) {
      return NextResponse.json({ error: "The cart is empty — choose a service." }, { status: 400 })
    }

    // 3b. The promo — re-validated from the live catalog against the REAL
    //     priced cart. The client's discount was a preview; this is the
    //     register. free_addon promos zero the named add-on line (the named
    //     add-on is added to the booking at $0 when it wasn't in the cart).
    let promoDiscountCents = 0
    let appliedPromo: Awaited<ReturnType<typeof validatePromo>> | null = null
    if (promoCode) {
      appliedPromo = await validatePromo(
        String(promoCode).trim(),
        { id: String(user.authUserId || email), email },
        {
          serviceIds: cart.lines.map((l) => l.id),
          subtotalCents: cart.subtotalCents,
          dogId: dogId ? String(dogId) : null,
          dogBirthDate: birthDate ? String(birthDate) : null,
        },
      )
      if (!appliedPromo.valid) {
        return NextResponse.json(
          { error: rejectionText(appliedPromo.reason), code: "PROMO_REJECTED" },
          { status: 422 },
        )
      }
      promoDiscountCents = Math.min(appliedPromo.discountCents, cart.subtotalCents)

      // free_addon: the named add-on rides ON the booking — priced with the
      // discount zeroing it out when it was in the cart, or as a free line
      // when it wasn't (validatePromo already returned 0 in that case).
      if (appliedPromo.promoType === "free_addon" && appliedPromo.discountCents === 0) {
        const items = await listBookableServiceItems().catch(() => [] as any[])
        const addonName = String(appliedPromo.value || "").trim().toLowerCase()
        const named = (items as any[]).find(
          (i) => String(i.name).trim().toLowerCase() === addonName,
        )
        const already = cart.lines.find((l) => l.name.trim().toLowerCase() === addonName)
        if (named && !already) {
          cart.lines.push({
            id: named.id,
            name: named.name,
            category: named.category || "Add-On Services",
            isPackage: false,
            isTreatment: false,
            customQuote: false,
            unitCents: 0,
            qty: 1,
            lineCents: 0,
          })
        }
      }
    }

    // 3c. Points — balance pre-checked here; the redemption itself writes
    //     AFTER the booking exists (it needs the booking id as source).
    const requestedPoints = Number(pointsToRedeem)
    const wantsPoints = Number.isFinite(requestedPoints) && requestedPoints > 0 && !!user.authUserId
    let pointsDiscountCents = 0
    let pointsRedeemed = 0
    let pointsPerDollar = 100
    if (wantsPoints) {
      const { redemptionRate } = await import("@/lib/perks")
      const rate = await redemptionRate().catch(() => ({ pointsPerDollar: 100 }))
      pointsPerDollar = rate.pointsPerDollar
      const balance = await perksBalance(String(user.authUserId)).catch(() => 0)
      if (balance < Math.floor(requestedPoints)) {
        return NextResponse.json(
          { error: `You have ${balance} Perks points — that's not enough for ${Math.floor(requestedPoints)}.`, code: "POINTS" },
          { status: 422 },
        )
      }
    }

    // 3d. Final math — discounts apply to the subtotal; tax follows the
    //     discounted subtotal (the register's rule).
    const subtotalAfterPromo = Math.max(0, cart.subtotalCents - promoDiscountCents)
    if (wantsPoints) {
      // redeemPoints caps at the remaining subtotal; the preview here just
      // mirrors it so the record and the charge agree.
      pointsDiscountCents = Math.min(
        subtotalAfterPromo,
        Math.floor((Math.floor(requestedPoints) / pointsPerDollar) * 100),
      )
      pointsRedeemed = Math.floor(requestedPoints)
    }
    const finalSubtotalCents = Math.max(0, subtotalAfterPromo - pointsDiscountCents)
    const taxCentsFinal = Math.round((finalSubtotalCents * cart.taxRatePercent) / 100)
    let totalCentsFinal = finalSubtotalCents + taxCentsFinal

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

    // 7. The booking — PENDING_PAYMENT with the full priced cart, promo +
    //    points discount lines on the record.
    const itemsJson = JSON.stringify(
      cart.lines.map((l) => ({ id: l.id, name: l.name, qty: l.qty, unitCents: l.unitCents, lineCents: l.lineCents, customQuote: l.customQuote || undefined })),
    )
    const packageName = cart.packageLine.name
    const deposit = Math.min(DEPOSIT_CENTS, totalCentsFinal)
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
      balanceDue: centsToDollars(mode === "FULL" ? 0 : Math.max(0, totalCentsFinal - deposit)),
      itemsJson,
      subtotalCents: finalSubtotalCents,
      taxCents: taxCentsFinal,
      totalCents: totalCentsFinal,
      paidCents: 0,
      payMode: mode,
      customerId: customer?.id || null,
      dogId: dog?.id || null,
      promoCode: appliedPromo?.valid ? appliedPromo.code : "",
      promoDiscountCents,
      pointsRedeemed: 0,
      pointsDiscountCents: 0,
    })) as any

    // 7b. The points redemption — writes now that the booking exists (it
    //     is the ledger source). Capped at the discounted subtotal; a rare
    //     failure just leaves the booking without points (logged).
    if (wantsPoints && booking?.id) {
      const redeem = await redeemPoints({
        userId: String(user.authUserId),
        pointsToRedeem: pointsRedeemed,
        subtotalCents: subtotalAfterPromo,
        sourceId: String(booking.id),
        note: `booking ${booking.id}`,
      }).catch(() => null)
      if (redeem?.ok) {
        pointsRedeemed = redeem.pointsRedeemed
        pointsDiscountCents = redeem.discountCents
        // Reconcile the record with the ACTUAL redemption (it may have
        // capped the points to the subtotal).
        const reconSubtotal = Math.max(0, subtotalAfterPromo - pointsDiscountCents)
        const reconTax = Math.round((reconSubtotal * cart.taxRatePercent) / 100)
        const reconTotal = reconSubtotal + reconTax
        await repo.update("bookings", booking.id, {
          subtotalCents: reconSubtotal,
          taxCents: reconTax,
          totalCents: reconTotal,
          balanceDue: centsToDollars(mode === "FULL" ? 0 : Math.max(0, reconTotal - deposit)),
          pointsRedeemed,
          pointsDiscountCents,
        }).catch(() => {})
        totalCentsFinal = reconTotal
      } else {
        console.error("[checkout] points redemption failed:", redeem)
      }
    }

    // The CRM registry — best-effort, never blocks a booking.
    if (booking?.id) {
      try { await syncCrmAppointment(booking) } catch (e: any) { console.error("[checkout] crm sync failed:", e.message) }
    }

    // 8. Emails — the "We got it" design-system lane: the customer gets the
    //    branded request-received email; the salon gets the internal
    //    notification (bookingNotificationHtml, same frame). Promo + points
    //    lines ride on the request honestly.
    const itemLines = [
      ...cart.lines.map((l) => `${l.name}${l.qty > 1 ? ` ×${l.qty}` : ""}${l.customQuote ? " — custom quote at the salon" : ` — ${centsToDollars(l.lineCents)}`}`),
      ...(promoDiscountCents > 0 ? [`Promo ${appliedPromo?.valid ? appliedPromo.code : ""} — -${centsToDollars(promoDiscountCents)}`] : []),
      ...(pointsDiscountCents > 0 ? [`Perks points (${pointsRedeemed} pts) — -${centsToDollars(pointsDiscountCents)}`] : []),
    ]
    sendBookingRequest({
      customerId: customer?.id,
      ownerName,
      dogName: String(dogName),
      service: packageName,
      size: sizeTier,
      date: String(date),
      time: String(time),
      email,
      phone: customer?.phone || "",
      notes: notes ? String(notes) : "",
      bookingId: booking?.id,
      itemLines,
      total: centsToDollars(totalCentsFinal),
      // The full intake — the salon's notification email carries everything
      // captured (owner direction): dog facts, promo, points.
      breed: String(breedName),
      weightLbs: weight,
      birthDate: birthDate ? String(birthDate) : null,
      promoCode: appliedPromo?.valid ? appliedPromo.code : "",
      pointsRedeemed: pointsRedeemed > 0 ? pointsRedeemed : null,
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
    const amount = payingFull ? totalCentsFinal : deposit
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
          totalCents: String(totalCentsFinal),
          depositCents: String(deposit),
          customerEmail: email,
          customerId: customer?.id || "",
          dogId: dog?.id || "",
          ownerName,
          dogName: String(dogName),
          promoCode: appliedPromo?.valid ? appliedPromo.code : "",
          pointsRedeemed: String(pointsRedeemed),
        },
      })

      if (booking?.id) {
        await repo.update("bookings", booking.id, { stripeCheckoutSessionId: session.id })
      }

      // The promo redemption — recorded ONCE, server-side, at creation.
      if (appliedPromo?.valid && booking?.id) {
        await recordRedemption({
          promoId: appliedPromo.promoId,
          code: appliedPromo.code,
          userId: user.authUserId || null,
          email,
          dogId: dog?.id || null,
          bookingId: String(booking.id),
          discountCents: promoDiscountCents,
        }).catch(() => {})
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
