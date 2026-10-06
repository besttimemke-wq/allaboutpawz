import { NextRequest, NextResponse } from "next/server"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { membershipsFor, markCancelledAtPeriodEnd, markMembershipStatus, membershipById } from "@/lib/subscriptions"

// ============================================================================
// POST /api/subscriptions/manage — the portal's Subscriptions actions:
//
//   { membershipId, action: 'cancel_at_end' | 'resume' | 'pause' | 'unpause' }
//
// Cancellation takes effect at the end of the billing cycle (no partial-month
// refunds — the plan terms the customer agreed to). The caller only ever
// touches their own memberships.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    if (!user?.email) {
      return NextResponse.json({ error: "Sign in to manage your membership." }, { status: 401 })
    }
    const email = String(user.email).toLowerCase()

    const body = await req.json().catch(() => ({}))
    const membershipId = String(body?.membershipId || "").trim()
    const action = String(body?.action || "").trim()
    if (!membershipId || !["cancel_at_end", "resume", "pause", "unpause"].includes(action)) {
      return NextResponse.json({ error: "membershipId and a valid action are required." }, { status: 400 })
    }

    // Ownership — only the member's own memberships.
    const own = await membershipsFor(email).catch(() => [])
    const membership = own.find((m) => m.id === membershipId)
    if (!membership) {
      return NextResponse.json({ error: "Membership not found." }, { status: 404 })
    }

    if (action === "cancel_at_end") {
      await markCancelledAtPeriodEnd(membershipId)
    } else if (action === "resume") {
      // A cancel-at-end request taken back before the period runs out.
      const { pgExec } = await import("@/lib/pg")
      const { TENANT_ID } = await import("@/lib/crm/enterprise")
      await pgExec(
        `update public.subscriptions set cancel_at_period_end = false, updated_at = now()
         where tenant_id = $1 and id = $2`,
        [TENANT_ID(), membershipId],
      )
    } else if (action === "pause") {
      await markMembershipStatus(membershipId, "PAUSED")
    } else if (action === "unpause") {
      await markMembershipStatus(membershipId, "ACTIVE")
    }

    const fresh = await membershipById(membershipId).catch(() => null)
    return NextResponse.json({ membership: fresh })
  } catch (err: any) {
    console.error("[POST /api/subscriptions/manage]", err)
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 })
  }
}
