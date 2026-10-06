import { NextRequest, NextResponse } from "next/server"
import { sendEnrollmentNotification, sendEnrollmentWelcome } from "@/lib/email"

// POST /api/notify/enrollment
// Called by the Supabase database trigger (notify_management_of_enrollment)
// when a new learner enrolls. Two branded emails now go out:
//   1. Management alert (booking@ / MANAGEMENT_NOTIFY_EMAIL) — internal card.
//   2. Learner welcome — classroom next-steps, academy-branded.
// Both run through the audit-trailed Resend pipeline (email_messages ledger).

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, timestamp } = body

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    if (!process.env.RESEND_API_KEY) {
      console.log(`[ENROLLMENT NOTIFY] No RESEND_API_KEY — logging only: ${email} enrolled at ${timestamp}`)
      return NextResponse.json({ notified: false, logged: true })
    }

    // 1. Internal management alert
    const notify = await sendEnrollmentNotification({
      name: name || "New member",
      email,
      program: body?.program || undefined,
      enrolledAt: timestamp
        ? new Date(timestamp).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "long", timeStyle: "short" })
        : undefined,
    })

    // 2. Learner welcome (never blocks the response on failure)
    const welcome = await sendEnrollmentWelcome({
      to: email,
      firstName: name || "",
      programName: body?.program || undefined,
    }).catch((e: any) => {
      console.error("[ENROLLMENT NOTIFY] learner welcome failed:", e?.message)
      return { ok: false }
    })

    if (!notify.ok) {
      return NextResponse.json({ error: notify.error || "Email failed" }, { status: 500 })
    }

    return NextResponse.json({ notified: true, welcomeSent: Boolean(welcome?.ok), email, name })
  } catch (error) {
    console.error("[ENROLLMENT NOTIFY] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification failed" },
      { status: 500 },
    )
  }
}
