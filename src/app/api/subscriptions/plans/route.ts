import { NextResponse } from "next/server"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { listBathClubPlans, activeMembershipFor } from "@/lib/subscriptions"

// ============================================================================
// GET /api/subscriptions/plans — the PAWfection Bath Club ladder, straight
// from the tenant catalog (subscription_plans). Public: the marketing page
// and the signup flow both read it. When signed in, the caller's membership
// rides along so the UI can switch pitch → manage.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [plans, session] = await Promise.all([
      listBathClubPlans(),
      sessionForSiteFlow().catch(() => ({ user: null }) as any),
    ])
    const email = session?.user?.email ? String(session.user.email).toLowerCase() : ""
    const membership = email ? await activeMembershipFor(email).catch(() => null) : null
    return NextResponse.json({ plans, membership })
  } catch (err: any) {
    console.error("[GET /api/subscriptions/plans]", err)
    return NextResponse.json({ plans: [], error: err.message || "Failed to load plans" }, { status: 500 })
  }
}
