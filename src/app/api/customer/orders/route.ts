import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, sessionFromPayload } from "@/lib/pawz-auth";
import { repo } from "@/lib/repo";
import pg from "pg";

// GET /api/customer/orders
//
// The customer portal Orders page data: every shop order belonging to the
// signed-in customer — matched by the order's own email (the Orders-CRM
// identity for product-only buyers) OR by customer_id when a salon record
// is linked. Items included per order.
//
// Schema notes (live commerce_orders / commerce_order_items — snake_case):
//   commerce_orders:        id, email, customer_email, customer_id, status,
//                           payment_status, fulfillment_status,
//                           fulfillment_method, subtotal, total_amount,
//                           shipping_address, notes, tracking_number,
//                           carrier, tracking_status, created_at
//   commerce_order_items:   id, order_id, product_id, name, quantity,
//                           unit_price, created_at
//
// The previous version of this file read camelCase fields (it.orderId,
// o.customerId, o.createdAt) that don't exist on the snake_case commerce_*
// tables, so item matching silently returned [] for every order and the
// sort was effectively random. This version uses the real snake_case
// column names and maps the response back to the camelCase shape the
// customer portal Orders page already renders.
async function sessionUser() {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (payload) return sessionFromPayload(payload);
  return null;
}

export async function GET() {
  try {
    const user = await sessionUser();
    if (!user || !user.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const email = user.email.toLowerCase();

    // The salon records that belong to this login (exact email match or the
    // userId FK) — their ids link orders that carry customer_id.
    let appCustomerIds: string[] = [];
    const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
    if (cs) {
      const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
      await client.connect();
      try {
        const res = await client.query(
          `SELECT id FROM public.customers WHERE lower(email) = lower($1) OR "userId" = $2::text;`,
          [email, user.authUserId],
        );
        appCustomerIds = res.rows.map((r: any) => r.id);
      } finally {
        await client.end().catch(() => {});
      }
    }

    const [orders, items] = await Promise.all([
      repo.list("commerce_orders").catch(() => []),
      repo.list("commerce_order_items").catch(() => []),
    ]);

    const mine = (orders as any[])
      .filter((o: any) => {
        // Match by either the new `email` column OR the legacy `customer_email`
        // column (both exist on the live commerce_orders table).
        const oEmail = String(o.email || o.customer_email || "").toLowerCase();
        const cid = String(o.customer_id || "");
        return (oEmail && oEmail === email) || (cid && appCustomerIds.includes(cid));
      })
      .sort((a: any, b: any) => {
        // Both tables use snake_case created_at (NOT createdAt).
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      })
      .map((o: any) => ({
        id: o.id,
        status: o.status || "PENDING",
        paymentStatus: o.payment_status || "UNPAID",
        subtotal: o.subtotal || o.total_amount || "$0.00",
        totalAmount: o.total_amount || null,
        fulfillmentStatus: o.fulfillment_status || null,
        fulfillmentMethod: o.fulfillment_method || null,
        deliveryMethod: o.fulfillment_method || (o.shipping_address ? "ship" : "ship"),
        shippingAddress: o.shipping_address || "",
        trackingNumber: o.tracking_number || "",
        carrier: o.carrier || "",
        trackingStatus: o.tracking_status || "",
        notes: o.notes || "",
        placedAt: o.created_at || null,
        createdAt: o.created_at || null,
        items: (items as any[])
          // FIX: column is `order_id` (snake_case) on commerce_order_items,
          // not `orderId`. The old code read it.orderId and matched nothing.
          .filter((it: any) => String(it.order_id) === String(o.id))
          .map((it: any) => ({
            id: it.id,
            orderId: it.order_id,
            productId: it.product_id,
            name: it.name,
            quantity: Number(it.quantity) || 1,
            unitPrice: it.unit_price,
          })),
      }));

    return NextResponse.json({ orders: mine });
  } catch (e: any) {
    console.error("[GET /api/customer/orders]", e);
    return NextResponse.json({ error: e.message || "Failed to load orders" }, { status: 500 });
  }
}
