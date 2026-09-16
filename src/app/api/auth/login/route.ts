import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PORTALS,
  PortalId,
  resolvePortalUser,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
  supabaseConfigured,
  validatePortalAccess,
} from "@/lib/pawz-auth";
import { createServerSupabase } from "@/lib/auth/server";

// ============================================================================
// POST /api/auth/login
// Email + password sign-in, used by all five bifurcated auth pages
// (/access-customer, /access-groomer, /access-frontdesk, /admin-login,
// /learn/sign-in). The client sends ONLY credentials + which door was used;
// the server resolves the role, validates the door, issues the session
// cookie, and returns the destination.
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const portal = String(body?.portal || "") as PortalId;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    }
    if (!PORTALS[portal]) {
      return NextResponse.json({ error: "Unknown sign-in portal." }, { status: 400 });
    }
    if (!supabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    // 1. Real password grant. Signing in through the @supabase/ssr server
    //    client also persists the Supabase session cookies on this response,
    //    which keeps the site's /account page and admin API gating working.
    const cookieStore = await cookies();
    const supabase = await createServerSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    let authUserId: string | null = authData?.user?.id || null;
    if (authError || !authUserId) {
      return NextResponse.json(
        { error: authError?.message || "Invalid email or password." },
        { status: 401 },
      );
    }

    // 2. Resolve who this is (server-side only — never trusted from client).
    const resolved = await resolvePortalUser(authUserId);
    if (!resolved) {
      return NextResponse.json(
        { error: "Your account has no profile records. Contact your admin." },
        { status: 403 },
      );
    }

    // 3. Validate the door.
    const validation = validatePortalAccess(portal, resolved);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 403 });
    }

    // 4. Issue the portal session cookie + optional redirect override
    //    (?redirect= from the door URL, restricted to same-site paths).
    cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions());

    let redirectTo = validation.redirectTo || PORTALS[portal].destination;
    const requested = typeof body?.redirect === "string" ? body.redirect : "";
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
      redirectTo = requested;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: resolved.authUserId,
        name: resolved.name,
        email: resolved.email,
        role: resolved.role,
        stationName: resolved.stationName,
        avatarUrl: resolved.avatarUrl,
      },
      redirectTo,
    });
  } catch (err: any) {
    console.error("[POST /api/auth/login]", err);
    return NextResponse.json({ error: err?.message || "Sign-in failed." }, { status: 500 });
  }
}
