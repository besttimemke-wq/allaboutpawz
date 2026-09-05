import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"

// POST /api/customers/pay
// Manually record a payment for a customer (cash, check, in-person card, etc.)
// Body: { customerId, bookingId?, amount, type, method, notes? }
export async function POST(req: NextRequest) {
  const { customerId, bookingId, amount, type, method, notes } = await req.json()

  if (!customerId || !amount) {
    return NextResponse.json({ error: "customerId and amount required" }, { status: 400 })
  }

  const payment = (await repo.create("payments", {
    customerId,
    bookingId: bookingId || null,
    amount: typeof amount === "number" ? `$${amount.toFixed(2)}` : amount,
    type: type || "payment",
    status: "paid",
    stripePaymentIntentId: method ? `manual:${method}` : null,
  })) as any

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
      entity: "payment", entityId: payment?.id, action: "recorded",
      summary: `Payment of ${typeof amount === "number" ? `$${amount.toFixed(2)}` : amount} recorded (${method || "manual"})`,
    })
  } catch { /* ignore */ }

  return NextResponse.json(payment, { status: 201 })
}
