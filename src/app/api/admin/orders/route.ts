import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

// ============================================================================
// GET /api/admin/orders — admin-gated list of REAL shop orders.
//
// Reads from commerce_orders (the snake_case table the Stripe webhook +
// shop checkout write into), joined with commerce_order_items.
//
// Query params:
//   ?status=pending|processing|shipped|delivered|cancelled  (fulfillment_status)
//   ?payment=paid|unpaid                                    (payment_status)
//
// Returns: { orders: [{ id, email, status, paymentStatus, fulfillmentStatus,
//                       subtotal, totalAmount, deliveryMethod, shippingAddress,
//                       trackingNumber, carrier, trackingStatus, notes,
//                       createdAt, items: [...] }] }
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const tenant = TENANT_ID()
  const status = req.nextUrl.searchParams.get("status") || ""
  const payment = req.nextUrl.searchParams.get("payment") || ""

  const rows = await withPg(async (client) => {
    const listRes = await client.query(
      `SELECT
         o.id::text AS id,
         o.email,
         o.customer_email,
         o.customer_id::text AS customer_id,
         o.status,
         o.payment_status,
         o.fulfillment_status,
         o.fulfillment_method,
         o.subtotal,
         o.total_amount,
         o.shipping_address,
         o.notes,
         o.tracking_number,
         o.carrier,
         o.tracking_status,
         o.coupon_id::text AS coupon_id,
         o.stripe_checkout_id,
         o.stripe_payment_intent_id,
         o.created_at::text AS created_at,
         o.updated_at::text AS updated_at,
         c.first_name AS customer_first_name,
         c.last_name AS customer_last_name,
         (SELECT count(*)::int FROM public.commerce_order_items WHERE order_id::text = o.id::text) AS item_count
       FROM public.commerce_orders o
       LEFT JOIN public.crm_customers c ON o.customer_id::text = c.id::text
       WHERE o.tenant_id = $1
         ${status ? `AND o.fulfillment_status = $2` : ""}
         ${payment ? `AND o.payment_status = $${status ? 3 : 2}` : ""}
       ORDER BY o.created_at DESC NULLS LAST
       LIMIT 200;`,
      status && payment ? [tenant, status, payment] : status ? [tenant, status] : payment ? [tenant, payment] : [tenant],
    )

    const ids = listRes.rows.map((r: any) => r.id)
    const itemsByOrder = new Map<string, any[]>()
    if (ids.length > 0) {
      const itemsRes = await client.query(
        `SELECT
           oi.id::text AS id,
           oi.order_id::text AS order_id,
           oi.product_id::text AS product_id,
           oi.name,
           oi.quantity,
           oi.unit_price
         FROM public.commerce_order_items oi
         WHERE oi.order_id::text = ANY($1::text[])`,
        [ids],
      )
      for (const it of itemsRes.rows) {
        const arr = itemsByOrder.get(it.order_id) || []
        arr.push({
          id: it.id,
          productId: it.product_id,
          name: it.name,
          quantity: Number(it.quantity) || 1,
          unitPrice: it.unit_price,
        })
        itemsByOrder.set(it.order_id, arr)
      }
    }

    return listRes.rows.map((r: any) => ({
      id: r.id,
      email: r.email || r.customer_email,
      customerId: r.customer_id,
      customerName: [r.customer_first_name, r.customer_last_name].filter(Boolean).join(" ") || null,
      status: r.status,
      paymentStatus: r.payment_status,
      fulfillmentStatus: r.fulfillment_status,
      fulfillmentMethod: r.fulfillment_method,
      subtotal: r.subtotal,
      totalAmount: r.total_amount,
      shippingAddress: r.shipping_address,
      notes: r.notes,
      trackingNumber: r.tracking_number,
      carrier: r.carrier,
      trackingStatus: r.tracking_status,
      couponId: r.coupon_id,
      stripeCheckoutSessionId: r.stripe_checkout_id,
      stripePaymentIntentId: r.stripe_payment_intent_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      itemCount: r.item_count || 0,
      items: itemsByOrder.get(r.id) || [],
    }))
  })

  return NextResponse.json({ orders: rows || [] })
}
