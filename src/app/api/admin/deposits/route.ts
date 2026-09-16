import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { repo } from "@/lib/repo";
import pg from "pg";

// GET /api/admin/deposits
//
// Deposits & Escrow, live. PRIMARY SOURCE: the owner's commerce_deposits
// table (written find-or-create by the Stripe webhook — the $25 booking
// deposit lands there keyed off the booking id, customer_id ->
// crm_customers, never through a fake order row). The booking reference
// rides in `notes` (JSON) and joins back to bookings for pet/service/appt.
// LEGACY UNION: payments rows with type "deposit" that have no
// commerce_deposits row yet (pre-registry deposits) so nothing live
// disappears from the screen.
//
// Status mapping: held -> HELD, applied -> APPLIED, released -> RELEASED,
// forfeited -> FORFEITED, refunded -> REFUNDED; legacy rows derive from the
// payment + booking status.
export async function GET() {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const [payments, bookings, customers] = await Promise.all([
      repo.list("payments").catch(() => []),
      repo.list("bookings").catch(() => []),
      repo.list("customers").catch(() => []),
    ]);
    const bookingMap = new Map((bookings as any[]).map((b: any) => [b.id, b]));
    const customerMap = new Map((customers as any[]).map((c: any) => [c.id, c]));

    const rows: any[] = [];

    // ---- 1. The owner's escrow registry (primary) ----
    const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
    const registryBookingIds = new Set<string>();
    if (cs) {
      const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001";
      const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
      await client.connect();
      try {
        const res = await client.query(
          `SELECT cd.id::text, cd.deposit_number, cd.customer_id::text, cd.amount, cd.currency,
                  cd.collected_at, cd.method, cd.status, cd.notes, cd.deposit_type,
                  cc.first_name, cc.last_name, cc.email, cc.phone
           FROM public.commerce_deposits cd
           JOIN public.crm_customers cc ON cd.customer_id = cc.id
           WHERE cd.tenant_id = $1
           ORDER BY cd.collected_at DESC NULLS LAST;`,
          [TENANT_ID],
        );
        for (const r of res.rows) {
          let notes: any = {};
          try { notes = JSON.parse(r.notes || "{}"); } catch { /* plain-text notes */ }
          if (notes.bookingId) registryBookingIds.add(String(notes.bookingId));
          const b = notes.bookingId ? bookingMap.get(String(notes.bookingId)) : null;
          const amount = parseFloat(String(r.amount || "0")) || 0;
          rows.push({
            id: r.deposit_number || r.id,
            bookingId: notes.bookingId || null,
            customerId: null,
            customer: `${r.first_name || ""} ${r.last_name || ""}`.trim() || r.email || "—",
            phone: r.phone || b?.phone || "—",
            pet: notes.dogName || b?.dogName || "—",
            breed: b?.breed || "—",
            service: notes.service || b?.service || "Grooming deposit",
            amount,
            collectedDate: r.collected_at ? new Date(r.collected_at).toISOString().slice(0, 10) : "",
            collectedTime: r.collected_at ? new Date(r.collected_at).toISOString().slice(11, 19) + " UTC" : "",
            targetApptDate: b?.date || "",
            targetApptTime: b?.time ? `${b.time}${b?.status ? " // " + String(b.status).toUpperCase() : ""}` : "",
            method: r.method === "card" ? "CARD (STRIPE)" : String(r.method || "—").toUpperCase(),
            auth: "—",
            status: String(r.status || "held").toUpperCase(),
          });
        }
      } finally {
        await client.end().catch(() => {});
      }
    }

    // ---- 2. Legacy payments(deposit) rows not yet in the registry ----
    for (const p of (payments as any[]).filter((x: any) => x.type === "deposit")) {
      if (p.bookingId && registryBookingIds.has(String(p.bookingId))) continue;
      const b = p.bookingId ? bookingMap.get(p.bookingId) : null;
      const c = p.customerId ? customerMap.get(p.customerId) : null;
      let status = "PENDING";
      if (p.status === "refunded") status = "REFUNDED";
      else if (p.status === "paid" || p.status === "succeeded") {
        const bs = String(b?.status || "").toUpperCase();
        if (bs === "COMPLETED" || bs === "CHECKOUT" || bs === "COMPLETED_CHECKOUT") status = "APPLIED";
        else if (bs.includes("CANCEL")) status = "RELEASED";
        else if (bs.includes("NO_SHOW") || bs.includes("NO SHOW") || bs === "MISSING") status = "FORFEITED";
        else status = "HELD";
      }
      const amount = parseFloat(String(p.amount || "").replace(/[^0-9.]/g, "")) || 0;
      const collected = p.createdAt ? new Date(p.createdAt) : null;
      rows.push({
        id: p.id,
        bookingId: p.bookingId || null,
        customerId: p.customerId || null,
        customer: c ? `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email : b?.ownerName || "—",
        phone: c?.phone || b?.phone || "—",
        pet: b?.dogName || "—",
        breed: b?.breed || "—",
        service: b?.service || "Grooming deposit",
        amount,
        collectedDate: collected ? collected.toISOString().slice(0, 10) : "",
        collectedTime: collected ? collected.toISOString().slice(11, 19) + " UTC" : "",
        targetApptDate: b?.date || "",
        targetApptTime: b?.time ? `${b.time}${b?.status ? " // " + String(b.status).toUpperCase() : ""}` : "",
        method: p.stripePaymentIntentId ? "CARD (STRIPE)" : "—",
        auth: p.stripePaymentIntentId ? `PI: ${String(p.stripePaymentIntentId).slice(0, 14)}…` : "—",
        status,
      });
    }

    rows.sort((a, b) => (a.collectedDate < b.collectedDate ? 1 : -1));
    return NextResponse.json({ deposits: rows });
  } catch (e: any) {
    console.error("[GET /api/admin/deposits]", e);
    return NextResponse.json({ error: e.message || "Failed to load deposits" }, { status: 500 });
  }
}
