import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, sessionFromPayload } from "@/lib/pawz-auth";
import { repo } from "@/lib/repo";
import pg from "pg";

// GET /api/customer/orders
//
// The customer portal Orders page data: every shop order belonging to the
// signed-in customer — matched by the order's own email (the Orders-CRM
// identity for product-only buyers) OR by customerId when a salon record is
// linked. Items included per order.
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
    // userId FK) — their ids link orders that carry customerId.
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
        const oEmail = String(o.email || "").toLowerCase();
        return (oEmail && oEmail === email) || (o.customerId && appCustomerIds.includes(o.customerId));
      })
      .sort((a: any, b: any) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((o: any) => ({
        id: o.id,
        status: o.status || "PENDING",
        paymentStatus: o.paymentStatus || "UNPAID",
        subtotal: o.subtotal || "$0.00",
        deliveryMethod: o.deliveryMethod || "ship",
        shippingAddress: o.shippingAddress || "",
        trackingNumber: o.trackingNumber || "",
        carrier: o.carrier || "",
        notes: o.notes || "",
        placedAt: o.createdAt || null,
        items: (items as any[]).filter((it: any) => it.orderId === o.id),
      }));

    return NextResponse.json({ orders: mine });
  } catch (e: any) {
    console.error("[GET /api/customer/orders]", e);
    return NextResponse.json({ error: e.message || "Failed to load orders" }, { status: 500 });
  }
}
