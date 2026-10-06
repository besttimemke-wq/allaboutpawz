import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { SITE_URL } from "@/lib/site-url"

// ---------------------------------------------------------------------------
// GET /api/automations/abandoned-bookings
//
// ABANDONED-BOOKING RECOVERY (owner request, 2026-10-06): "if a user
// abandons the cart shouldn't we be sending an email that says finish your
// booking with a link". A booking that reached checkout but never paid is
// unambiguous abandonment — the row exists, the $25 deposit never cleared.
//
// For every PAYMENT_PENDING booking older than 4 hours (including
// paymentStatus ABANDONED — Stripe expired the session) that has NOT
// already received a recovery email, send exactly ONE "Finish your
// booking" email with a resume link. The wizard's ?resume=<id> support
// reopens the SAME booking row with a fresh Stripe session — the customer
// never re-types anything and no duplicate rows are created.
//
// TRIGGERS:
//   - Vercel Cron (vercel.json) — daily 13:00 UTC (8:00 AM CST), sends
//     Authorization: Bearer $CRON_SECRET when that env var is set in Vercel.
//   - Manual: /api/automations/abandoned-bookings?secret=$CRON_SECRET
//     — lets the owner fire a recovery sweep any time.
//
// Runs through the repo (PostgREST via SUPABASE_URL) — the same data path
// the whole site uses, so it works wherever the app is deployed, with no
// direct-connection credentials required.
//
// Idempotent by construction: email_messages (template=abandoned_booking,
// relatedBookingId) is the ledger — one recovery email per booking, ever.
// ---------------------------------------------------------------------------

const MIN_AGE_HOURS = 4
const MAX_AGE_DAYS = 7

function abandonedBookingHtml(opts: {
  name: string
  dogName: string
  service: string
  date: string
  time: string
  resumeUrl: string
}): string {
  const when = [opts.date, opts.time].filter(Boolean).join(" at ")
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a">
    <p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Your booking is saved</p>
    <h1 style="font-size:26px;line-height:1.15;margin:8px 0 0">Still want that appointment${opts.dogName ? ` for ${opts.dogName}` : ""}?</h1>
    <p style="font-style:italic;color:#9a7b3c;font-size:18px;margin:4px 0 16px">From Pawz to PAWfection</p>
    <p>Hi ${opts.name || "there"},</p>
    <p>You were almost done booking${opts.service ? ` a <strong>${opts.service}</strong>` : " an appointment"}${when ? ` for <strong>${when}</strong>` : ""} — everything you entered is still saved. Only the $25 deposit is left to confirm your slot.</p>
    <div style="background:#fff;border:1px solid #e0d6bf;padding:16px;margin:16px 0">
      <p style="margin:0 0 4px"><strong>What's left:</strong> the $25 deposit (credited toward your groom)</p>
      <p style="margin:0"><strong>Time to finish:</strong> about a minute</p>
    </div>
    <p style="text-align:center;margin:28px 0">
      <a href="${opts.resumeUrl}" style="background:#9a7b3c;color:#fff;padding:14px 30px;text-decoration:none;font-weight:700;letter-spacing:0.08em;font-family:sans-serif;font-size:13px">FINISH YOUR BOOKING</a>
    </p>
    <p style="font-size:12px;color:#6b6255">If the time no longer works, the same link lets you pick up where you left off and adjust it. Questions? Just reply to this email or call the salon.</p>
    <p style="font-size:12px;color:#6b6255;margin-top:22px">— All About Pawz</p>
  </body></html>`
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
      const firstName = String(b.ownerName || "").split(" ")[0] || ""
      const result = await sendEmail({
        to: String(b.email),
        template: "abandoned_booking",
        subject: `Finish your booking${b.dogName ? ` — ${b.dogName}'s appointment is saved` : " — your appointment is saved"}`,
        html: abandonedBookingHtml({
          name: firstName,
          dogName: String(b.dogName || ""),
          service: String(b.service || ""),
          date: String(b.date || ""),
          time: String(b.time || ""),
          resumeUrl,
        }),
        relatedBookingId: String(b.id),
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
