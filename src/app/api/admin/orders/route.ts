import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

// ============================================================================
// GET /api/admin/orders — read-only list of real shop orders (the table the
// Stripe shop checkout + booking deposit flow write into). Replaces the
// hardcoded mock array in OrdersView.
//
// Tables:
//   orders        (id, email, customerId, status, paymentStatus,
//                 fulfillment_status, subtotal, deliveryMethod, notes,
//                 stripeCheckoutSessionId, stripePaymentIntentId, carrier,
//                 tracking_number, createdAt, updatedAt, tenant_id)
//   order_items    (id, orderId, name, quantity, unitPrice, productId, ...)
//   customers      (firstName, lastName, email — for the customer join)
// ============================================================================

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const tenant = TENANT_ID()
  const status = req.nextUrl.searchParams.get("status") || ""

  const rows = await withPg(async (client) => {
    const listRes = await client.query(
      `SELECT
         o.id::text, o.email, o.status, o."paymentStatus", o."fulfillment_status",
         regexp_replace(o.subtotal::text, '[^0-9.]', '', 'g')::numeric::text AS subtotal,
         o.currency, o."deliveryMethod",
         o.notes, o.carrier, o.tracking_number,
         o."stripeCheckoutSessionId", o."stripePaymentIntentId",
         o."customerId"::text AS customer_id,
         o."createdAt"::text AS created_at,
         o."updatedAt"::text AS updated_at,
         c."firstName" AS customer_first_name,
         c."lastName" AS customer_last_name,
         (SELECT COUNT(*)::int FROM public.order_items WHERE "orderId" = o.id) AS item_count,
         (SELECT COALESCE(SUM(regexp_replace("unitPrice"::text, '[^0-9.]', '', 'g')::numeric * quantity), 0)::numeric::text
            FROM public.order_items WHERE "orderId" = o.id) AS items_total
       FROM public.orders o
       LEFT JOIN public.customers c ON o."customerId" = c.id
       WHERE o.tenant_id = $1 ${status ? `AND o.status = $2` : ""}
       ORDER BY o."createdAt" DESC NULLS LAST
       LIMIT 200;`,
      status ? [tenant, status] : [tenant],
    )

    const ids = listRes.rows.map((r: any) => r.id)
    const itemsByOrder = new Map<string, any[]>()
    if (ids.length > 0) {
      const itemsRes = await client.query(
        `SELECT
           oi."orderId"::text AS order_id,
           oi.id::text AS id, oi.name, oi.quantity,
           regexp_replace(oi."unitPrice"::text, '[^0-9.]', '', 'g')::numeric::text AS unit_price,
           oi."productId"::text AS product_id
         FROM public.order_items oi
         WHERE oi.tenant_id = $1 AND oi."orderId"::text = ANY($2::text[])
         ORDER BY oi."createdAt" ASC;`,
        [tenant, ids],
      )
      for (const it of itemsRes.rows) {
        const arr = itemsByOrder.get(it.order_id) || []
        arr.push({
          id: it.id, name: it.name,
          quantity: Number(it.quantity) || 1,
          unitPrice: Number(it.unit_price) || 0,
          productId: it.product_id || null,
        })
        itemsByOrder.set(it.order_id, arr)
      }
    }

    return listRes.rows.map((r: any) => {
      const customerName = [r.customer_first_name, r.customer_last_name].filter(Boolean).join(" ").trim() || r.email || "Guest"
      return {
        id: r.id,
        email: r.email,
        customerName,
        customerId: r.customer_id || null,
        status: r.status,
        paymentStatus: r.paymentStatus,
        fulfillmentStatus: r.fulfillment_status,
        subtotal: Number(r.subtotal) || 0,
        itemsTotal: Number(r.items_total) || 0,
        currency: r.currency || "USD",
        deliveryMethod: r.deliveryMethod || null,
        notes: r.notes || null,
        carrier: r.carrier || null,
        trackingNumber: r.tracking_number || null,
        stripeCheckoutSessionId: r.stripeCheckoutSessionId || null,
        stripePaymentIntentId: r.stripePaymentIntentId || null,
        itemCount: Number(r.item_count) || 0,
        items: itemsByOrder.get(r.id) || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    })
  })

  if (rows === null) return NextResponse.json({ error: "Database connection not configured." }, { status: 500 })
  return NextResponse.json({ orders: rows })
}
