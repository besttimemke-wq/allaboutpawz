import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminApi } from "@/lib/admin/gate"
import { repo } from "@/lib/repo"
import { applyUspsTrackingToOrder } from "@/lib/shipping/usps"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// GET /api/admin/shipping — list shippable orders.
//   Gated by requireAdminApi().
//   Returns every commerce_orders row where:
//     fulfillment_status IN ('pending','processing','shipped')
//       AND payment_status = 'paid'
//   Sorted by created_at DESC. Each order includes its line items joined
//   from commerce_order_items by order_id.
//   Returns { orders }.
//
// POST /api/admin/shipping — bulk / single-order fulfillment actions.
//   Gated by requireAdminApi().
//   Body: { orderId, action, trackingNumber?, carrier? }
//   Actions:
//     mark_processing — fulfillment_status='processing'
//     mark_shipped    — fulfillment_status='shipped', tracking_number,
//                       carrier, tracking_status='IN_TRANSIT', status='shipped'
//     mark_delivered  — fulfillment_status='delivered', tracking_status='DELIVERED',
//                       status='delivered'
//     track_usps      — delegates to the shared USPS tracker (same module
//                       /api/admin/shipping/usps uses); returns USPS status.
//   After every action: revalidate /admin/orders + /customer/orders.
//   Returns { ok: true, order } (or { ok:false, error }).
// ============================================================================

const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

function nowIso() {
  return new Date().toISOString()
}

export async function GET() {
  const gate = await requireAdminApi()
  if (gate) return gate

  try {
    const [orders, items] = await Promise.all([
      repo.list("commerce_orders").catch(() => []),
      repo.list("commerce_order_items").catch(() => []),
    ])

    const shippableStatuses = new Set(["pending", "processing", "shipped"])
    const out = (orders as any[])
      .filter((o: any) =>
        shippableStatuses.has(String(o.fulfillment_status || "pending")) &&
        String(o.payment_status || "unpaid") === "paid",
      )
      .sort((a: any, b: any) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0
        return bt - at
      })
      .map((o: any) => ({
        id: o.id,
        customerEmail: o.email || o.customer_email || "",
        customerId: o.customer_id || null,
        status: o.status,
        paymentStatus: o.payment_status,
        fulfillmentStatus: o.fulfillment_status,
        fulfillmentMethod: o.fulfillment_method || null,
        trackingNumber: o.tracking_number || null,
        carrier: o.carrier || null,
        trackingStatus: o.tracking_status || null,
        subtotal: o.subtotal || null,
        totalAmount: o.total_amount || null,
        shippingAddress: o.shipping_address || null,
        notes: o.notes || null,
        couponId: o.coupon_id || null,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        items: (items as any[])
          .filter((it: any) => String(it.order_id) === String(o.id))
          .map((it: any) => ({
            id: it.id,
            orderId: it.order_id,
            productId: it.product_id,
            name: it.name,
            quantity: Number(it.quantity) || 1,
            unitPrice: it.unit_price,
          })),
      }))

    return NextResponse.json({ orders: out })
  } catch (e: any) {
    console.error("[GET /api/admin/shipping]", e)
    return NextResponse.json({ error: e?.message || "Failed to load shippable orders" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  try {
    const body = await req.json().catch(() => ({}))
    const orderId = String(body?.orderId || "").trim()
    const action = String(body?.action || "").trim()
    const trackingNumber = body?.trackingNumber ? String(body.trackingNumber).trim() : undefined
    const carrier = body?.carrier ? String(body.carrier).trim() : "USPS"

    if (!orderId || !action) {
      return NextResponse.json(
        { ok: false, error: "orderId and action are required." },
        { status: 400 },
      )
    }

    const existing = await repo.get("commerce_orders", orderId).catch(() => null)
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: `Order ${orderId} not found.` },
        { status: 404 },
      )
    }

    // ---- track_usps delegates to the shared USPS tracker --------------
    if (action === "track_usps") {
      const tn = trackingNumber || (existing as any).tracking_number
      if (!tn) {
        return NextResponse.json(
          { ok: false, error: "No tracking_number on this order and none supplied." },
          { status: 400 },
        )
      }
      const r = await applyUspsTrackingToOrder(orderId, tn)
      if (!r.ok) {
        return NextResponse.json({ ok: false, error: r.error }, { status: 500 })
      }
      return NextResponse.json({
        ok: true,
        order: r.order,
        usps: {
          status: r.result.status,
          isDelivered: r.result.isDelivered,
          summary: r.result.summary,
          simulated: r.result.simulated,
        },
      })
    }

    // ---- mark_processing / mark_shipped / mark_delivered --------------
    let patch: Record<string, any>
    switch (action) {
      case "mark_processing":
        patch = {
          fulfillment_status: "processing",
          updated_at: nowIso(),
        }
        break
      case "mark_shipped":
        patch = {
          fulfillment_status: "shipped",
          status: "shipped",
          tracking_status: "IN_TRANSIT",
          ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
          ...(carrier ? { carrier } : {}),
          updated_at: nowIso(),
        }
        break
      case "mark_delivered":
        patch = {
          fulfillment_status: "delivered",
          status: "delivered",
          tracking_status: "DELIVERED",
          updated_at: nowIso(),
        }
        break
      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action '${action}'. Valid: mark_processing, mark_shipped, mark_delivered, track_usps.` },
          { status: 400 },
        )
    }

    const updated = (await repo.update("commerce_orders", orderId, patch as any)) as any
    try {
      revalidatePath("/admin/orders")
      revalidatePath("/customer/orders")
    } catch {
      /* revalidate is best-effort */
    }

    return NextResponse.json({ ok: true, order: updated })
  } catch (e: any) {
    console.error("[POST /api/admin/shipping]", e)
    return NextResponse.json({ ok: false, error: e?.message || "Fulfillment action failed" }, { status: 500 })
  }
}
