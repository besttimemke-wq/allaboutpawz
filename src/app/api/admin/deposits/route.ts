import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { repo } from "@/lib/repo";

// GET /api/admin/deposits
//
// Deposits & Escrow, live: the payments rows with type "deposit" ARE the
// escrow ledger entries (written find-or-create by the Stripe webhook on
// checkout.session.completed — the $25 booking deposit lands here keyed off
// the booking id, never through a fake order row). Joined to bookings
// (pet, service, appointment) and customers (name, phone).
//
// Status derivation:
//   payment refunded                         -> REFUNDED
//   paid + booking COMPLETED                 -> APPLIED
//   paid + booking CANCELLED                 -> RELEASED
//   paid + booking NO-SHOW                   -> FORFEITED
//   paid + upcoming/confirmed                -> HELD
//   anything else (pending / failed / no booking) -> PENDING
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

    const deposits = (payments as any[])
      .filter((p) => p.type === "deposit")
      .map((p: any) => {
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
        const customerName = c
          ? `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email
          : b?.ownerName || "—";
        const collected = p.createdAt ? new Date(p.createdAt) : null;

        return {
          id: p.id,
          bookingId: p.bookingId || null,
          customerId: p.customerId || null,
          customer: customerName,
          phone: c?.phone || b?.phone || "—",
          pet: b?.dogName || "—",
          breed: b?.breed || "—",
          service: b?.service || "Grooming deposit",
          amount,
          collectedDate: collected ? collected.toISOString().slice(0, 10) : "",
          collectedTime: collected ? collected.toISOString().slice(11, 19) + " UTC" : "",
          targetApptDate: b?.date || "",
          targetApptTime: b?.time
            ? `${b.time}${b?.status ? " // " + String(b.status).toUpperCase() : ""}`
            : "",
          method: p.stripePaymentIntentId ? "CARD (STRIPE)" : "—",
          auth: p.stripePaymentIntentId ? `PI: ${String(p.stripePaymentIntentId).slice(0, 14)}…` : "—",
          status,
        };
      })
      .sort((a: any, b: any) => (a.collectedDate < b.collectedDate ? 1 : -1));

    return NextResponse.json({ deposits });
  } catch (e: any) {
    console.error("[GET /api/admin/deposits]", e);
    return NextResponse.json({ error: e.message || "Failed to load deposits" }, { status: 500 });
  }
}
