import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { callbackBase } from "@/lib/site-url"
import { listCatalogProducts, type CatalogProduct } from "@/lib/enterprise/catalog"

// POST /api/shop/checkout
// Body: { customerId, items: [{productId, quantity}], deliveryMethod: "ship"|"pickup",
//         email, phone, address, addressLine2, city, state, postalCode, notes }
//
// Booking-style shop checkout:
//   1. Re-verifies every product + price SERVER-SIDE (client prices are never
//      trusted). Reads from the NORMALIZED enterprise schema
//      (erp_products + erp_product_skus + commerce_catalog_items +
//      commerce_prices + commerce_product_media) via listCatalogProducts().
//      The active unit price is CatalogProduct.priceCents (sale price when
//      on sale, otherwise the base price from commerce_prices).
//   2. Writes the order to BOTH tables (defense in depth):
//        • commerce_orders + commerce_order_items  (snake_case, the new
//          fulfillment surface — status='pending', payment_status='unpaid',
//          fulfillment_status='pending')
//        • orders + order_items  (camelCase, the legacy admin OrdersView)
//      So even if the webhook fails, the order exists in commerce_orders
//      and the admin orders page can already see it.
//   3. Creates a Stripe Checkout Session. metadata.flow_type='shop' so the
//      webhook recognizes it; metadata.commerce_order_id lets the webhook
//      find the commerce_orders row to UPDATE (no duplicate INSERT).
//      metadata.cart_items = JSON.stringify(orderItems) so the webhook can
//      decrement inventory without re-resolving the cart.
//   4. Returns { url, sessionId, orderId, commerceOrderId }.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

// The enterprise CatalogProduct already carries the active price (priceCents),
// the compare-at reference, stock-on-hand, and the Stripe price id. No
// client-side price parsing is trusted.
function activePriceCents(p: CatalogProduct): number | null {
  return p.priceCents > 0 ? p.priceCents : null
}

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
    // 1. Server-side product + price verification (NORMALIZED schema).
    //    Reads from commerce_catalog_items + erp_products + erp_product_skus
    //    + commerce_prices + commerce_product_media via listCatalogProducts().
    //    Client prices are NEVER trusted.
    // ------------------------------------------------------------------
    const products = await listCatalogProducts()
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const orderItems: { productId: string; name: string; quantity: number; unitPrice: string }[] = []
    let subtotalCents = 0

    for (const it of items) {
      const pid = String(it.productId || it.id || "")
      const p = products.find((x) => x.id === pid)
      if (!p || !p.visible) {
        return NextResponse.json({ error: "One of the products in your bag is no longer available." }, { status: 404 })
      }
      const qty = Math.max(1, Math.min(20, Number(it.quantity ?? it.qty) || 1))
      const cents = activePriceCents(p)
      const stripePriceId = p.stripePriceId

      if (stripePriceId) {
        // Product has a managed Stripe price — use it.
        lineItems.push({ price: stripePriceId, quantity: qty })
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
      const unitPriceStr = cents != null ? fmt(cents) : "$0.00"
      orderItems.push({ productId: p.id, name: p.name, quantity: qty, unitPrice: unitPriceStr })
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
    // 3a. commerce_orders + commerce_order_items (snake_case — the new
    //     fulfillment surface). status='pending', payment_status='unpaid',
    //     fulfillment_status='pending'. The webhook flips these to
    //     confirmed/paid on checkout.session.completed.
    // ------------------------------------------------------------------
    const commerceOrderId = crypto.randomUUID()
    const commerceOrder = (await repo.create("commerce_orders", {
      id: commerceOrderId,
      tenant_id: TENANT_ID,
      customer_id: customer?.id || null,
      customer_email: String(email).toLowerCase(),
      email: String(email).toLowerCase(),
      subtotal: fmt(subtotalCents),
      total_amount: fmt(subtotalCents),
      status: "pending",
      payment_status: "unpaid",
      fulfillment_status: "pending",
      fulfillment_method: isPickup ? "pickup" : "ship",
      ...(shippingAddress ? { shipping_address: shippingAddress } : {}),
      ...(notes ? { notes: String(notes).slice(0, 500) } : {}),
      metadata: { flow_type: "shop", source: "shop_checkout", cart_items: orderItems },
    } as any)) as any

    if (commerceOrder?.id) {
      for (const oi of orderItems) {
        try {
          await repo.create("commerce_order_items", {
            id: crypto.randomUUID(),
            tenant_id: TENANT_ID,
            order_id: commerceOrder.id,
            product_id: oi.productId,
            name: oi.name,
            quantity: oi.quantity,
            unit_price: oi.unitPrice,
          } as any)
        } catch (e: any) {
          console.error("[shop/checkout] commerce_order_items insert failed:", e?.message)
        }
      }
    }

    // ------------------------------------------------------------------
    // 3b. Legacy orders table was removed in the enterprise migration
    // (the live schema has commerce_orders only). commerce_orders from 3a
    // is the single source of truth. Skip the legacy write entirely.
    // ------------------------------------------------------------------
    const order = { id: commerceOrder?.id || commerceOrderId } as any

    // ------------------------------------------------------------------
    // 4. Stripe Checkout Session — metadata.flow_type='shop' so the webhook
    //    recognizes it. metadata.commerce_order_id lets the webhook UPDATE
    //    the commerce_orders row (no duplicate insert). metadata.cart_items
    //    is JSON-stringified so the webhook can decrement inventory without
    //    re-resolving the cart.
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
        commerceOrderId: commerceOrder?.id || commerceOrderId,
        customerId: customer?.id || "",
        flow_type: "shop",
        deliveryMethod: isPickup ? "pickup" : "ship",
        cart_items: JSON.stringify(orderItems),
      },
      success_url: `${origin}/shop?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop?checkout=cancel`,
    })

    // Persist the Stripe session id back onto the commerce_orders row.
    if (commerceOrder?.id) {
      await repo.update("commerce_orders", commerceOrder.id, {
        stripe_checkout_id: session.id,
      } as any)
    }

    // Activity log (non-fatal)
    try {
      await repo.create("activity_log", {
        entity: "order",
        entityId: commerceOrder?.id || commerceOrderId,
        action: "order_placed",
        summary: `Order placed — ${orderItems.length} item(s), ${fmt(subtotalCents)} (${isPickup ? "pickup" : "shipping"})`,
      })
    } catch { /* ignore */ }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      orderId: commerceOrder?.id || commerceOrderId,
      commerceOrderId: commerceOrder?.id || commerceOrderId,
    })
  } catch (e: any) {
    console.error("[shop/checkout]", e)
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 })
  }
}
