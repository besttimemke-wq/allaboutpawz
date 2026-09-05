import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { callbackBase } from "@/lib/site-url"

// POST /api/stripe/customer-portal
// Creates a Stripe Billing Portal session for a customer.
// The server derives the stripe_customer_id from the Supabase customer record —
// never trusts a customer ID from the browser.
// Lazy Stripe client — module-level init would crash the route file when
// STRIPE_SECRET_KEY isn't set yet. Constructed on first authenticated use.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

export async function POST(req: NextRequest) {
  const { customerId } = await req.json()

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 })
  }

  // 1. Get the Supabase customer
  const customer = (await repo.get("customers", customerId)) as any
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 })
  }

  // 2. Check for Stripe customer ID
  if (!customer.stripeCustomerId) {
    return NextResponse.json({ error: "Customer has no Stripe account linked" }, { status: 400 })
  }

  // 3. Create Stripe Billing Portal session
  const origin = callbackBase(req)
  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${origin}/account/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error("[customer-portal]", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
