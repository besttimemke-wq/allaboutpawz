import { NextRequest, NextResponse } from "next/server"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { eligiblePromos, type PromoPlacement } from "@/lib/promos"

// ============================================================================
// GET /api/promos/eligible?placement=<services|pricing|shop|book|portal|checkout>
//
// Every PUBLISHED offer the caller is eligible for on that placement,
// evaluated per user server-side (new/existing, usage history, dates).
// No eligible offers → { offers: [] } — the caller renders nothing.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PLACEMENTS: PromoPlacement[] = ["services", "pricing", "shop", "book", "portal", "checkout"]

export async function GET(req: NextRequest) {
  try {
    const placement = (new URL(req.url).searchParams.get("placement") || "").toLowerCase() as PromoPlacement
    if (!PLACEMENTS.includes(placement)) {
      return NextResponse.json({ error: "placement must be one of: " + PLACEMENTS.join(", ") }, { status: 400 })
    }

    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    const validateUser = user?.email
      ? { id: String(user.authUserId || user.email), email: String(user.email) }
      : null

    const offers = await eligiblePromos(placement, validateUser)
    return NextResponse.json({ offers })
  } catch (err: any) {
    console.error("[GET /api/promos/eligible]", err)
    return NextResponse.json({ offers: [], error: err.message || "Failed to load offers" }, { status: 500 })
  }
}
