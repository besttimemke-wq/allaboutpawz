import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { withPg, writeCommercePayment, ensureCrmCustomer, parseMoney } from "@/lib/crm/enterprise"

// POST /api/customers/pay
// Manually record a payment for a customer (cash, check, in-person card, etc.)
// Body: { customerId, bookingId?, amount, type, method, notes? }
//
// The ledger row lands in commerce_payments on the owner's table — keyed to
// the crm_customers registry row (resolved through the salon record), with a
// find-or-created commerce_payment_methods entry for the manual method.
export async function POST(req: NextRequest) {
  const { customerId, bookingId, amount, type, method, notes } = await req.json()

  if (!customerId || !amount) {
    return NextResponse.json({ error: "customerId and amount required" }, { status: 400 })
  }

  const numericAmount = parseMoney(amount)

  // Resolve the salon record → the crm_customers registry row.
  const crmCustomerId = await withPg(async (client) => {
    const salon = await client.query(
      `SELECT * FROM public.customers WHERE id = $1 LIMIT 1`,
      [String(customerId)],
    )
    const row = salon.rows[0]
    if (!row) return null
    return ensureCrmCustomer(client, {
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      appCustomerId: row.id,
    })
  }).catch(() => null)

  const paymentNumber = bookingId
    ? `PAY-${String(bookingId).slice(0, 8).toUpperCase()}`
    : `PAY-M${Date.now().toString(36).toUpperCase()}`

  const paymentId = await withPg((client) =>
    writeCommercePayment(client, {
      paymentNumber,
      amount: numericAmount,
      status: "succeeded",
      customerId: crmCustomerId || null,
      methodType: "manual",
      manualMethodName: method || "manual",
      processorTransactionId: method ? `manual:${method}` : "manual",
    }),
  ).catch(() => null)

  // If linked to a booking, update its payment status
  if (bookingId) {
    try {
      const booking = (await repo.get("bookings", bookingId)) as any
      if (booking) {
        await repo.update("bookings", bookingId, {
          paymentStatus: "PAID",
          status: booking.status === "PAYMENT_PENDING" ? "CONFIRMED" : booking.status,
        })
      }
    } catch { /* ignore */ }
  }

  // Log activity
  try {
    await repo.create("activity_log", {
      entity: "payment", entityId: paymentId || "", action: "recorded",
      summary: `Payment of ${typeof amount === "number" ? `$${amount.toFixed(2)}` : amount} recorded (${method || "manual"})`,
    })
  } catch { /* ignore */ }

  return NextResponse.json({
    id: paymentId,
    paymentNumber,
    amount: numericAmount,
    type: type || "payment",
    method: method || "manual",
    status: "succeeded",
    recorded: !!paymentId,
    notes: notes || null,
  }, { status: 201 })
}
