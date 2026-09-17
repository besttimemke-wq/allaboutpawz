import { PostHog } from "posthog-node"
import type pg from "pg"
import { withPg } from "@/lib/crm/enterprise"

// ---------------------------------------------------------------------------
// All About Pawz — Analytics tracking library (SERVER-side).
//
// The client library (src/lib/analytics.ts) fans browser events to GA4 / GTM
// / the analytics_events log, but only while the visitor granted the
// Performance & Analytics cookie category — and it can never see the moment
// of truth (the Stripe webhook flipping a booking/order to PAID). This module
// is the authoritative server-side mirror:
//
//   captureServerEvent() → PostHog (posthog-node, NEXT_PUBLIC_POSTHOG_* env)
//   logAnalyticsEvent()  → the salon's own analytics_events table in
//                          Supabase (same insert the public
//                          /api/analytics/events route uses — shared helper)
//
// HARD RULE: neither function EVER throws. Analytics must never be able to
// fail a payment, a booking, or any API response.
// ---------------------------------------------------------------------------

const EVENT_NAME_RE = /^[a-z0-9_]{1,64}$/
const MAX_DATA_CHARS = 4000

// --------------------------------------------------------------------- PostHog

// Lazy singleton — posthog-node is only constructed when the env token is
// present, so routes import this module freely in every environment.
let _posthog: PostHog | null = null
let _posthogUnavailable = false

async function getPostHog(): Promise<PostHog | null> {
  if (_posthogUnavailable) return null
  if (_posthog) return _posthog

  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
  if (!token) {
    // Silent no-op when the project token isn't configured.
    _posthogUnavailable = true
    return null
  }
  try {
    _posthog = new PostHog(token, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      // Flush on every capture + an explicit flush() below, so events leave
      // before the API request ends.
      flushAt: 1,
      // Never let a slow PostHog call hold a payment/booking response hostage.
      requestTimeout: 5000,
    })
    await _posthog.enable()
    return _posthog
  } catch (e) {
    console.error("[analytics-server] PostHog init failed:", e instanceof Error ? e.message : e)
    _posthogUnavailable = true
    _posthog = null
    return null
  }
}

/**
 * Capture one authoritative server-side event in PostHog.
 * Never throws; silently no-ops when the env token is missing.
 */
export async function captureServerEvent({
  event,
  distinctId,
  properties,
}: {
  event: string
  distinctId?: string
  properties?: Record<string, unknown>
}): Promise<void> {
  try {
    const client = await getPostHog()
    if (!client) return
    client.capture({
      event,
      distinctId: distinctId || "anonymous",
      properties: properties ?? {},
    })
    // Flush so the event leaves the process before the request ends.
    await client.flush()
  } catch (e) {
    // Analytics must never break the API response it lives inside.
    console.error("[analytics-server] captureServerEvent failed:", e instanceof Error ? e.message : e)
  }
}

// ------------------------------------------------- analytics_events (Supabase)

/** Row shape for public.analytics_events (mirrors the public events route). */
export type AnalyticsEventRow = {
  event_name: string
  event_data: unknown
  page_path: string
  session_id: string
  value: number | null
  currency: string
}

/**
 * The exact INSERT the public /api/analytics/events route performs — shared
 * so the beacon route and the server-side logger write identical rows.
 * Throws on database errors (callers wrap); never called with invalid input
 * by this module (see logAnalyticsEvent's validation).
 */
export async function insertAnalyticsEventRow(client: pg.Client, r: AnalyticsEventRow): Promise<void> {
  await client.query(
    `INSERT INTO public.analytics_events
       (event_name, event_data, page_path, session_id, value, currency)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6)`,
    [r.event_name, JSON.stringify(r.event_data), r.page_path, r.session_id, r.value, r.currency],
  )
}

/**
 * Insert one row into the salon's own analytics_events log from the server.
 * Mirrors the public route's validation exactly (event-name regex, payload
 * cap, value rounding, USD currency default). Never throws.
 */
export async function logAnalyticsEvent({
  event,
  data,
  page,
  sessionId,
  value,
  currency,
}: {
  event: string
  data?: Record<string, unknown>
  page?: string
  sessionId?: string
  value?: number | null
  currency?: string
}): Promise<void> {
  try {
    const name = String(event || "").toLowerCase()
    if (!EVENT_NAME_RE.test(name)) return // only known-good schema names

    const payload = data ?? {}
    const serialized = JSON.stringify(payload)
    if (serialized.length > MAX_DATA_CHARS) return

    // Same derivation as the public route: explicit arg wins, then the
    // payload's own value/currency, then defaults (null / USD).
    const v =
      typeof value === "number" && isFinite(value) && value >= 0
        ? Math.round(value * 100) / 100
        : typeof payload.value === "number" && isFinite(payload.value) && payload.value >= 0
          ? Math.round(payload.value * 100) / 100
          : null
    const rawCurrency =
      typeof currency === "string" && currency
        ? currency
        : typeof payload.currency === "string"
          ? payload.currency
          : "USD"

    await withPg(async (client) => {
      await insertAnalyticsEventRow(client, {
        event_name: name,
        event_data: payload,
        page_path: typeof page === "string" ? page.slice(0, 500) : "",
        session_id: typeof sessionId === "string" ? sessionId.slice(0, 64) : "",
        value: v,
        currency: rawCurrency.slice(0, 3).toUpperCase(),
      })
    })
  } catch (e) {
    // Never surface analytics failures to the caller.
    console.error("[analytics-server] logAnalyticsEvent failed:", e instanceof Error ? e.message : e)
  }
}
