import { NextResponse } from "next/server"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { perksBalance, perksHistory, redemptionRate } from "@/lib/perks"

// ============================================================================
// GET /api/perks/balance — the signed-in customer's points.
//
//   → { points, pointsPerDollar, history: [{ points, source, note, createdAt }] }
//
// The balance is SUM(perk_ledger) — there is no mutable balance column.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    const authUserId = user?.authUserId ? String(user.authUserId) : ""
    if (!authUserId) {
      return NextResponse.json({ error: "Sign in to see your Perks." }, { status: 401 })
    }

    const [points, history, rate] = await Promise.all([
      perksBalance(authUserId),
      perksHistory(authUserId, 25).catch(() => []),
      redemptionRate().catch(() => ({ pointsPerDollar: 100, pointsPerCent: 1 })),
    ])
    return NextResponse.json({ points, pointsPerDollar: rate.pointsPerDollar, history })
  } catch (err: any) {
    console.error("[GET /api/perks/balance]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
