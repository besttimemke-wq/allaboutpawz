import { NextRequest, NextResponse } from "next/server"

// POST /api/notify/enrollment
// Called by the Supabase database trigger (notify_management_of_enrollment)
// when a new learner enrolls. Sends a transactional email to management
// via Resend.
//
// The Supabase trigger fires pg_net HTTP POST to this endpoint with:
// { email, name, user_id, timestamp }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, user_id, timestamp } = body

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    const managementEmail = "etnologicinc@gmail.com"

    if (!resendKey) {
      console.log(`[ENROLLMENT NOTIFY] No RESEND_API_KEY — logging only: ${email} enrolled at ${timestamp}`)
      return NextResponse.json({ notified: false, logged: true })
    }

    // Send email via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All About Pawz Academy <notifications@confirmation.aapawz.com>",
        to: [managementEmail],
        subject: `New Enrollment: ${name || email}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #0f1f35;">New Learner Enrollment</h2>
            <p><strong>Name:</strong> ${name || "New Member"}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>User ID:</strong> ${user_id || "N/A"}</p>
            <p><strong>Enrolled at:</strong> ${new Date(timestamp || Date.now()).toLocaleString()}</p>
            <hr style="border: none; border-top: 1px solid #e4dfd4; margin: 20px 0;" />
            <p style="color: #73818a; font-size: 12px;">
              This notification was sent automatically when a new user completed enrollment.
              The learner has been seeded into the database with the 'learner' role.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[ENROLLMENT NOTIFY] Resend error:", err)
      return NextResponse.json({ error: "Email failed", detail: err }, { status: 500 })
    }

    return NextResponse.json({ notified: true, email, name })
  } catch (error) {
    console.error("[ENROLLMENT NOTIFY] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification failed" },
      { status: 500 }
    )
  }
}
