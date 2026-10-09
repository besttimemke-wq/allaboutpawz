import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"
import { callbackBase } from "@/lib/site-url"
import { pgQuery } from "@/lib/pg"
import { getCatalogProductById, type CatalogProduct } from "@/lib/enterprise/catalog"
import { sendOrderPlacedAlert } from "@/lib/email"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"

// POST /api/shop/checkout
// Body: { items: [{productId, quantity}], deliveryMethod: "ship"|"pickup",
//         email, phone, address, addressLine2, city, state, postalCode, notes }
//
// (A client-sent customerId is accepted by the body shape for older callers
// but NEVER trusted — the order is attributed to the SESSION-resolved customer
// record below.)
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

  // ------------------------------------------------------------------
  // 0. AUTH GATE (owner ruling: clicking Shop must automatically know who
  //    the visitor is — no anonymous checkout). The session cookie is the
  //    only authority on who is placing the order; the client-side gate on
  //    /shop/bag routes signed-out visitors to /access-customer first, and
  //    this 401 is the server-side backstop behind it.
  // ------------------------------------------------------------------
  const { user } = await sessionForSiteFlow()
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 })
  }

  const {
    items, deliveryMethod = "ship",
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
    // 1. Server-side product + price verification (client prices are NEVER
    //    trusted). The storefront sells the LIVE feed catalog (products +
    //    product_variants — the same uuid ids every card and PDP links to),
    //    so every bag item is resolved there FIRST in one batched query.
    //    Legacy enterprise ids fall back to getCatalogProductById (per-item,
    //    indexed — never listCatalogProducts(), whose full-catalog memory
    //    load exhausted the session pooler once already).
    //
    //    THE BUG THIS FIXES: checkout used to verify against the normalized
    //    enterprise catalog ONLY (commerce_catalog_items), whose ids have
    //    ZERO overlap with the feed catalog — every feed product in the bag
    //    404'd at checkout ("no longer available") and the entire
    //    signup → bag → checkout → Stripe flow was dead.
    // ------------------------------------------------------------------
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const itemIds = items.map((it: { productId?: unknown; id?: unknown }) =>
      String(it.productId || it.id || ""),
    )
    const feedIds = [...new Set(itemIds.filter((id: string) => isUuid.test(id)))]
    const feedRows = feedIds.length
      ? await pgQuery<Record<string, unknown>>(
          `SELECT p.id::text AS id, COALESCE(p.title, p.name) AS name,
                  (SELECT mm.url FROM product_media mm
                    WHERE mm.product_id = p.id AND mm.media_type = 'image'
                    ORDER BY mm.sort_order ASC LIMIT 1) AS image,
                  (SELECT MIN(v.price) FROM product_variants v
                    WHERE v.product_id = p.id AND v.status = 'active' AND v.price IS NOT NULL) AS price
             FROM products p
            WHERE p.id = ANY($1::uuid[]) AND p.status = 'published'`,
          [feedIds],
        )
      : []
    const feedById = new Map(feedRows.map((r) => [String(r.id), r]))

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []
    const orderItems: { productId: string; name: string; quantity: number; unitPrice: string }[] = []
    let subtotalCents = 0

    for (const it of items) {
      const pid = String(it.productId || it.id || "")
      const qty = Math.max(1, Math.min(20, Number(it.quantity ?? it.qty) || 1))

      // Feed catalog first — the universe the storefront actually sells.
      let name: string
      let cents: number | null
      let stripePriceId: string | null
      let image: string | null
      const feed = feedById.get(pid)
      if (feed) {
        name = String(feed.name ?? "")
        const fp = Number(feed.price)
        cents = Number.isFinite(fp) && fp > 0 ? Math.round(fp * 100) : null
        stripePriceId = null
        image = (feed.image as string) || null
      } else {
        // Legacy enterprise fallback (hand-curated items).
        const legacy: CatalogProduct | null = await getCatalogProductById(pid)
        if (!legacy || !legacy.visible) {
          return NextResponse.json({ error: "One of the products in your bag is no longer available." }, { status: 404 })
        }
        name = legacy.name
        cents = activePriceCents(legacy)
        stripePriceId = legacy.stripePriceId
        image = typeof legacy.image === "string" ? legacy.image : null
      }

      if (stripePriceId) {
        // Managed Stripe price — use it.
        lineItems.push({ price: stripePriceId, quantity: qty })
      } else {
        if (cents == null) {
          return NextResponse.json(
            { error: `"${name}" is not available for online purchase yet.` },
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
              name,
              ...(typeof image === "string" && image.startsWith("/")
                ? { images: [`${origin}${image}`] }
                : {}),
            },
          },
        })
      }

      subtotalCents += (cents || 0) * qty
      orderItems.push({ productId: pid, name, quantity: qty, unitPrice: cents != null ? fmt(cents) : "$0.00" })
    }

    // ------------------------------------------------------------------
    // 2. Resolve the customer (link the order to the customer record).
    //    Server-side attribution: the session user is matched against the
    //    salon records by email/userId — the same resolution pattern the
    //    customer pets route uses — so the order lands on the account of
    //    whoever is actually signed in. A client-sent customerId is never
    //    trusted.
    // ------------------------------------------------------------------
    const sessionEmail = String(user.email || "").toLowerCase()
    const all = (await repo.list("customers").catch(() => [])) as any[]
    const customer =
      all.find(
        (c: any) =>
          String(c.email || "").toLowerCase() === sessionEmail ||
          c.userId === user.authUserId,
      ) || null

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
        customer_name: [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim(),
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

    // ------------------------------------------------------------------
    // 5. SALON ALERT (owner direction: every captured business event —
    //    bookings, subscription events, shop orders — lands in the salon
    //    inbox as an email). Fire-and-forget: a mail failure must never
    //    break checkout. The alert identifies the customer, every item,
    //    the totals, and the delivery method / ship-to.
    // ------------------------------------------------------------------
    const orderNumber = `ORD-${String(commerceOrder?.id || commerceOrderId).replace(/-/g, "").slice(0, 8).toUpperCase()}`
    const customerName =
      [customer?.firstName, customer?.lastName].filter(Boolean).join(" ").trim() ||
      String(email).split("@")[0]
    sendOrderPlacedAlert({
      customerId: customer?.id,
      customerName,
      email: String(email),
      phone: phone ? String(phone) : "",
      orderNumber,
      items: orderItems.map((oi) => ({ name: oi.name, qty: oi.quantity, price: oi.unitPrice })),
      subtotal: fmt(subtotalCents),
      shipping: isPickup ? "Pickup at the salon" : "Complimentary standard shipping",
      tax: "Calculated at checkout",
      total: fmt(subtotalCents),
      ...(shippingAddress ? { shipTo: shippingAddress } : {}),
      orderId: commerceOrder?.id || commerceOrderId,
    }).catch((e: any) => console.error("[shop/checkout] order alert failed:", e?.message))

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
