import { NextRequest, NextResponse } from "next/server";
import {
  PORTALS,
  PortalId,
  createOAuthState,
  googleAuthUrl,
  googleConfigured,
  registeredGoogleOrigins,
} from "@/lib/pawz-auth";

// ============================================================================
// GET /api/auth/google/start?portal=customer|groomer|frontdesk|admin|lms
//
// Builds the Google authorization URL and redirects. The `state` sent to
// Google is a signed nonce stored server-side in public.oauth_states with
// { portal, redirectTo, redirectUri, expiresAt } — the client never controls
// any of it after this request, so nothing in the callback URL can be
// tampered with to land someone in the wrong portal.
//
// The Google button is on every door (the owner's design) — the callback
// validates the door against the server-resolved role exactly like the
// password flow.
//
// ORIGIN HANDLING: the preview gateway rewrites the Host header to
// localhost:3000, so req.nextUrl.origin is NOT the origin the browser is on.
// The Referer header carries the real public origin; it is preferred when it
// is an https URL. The chosen origin must be one the owner registered on the
// Google client (verified set in registeredGoogleOrigins()) — otherwise the
// user is bounced back to their door with the exact URI to register, never
// to Google's redirect_uri_mismatch dead-end.
// ============================================================================

function realOrigin(req: NextRequest): string {
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      const host = u.hostname;
      const isLocal =
        host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
      if (u.protocol === "https:" && !isLocal) return u.origin;
    } catch {
      /* fall through to request origin */
    }
  }
  return (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

/** Relative redirect — the browser resolves it against the origin it is on,
 *  so gateway Host rewrites can never send anyone to a wrong host. */
function redirectToPath(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const portal = searchParams.get("portal") as PortalId | null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ error: message }, { status });

  if (!portal || !PORTALS[portal]) {
    return fail("Unknown sign-in portal.");
  }
  if (!googleConfigured()) {
    // Not a JSON-in-browser dead end and never an HTML shell — send the
    // user back to their door with a clear, actionable message.
    return redirectToPath(`${PORTALS[portal].door}?error=${encodeURIComponent(
      "Google sign-in is not configured on this deployment yet. Use email and password for now.",
    )}`);
  }

  // The origin the browser is actually on, and the one redirect URI Google
  // will send them back to.
  const origin = realOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!registeredGoogleOrigins().includes(origin)) {
    return redirectToPath(`${PORTALS[portal].door}?error=${encodeURIComponent(
      `Google sign-in is not activated for ${origin} yet. Register this exact redirect URI on the Google client (Authorized redirect URIs): ${redirectUri} — then try again.`,
    )}`);
  }

  // Optional same-site redirect override (e.g. ?redirect=/account).
  let redirectTo = PORTALS[portal].destination;
  const requested = searchParams.get("redirect");
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
    redirectTo = requested;
  }

  // Single-use signed state, stored server-side. The redirect_uri rides in
  // the state row so the callback exchanges against the exact same URI.
  const state = await createOAuthState(portal, redirectTo, redirectUri);
  if (!state) {
    return fail("Could not create a sign-in state. Please try again.", 500);
  }

  return NextResponse.redirect(googleAuthUrl(state, redirectUri));
}
