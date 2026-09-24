import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// GET /api/admin/orders/export — CSV export of all orders + line items.
// Returns a text/csv file download.
// ============================================================================

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const status = req.nextUrl.searchParams.get("status") || ""

  const rows = await withPg(async (client) => {
    const listRes = await client.query(`
      SELECT
        o.id::text AS id, o.email, o.customer_email, o.customer_id::text AS customer_id,
        o.status, o.payment_status, o.fulfillment_status, o.fulfillment_method,
        o.subtotal, o.total_amount, o.shipping_address, o.notes,
        o.tracking_number, o.carrier, o.tracking_status,
        o.created_at::text AS created_at
      FROM public.commerce_orders o
      WHERE o.tenant_id = $1
        ${status ? `AND o.fulfillment_status = $2` : ""}
      ORDER BY o.created_at DESC
    `, status ? [TENANT_ID(), status] : [TENANT_ID()])

    const ids = listRes.rows.map((r: any) => r.id)
    let itemsByOrder = new Map<string, any[]>()
    if (ids.length > 0) {
      const itemsRes = await client.query(
        `SELECT order_id::text AS order_id, name, quantity, unit_price
         FROM public.commerce_order_items
         WHERE order_id::text = ANY($1::text[])`,
        [ids],
      )
      for (const it of itemsRes.rows) {
        const arr = itemsByOrder.get(it.order_id) || []
        arr.push(it)
        itemsByOrder.set(it.order_id, arr)
      }
    }

    return listRes.rows.map((r: any) => ({
      ...r,
      items: itemsByOrder.get(r.id) || [],
    }))
  })

  // Build CSV
  const headers = [
    "Order ID", "Date", "Email", "Customer", "Status", "Payment Status",
    "Fulfillment Status", "Method", "Subtotal", "Total", "Tracking #",
    "Carrier", "Shipping Address", "Items",
  ]
  const csvLines = [headers.join(",")]
  for (const o of (rows || [])) {
    const items = (o.items || []).map((it: any) => `${it.quantity}x ${it.name}`).join("; ")
    const row = [
      o.id,
      o.created_at || "",
      o.email || o.customer_email || "",
      o.customer_id || "",
      o.status || "",
      o.payment_status || "",
      o.fulfillment_status || "",
      o.fulfillment_method || "",
      o.subtotal || "",
      o.total_amount || "",
      o.tracking_number || "",
      o.carrier || "",
      `"${(o.shipping_address || "").replace(/"/g, '""')}"`,
      `"${items.replace(/"/g, '""')}"`,
    ]
    csvLines.push(row.join(","))
  }

  const csv = csvLines.join("\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
