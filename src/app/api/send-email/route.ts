import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

// POST /api/send-email
// Manually send an email from the admin (e.g., Customer 360 → Send Email)
export async function POST(req: NextRequest) {
  const { to, subject, html, customerId } = await req.json()
  if (!to || !subject || !html) {
    return NextResponse.json({ error: "to, subject, html required" }, { status: 400 })
  }
  const result = await sendEmail({ to, subject, html, template: "manual", customerId })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
