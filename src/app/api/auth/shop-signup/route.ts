import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sendEmail } from "@/lib/email"
import { BRAND, button, eyebrow, h1, noteBox, p, taglineFlourish, frame, esc } from "@/lib/email/design"
import { getSupabaseAdmin } from "@/lib/pawz-auth"

// ============================================================================
// POST /api/auth/shop-signup
//
// The SHOP's registration path — the checkout-flow twin of
// /api/auth/booking-signup. The owner's model: "clients are created at
// checkout, booking, or walk-in" — booking had its email door, the shop did
// not, so a new customer could not sign up anywhere and the Stripe checkout
// flow (session-gated) was unreachable for them. This route completes it:
//
//   1. The salon record is created NOW (customers row, PENDING) — the
//      customer exists from the moment they start checking out. Idempotent:
//      an email with a record is never duplicated.
//   2. A Supabase magic link is generated SERVER-SIDE (admin.generateLink)
//      and delivered in our own branded email (Resend). The link lands the
//      customer back exactly where they were — the bag — with the session
//      installed, and checkout proceeds.
//
// The magic link's redirect is path-relative only (never off-site).
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

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

/** Path-relative redirect only — the same validation the door login uses. */
function safeRedirect(raw: unknown): string {
  const r = String(raw || "")
  if (r.startsWith("/") && !r.startsWith("//") && !r.includes("\\")) return r
  return "/shop/bag"
}

function signupEmailHtml(name: string, link: string) {
  return frame({
    preheader: "One tap and you're back in your bag — nothing was lost.",
    body: [
      eyebrow("Finish checking out"),
      h1(`Hi ${esc(name)},`),
      taglineFlourish(),
      p(
        "Click the button below to sign in and finish your order. Your bag is exactly as you left it — every item is waiting.",
      ),
      button(link, "Continue to checkout"),
      noteBox(
        "This link signs you in and expires in 24 hours. If you didn't request it, you can ignore this email — nothing changes on your account.",
      ),
    ].join(""),
    reason: `You're receiving this because you started an order at ${BRAND.url.replace(/^https?:\/\//, "")}.`,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = String(body.email || "").trim().toLowerCase()
    const redirect = safeRedirect(body.redirect)
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
    }

    // 1. The salon record — find-or-create by exact email (idempotent).
    const existing = (await repo.list("customers").catch(() => [])) as any[]
    let customer = existing.find((c: any) => String(c.email || "").toLowerCase() === email)
    const derivedName = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())

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
        await enrollCustomer({ email, source: "purchase" })
      } catch { /* non-fatal */ }
    }

    // 2. The magic link — generated server-side; lands back on the redirect.
    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Sign-in is not configured yet. Please call the salon." }, { status: 503 })
    }
    const origin = requestOrigin(req)
    // The emailed link points at /auth/link — the server-side exchange: the
    // token_hash is verified with the @supabase/ssr server client, which
    // writes the real session cookies and forwards to the flow's redirect
    // (the bag). The stock action_link lands with #access_token in the URL
    // fragment — fragments never reach the server and pages that mount no
    // Supabase browser client silently drop the session.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/shop/bag` },
    })
    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("[shop-signup] generateLink failed:", linkError?.message)
      return NextResponse.json({ error: "Could not create your sign-in link. Please try again." }, { status: 502 })
    }
    const link = `${origin}/auth/link?token_hash=${encodeURIComponent(
      linkData.properties.hashed_token,
    )}&next=${encodeURIComponent(redirect)}`

    // 3. Deliver it — our email, the salon's look.
    const send = await sendEmail({
      customerId: customer?.id,
      to: email,
      template: "shop_signup_link",
      subject: "Finish checking out — All About Pawz",
      html: signupEmailHtml(derivedName, link),
    })
    if (!send.ok) {
      console.error("[shop-signup] email send failed:", send.error)
      return NextResponse.json({ error: "The sign-in email could not be sent. Please try again." }, { status: 502 })
    }

    return NextResponse.json({ sent: true, email })
  } catch (err: any) {
    console.error("[POST /api/auth/shop-signup]", err)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
