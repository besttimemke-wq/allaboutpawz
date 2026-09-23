import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { withPg, TENANT_ID } from "@/lib/crm/enterprise"
import { generateReceiptPdf, emailReceipt, type ReceiptData } from "@/lib/enterprise/receipt"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// /api/admin/pos/receipt — receipt PDF generation + email delivery.
//
//   GET  /api/admin/pos/receipt?saleId=...        → PDF file (application/pdf)
//   POST /api/admin/pos/receipt { saleId, email }  → email the receipt
// ============================================================================

// ---- Load a sale + its lines + payments from the DB ----
async function loadSaleData(saleId: string): Promise<ReceiptData | null> {
  return (await withPg(async (client) => {
    const tenant = TENANT_ID()

    // Load the sale
    const { rows: saleRows } = await client.query(`
      SELECT s.id, s.sale_number, s.subtotal, s.discount_total, s.tax_total,
             s.total, s.paid_total, s.change_due, s.sale_at, s.metadata,
             c."firstName" AS customer_first, c."lastName" AS customer_last,
             c.email AS customer_email
      FROM public.commerce_sales s
      LEFT JOIN public.customers c ON s.customer_id::text = c.id
      WHERE s.id = $1 AND s.tenant_id = $2
    `, [saleId, tenant])
    if (saleRows.length === 0) return null
    const sale = saleRows[0]

    // Load sale lines
    const { rows: lineRows } = await client.query(`
      SELECT description, quantity, unit_price, gross_amount, discount_amount, line_total
      FROM public.commerce_sale_lines WHERE sale_id = $1 ORDER BY line_no
    `, [saleId])

    // Load payments
    const { rows: payRows } = await client.query(`
      SELECT p.amount, pm.name AS method_name
      FROM public.commerce_payments p
      JOIN public.commerce_payment_methods pm ON pm.id = p.payment_method_id
      WHERE p.sale_id = $1
    `, [saleId])

    // Load receipt number
    const { rows: recRows } = await client.query(`
      SELECT receipt_number FROM public.commerce_receipts WHERE sale_id = $1 LIMIT 1
    `, [saleId])

    const date = new Date(sale.sale_at).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    })

    return {
      saleNumber: sale.sale_number,
      receiptNumber: recRows[0]?.receipt_number || `R-${sale.sale_number}`,
      date,
      customerEmail: sale.customer_email || null,
      customerName: sale.customer_first
        ? `${sale.customer_first} ${sale.customer_last || ""}`.trim()
        : null,
      lines: lineRows.map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unit_price) || 0,
        lineTotal: Number(l.line_total) || 0,
      })),
      subtotal: Number(sale.subtotal) || 0,
      discountTotal: Number(sale.discount_total) || 0,
      taxTotal: Number(sale.tax_total) || 0,
      total: Number(sale.total) || 0,
      paidTotal: Number(sale.paid_total) || 0,
      changeDue: Number(sale.change_due) || 0,
      payments: payRows.map((p: any) => ({
        methodName: p.method_name,
        amount: Number(p.amount) || 0,
      })),
      staffName: null,
      registerName: null,
    }
  })) ?? null
}

// ---- GET: return the PDF file ----
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const saleId = req.nextUrl.searchParams.get("saleId")
  if (!saleId) return NextResponse.json({ error: "saleId required" }, { status: 400 })

  const data = await loadSaleData(saleId)
  if (!data) return NextResponse.json({ error: "Sale not found" }, { status: 404 })

  const pdfBytes = await generateReceiptPdf(data)

  return new NextResponse(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${data.receiptNumber}.pdf"`,
    },
  })
}

// ---- POST: email the receipt ----
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const body = await req.json().catch(() => ({}))
  const { saleId, email } = body
  if (!saleId) return NextResponse.json({ error: "saleId required" }, { status: 400 })

  const data = await loadSaleData(saleId)
  if (!data) return NextResponse.json({ error: "Sale not found" }, { status: 404 })

  const toEmail = email || data.customerEmail
  if (!toEmail) return NextResponse.json({ error: "No email address — provide one in the request body" }, { status: 400 })

  const result = await emailReceipt(data, toEmail)
  if (!result.ok) return NextResponse.json({ error: result.error || "Failed to email" }, { status: 500 })

  return NextResponse.json({ ok: true, emailed: toEmail })
}
