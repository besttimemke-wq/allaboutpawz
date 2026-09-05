import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { callbackBase } from "@/lib/site-url"

// POST /api/shop/checkout
// Body: { customerId, items: [{productId, quantity}], deliveryMethod: "ship"|"pickup",
//         email, phone, address, addressLine2, city, state, postalCode, notes }
//
// Booking-style shop checkout:
//   1. Re-verifies every product + price SERVER-SIDE (client prices are never trusted).
//   2. Creates the order (PAYMENT_PENDING) + order_items in Supabase.
//   3. Creates a Stripe Checkout Session (ad-hoc price_data when the product has
//      no stripePriceId, so every catalog product is purchasable) and returns
//      the Stripe URL for the browser to redirect to.
//   4. The webhook (checkout.session.completed) and/or /api/shop/verify marks
//      the order PAID after payment.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

function parseCents(price: string | null | undefined): number | null {
  if (!price) return null
  const v = parseFloat(String(price).replace(/[^0-9.]/g, ""))
  if (!isFinite(v) || v <= 0) return null
  return Math.round(v * 100)
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    customerId, items, deliveryMethod = "ship",
    email, phone, notes,
  } = body

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 })
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 })
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet. Set STRIPE_SECRET_KEY in .env to enable shop checkout." }, { status: 503 })
  }

  const isPickup = deliveryMethod === "pickup"
  const origin = callbackBase(req)
  const { address, addressLine2, city, state, postalCode } = body
  const shippingAddress = isPickup || !address
    ? null
    : [address, addressLine2, `${city || ""}, ${state || ""} ${postalCode || ""}`.trim().replace(/^,\s*/, "")].filter(Boolean).join(" · ")

  try {
    // ------------------------------------------------------------------
    // 1. Server-side product + price verification
    // ------------------------------------------------------------------
    const products = (await repo.list("products")) as any[]
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const orderItems: { productId: string; name: string; quantity: number; unitPrice: string }[] = []
    let subtotalCents = 0

    for (const it of items) {
      const p = products.find((x) => x.id === it.productId)
      if (!p || p.visible === false) {
        return NextResponse.json({ error: "One of the products in your bag is no longer available." }, { status: 404 })
      }
      const qty = Math.max(1, Math.min(20, Number(it.quantity) || 1))
      const cents = parseCents(p.price)

      if (p.stripePriceId) {
        // Product has a managed Stripe price — use it.
        lineItems.push({ price: p.stripePriceId, quantity: qty })
      } else {
        if (cents == null) {
          return NextResponse.json(
            { error: `"${p.name}" is not available for online purchase yet.` },
            { status: 400 },
          )
        }
        // Ad-hoc price (server-verified) so any catalog product is purchasable.
        lineItems.push({
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: p.name,
              ...(typeof p.image === "string" && p.image.startsWith("/")
                ? { images: [`${origin}${p.image}`] }
                : {}),
            },
          },
        })
      }

      subtotalCents += (cents || 0) * qty
      orderItems.push({ productId: p.id, name: p.name, quantity: qty, unitPrice: p.price })
    }

    // ------------------------------------------------------------------
    // 2. Resolve the customer (link the order to the customer record)
    // ------------------------------------------------------------------
    let customer: any = null
    if (customerId) customer = await repo.get("customers", customerId)
    if (!customer) {
      const all = (await repo.list("customers")) as any[]
      customer = all.find((c: any) => c.email === email) || null
    }

    // ------------------------------------------------------------------
    // 3. Order + order items in Supabase (PAYMENT_PENDING)
    // ------------------------------------------------------------------
    const order = (await repo.create("orders", {
      customerId: customer?.id || null,
      status: "PAYMENT_PENDING",
      paymentStatus: "UNPAID",
      subtotal: fmt(subtotalCents),
      email: String(email).toLowerCase(),
      deliveryMethod: isPickup ? "pickup" : "ship",
      shippingAddress,
      ...(notes ? { notes: String(notes).slice(0, 500) } : {}),
    })) as any
    if (order?.id) {
      for (const oi of orderItems) {
        await repo.create("order_items", { orderId: order.id, ...oi })
      }
    }

    // ------------------------------------------------------------------
    // 4. Stripe Checkout Session
    // ------------------------------------------------------------------
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(customer?.stripeCustomerId
        ? { customer: customer.stripeCustomerId }
        : { customer_email: email }),
      ...(isPickup
        ? {}
        : {
            shipping_address_collection: { allowed_countries: ["US"] },
            phone_number_collection: { enabled: true },
            shipping_options: [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  fixed_amount: { amount: 0, currency: "usd" },
                  display_name: "Complimentary standard shipping (5–7 business days)",
                },
              },
            ],
          }),
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      metadata: {
        orderId: order?.id || "",
        customerId: customer?.id || "",
        type: "product",
        deliveryMethod: isPickup ? "pickup" : "ship",
      },
      success_url: `${origin}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?checkout=cancel`,
    })

    // Persist the Stripe session id back onto the order.
    if (order?.id) {
      await repo.update("orders", order.id, { stripeCheckoutSessionId: session.id } as any)
    }

    // Activity log (non-fatal)
    try {
      await repo.create("activity_log", {
        entity: "order",
        entityId: order?.id || "",
        action: "order_placed",
        summary: `Order placed — ${orderItems.length} item(s), ${fmt(subtotalCents)} (${isPickup ? "pickup" : "shipping"})`,
      })
    } catch { /* ignore */ }

    return NextResponse.json({ url: session.url, sessionId: session.id, orderId: order?.id })
  } catch (e: any) {
    console.error("[shop/checkout]", e)
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 })
  }
}
