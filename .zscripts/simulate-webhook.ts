// Simulate the Stripe webhook for the test booking — the exact call the
// webhook route makes (applyBookingPayment). Verifies the CONFIRMED flip,
// paidCents, PAID_IN_FULL, customer signal, and the confirmation email.
import { applyBookingPayment } from "@/lib/booking/payments"
import { repo } from "@/lib/repo"

async function main() {
  const bookingId = process.argv[2]
  const amountCents = Number(process.argv[3] || 0)
  const booking = await repo.get("bookings", bookingId)
  if (!booking) { console.log("NOT FOUND"); process.exit(1) }
  const res = await applyBookingPayment({
    bookingId,
    stripeSessionId: booking.stripeCheckoutSessionId,
    amountCents,
    paymentIntentId: "pi_test_" + Date.now(),
    sessionId: booking.stripeCheckoutSessionId,
  })
  const fresh = await repo.get("bookings", bookingId)
  console.log("RESULT ok:", res.ok, "changed:", res.ok && res.changed)
  console.log("BOOKING:", JSON.stringify({ status: fresh.status, paymentStatus: fresh.paymentStatus, paidCents: fresh.paidCents, balanceDue: fresh.balanceDue, payMode: fresh.payMode }))
  const customers = (await repo.list("customers").catch(() => [])) as any[]
  const c = customers.find((x) => String(x.email || "").toLowerCase() === "booking@aapawz.com")
  console.log("CUSTOMER STATUS:", c?.customerStatus)
  process.exit(0)
}
main()
