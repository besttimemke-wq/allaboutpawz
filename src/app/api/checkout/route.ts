import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo, supabaseConfig } from "@/lib/repo"
import { callbackBase } from "@/lib/site-url"

// POST /api/checkout
// Body: { productId, quantity }
// Creates a PENDING order + order_items, then a Stripe Checkout Session, and
// returns the Stripe URL the browser should redirect to. The price is always
// looked up server-side from the product record — never trusted from the client.
// Lazy Stripe client — module-level init would crash the route file when
// STRIPE_SECRET_KEY isn't set yet. Constructed on first authenticated use.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

export async function POST(req: NextRequest) {
  const { productId, quantity = 1 } = await req.json()
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 })

  // Server is the source of truth for the product + price.
  const product = (await repo.get("products", productId)) as any
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  if (!product.stripePriceId) {
    return NextResponse.json({ error: "This product is not available for online purchase yet." }, { status: 400 })
  }

  const qty = Math.max(1, Math.min(99, Number(quantity) || 1))
  const origin = callbackBase(req)
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Payments are not configured yet. Set STRIPE_SECRET_KEY in .env to enable shop checkout." }, { status: 503 })
  }

  try {
    // Create an order record in PENDING_PAYMENT state.
    const order = (await repo.create("orders" as any, {
      status: "PAYMENT_PENDING",
      paymentStatus: "UNPAID",
      subtotal: product.price,
    } as any)) as any
    if (order?.id) {
      await repo.create("order_items" as any, {
        orderId: order.id, productId: product.id, name: product.name,
        quantity: qty, unitPrice: product.price,
      } as any)
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: product.stripePriceId, quantity: qty }],
      success_url: `${origin}/shop?checkout=success`,
      cancel_url: `${origin}/shop?checkout=cancel`,
      metadata: {
        orderId: order?.id || "",
        productId: product.id,
        type: "product",
      },
    })

    // Persist the Stripe session id back onto the order.
    if (order?.id) {
      await repo.update("orders" as any, order.id, { stripeCheckoutSessionId: session.id } as any)
    }

    return NextResponse.json({ url: session.url, sessionId: session.id, orderId: order?.id })
  } catch (e: any) {
    console.error("[checkout]", e)
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 })
  }
}

// Helper exported for the webhook to call (server-only).
export async function fulfillOrderFromSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId
  if (!orderId) return
  await repo.update("orders" as any, orderId, {
    status: "PAID",
    paymentStatus: "PAID",
    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
  } as any)
  // Notify via email.
  const { sendPaymentReceipt } = await import("@/lib/email")
  const order = (await repo.get("orders" as any, orderId)) as any
  if (session.customer_details?.email) {
    await sendPaymentReceipt({
      amount: order?.subtotal || "",
      type: "order",
      email: session.customer_details?.email,
    }).catch(() => {})
  }
}

// Suppress unused import warning
void supabaseConfig
