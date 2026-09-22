import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import {
  getPosCatalog,
  getPosPaymentMethods,
  getPosRegisters,
  getActiveRegisterSession,
  openRegister,
  closeRegister,
  recordCashMovement,
  completePosSale,
  getPosTodaySummary,
  type PosSaleInput,
} from "@/lib/enterprise/pos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// /api/admin/pos — the Cloud POS API
//
//   GET    /api/admin/pos                    → { catalog, paymentMethods, registers, todaySummary }
//   POST   /api/admin/pos?action=open_register    → open a register session
//   POST   /api/admin/pos?action=close_register   → close a register session
//   POST   /api/admin/pos?action=cash_movement    → record cash in/out
//   POST   /api/admin/pos?action=complete_sale    → complete a POS sale
// ============================================================================

export async function GET(_req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const [catalog, paymentMethods, registers, todaySummary] = await Promise.all([
    getPosCatalog(),
    getPosPaymentMethods(),
    getPosRegisters(),
    getPosTodaySummary(),
  ])

  // For each register, get its active session
  const registersWithSessions = await Promise.all(
    registers.map(async (r) => ({
      ...r,
      activeSession: await getActiveRegisterSession(r.id),
    })),
  )

  return NextResponse.json({
    catalog,
    paymentMethods,
    registers: registersWithSessions,
    todaySummary,
  })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  try {
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || "").trim()

    if (action === "open_register") {
      const { registerId, openingCash } = body
      if (!registerId) return NextResponse.json({ error: "registerId required" }, { status: 400 })
      const session = await openRegister(registerId, Number(openingCash) || 0, body.createdBy)
      return NextResponse.json({ session })
    }

    if (action === "close_register") {
      const { sessionId, countedCash } = body
      if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 })
      const ok = await closeRegister(sessionId, Number(countedCash) || 0, body.createdBy)
      return NextResponse.json({ ok })
    }

    if (action === "cash_movement") {
      const { sessionId, type, amount, reason } = body
      if (!sessionId || !type || amount == null)
        return NextResponse.json({ error: "sessionId, type, amount required" }, { status: 400 })
      const ok = await recordCashMovement(sessionId, type, Number(amount), reason, body.createdBy)
      return NextResponse.json({ ok })
    }

    if (action === "complete_sale") {
      const input: PosSaleInput = {
        registerSessionId: body.registerSessionId,
        customerId: body.customerId || null,
        petId: body.petId || null,
        appointmentId: body.appointmentId || null,
        staffId: body.staffId || null,
        lines: body.lines || [],
        discountTotal: body.discountTotal || 0,
        taxTotal: body.taxTotal || 0,
        payments: body.payments || [],
        depositAmount: body.depositAmount || 0,
        notes: body.notes || "",
        createdBy: body.createdBy,
      }
      if (!input.registerSessionId || input.lines.length === 0)
        return NextResponse.json({ error: "registerSessionId + lines required" }, { status: 400 })
      const result = await completePosSale(input)
      if (!result) return NextResponse.json({ error: "Sale failed" }, { status: 500 })
      return NextResponse.json({ sale: result })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (e: any) {
    console.error("[POST /api/admin/pos]", e)
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
