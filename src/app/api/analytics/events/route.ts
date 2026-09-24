import { NextRequest, NextResponse } from "next/server"
import { withPg } from "@/lib/crm/enterprise"
import { requireAdminApi } from "@/lib/admin/gate"
import { insertAnalyticsEventRow } from "@/lib/analytics-server"

// ---------------------------------------------------------------------------
// /api/analytics/events — the salon's OWN custom analytics event log
// (analytics_events table in Supabase), independent of the Google console.
//
//   POST  — client-side `track` library mirrors every booking + ecommerce
//           event here via navigator.sendBeacon (only fires while the
//           visitor granted the Performance & Analytics cookie category).
//   GET   — admin read: recent events + per-event counts for the portal's
//           custom analytics panel. Admin sign-in required.
// ---------------------------------------------------------------------------

const EVENT_NAME_RE = /^[a-z0-9_]{1,64}$/
const MAX_DATA_CHARS = 4000

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    // sendBeacon posts a single event object; the client may also batch.
    const events = Array.isArray(body?.events) ? body.events : [body]
    const rows: {
      event_name: string
      event_data: unknown
      page_path: string
      session_id: string
      value: number | null
      currency: string
    }[] = []

    for (const e of events.slice(0, 25)) {
      if (!e || typeof e !== "object") continue
      const name = String(e.event || "").toLowerCase()
      if (!EVENT_NAME_RE.test(name)) continue // only known-good schema names
      const data = e.data ?? {}
      const serialized = JSON.stringify(data)
      if (serialized.length > MAX_DATA_CHARS) continue
      const value =
        typeof data.value === "number" && isFinite(data.value) && data.value >= 0
          ? Math.round(data.value * 100) / 100
          : null
      rows.push({
        event_name: name,
        event_data: data,
        page_path: typeof e.page === "string" ? e.page.slice(0, 500) : "",
        session_id: typeof e.sessionId === "string" ? e.sessionId.slice(0, 64) : "",
        value,
        currency: typeof data.currency === "string" ? data.currency.slice(0, 3).toUpperCase() : "USD",
      })
    }

    if (rows.length === 0) return NextResponse.json({ ok: true, inserted: 0 })

    // Shared insert helper (src/lib/analytics-server.ts) — the exact same
    // INSERT the server-side logAnalyticsEvent() performs, so beacon rows
    // and authoritative server rows are written identically.
    const inserted = await withPg(async (client) => {
      let n = 0
      for (const r of rows) {
        await insertAnalyticsEventRow(client, r)
        n++
      }
      return n
    })

    return NextResponse.json({ ok: true, inserted: inserted ?? 0 })
  } catch (e) {
    // Never surface analytics failures to the visitor.
    console.error("[analytics/events POST]", e)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const { searchParams } = new URL(req.url)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50))
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "7", 10) || 7))

  const result = await withPg(async (client) => {
    const recent = await client.query(
      `SELECT id, created_at, event_name, event_data, page_path, session_id, value, currency
         FROM public.analytics_events
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        ORDER BY created_at DESC
        LIMIT $2`,
      [String(days), limit],
    )
    const counts = await client.query(
      `SELECT event_name, COUNT(*)::int AS count, COALESCE(SUM(value), 0)::float AS total_value
         FROM public.analytics_events
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY event_name
        ORDER BY count DESC`,
      [String(days)],
    )
    const sessions = await client.query(
      `SELECT COUNT(DISTINCT session_id)::int AS sessions
         FROM public.analytics_events
        WHERE created_at >= NOW() - ($1 || ' days')::interval`,
      [String(days)],
    )
    return {
      recent: recent.rows.map((r: any) => ({
        id: r.id,
        createdAt: new Date(r.created_at).toISOString(),
        event: r.event_name,
        data: r.event_data,
        page: r.page_path,
        sessionId: r.session_id?.slice(0, 8),
        value: r.value != null ? parseFloat(r.value) : null,
        currency: r.currency,
      })),
      counts: counts.rows.map((r: any) => ({
        event: r.event_name,
        count: r.count,
        totalValue: r.total_value,
      })),
      sessions: sessions.rows[0]?.sessions ?? 0,
      days,
    }
  })

  if (!result) return NextResponse.json({ error: "Analytics database unavailable." }, { status: 503 })
  return NextResponse.json(result)
}
