import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"

// GET /api/availability?date=2025-03-15&duration=120
// Returns available time slots, checking:
//   - business hours (7:00 AM – 6:00 PM, every 30 minutes, Mon closed)
//   - existing bookings (with service duration overlap)
//   - blocked times
// The server validates again at booking time (double-booking protection).

// Generate 30-minute slots from 7:00 AM to 6:00 PM (11 hours = 22 slots)
const OPEN_MIN = 7 * 60       // 7:00 AM
const CLOSE_MIN = 18 * 60    // 6:00 PM
const INTERVAL = 30           // 30 minutes

function generateSlots(): string[] {
  const slots: string[] = []
  for (let min = OPEN_MIN; min < CLOSE_MIN; min += INTERVAL) {
    const h = Math.floor(min / 60)
    const m = min % 60
    const ap = h >= 12 ? "PM" : "AM"
    const h12 = h % 12 || 12
    slots.push(`${h12}:${String(m).padStart(2, "0")} ${ap}`)
  }
  return slots
}

const ALL_SLOTS = generateSlots()

// Parse "10:30 AM" → minutes from midnight
function parseTimeToMin(t: string): number {
  const m = t.match(/^(\d+):(\d+)\s*(AM|PM)$/i)
  if (!m) return 0
  let h = parseInt(m[1])
  const min = parseInt(m[2])
  const ap = m[3].toUpperCase()
  if (ap === "PM" && h !== 12) h += 12
  if (ap === "AM" && h === 12) h = 0
  return h * 60 + min
}

// Format minutes → "10:30 AM"
function minToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const ap = h >= 12 ? "PM" : "AM"
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const duration = parseInt(searchParams.get("duration") || "120") // minutes

  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 })

  const d = new Date(date + "T00:00:00")
  const day = d.getDay()
  if (day === 1) return NextResponse.json({ date, closed: true, times: [], reason: "Closed Mondays" })

  // All days (except Monday) use the same 7:00 AM – 6:00 PM schedule
  const baseSlots = ALL_SLOTS

  // Get existing bookings for this date
  let existing: any[] = []
  let blocked: any[] = []
  try {
    const allBookings = (await repo.list("bookings")) as any[]
    existing = allBookings.filter((b) => b.date === date && b.status !== "CANCELLED")
    blocked = (await repo.list("blocked_times")) as any[]
    blocked = blocked.filter((b) => b.date === date)
  } catch { /* ignore */ }

  // Build occupied time ranges (start_min, end_min) from existing bookings
  // Each booking occupies its slot + a default 120min duration
  const occupied: [number, number][] = existing.map((b) => {
    const start = parseTimeToMin(b.time || "9:00 AM")
    const dur = parseInt(b.durationMinutes || "120")
    return [start, start + dur]
  })

  // Add blocked times
  for (const bt of blocked) {
    if (bt.startTime && bt.endTime) {
      occupied.push([parseTimeToMin(bt.startTime), parseTimeToMin(bt.endTime)])
    } else {
      // Whole day blocked
      return NextResponse.json({ date, closed: true, times: [], reason: bt.reason || "Blocked" })
    }
  }

  // Check each base slot: does [slot, slot+duration] overlap any occupied range?
  const available = baseSlots.filter((slot) => {
    const start = parseTimeToMin(slot)
    const end = start + duration
    // Check the slot fits within business hours (6:00 PM close)
    if (end > CLOSE_MIN) return false
    // Check overlap
    return !occupied.some(([oStart, oEnd]) => start < oEnd && end > oStart)
  })

  return NextResponse.json({ date, closed: false, times: available, duration })
}
