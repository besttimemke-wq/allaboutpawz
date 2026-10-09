import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/auth/server"

// ============================================================================
// GET /auth/link — the EMAIL SIGN-IN LINK EXCHANGE (server-side).
//
// The tail of /api/auth/shop-signup: the emailed link carries the
// admin.generateLink token_hash here. This route verifies it with the
// @supabase/ssr SERVER client (verifyOtp), which writes the real httpOnly
// session cookies onto the redirect response, then forwards the visitor to
// the flow they came from (the bag by default).
//
// WHY NOT THE DEFAULT action_link: it lands on the page with
// #access_token=… in the URL fragment — fragments never reach the server,
// and pages that mount no Supabase browser client silently drop the
// session, bouncing gated flows back to the door. Exchanging the token
// server-side is the @supabase/ssr pattern: one request, cookies set,
// session live.
//
// `next` is path-relative only — never off-site.
// ============================================================================

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = url.origin
  const tokenHash = url.searchParams.get("token_hash") || ""
  const rawNext = url.searchParams.get("next") || "/shop/bag"
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
      ? rawNext
      : "/shop/bag"

  if (!tokenHash) {
    return NextResponse.redirect(`${origin}/access-customer?redirect=${encodeURIComponent(next)}&error=link_expired`)
  }

  try {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash })
    if (error) {
      console.error("[auth/link] verifyOtp failed:", error.message)
      return NextResponse.redirect(`${origin}/access-customer?redirect=${encodeURIComponent(next)}&error=link_expired`)
    }
    return NextResponse.redirect(`${origin}${next}`)
  } catch (e: any) {
    console.error("[auth/link]", e?.message)
    return NextResponse.redirect(`${origin}/access-customer?redirect=${encodeURIComponent(next)}&error=link_expired`)
  }
}
