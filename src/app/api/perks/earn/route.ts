import { NextRequest, NextResponse } from "next/server"
import { earnPoints, type EarnEvent } from "@/lib/perks"

// ============================================================================
// POST /api/perks/earn — INTERNAL ONLY.
//
// Fires when a completion event lands (order paid, appointment completed,
// subscription activated/renewed). Never callable from the customer client:
// it requires either the CRON_SECRET header or an authenticated admin
// session. Idempotent on (source, source_id) — see lib/perks.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EVENTS: EarnEvent[] = [
  "order_completed",
  "booking_completed",
  "subscription_purchased",
  "subscription_renewed",
]

export async function POST(req: NextRequest) {
  try {
    // Internal gate: CRON_SECRET bearer or an admin session cookie. The
    // customer-facing balance/redeem routes never need this.
    const secret = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    const isInternal = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET
    if (!isInternal) {
      return NextResponse.json({ error: "Forbidden — internal endpoint." }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const event = String(body?.event || "") as EarnEvent
    if (!EVENTS.includes(event)) {
      return NextResponse.json({ error: `event must be one of: ${EVENTS.join(", ")}` }, { status: 400 })
    }
    const userId = String(body?.userId || "").trim()
    const sourceId = String(body?.sourceId || "").trim()
    const amountCents = Number(body?.amountCents)
    if (!userId || !sourceId || !Number.isFinite(amountCents) || amountCents < 0) {
      return NextResponse.json({ error: "userId, sourceId, amountCents are required." }, { status: 400 })
    }

    const result = await earnPoints({
      userId,
      email: body?.email ? String(body.email) : undefined,
      event,
      amountCents,
      sourceId,
      note: body?.note ? String(body.note) : undefined,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[POST /api/perks/earn]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
