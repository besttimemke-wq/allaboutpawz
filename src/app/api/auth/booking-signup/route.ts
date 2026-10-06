import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { getSupabaseAdmin } from "@/lib/pawz-auth"

// ============================================================================
// POST /api/auth/booking-signup
//
// Step 1 of the booking flow — the sign-up step. Two doors exist (Google on
// the client; this route is the email door):
//
//   1. The salon record is created NOW (customers row, PENDING signal) —
//      "clients are created at checkout, booking, or walk-in". This also
//      opens the customer portal door for the email the moment it books.
//   2. A Supabase magic link is generated server-side (admin.generateLink)
//      and delivered in OUR OWN email (Resend) — the link lands back on the
//      booking page, the browser installs the session, and the flow resumes
//      exactly where the customer left off.
//
// Idempotent: an email that already has a record is never duplicated, and a
// link can be re-requested at any time.
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Where the browser actually is (gateway/preview aware) — the magic link
// must return the customer to the page they're already on.
function requestOrigin(req: NextRequest): string {
  const referer = req.headers.get("referer")
  if (referer) {
    try {
      const u = new URL(referer)
      const host = u.hostname.toLowerCase()
      if (u.protocol === "https:" && host !== "localhost" && !host.startsWith("127.")) {
        return u.origin
      }
    } catch { /* fall through */ }
  }
  const xfh = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim().toLowerCase()
  if (xfh) {
    const proto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase()
    return `${proto === "http" ? "http" : "https"}://${xfh}`
  }
  return (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")
}

function signupEmailHtml(name: string, link: string) {
  return `<!doctype html><html><body style="font-family:Georgia,serif;max-width:560px;margin:auto;background:#faf7f2;padding:32px;color:#1a1a1a">
    <p style="font-size:10px;letter-spacing:0.18em;color:#9a7b3c;text-transform:uppercase;font-family:sans-serif;font-weight:700">Finish your booking</p>
    <h1 style="font-size:28px;line-height:1.1;margin:8px 0 0">Hi ${name},</h1>
    <p style="font-style:italic;color:#9a7b3c;font-size:20px;margin:4px 0 16px">From Pawz to PAWfection</p>
    <p>Click the button below to sign in and finish booking your pup's appointment. Your progress is saved — you'll pick up right where you left off.</p>
    <a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;font-family:sans-serif;margin:16px 0">Continue booking</a>
    <p style="font-size:12px;color:#6b6b6b">This link signs you in and expires in 24 hours. If you didn't request it, you can ignore this email.</p>
  </body></html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    const firstName = String(body.firstName || "").trim()

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    // 1. The salon record — find-or-create by exact email. The booking flow
    //    IS a registration path: the customer exists from the moment they
    //    start booking, with the honest PENDING signal.
    const existing = (await repo.list("customers").catch(() => [])) as any[]
    let customer = existing.find((c: any) => String(c.email || "").toLowerCase() === email)
    const derivedName = firstName || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())

    if (!customer) {
      customer = await repo.create("customers", {
        firstName: derivedName,
        lastName: "",
        email,
        phone: "",
        customerStatus: "PENDING",
      })
      // The CRM registry (crm_customers) — best-effort, never blocks signup.
      try {
        const { enrollCustomer } = await import("@/lib/auth/enroll-customer")
        await enrollCustomer({ email, source: "booking" })
      } catch { /* non-fatal */ }
    } else if (firstName && !String(customer.firstName || "").trim()) {
      await repo.update("customers", customer.id, { firstName }).catch(() => {})
    }

    // 2. The magic link — generated server-side so no anon-key OTP templating
    //    depends on dashboard settings; we send it in our own email.
    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Sign-in is not configured yet. Please call the salon." }, { status: 503 })
    }
    const origin = requestOrigin(req)
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/book/appointment` },
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[booking-signup] generateLink failed:", linkError?.message)
      return NextResponse.json({ error: "Could not create your sign-in link. Please try again." }, { status: 502 })
    }

    // action_link is the Supabase verify URL carrying our redirect_to — the
    // click lands back on /book/appointment with the session tokens.
    const link = linkData.properties.action_link || `${origin}/book/appointment`

    // 3. Deliver it — OUR email, OUR words, the salon's look.
    const send = await sendEmail({
      customerId: customer?.id,
      to: email,
      template: "booking_signup_link",
      subject: "Finish booking your appointment — All About Pawz",
      html: signupEmailHtml(derivedName, link),
    })
    if (!send.ok) {
      console.error("[booking-signup] email send failed:", send.error)
      return NextResponse.json({ error: "The sign-in email could not be sent. Please try again." }, { status: 502 })
    }

    return NextResponse.json({ sent: true, email })
  } catch (err: any) {
    console.error("[POST /api/auth/booking-signup]", err)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
