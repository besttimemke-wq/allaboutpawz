import { NextRequest, NextResponse } from "next/server"
import { pgQuery, pgExec } from "@/lib/pg"
import { sendSubscriptionRenewalReminder } from "@/lib/email"
import { requireAdminApi } from "@/lib/admin/gate"

// ============================================================================
// GET /api/cron/subscription-reminders — the Bath Club pre-charge reminder.
//
// The owner's "月扣款前发提醒邮件": every ACTIVE membership whose billing
// period ends within the next 3 days (inclusive) gets exactly one branded
// reminder email ("Your membership renews soon" — see
// src/lib/email/templates/commerce.ts) before the monthly/annual charge.
//
// TRIGGERS:
//   - Vercel Cron (vercel.json) — daily 14:00 UTC (8:00 AM CST), after the
//     13:00 abandoned-bookings sweep.
//   - Manual: /api/cron/subscription-reminders?secret=$CRON_SECRET
//
// Gate: CRON_SECRET (Authorization: Bearer / x-cron-secret / ?secret=) or an
// authenticated admin session — same rule as /api/perks/earn.
//
// Idempotency: the subscriptions row remembers the period it was reminded
// for (reminder_sent_period). A second sweep the same day — or a Vercel cron
// retry — sends nothing new; a renewed membership (new current_period_end)
// gets its own reminder before the next charge.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function prettyDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })}`
}

function sizeLabel(tier: string | null | undefined): string {
  const s = String(tier || "")
  return s ? s[0] + s.slice(1).toLowerCase() : ""
}

export async function GET(req: NextRequest) {
  // ---- Auth: CRON_SECRET bearer/x-cron-secret/?secret= or an admin session ----
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
    const headerSecret = req.headers.get("x-cron-secret") || ""
    const querySecret = new URL(req.url).searchParams.get("secret") || ""
    const authorized = bearer === cronSecret || headerSecret === cronSecret || querySecret === cronSecret
    if (!authorized) {
      const adminGate = await requireAdminApi()
      if (adminGate) return adminGate
    }
  } else {
    // No CRON_SECRET configured (e.g. local dev without env) — fall back to
    // the admin-session gate so the endpoint is never wide open.
    const adminGate = await requireAdminApi()
    if (adminGate) return adminGate
  }

  try {
    const now = new Date()
    const horizon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // ACTIVE memberships renewing within 3 days that were NOT already
    // reminded for this exact period. Dog name + plan ride the join columns.
    const due = await pgQuery<any>(
      `select s.id, s.email, s.customer_id, s.dog_name, s.billing_interval,
              s.price_cents, s.visits_included, s.visits_used, s.current_period_end,
              p.name as plan_name, p.size_tier
       from public.subscriptions s
       join public.subscription_plans p on p.id = s.plan_id
       where s.status = 'ACTIVE'
         and s.current_period_end is not null
         and s.current_period_end >= $1 and s.current_period_end <= $2
         and (s.reminder_sent_period is null or s.reminder_sent_period <> s.current_period_end)`,
      [now, horizon],
    )

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const m of due) {
      try {
        const periodEnd = new Date(m.current_period_end)
        // Best-effort first name from the CRM record — "there" otherwise.
        let firstName = "there"
        try {
          const cust = await pgQuery<{ firstName: string | null }>(
            `select "firstName" from public.customers where lower(email) = lower($1) limit 1`,
            [String(m.email || "")],
          )
          if (cust[0]?.firstName) firstName = String(cust[0].firstName)
        } catch { /* best-effort */ }

        const amount = money(Number(m.price_cents ?? 0))
        const interval: "monthly" | "annual" = m.billing_interval === "annual" ? "annual" : "monthly"
        const planName = `${m.plan_name ?? "PAWfection Bath Club"}${m.size_tier ? ` — ${sizeLabel(m.size_tier)}` : ""}`

        const res = await sendSubscriptionRenewalReminder({
          to: String(m.email || ""),
          customerId: m.customer_id || undefined,
          firstName,
          planName,
          dogName: m.dog_name || undefined,
          amount,
          interval,
          renewsOn: prettyDate(periodEnd),
          bathsUsed: Number(m.visits_used ?? 0),
          bathsIncluded: Number(m.visits_included ?? 4),
        })

        if (res?.ok) {
          // Mark THIS period as reminded. reminder_sent_period takes the
          // column's exact value (SQL-side) so the next sweep's strict
          // <> comparison sees them equal — a JS Date round-trip would drop
          // Postgres' microseconds and re-send. The date_trunc guard pins
          // the row we actually reminded for, so a renewal webhook that
          // advances the period mid-sweep can't suppress next cycle's email.
          await pgExec(
            `update public.subscriptions
             set reminder_sent_period = current_period_end, reminder_sent_at = now(), updated_at = now()
             where id = $1 and date_trunc('milliseconds', current_period_end) = $2::timestamptz`,
            [String(m.id), periodEnd],
          )
          sent++
        } else {
          skipped++
          if (res?.error) errors.push(`${m.id}: ${res.error}`)
        }
      } catch (e: any) {
        skipped++
        errors.push(`${m.id}: ${e?.message || "send failed"}`)
      }
    }

    return NextResponse.json({ checked: due.length, sent, skipped, errors })
  } catch (err: any) {
    console.error("[GET /api/cron/subscription-reminders]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
