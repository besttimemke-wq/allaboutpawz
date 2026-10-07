// ============================================================================
// Verify Stripe subscription pricing per Bath Club tier — creates real
// checkout sessions (subscription mode, price_data from the catalog, exactly
// like /api/subscriptions/checkout), asserts unit amounts + recurring
// intervals, expires them. Also asserts the ANNUAL prepay total.
// Run: bun .zscripts/verify-stripe-sub-pricing.ts
// ============================================================================
import Stripe from "stripe"
import { listBathClubPlans } from "../src/lib/subscriptions"

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) { console.log("STRIPE_SECRET_KEY not set"); process.exit(1) }
  const stripe = new Stripe(key)
  const plans = await listBathClubPlans()

  const expected: Record<string, number | null> = {
    SMALL: 12900, MEDIUM: 15900, LARGE: 19900, XLARGE: null,
  }

  let failures = 0
  for (const p of plans) {
    const want = expected[p.sizeTier]
    if (want === null) {
      const ok = p.monthlyPriceCents === null
      console.log(`${ok ? "✓" : "✗"} ${p.sizeTier}: catalog=${p.monthlyPriceCents ?? "null"} (custom quote, no online signup)`)
      if (!ok) failures++
      continue
    }
    // Monthly session — same construction as the checkout route
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: p.monthlyPriceCents!,
          recurring: { interval: "month" },
          product_data: { name: `TEST — ${p.name} — ${p.sizeLabel}` },
        },
        quantity: 1,
      }],
      customer_email: "pricing-verify@aapawz.com",
      success_url: "https://aapawz.com/verify",
      cancel_url: "https://aapawz.com/verify",
    })
    const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["line_items"],
    })
    const li: any = retrieved.line_items?.data?.[0]
    const got = li?.price?.unit_amount ?? null
    const recurring = li?.price?.recurring?.interval ?? "?"
    const ok = got === want && recurring === "month"
    console.log(`${ok ? "✓" : "✗"} ${p.sizeTier} monthly: stripe=$${got ? got / 100 : "?"}/mo (${recurring}) expected=$${want / 100}/mo`)
    if (!ok) failures++
    await stripe.checkout.sessions.expire(session.id).catch(() => {})

    // Annual session — 12 months for the price of 10 = monthly × 10 per YEAR
    const annual = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: p.monthlyPriceCents! * p.annualPrepayChargeMonths,
          recurring: { interval: "year" },
          product_data: { name: `TEST — ${p.name} — ${p.sizeLabel} annual` },
        },
        quantity: 1,
      }],
      customer_email: "pricing-verify@aapawz.com",
      success_url: "https://aapawz.com/verify",
      cancel_url: "https://aapawz.com/verify",
    })
    const annualRetrieved = await stripe.checkout.sessions.retrieve(annual.id, {
      expand: ["line_items"],
    })
    const ali: any = annualRetrieved.line_items?.data?.[0]
    const aGot = ali?.price?.unit_amount ?? null
    const aRecurring = ali?.price?.recurring?.interval ?? "?"
    const aWant = p.monthlyPriceCents! * p.annualPrepayChargeMonths
    const aOk = aGot === aWant && aRecurring === "year"
    console.log(`${aOk ? "✓" : "✗"} ${p.sizeTier} annual: stripe=$${aGot ? aGot / 100 : "?"}/yr (${aRecurring}) expected=$${aWant / 100}/yr`)
    if (!aOk) failures++
    await stripe.checkout.sessions.expire(annual.id).catch(() => {})
  }

  console.log(failures === 0 ? "\nALL STRIPE SUBSCRIPTION PRICING VERIFIED (monthly + annual)" : `\n${failures} FAILURES`)
  process.exit(failures === 0 ? 0 : 1)
}
main()
