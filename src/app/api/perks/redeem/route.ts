import { NextRequest, NextResponse } from "next/server"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { redeemPoints } from "@/lib/perks"

// ============================================================================
// POST /api/perks/redeem — at checkout.
//
//   { pointsToRedeem, context: { orderId | bookingId }, subtotalCents }
//   → { pointsRedeemed, discountCents, balanceAfter }
//
// Server validates balance ≥ pointsToRedeem, caps the discount at the
// subtotal, and writes the negative ledger row. A later cancellation writes
// a compensating positive row (lib/perks.compensateRedemption) — ledger rows
// are never deleted.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    const authUserId = user?.authUserId ? String(user.authUserId) : ""
    if (!authUserId) {
      return NextResponse.json({ error: "Sign in to use your Perks." }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const points = Number(body?.pointsToRedeem)
    const subtotal = Number(body?.subtotalCents ?? body?.context?.subtotalCents ?? 0)
    const sourceId = String(body?.context?.bookingId || body?.context?.orderId || "").trim()

    if (!Number.isFinite(points) || points <= 0) {
      return NextResponse.json({ error: "Choose how many points to use." }, { status: 400 })
    }
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json({ error: "Nothing to apply points to yet." }, { status: 400 })
    }
    if (!sourceId) {
      return NextResponse.json({ error: "Missing booking/order context." }, { status: 400 })
    }

    const result = await redeemPoints({
      userId: authUserId,
      pointsToRedeem: points,
      subtotalCents: Math.floor(subtotal),
      sourceId,
      note: "redeemed at checkout",
    })

    if (!result.ok) {
      const messages: Record<string, string> = {
        insufficient: "You don't have that many points yet.",
        invalid: "Enter a valid number of points.",
        capped: "Your total is too small to apply points to.",
      }
      return NextResponse.json(
        { error: messages[result.error] || "Couldn't redeem points." },
        { status: 422 },
      )
    }
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[POST /api/perks/redeem]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
