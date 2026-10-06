import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { buildBookingIcs } from "@/lib/booking/ics"
import { centsToDollars } from "@/lib/booking/pricing"
import { totalCentsOf } from "@/lib/booking/status"

// ============================================================================
// GET /api/bookings/ics?bookingId=…
//
// The appointment as a downloadable .ics calendar file — the confirmation
// panel's "Add to calendar · iCal" target (Google + Outlook use their own
// add-event URLs built from the same UTC math in lib/booking/ics.ts).
//
// Session-scoped (any signed-in identity — the shopper, the learner, the
// booker are the same person), and the booking must belong to the caller's
// own email. No-store: the file is a function of live booking data.
// ============================================================================

function parseItems(json: any): any[] {
  if (!json) return []
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  try {
    const bookingId = new URL(req.url).searchParams.get("bookingId")
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
    }

    const { user } = await sessionForSiteFlow()
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 })
    }
    const email = String(user.email).toLowerCase()

    const booking = await repo.get("bookings", bookingId).catch(() => null)
    if (!booking) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    if (String(booking.email || "").toLowerCase() !== email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const items = parseItems(booking.itemsJson)
    const totalCents = totalCentsOf(booking)
    const paidCents = Number(booking.paidCents || 0)

    const ics = buildBookingIcs({
      bookingId: booking.id,
      dogName: booking.dogName,
      serviceNames:
        items.length > 0 ? items.map((l: any) => String(l.name)) : [booking.service || "Grooming"],
      date: String(booking.date || ""),
      time: String(booking.time || ""),
      durationMinutes: 120,
      totalDisplay:
        totalCents > 0
          ? centsToDollars(totalCents)
          : booking.servicePrice
            ? String(booking.servicePrice)
            : "",
      balanceDisplay: totalCents > 0 ? centsToDollars(Math.max(0, totalCents - paidCents)) : "",
    })

    const res = new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="all-about-pawz-appointment.ics"`,
        "Cache-Control": "no-store, max-age=0",
      },
    })
    return res
  } catch (err: any) {
    console.error("[GET /api/bookings/ics]", err)
    return NextResponse.json({ error: err.message || "Failed to build calendar file" }, { status: 500 })
  }
}
