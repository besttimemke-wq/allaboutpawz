import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  PORTALS,
  ResolvedPortalUser,
  resolvePortalUser,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  signSession,
} from "@/lib/pawz-auth";
import { createServerSupabase } from "@/lib/auth/server";

// ============================================================================
// POST /api/auth/email-link[?code=…]
//
// Server half of /auth/callback (the email-link landing page). The client
// either passes a PKCE ?code (browser-initiated "Forgot your password?" —
// the verifier lives in a cookie the server can read) or has already
// installed the session client-side from dashboard-generated link tokens.
// Either way, this route establishes the Supabase session, resolves who
// landed through the single source of truth, issues the portal session
// cookie, and returns where to go next: /auth/set-password, then the
// user's portal. Responds with JSON only to the landing page — a wrong
// door or a bad link never renders a JSON dead-end in the browser.
// ============================================================================

function doorFor(user: ResolvedPortalUser): { door: string; destination: string } {
  if (user.scope === "admin") return { door: PORTALS.admin.door, destination: PORTALS.admin.destination };
  if (user.scope === "employee") {
    const frontDesk = ["front_desk", "frontdesk", "reception"].includes(String(user.membershipRole || ""));
    if (frontDesk) return { door: PORTALS.frontdesk.door, destination: PORTALS.frontdesk.destination };
    return { door: PORTALS.groomer.door, destination: PORTALS.groomer.destination };
  }
  return { door: PORTALS.customer.door, destination: PORTALS.customer.destination };
}

export async function POST(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get("code");
    const supabase = await createServerSupabase();

    let authUserId: string | null = null;

    if (code) {
      // PKCE exchange — the verifier cookie was set when the reset was
      // requested from the door in this same browser.
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      authUserId = data?.user?.id || null;
      if (error || !authUserId) {
        return NextResponse.json(
          { error: "This sign-in link is invalid or has expired. Please try again." },
          { status: 400 },
        );
      }
    } else {
      // Session already installed client-side from hash tokens — read it
      // back through the SSR cookies.
      const { data } = await supabase.auth.getUser();
      authUserId = data?.user?.id || null;
      if (!authUserId) {
        return NextResponse.json(
          { error: "This sign-in link is invalid or has expired. Please try again." },
          { status: 400 },
        );
      }
    }

    // Resolve who this is (server-side, same single source of truth as
    // every other auth route).
    const resolved = await resolvePortalUser(authUserId);
    if (!resolved) {
      return NextResponse.json(
        { error: "Your account has no profile records. Contact your admin." },
        { status: 403 },
      );
    }

    // Issue the portal session cookie.
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions());

    // Invite = first password; reset = new password. Both continue from
    // the set-password page, then land at the user's portal.
    const target = doorFor(resolved);
    return NextResponse.json({
      next: `/auth/set-password?next=${encodeURIComponent(target.destination)}`,
    });
  } catch (err: any) {
    console.error("[POST /api/auth/email-link]", err);
    return NextResponse.json(
      { error: "Could not complete sign-in from this link. Please try again." },
      { status: 500 },
    );
  }
}
