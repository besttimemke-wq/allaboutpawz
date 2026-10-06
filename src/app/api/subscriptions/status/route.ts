import { NextResponse } from "next/server"
import Stripe from "stripe"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { membershipsFor, markMembershipStatus, activateMembership, membershipById } from "@/lib/subscriptions"
import { earnPoints } from "@/lib/perks"

// ============================================================================
// GET /api/subscriptions/status — the signup verifier.
//
// The customer returns from Stripe to /customer/orders/subscriptions?signup=success.
// This route finds their PENDING membership, asks Stripe whether the checkout
// session actually PAID, flips the membership to ACTIVE, and posts the
// subscription_purchased perk points (idempotent). The same verification the
// booking flow uses — the webhook may race us; both paths are safe.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let _stripe: Stripe | null = null
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

export async function GET() {
  try {
    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in to manage your membership." }, { status: 401 })
    }
    const email = String(user.email).toLowerCase()

    const all = await membershipsFor(email).catch(() => [])
    const pending = all.filter((m) => m.status === "PENDING")
    const stripe = getStripe()

    const activated: string[] = []
    for (const m of pending) {
      try {
        const full = await membershipById(m.id).catch(() => m as any)
        const sessionId = full?.stripeCheckoutSessionId
        if (!stripe || !sessionId) continue

        const session = await stripe.checkout.sessions
          .retrieve(String(sessionId))
          .catch(() => null)
        if (!session) continue

        if (session.payment_status === "paid") {
          const stripeSubscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as any)?.id ?? undefined
          const ok = await activateMembership(m.id, { stripeSubscriptionId })
          if (ok) {
            activated.push(m.id)
            // Points post on completion (first payment succeeds) — the
            // amount is the recurring price carried on the membership row.
            if (user.authUserId) {
              await earnPoints({
                userId: String(user.authUserId),
                email,
                event: "subscription_purchased",
                amountCents: m.priceCents,
                sourceId: `membership-${m.id}`,
                note: `${m.planName} — ${m.billingInterval}`,
              }).catch(() => {})
            }
          }
        } else if (session.status === "expired" || session.status === "canceled") {
          // Unpaid after Stripe's session lifetime → honestly CANCELLED.
          await markMembershipStatus(m.id, "CANCELLED").catch(() => {})
        }
      } catch (e: any) {
        console.error("[subscriptions/status] membership verify failed:", e?.message)
      }
    }

    const memberships = await membershipsFor(email).catch(() => [])
    return NextResponse.json({ memberships, activated })
  } catch (err: any) {
    console.error("[GET /api/subscriptions/status]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
