import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sendAbandonedBooking } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"

// ---------------------------------------------------------------------------
// GET /api/automations/abandoned-bookings
//
// ABANDONED-BOOKING RECOVERY: for every PAYMENT_PENDING booking older than 4
// hours that has NOT already received a recovery email, send exactly ONE
// branded "Finish your booking" email (src/lib/email/templates) with a
// resume link. The wizard's ?resume=<id> support reopens the SAME booking
// row with a fresh Stripe session — the customer never re-types anything.
//
// TRIGGERS:
//   - Vercel Cron (vercel.json) — daily 13:00 UTC (8:00 AM CST), sends
//     Authorization: Bearer $CRON_SECRET when that env var is set in Vercel.
//   - Manual: /api/automations/abandoned-bookings?secret=$CRON_SECRET
//
// Idempotent by construction: email_messages (template=abandoned_booking,
// relatedBookingId) is the ledger — one recovery email per booking, ever.
// ---------------------------------------------------------------------------

const MIN_AGE_HOURS = 4
const MAX_AGE_DAYS = 7

export async function GET(req: NextRequest) {
  // ---- Auth: Vercel Cron bearer or ?secret= (when CRON_SECRET is set) ----
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization") || ""
    const querySecret = new URL(req.url).searchParams.get("secret") || ""
    const authorized = auth === `Bearer ${cronSecret}` || querySecret === cronSecret
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const [bookings, emailMessages] = await Promise.all([
      repo.list("bookings").catch(() => [] as any[]),
      repo.list("email_messages").catch(() => [] as any[]),
    ])

    const sentAlready = new Set(
      (emailMessages as any[])
        .filter((em) => em?.template === "abandoned_booking" && em?.relatedBookingId)
        .map((em) => String(em.relatedBookingId)),
    )

    const now = Date.now()
    const candidates = (bookings as any[])
      .filter((b) => {
        if (b?.status !== "PAYMENT_PENDING") return false
        if (String(b?.paymentStatus || "") === "PAID") return false
        const email = String(b?.email || "").trim()
        if (!email) return false
        const created = new Date(b?.createdAt || 0).getTime()
        if (!created) return false
        if (now - created < MIN_AGE_HOURS * 3600_000) return false // too fresh
        if (now - created > MAX_AGE_DAYS * 86_400_000) return false // too old
        if (sentAlready.has(String(b.id))) return false
        return true
      })
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(0, 50)

    let sent = 0
    const failures: string[] = []

    for (const b of candidates) {
      const resumeUrl = `${SITE_URL}/book/appointment?resume=${b.id}`
      const result = await sendAbandonedBooking({
        email: String(b.email),
        ownerName: String(b.ownerName || ""),
        dogName: b.dogName ? String(b.dogName) : null,
        service: String(b.service || ""),
        date: String(b.date || ""),
        time: String(b.time || ""),
        resumeUrl,
        bookingId: String(b.id),
      })
      if (result.ok) sent++
      else failures.push(`${b.id}: ${result.error || "send failed"}`)
    }

    return NextResponse.json({
      checked: candidates.length,
      sent,
      skipped: (bookings as any[]).length ? undefined : 0,
      ...(failures.length ? { failures } : {}),
    })
  } catch (e: any) {
    console.error("[automations/abandoned-bookings]", e)
    return NextResponse.json({ error: e?.message || "Automation failed" }, { status: 500 })
  }
}
