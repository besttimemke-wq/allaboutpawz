import { NextRequest, NextResponse } from "next/server";
import {
  PORTALS,
  PortalId,
  createOAuthState,
  googleAuthUrl,
  googleConfigured,
} from "@/lib/pawz-auth";

// ============================================================================
// GET /api/auth/google/start?portal=customer|groomer|lms
//
// Builds the Google authorization URL and redirects. The `state` sent to
// Google is a signed nonce stored server-side in public.oauth_states with
// { portal, redirectTo, expiresAt } — the client never controls either
// after this request, so nothing in the callback URL can be tampered with
// to land someone in the wrong portal.
//
// Front Desk and Admin doors do NOT offer Google (station-based shared
// devices / internal-only accounts — see the auth spec, Sections 3 & 6).
// ============================================================================

const GOOGLE_PORTALS: PortalId[] = ["customer", "groomer", "lms"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const portal = searchParams.get("portal") as PortalId | null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status });

  if (!portal || !PORTALS[portal]) {
    return fail("Unknown sign-in portal.");
  }
  if (!GOOGLE_PORTALS.includes(portal)) {
    return fail("Google sign-in is not available for this portal.");
  }
  if (!googleConfigured()) {
    // Not a JSON-in-browser dead end and never an HTML shell — send the
    // user back to their door with a clear, actionable message.
    const door = new URL(PORTALS[portal].door, req.nextUrl.origin);
    door.searchParams.set(
      "error",
      "Google sign-in is not configured on this deployment yet. Use email and password for now.",
    );
    return NextResponse.redirect(door.toString());
  }

  // Optional same-site redirect override (e.g. ?redirect=/account).
  let redirectTo = PORTALS[portal].destination;
  const requested = searchParams.get("redirect");
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
    redirectTo = requested;
  }

  // Single-use signed state, stored server-side.
  const state = await createOAuthState(portal, redirectTo);
  if (!state) {
    return fail("Could not create a sign-in state. Please try again.", 500);
  }

  // The one and only registered redirect URI — same origin as this request.
  // Each environment's origin (dev / pre / prod) is registered in the single
  // Google OAuth client per the auth spec, Section 3.
  const origin = (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const redirectUri = `${origin}/api/auth/google/callback`;

  return NextResponse.redirect(googleAuthUrl(state, redirectUri));
}
