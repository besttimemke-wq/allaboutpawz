import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { sendEmail, sendOrderStatusUpdate, sendSalonMessage } from "@/lib/email"

// POST /api/send-email
// Manually send an email from the admin (e.g., Customer 360 → Send Email,
// fulfillment queue alerts). ADMIN-GATED — this used to be an open relay
// (anyone could POST arbitrary HTML to any recipient); now it requires an
// admin session exactly like every other /api/admin surface.
//
// Two modes:
//   template: "order_alert" → branded order status update (server-rendered;
//             no client HTML is trusted)
//   template: "salon_message" (or no template) → branded salon message
//             built from { subject, message }
export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const to = String(body?.to || "").trim()
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "A valid recipient is required" }, { status: 400 })
  }

  try {
    if (body?.template === "order_alert") {
      const orderNumber = String(body.orderNumber || "").trim()
      if (!orderNumber) return NextResponse.json({ error: "orderNumber required" }, { status: 400 })
      const result = await sendOrderStatusUpdate({
        to,
        customerId: body.customerId || undefined,
        orderNumber,
        statusNote: String(body.statusNote || "Your order is being processed. We'll notify you when it ships."),
        firstName: body.firstName || undefined,
      })
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    // Default: branded salon message (Customer 360 "Send Email" etc.)
    if (body?.message) {
      const result = await sendSalonMessage({
        to,
        customerId: body.customerId || undefined,
        subject: String(body.subject || "A note from All About Pawz"),
        message: String(body.message),
      })
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    // Legacy pass-through: raw HTML supplied by an authenticated admin page.
    if (!body?.subject || !body?.html) {
      return NextResponse.json({ error: "subject and html (or message) required" }, { status: 400 })
    }
    const result = await sendEmail({
      to,
      subject: String(body.subject),
      html: String(body.html),
      template: "manual",
      customerId: body.customerId || undefined,
    })
    return NextResponse.json(result, { status: result.ok ? 200 : 500 })
  } catch (e: any) {
    console.error("[send-email]", e)
    return NextResponse.json({ error: e?.message || "Send failed" }, { status: 500 })
  }
}
