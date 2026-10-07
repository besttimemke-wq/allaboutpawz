import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import {
  membershipsFor, markCancelledAtPeriodEnd, markMembershipStatus, membershipById, getPlan, type Membership,
} from "@/lib/subscriptions"
import { pgQuery, pgExec } from "@/lib/pg"
import { sendSubscriptionPlanChanged } from "@/lib/email"

// ============================================================================
// POST /api/subscriptions/manage — the portal's Subscriptions actions:
//
//   { membershipId, action: 'cancel_at_end' | 'resume' | 'pause' | 'unpause' }
//   { membershipId, action: 'change_plan', planId, billingInterval? }
//
// Cancellation takes effect at the end of the billing cycle (no partial-month
// refunds — the plan terms the customer agreed to). The caller only ever
// touches their own memberships.
//
// change_plan switches the tier (and optionally the billing interval). The
// server is the pricing authority: the new price always comes from the
// subscription_plans row, never the client. The Stripe subscription is
// price-swapped with proration_behavior "none" — the new price bills from
// the NEXT cycle, the current period is unchanged (no surprise charges).
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

function prettyDate(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })}`
}

function tierLabel(tier: string | null | undefined): string {
  const s = String(tier || "")
  return s ? s[0] + s.slice(1).toLowerCase() : ""
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in to manage your membership." }, { status: 401 })
    }
    const email = String(user.email).toLowerCase()

    const body = await req.json().catch(() => ({}))
    const membershipId = String(body?.membershipId || "").trim()
    const action = String(body?.action || "").trim()
    if (!membershipId || !["cancel_at_end", "resume", "pause", "unpause", "change_plan"].includes(action)) {
      return NextResponse.json({ error: "membershipId and a valid action are required." }, { status: 400 })
    }

    // Ownership — only the member's own memberships.
    const own = await membershipsFor(email).catch(() => [])
    const membership = own.find((m) => m.id === membershipId)
    if (!membership) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 })
    }

    if (action === "change_plan") {
      return await changePlan(membership, body, email)
    } else if (action === "cancel_at_end") {
      await markCancelledAtPeriodEnd(membershipId)
    } else if (action === "resume") {
      // A cancel-at-end request taken back before the period runs out.
      // (No tenant_id filter — the subscriptions table never had that
      // column, and ownership is already proven above.)
      await pgExec(
        `update public.subscriptions set cancel_at_period_end = false, updated_at = now()
         where id = $1`,
        [membershipId],
      )
    } else if (action === "pause") {
      await markMembershipStatus(membershipId, "PAUSED")
    } else if (action === "unpause") {
      await markMembershipStatus(membershipId, "ACTIVE")
    }

    const fresh = await membershipById(membershipId).catch(() => null)
    return NextResponse.json({ membership: fresh })
  } catch (err: any) {
    console.error("[POST /api/subscriptions/manage]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}

// ----------------------------------------------------------------------------
// change_plan — switch tier (and optionally billing interval).
//
//   { membershipId, action: 'change_plan', planId, billingInterval? }
//
// Per-subscription pricing mirrors the checkout math: monthly = the tier's
// monthly price; annual = monthly × annualPrepayChargeMonths (12 months for
// the price of 10). The LIST price applies — the household multi-pet percent
// is a signup-time discount for ADDITIONAL memberships and is never carried
// into a plan change.
// ----------------------------------------------------------------------------
async function changePlan(membership: Membership, body: any, email: string) {
  const membershipId = membership.id

  // 1. The target plan — catalog-driven, never client-priced.
  const planId = String(body?.planId || "").trim()
  if (!planId) {
    return NextResponse.json({ error: "planId is required to change plans." }, { status: 400 })
  }
  const plan = await getPlan(planId).catch(() => null)
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

  // 2. The chosen interval — defaults to the membership's current one, so a
  //    tier-only change keeps the billing cadence and an explicit
  //    billingInterval switches it.
  const intervalChoice: "monthly" | "annual" =
    body?.billingInterval === "annual" ? "annual" : body?.billingInterval === "monthly" ? "monthly" : membership.billingInterval

  // 3. Same plan AND same interval → nothing to change.
  if (plan.id === membership.planId && intervalChoice === membership.billingInterval) {
    return NextResponse.json({ error: "You're already on that plan." }, { status: 400 })
  }

  // 4. Only real memberships can change plans.
  if (membership.status !== "ACTIVE" && membership.status !== "PAUSED") {
    return NextResponse.json(
      { error: "Only active or paused memberships can change plans." },
      { status: 400 },
    )
  }

  // 5. The new price — server-computed from the plan row.
  const newPriceCents =
    intervalChoice === "annual"
      ? plan.monthlyPriceCents * plan.annualPrepayChargeMonths
      : plan.monthlyPriceCents

  // 6. Stripe price swap — a NEW Price object for the target plan+interval
  //    (reusing the subscription item's product), swapped onto the
  //    subscription with proration_behavior "none": the current period is
  //    untouched and the new price bills from the next cycle.
  if (membership.stripeSubscriptionId) {
    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments aren't configured — call the salon to change your plan." },
        { status: 503 },
      )
    }
    try {
      const sub = await stripe.subscriptions.retrieve(membership.stripeSubscriptionId, {
        expand: ["items.data.price.product"],
      })
      const item = sub.items.data[0]
      if (!item) {
        return NextResponse.json({ error: "This membership has no billable item — call the salon." }, { status: 400 })
      }
      const existingProduct =
        typeof item.price.product === "string" ? item.price.product : (item.price.product as Stripe.Product | Stripe.DeletedProduct | null)?.id ?? null

      const newPrice = await stripe.prices.create({
        unit_amount: newPriceCents,
        currency: "usd",
        recurring: { interval: intervalChoice === "annual" ? "year" : "month" },
        ...(existingProduct
          ? { product: existingProduct }
          : { product_data: { name: `${plan.name} — ${plan.sizeLabel} (${plan.weightRange})` } }),
      })

      await stripe.subscriptions.update(membership.stripeSubscriptionId, {
        items: [{ id: item.id, price: newPrice.id }],
        proration_behavior: "none",
      })
    } catch (err: any) {
      // Stripe is the billing authority — if the swap fails, the DB row must
      // NOT move (the customer would be charged the old price while the
      // portal showed the new one).
      console.error("[POST /api/subscriptions/manage] stripe price swap failed:", err?.message)
      return NextResponse.json(
        { error: `Stripe couldn't update your plan — ${err?.message || "try again"}. Nothing was charged.` },
        { status: 502 },
      )
    }
  }
  // No stripeSubscriptionId (salon-managed membership) → DB-only update.

  // 7. The DB row — plan, price, interval (+ visits from the plan). The
  //    current period end stays; the new price starts next cycle.
  const updated = await pgQuery<any>(
    `update public.subscriptions
     set plan_id = $2, price_cents = $3, billing_interval = $4, visits_included = $5,
         updated_at = now()
     where id = $1
     returning id`,
    [membershipId, plan.id, newPriceCents, intervalChoice, plan.visitsPerMonth],
  )
  if (!updated[0]?.id) {
    return NextResponse.json({ error: "Couldn't save the plan change — try again." }, { status: 500 })
  }

  // 8. Emails — fire-and-forget. sendSubscriptionPlanChanged sends the
  //    customer email AND the salon's plan-change alert in one call.
  const oldPlanName = `${membership.planName}${membership.sizeTier ? ` — ${tierLabel(membership.sizeTier)}` : ""}`
  const newPlanName = `${plan.name} — ${plan.sizeLabel}`
  const nextCycle = membership.currentPeriodEnd ? new Date(membership.currentPeriodEnd) : null
  const nextCyclePretty = prettyDate(nextCycle) || "your next billing cycle"

  void (async () => {
    try {
      // Best-effort customer facts for the email (name + CRM link).
      let customerId: string | undefined
      let firstName: string | null = null
      try {
        const cust = await pgQuery<{ id: string; firstName: string | null }>(
          `select id, "firstName" from public.customers where lower(email) = lower($1) limit 1`,
          [email],
        )
        customerId = cust[0]?.id || undefined
        firstName = cust[0]?.firstName ?? null
      } catch { /* best-effort */ }

      await sendSubscriptionPlanChanged({
        to: email,
        customerId,
        firstName,
        oldPlanName,
        newPlanName,
        newPrice: money(newPriceCents),
        billingInterval: intervalChoice === "annual" ? "year" : "month",
        effective: nextCyclePretty,
        renews: nextCyclePretty,
        email,
        dogName: membership.dogName,
        periodEnd: nextCyclePretty,
      })
    } catch (e: any) {
      console.error("[POST /api/subscriptions/manage] plan-change email failed:", e?.message)
    }
  })()

  const fresh = await membershipById(membershipId).catch(() => null)
  return NextResponse.json({ membership: fresh })
}
