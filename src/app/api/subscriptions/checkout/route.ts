import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { repo } from "@/lib/repo"
import {
  getPlan, createPendingMembership, membershipsFor,
  type BathClubPlan,
} from "@/lib/subscriptions"
import { validatePromo, recordRedemption, rejectionText } from "@/lib/promos"

// ============================================================================
// POST /api/subscriptions/checkout — sign up for the PAWfection Bath Club.
//
//   { planId, billingInterval: 'monthly' | 'annual', dogId?, dogName?, promoCode? }
//
// The server is the authority: the plan (price, tiers, prepay rule) comes
// from subscription_plans, the multi-pet household discount is evaluated
// from the caller's existing memberships, the promo is re-validated, and a
// Stripe Checkout SUBSCRIPTION session is issued. XL plans (price NULL in
// the catalog) are custom-quote — online signup is refused with the salon
// phone number.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://aapawz.com").replace(/\/$/, "")
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    if (!user?.email) {
      return NextResponse.json(
        { error: "Sign in to start your membership.", code: "NO_SESSION" },
        { status: 401 },
      )
    }
    const email = String(user.email).toLowerCase()

    const body = await req.json().catch(() => ({}))
    const planId = String(body?.planId || "").trim()
    const interval: "monthly" | "annual" = body?.billingInterval === "annual" ? "annual" : "monthly"
    const promoCode = body?.promoCode ? String(body.promoCode).trim().toUpperCase() : ""
    const dogId = body?.dogId ? String(body.dogId) : null
    const dogName = body?.dogName ? String(body.dogName).trim() : null

    // 1. The plan — catalog-driven price. XL is custom quote.
    const plan: BathClubPlan | null = await getPlan(planId)
    if (!plan) {
      return NextResponse.json({ error: "That membership tier isn't available." }, { status: 400 })
    }
    if (plan.monthlyPriceCents == null) {
      return NextResponse.json(
        {
          error: `${plan.sizeLabel} memberships are custom-quote — call us at (901) 722-1114 and we'll set you up.`,
          code: "CUSTOM_QUOTE",
        },
        { status: 400 },
      )
    }

    // 2. One membership per dog — refuse a duplicate signup for the same dog.
    const existing = await membershipsFor(email).catch(() => [])
    const active = existing.filter((m) => m.status === "ACTIVE" || m.status === "PENDING")
    if (dogId && active.some((m) => m.dogId === dogId)) {
      return NextResponse.json({ error: "This pup already has a Bath Club membership." }, { status: 409 })
    }

    // 3. The price — annual prepay = 12 months for the price of 10: the
    //    YEAR charges monthly × charge-months (e.g. $129 × 10 = $1,290/yr —
    //    two months free), recurring yearly. Monthly is the tier price per
    //    month. Each ADDITIONAL membership in the household gets the plan's
    //    multi-pet percent off.
    let priceCents = plan.monthlyPriceCents
    if (interval === "annual") {
      priceCents = plan.monthlyPriceCents * plan.annualPrepayChargeMonths
    } else if (active.length > 0) {
      priceCents = Math.round(priceCents * (1 - plan.multiPetDiscountPercent / 100))
    }

    // 4. The promo — validated server-side; subscription signups accept
    //    promos scoped to subscriptions.
    let discountCents = 0
    let appliedPromo: Awaited<ReturnType<typeof validatePromo>> | null = null
    if (promoCode) {
      appliedPromo = await validatePromo(promoCode, { id: String(user.authUserId || email), email }, {
        subscriptionPlanId: plan.id,
        subtotalCents: priceCents,
        dogId,
      })
      if (!appliedPromo.valid) {
        return NextResponse.json(
          { error: rejectionText(appliedPromo.reason), code: "PROMO_REJECTED" },
          { status: 422 },
        )
      }
      discountCents = appliedPromo.discountCents
    }

    // 5. The customer record (portal link).
    let customerId: string | null = null
    try {
      const customers = (await repo.list("customers")) as any[]
      const c = customers.find((x) => String(x.email || "").toLowerCase() === email)
      customerId = c?.id || null
    } catch { /* best-effort */ }

    // 6. Stripe — subscription mode, recurring price built from the catalog.
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments aren't configured yet — call the salon to start your membership." },
        { status: 503 },
      )
    }

    const origin = requestOrigin(req)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.max(50, priceCents - discountCents),
            recurring: { interval: interval === "annual" ? "year" : "month" },
            product_data: {
              name: `${plan.name} — ${plan.sizeLabel} (${plan.weightRange})`,
              description:
                interval === "annual"
                  ? `Prepay ${plan.annualPrepayMonths} months for the price of ${plan.annualPrepayChargeMonths} — two months free. Up to ${plan.visitsPerMonth} baths a month, appointments required.`
                  : `Monthly membership — up to ${plan.visitsPerMonth} baths a month, appointments required.`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${origin}/customer/orders/subscriptions?signup=success`,
      cancel_url: `${origin}/customer/orders/subscriptions?signup=cancelled`,
      metadata: {
        type: "bath_club_signup",
        planId: plan.id,
        planSize: plan.sizeTier,
        email,
        dogId: dogId || "",
        dogName: dogName || "",
        billingInterval: interval,
        priceCents: String(priceCents),
        discountCents: String(discountCents),
        promoCode: appliedPromo?.valid ? appliedPromo.code : "",
        visitsIncluded: String(plan.visitsPerMonth),
      },
    })

    // 7. The PENDING membership row — activation happens on payment.
    const membershipId = await createPendingMembership({
      planId: plan.id,
      email,
      userId: user.authUserId || null,
      customerId,
      dogId,
      dogName,
      billingInterval: interval,
      priceCents,
      visitsIncluded: plan.visitsPerMonth,
      stripeCheckoutSessionId: session.id,
    })
    if (!membershipId) {
      // The Stripe session exists but we couldn't record it — expire it so
      // the customer is never charged for an untracked membership.
      await stripe.checkout.sessions.expire(session.id).catch(() => {})
      return NextResponse.json({ error: "Couldn't start the membership — try again." }, { status: 500 })
    }

    // 8. Redemption is recorded at creation (server-side, once).
    if (appliedPromo?.valid) {
      await recordRedemption({
        promoId: appliedPromo.promoId,
        code: appliedPromo.code,
        userId: user.authUserId || null,
        email,
        dogId,
        subscriptionId: membershipId,
        discountCents,
      }).catch(() => {})
    }

    return NextResponse.json({ url: session.url, membershipId })
  } catch (err: any) {
    console.error("[POST /api/subscriptions/checkout]", err)
    return NextResponse.json({ error: err.message || "Failed to start membership" }, { status: 500 })
  }
}
