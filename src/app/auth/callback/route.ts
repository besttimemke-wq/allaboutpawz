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
// GET /auth/callback — the landing route for every Supabase auth email link
// (invitation, email confirmation, password reset). The email buttons hit
// Supabase's /auth/v1/verify, which redirects here with ?code=… (server-side
// PKCE flow). We exchange the code for a session, resolve who landed, issue
// the portal session cookie, and send them to their portal — so "Accept
// invitation" logs the invited user straight into the right place.
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const origin = (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  const fail = (message: string) => {
    // Errors land on the customer door with a clear message (the Section 0
    // failure mode — a JSON or HTML dead-end — is impossible here).
    const url = new URL(PORTALS.customer.door, origin);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url.toString());
  };

  if (!code) {
    // No code to exchange — this is a plain visit. Send them to the customer
    // door rather than erroring.
    return NextResponse.redirect(new URL(PORTALS.customer.door, origin).toString());
  }

  try {
    // 1. Exchange the Supabase auth code for a session. This also persists
    //    the Supabase SSR cookies on this response.
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const authUserId = data?.user?.id;
    if (error || !authUserId) {
      return fail("This sign-in link is invalid or has expired. Please try again.");
    }

    // 2. Resolve who this is (server-side, same single source of truth as
    //    every other auth route).
    const resolved = await resolvePortalUser(authUserId);
    if (!resolved) {
      return fail("Your account has no profile records. Contact your admin.");
    }

    // 3. Issue the portal session cookie and route them home.
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signSession(resolved), sessionCookieOptions());

    const target = doorFor(resolved);
    const requested = searchParams.get("redirect_to") || searchParams.get("next");
    if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
      return NextResponse.redirect(new URL(requested, origin).toString());
    }
    return NextResponse.redirect(new URL(target.destination, origin).toString());
  } catch (err: any) {
    console.error("[GET /auth/callback]", err);
    return fail("Could not complete sign-in from this link. Please try again.");
  }
}
