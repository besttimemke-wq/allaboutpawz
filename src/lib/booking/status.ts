import { repo } from "@/lib/repo"

// ---------------------------------------------------------------------------
// Booking status model — the REAL SIGNALS.
//
// A booking's lifecycle, as the business actually experiences it:
//
//   PENDING_PAYMENT  customer reached checkout, Stripe session pending
//   CONFIRMED        paid (deposit or full) → the slot is booked
//     └ paymentStatus DEPOSIT_PAID → balance remains
//     └ paymentStatus PAID_IN_FULL → nothing owed
//   ABANDONED        started checkout and never paid (lazily flipped after
//                    the Stripe session's useful life — a real marketing
//                    signal, not a guess: we KNOW they wanted the slot)
//   CANCELLED        cancelled by the customer or the salon
//   COMPLETED        the appointment happened (salon marks it)
//
// The customer record carries a parallel signal (customers.customerStatus):
//   PENDING  → started a booking, hasn't paid
//   ACTIVE   → has a booked (confirmed) appointment
//   ABANDONED→ only ever abandoned (never converted)
// Every transition below keeps the two in lockstep, lazily and idempotently.
// ---------------------------------------------------------------------------

export type BookingSignal =
  | "pending"
  | "booked"
  | "paid"
  | "abandoned"
  | "cancelled"
  | "completed"

export type CustomerSignal = "PENDING" | "ACTIVE" | "ABANDONED"

// Stripe Checkout Sessions live 24 hours by default — a PENDING_PAYMENT
// booking whose session can no longer complete is a true abandon.
const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000

export function bookingSignal(b: any): BookingSignal {
  const status = String(b.status || "").toUpperCase()
  if (status === "CANCELLED" || status === "CANCELED") return "cancelled"
  if (status === "COMPLETED") return "completed"
  if (status === "ABANDONED") return "abandoned"
  if (status === "CONFIRMED") {
    const pay = String(b.paymentStatus || "").toUpperCase()
    if (pay === "PAID_IN_FULL") return "paid"
    return "booked"
  }
  // PENDING_PAYMENT and anything unknown reads as pending
  return "pending"
}

export function signalLabel(s: BookingSignal): string {
  switch (s) {
    case "pending": return "Pending payment"
    case "booked": return "Booked"
    case "paid": return "Paid in full"
    case "abandoned": return "Abandoned"
    case "cancelled": return "Cancelled"
    case "completed": return "Completed"
  }
}

// Does this booking still owe money? (pending → everything; booked/deposit →
// the balance; paid/cancelled → nothing). Legacy rows without totalCents
// fall back to their servicePrice + deposit facts.
export function amountDueCents(b: any): number {
  const signal = bookingSignal(b)
  const total = totalCentsOf(b)
  const paid = Number(b.paidCents || 0)
  if (total <= 0) return 0
  if (signal === "pending") return total
  if (signal === "booked") return Math.max(0, total - paid)
  return 0
}

// The booking's real total in cents — the new flow's totalCents, or the
// legacy servicePrice (+ never more than the deposit paid on it).
export function totalCentsOf(b: any): number {
  const total = Number(b.totalCents || 0)
  if (total > 0) return total
  // Legacy row: parse "$95" and treat the old $25 deposit world honestly.
  const legacy = parseFloat(String(b.servicePrice || "").replace(/[^0-9.]/g, ""))
  if (Number.isFinite(legacy) && legacy > 0) return Math.round(legacy * 100)
  return 0
}

// ---------------------------------------------------------------------------
// Lazy abandonment — flip stale PENDING_PAYMENT bookings to ABANDONED.
// Called on read (portal lists, status checks). Idempotent, best-effort,
// never throws into the caller's response.
// ---------------------------------------------------------------------------
export async function abandonStaleBookings(): Promise<number> {
  try {
    const bookings = (await repo.list("bookings").catch(() => [])) as any[]
    const cutoff = Date.now() - ABANDON_AFTER_MS
    const stale = bookings.filter((b) => {
      if (String(b.status || "").toUpperCase() !== "PENDING_PAYMENT") return false
      const created = Date.parse(b.createdAt || "") || 0
      return created > 0 && created < cutoff
    })
    for (const b of stale) {
      await repo
        .update("bookings", b.id, { status: "ABANDONED", abandonedAt: new Date().toISOString() })
        .catch(() => {})
      await setCustomerSignal(b.email, "ABANDONED").catch(() => {})
    }
    return stale.length
  } catch {
    return 0
  }
}

// ---------------------------------------------------------------------------
// Customer signal sync — the customer's row reflects their booking reality.
// ACTIVE (booked) beats PENDING beats ABANDONED; the salon may also set
// statuses manually, so we never downgrade an ACTIVE customer back to
// PENDING (they're a client — they've booked before).
// ---------------------------------------------------------------------------
export async function setCustomerSignal(email: string | null | undefined, signal: CustomerSignal): Promise<void> {
  if (!email) return
  try {
    const rows = (await repo.list("customers").catch(() => [])) as any[]
    const customer = rows.find((c) => String(c.email || "").toLowerCase() === String(email).toLowerCase())
    if (!customer) return
    const current = String(customer.customerStatus || "").toUpperCase()
    if (signal === "PENDING" && (current === "ACTIVE" || current === "PENDING")) return
    if (signal === "ABANDONED" && current === "ACTIVE") return
    await repo.update("customers", customer.id, { customerStatus: signal }).catch(() => {})
  } catch { /* best-effort by design */ }
}

// The signal a customer's ROW should show given their whole booking history —
// used after cancellations/completions to recompute the honest state.
export async function recomputeCustomerSignal(email: string | null | undefined): Promise<void> {
  if (!email) return
  try {
    const bookings = (await repo.list("bookings").catch(() => [])) as any[]
    const mine = bookings.filter(
      (b) => String(b.email || "").toLowerCase() === String(email).toLowerCase(),
    )
    const now = Date.now()
    const upcomingConfirmed = mine.find((b) => {
      const s = bookingSignal(b)
      return (s === "booked" || s === "paid") && Date.parse(`${b.date}T23:59:59`) >= now
    })
    if (upcomingConfirmed) return setCustomerSignal(email, "ACTIVE")
    const everBooked = mine.find((b) => ["booked", "paid", "completed", "cancelled"].includes(bookingSignal(b)))
    if (everBooked) return setCustomerSignal(email, "ACTIVE")
    const anyPending = mine.find((b) => bookingSignal(b) === "pending")
    if (anyPending) return setCustomerSignal(email, "PENDING")
    const anyAbandoned = mine.find((b) => bookingSignal(b) === "abandoned")
    if (anyAbandoned) return setCustomerSignal(email, "ABANDONED")
  } catch { /* best-effort */ }
}
