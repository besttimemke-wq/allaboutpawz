import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { isAdmin } from "@/lib/auth/server"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/pawz-auth"

// Gate for the admin data APIs (/api/admin/*).
//
// Access is granted when EITHER:
//   1. the caller is signed in via Supabase Auth and passes isAdmin()
//      (ADMIN_EMAILS restricts to specific addresses when set), or
//   2. the caller carries the server-signed portal session cookie
//      (pawz_session, HMAC-SHA256 with the service-role key) resolving to
//      an admin — this is the session a GOOGLE sign-in receives: the OAuth
//      callback hosts its own cookie and never creates Supabase SSR
//      cookies, so without this path every /api/admin/* call after Google
//      sign-in returned 401. The same ADMIN_EMAILS restriction applies, and
//      the HMAC verification is server-side (unforgeable without the key), or
//   3. ALLOW_OPEN_ADMIN_API=1 is set in the environment — a local
//      development convenience flag (.env is gitignored, so it never
//      reaches production).
async function isPortalAdmin(): Promise<boolean> {
  try {
    const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
    const payload = verifySessionToken(token)
    if (!payload) return false
    if (payload.role !== "admin" || payload.scope !== "admin") return false
    const list = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (list.length > 0 && !list.includes((payload.email || "").toLowerCase())) return false
    return true
  } catch {
    return false
  }
}

export async function requireAdminApi(): Promise<NextResponse | null> {
  if (process.env.ALLOW_OPEN_ADMIN_API === "1") return null
  try {
    if (await isAdmin()) return null
    if (await isPortalAdmin()) return null
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 })
  } catch (e) {
    return NextResponse.json(
      { error: `Auth check failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 500 },
    )
  }
}
