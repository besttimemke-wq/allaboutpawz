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
  processRefund,
  queryGiftCard,
  getPosTodaySummary,
  type PosSaleInput,
  type RefundInput,
} from "@/lib/enterprise/pos"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// /api/admin/pos — the Cloud POS API
//
//   GET    /api/admin/pos                         → { catalog, categories, paymentMethods, registers, todaySummary }
//   POST   /api/admin/pos?action=open_register     → open a register session
//   POST   /api/admin/pos?action=close_register    → close a register session
//   POST   /api/admin/pos?action=cash_movement     → record cash in/out
//   POST   /api/admin/pos?action=complete_sale     → complete a POS sale (idempotent, journal-balanced)
//   POST   /api/admin/pos?action=query_gift_card   → check gift card balance
//   POST   /api/admin/pos?action=refund            → process a return/refund (creates negative rows)
// ============================================================================

export async function GET(_req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const [catalogData, paymentMethods, registers, todaySummary] = await Promise.all([
    getPosCatalog(),
    getPosPaymentMethods(),
    getPosRegisters(),
    getPosTodaySummary(),
  ])

  const registersWithSessions = await Promise.all(
    registers.map(async (r) => ({
      ...r,
      activeSession: await getActiveRegisterSession(r.id),
    })),
  )

  return NextResponse.json({
    catalog: catalogData.items,
    categories: catalogData.categories,
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

    if (action === "query_gift_card") {
      const { cardNumber } = body
      if (!cardNumber) return NextResponse.json({ error: "cardNumber required" }, { status: 400 })
      const card = await queryGiftCard(String(cardNumber).trim())
      if (!card) return NextResponse.json({ error: "Gift card not found" }, { status: 404 })
      return NextResponse.json({ card })
    }

    if (action === "complete_sale") {
      // The idempotency key is REQUIRED — blocks double-submission.
      const input: PosSaleInput = {
        idempotencyKey: body.idempotencyKey || crypto.randomUUID(),
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
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.error.includes("JOURNAL_UNBALANCED") ? 500 : 400 })
      }
      return NextResponse.json({ sale: result })
    }

    if (action === "refund") {
      const input: RefundInput = {
        originalSaleId: body.originalSaleId,
        refundMethod: body.refundMethod || "cash",
        amount: Number(body.amount) || 0,
        reason: body.reason || "Customer return",
        lines: body.lines || [],
        createdBy: body.createdBy,
      }
      if (!input.originalSaleId || input.amount <= 0)
        return NextResponse.json({ error: "originalSaleId + amount required" }, { status: 400 })
      const result = await processRefund(input)
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      return NextResponse.json({ refund: result })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (e: any) {
    console.error("[POST /api/admin/pos]", e)
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 })
  }
}
