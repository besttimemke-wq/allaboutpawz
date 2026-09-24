import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieDomainForHost, requestHost, SESSION_COOKIE_NAME, OAUTH_BROWSER_COOKIE } from "@/lib/pawz-auth";
import { createServerSupabase } from "@/lib/auth/server";

// ============================================================================
// POST /api/auth/logout
// Clears the portal session cookie and signs out of Supabase (server-side).
// Called by the portal sign-out buttons before routing back to the door.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 };
    const domain = cookieDomainForHost(requestHost(req));
    // Clear BOTH variants: legacy host-only cookies AND the shared
    // Domain=.aapawz.com cookie — whichever the browser holds must die.
    cookieStore.set(SESSION_COOKIE_NAME, "", { ...base });
    if (domain.domain) {
      cookieStore.set(SESSION_COOKIE_NAME, "", { ...base, domain: domain.domain });
    }
    cookieStore.set(OAUTH_BROWSER_COOKIE, "", { ...base });
    if (domain.domain) {
      cookieStore.set(OAUTH_BROWSER_COOKIE, "", { ...base, domain: domain.domain });
    }

    // Sign out of Supabase as well (clears the SSR session cookies).
    try {
      const supabase = await createServerSupabase();
      await supabase.auth.signOut();
    } catch {
      // Supabase unavailability should not block local sign-out.
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/auth/logout]", err);
    return NextResponse.json({ error: err?.message || "Sign-out failed." }, { status: 500 });
  }
}
