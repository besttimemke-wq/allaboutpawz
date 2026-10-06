import { repo } from "@/lib/repo"

// ---------------------------------------------------------------------------
// Slot availability — shared by booking checkout and customer reschedule.
// One definition of "this time is open", enforced server-side at write time:
// business hours 7:00 AM – 6:00 PM (closed Mondays), 120-minute standard
// groom duration, existing bookings and blocked times occupy the day.
// ---------------------------------------------------------------------------

const OPEN_MIN = 7 * 60
const CLOSE_MIN = 18 * 60
const DEFAULT_DURATION = 120

export function parseTimeToMin(t: string): number {
  const m = String(t || "").match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return -1
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  const ap = m[3].toUpperCase()
  if (ap === "PM" && h !== 12) h += 12
  if (ap === "AM" && h === 12) h = 0
  return h * 60 + min
}

export type SlotCheck =
  | { ok: true }
  | { ok: false; reason: string }

// Is (date, time) bookable right now? excludeBookingId lets a reschedule
// re-check the customer's own existing slot without colliding with itself.
export async function checkSlotAvailable(
  date: string,
  time: string,
  excludeBookingId?: string | null,
): Promise<SlotCheck> {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: "Pick a valid date." }
  const start = parseTimeToMin(time)
  if (start < OPEN_MIN) return { ok: false, reason: "Pick a valid time." }
  const end = start + DEFAULT_DURATION
  if (end > CLOSE_MIN) return { ok: false, reason: "That time is too late in the day for a full groom." }

  const day = new Date(`${date}T00:00:00`).getDay()
  if (day === 1) return { ok: false, reason: "We're closed on Mondays." }

  let bookings: any[] = []
  let blocked: any[] = []
  try {
    bookings = ((await repo.list("bookings")) as any[]).filter(
      (b) => b.date === date && !["CANCELLED", "CANCELED"].includes(String(b.status || "").toUpperCase()) && b.id !== excludeBookingId,
    )
    blocked = ((await repo.list("blocked_times")) as any[]).filter((b) => b.date === date)
  } catch { /* read failure → conservative continue */ }

  for (const b of bookings) {
    const oStart = parseTimeToMin(b.time || "9:00 AM")
    if (oStart < 0) continue
    const oEnd = oStart + DEFAULT_DURATION
    if (start < oEnd && end > oStart) {
      return { ok: false, reason: "That time was just taken — please pick another." }
    }
  }

  for (const bt of blocked) {
    if (bt.startTime && bt.endTime) {
      const bStart = parseTimeToMin(bt.startTime)
      const bEnd = parseTimeToMin(bt.endTime)
      if (bStart >= 0 && bEnd > bStart && start < bEnd && end > bStart) {
        return { ok: false, reason: "That time is blocked — please pick another." }
      }
    } else {
      return { ok: false, reason: (bt.reason as string) || "We're unavailable that day." }
    }
  }

  return { ok: true }
}
