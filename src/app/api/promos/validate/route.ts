import { NextRequest, NextResponse } from "next/server"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { validatePromo, rejectionText } from "@/lib/promos"

// ============================================================================
// POST /api/promos/validate — the spec's promo validation contract.
//
//   { code, context: { serviceIds?, subscriptionPlanId?, productIds?,
//                      subtotalCents, dogId?, currentPromoCode? } }
//   → 200 { valid, discountCents, newSubtotalCents, promoId, … }
//   → 422 { valid: false, reason }
//
// The session (when present) drives eligibility evidence server-side. The
// subtotal the CLIENT sends is a preview input only — booking/order creation
// recomputes every number from the live catalog.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const code = String(body?.code || "").trim()
    if (!code) {
      return NextResponse.json({ valid: false, reason: "invalid", message: "Enter a code." }, { status: 422 })
    }

    const ctx = body?.context || {}
    const subtotal = Number(ctx.subtotal ?? ctx.subtotalCents ?? 0)
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ valid: false, reason: "invalid", message: "Bad subtotal." }, { status: 422 })
    }

    const { user } = await sessionForSiteFlow().catch(() => ({ user: null }))
    const validateUser = user?.email
      ? { id: String(user.authUserId || user.email), email: String(user.email) }
      : null

    const result = await validatePromo(code, validateUser, {
      serviceIds: Array.isArray(ctx.serviceIds) ? ctx.serviceIds.map(String) : [],
      subscriptionPlanId: ctx.subscriptionPlanId ? String(ctx.subscriptionPlanId) : null,
      productIds: Array.isArray(ctx.productIds) ? ctx.productIds.map(String) : [],
      subtotalCents: Math.floor(subtotal),
      dogId: ctx.dogId ? String(ctx.dogId) : null,
      dogBirthDate: ctx.dogBirthDate ? String(ctx.dogBirthDate) : null,
      currentPromoCode: ctx.currentPromoCode ? String(ctx.currentPromoCode) : null,
    })

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, reason: result.reason, message: rejectionText(result.reason) },
        { status: 422 },
      )
    }
    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[POST /api/promos/validate]", err)
    return NextResponse.json(
      { valid: false, reason: "invalid", message: "Could not check that code — try again." },
      { status: 500 },
    )
  }
}
