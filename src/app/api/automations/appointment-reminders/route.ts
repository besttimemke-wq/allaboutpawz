import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sendAppointmentReminder } from "@/lib/email"

// ---------------------------------------------------------------------------
// GET /api/automations/appointment-reminders
//
// Day-before appointment reminders: every CONFIRMED wizard booking whose
// date is TOMORROW (America/Chicago) gets exactly one branded reminder
// email ("Grooming tomorrow" — see src/lib/email/templates/appointments).
//
// TRIGGERS:
//   - Vercel Cron (vercel.json) — daily 17:00 UTC (11:00 AM CST)
//   - Manual: /api/automations/appointment-reminders?secret=$CRON_SECRET
//
// Idempotent by construction: email_messages (template=appointment_reminder,
// relatedBookingId) is the ledger — one reminder per booking, ever. Manual
// per-appointment reminder sends from the admin schedule (send_reminder
// action) use a different call path and are not blocked by this ledger.
// ---------------------------------------------------------------------------

function tomorrowIso(): string {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 3600_000)
  return tomorrow.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }) // YYYY-MM-DD
}

function prettyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

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
    const tomorrow = tomorrowIso()

    const [bookings, emailMessages] = await Promise.all([
      repo.list("bookings").catch(() => [] as any[]),
      repo.list("email_messages").catch(() => [] as any[]),
    ])

    const sentAlready = new Set(
      (emailMessages as any[])
        .filter((em) => em?.template === "appointment_reminder" && em?.relatedBookingId)
        .map((em) => String(em.relatedBookingId)),
    )

    const candidates = (bookings as any[]).filter((b) => {
      if (b?.status !== "CONFIRMED") return false
      const email = String(b?.email || "").trim()
      if (!email) return false
      if (!String(b?.date || "").startsWith(tomorrow)) return false
      if (sentAlready.has(String(b.id))) return false
      return true
    })

    let sent = 0
    const failures: string[] = []

    for (const b of candidates) {
      const result = await sendAppointmentReminder({
        email: String(b.email),
        ownerName: String(b.ownerName || ""),
        dogName: b.dogName ? String(b.dogName) : null,
        service: String(b.service || "Grooming appointment"),
        size: b.size ? String(b.size) : null,
        date: prettyDate(String(b.date)),
        time: b.time ? String(b.time) : null,
        bookingId: String(b.id),
      })
      if (result.ok) sent++
      else failures.push(`${b.id}: ${result.error || "send failed"}`)
    }

    return NextResponse.json({
      tomorrow,
      checked: candidates.length,
      sent,
      ...(failures.length ? { failures } : {}),
    })
  } catch (e: any) {
    console.error("[automations/appointment-reminders]", e)
    return NextResponse.json({ error: e?.message || "Automation failed" }, { status: 500 })
  }
}
