import { NextRequest, NextResponse } from "next/server";
import {
  PORTALS,
  PortalId,
  createOAuthState,
  googleAuthUrl,
  googleCallbackUri,
  googleConfigured,
  isPreviewOrigin,
  newBrowserBinding,
  OAUTH_BROWSER_COOKIE,
  productionRelayCallbackUri,
  productionRelayOrigin,
  productionRelayStatus,
  redirectUriRegistered,
} from "@/lib/pawz-auth";

// ============================================================================
// GET /api/auth/google/start?portal=customer|groomer|frontdesk|admin|lms
//
// Builds the Google authorization URL and redirects. The `state` sent to
// Google is a signed nonce stored server-side in public.oauth_states with
// { portal, redirectTo, redirectUri, returnOrigin, browserHash, expiresAt } —
// the client never controls any of it after this request, so nothing in the
// callback URL can be tampered with to land someone in the wrong portal.
//
// The Google button is on every door (the owner's design) — the callback
// validates the door against the server-resolved role exactly like the
// password flow.
//
// ORIGIN / REDIRECT-URI ROUTING (three cases, decided by LIVE Google data —
// never by a hardcoded list):
//   1. The origin the browser is on has its callback registered on the Google
//      client (verified live at click time) → direct flow, redirect_uri is
//      that origin's own callback.
//   2. A sandbox preview origin (https://preview-chat-<id>.space-z.ai —
//      changes every session, impossible to pre-register) → the flow is
//      routed THROUGH the registered production callback — the ORIGINAL
//      repo's strategy (redirect_uri resolved from NEXT_PUBLIC_SITE_URL,
//      never from the live host), so the preview host NEVER needs console
//      registration. That deployment relays the browser back to this preview
//      origin with the code + state untouched, and this origin's callback
//      finishes the flow and hosts the session. While production still runs
//      an older build (its callback route 404s — verified live), the user is
//      told the one activation step: deploy the current build. No
//      registration instruction is ever shown for preview hosts.
//   3. Any other unregistered origin (a custom domain hosting this repo) →
//      the user is bounced back to their door with the exact URI to
//      register — a message generated from a live check, so it disappears
//      the moment the owner registers the URI (≤60 s).
//
// A short-lived browser-binding cookie (pawz_oauth_b, hash stored in the state
// row) makes the callback refuse to complete in any OTHER browser — the
// login-CSRF guard for the whole flow, including relay hops.
//
// ORIGIN DETECTION: the outer gateway rewrites Host and X-Forwarded-Host to
// an internal routing host before the request reaches this app, so those
// headers never carry the public origin the browser is on. The Referer of
// the door-page click is the reliable signal (every real Google-button flow
// navigates from a door page); X-Forwarded-Host — correct on production-style
// deployments that preserve it — is the fallback for Referer-less direct
// navigations; the request's own origin is the last resort.
// ============================================================================

function isLocalHost(host: string): boolean {
  // Headers carry host[:port] — strip the port before comparing (the Next dev
  // server itself adds x-forwarded-host: localhost:3000 to every request).
  const bare = host.split(":")[0].toLowerCase();
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1" || bare.endsWith(".localhost");
}

function realOrigin(req: NextRequest): string {
  // 1) Referer — the origin the browser is actually on. On this platform the
  //    outer gateway rewrites Host/X-Forwarded-Host to an internal routing
  //    host, so the Referer of the door-page click is the ONLY header that
  //    carries the public origin the user sees (https preview, production
  //    apex, Cloud Run — all correct here). The Google button always
  //    navigates from a door page, so it is always present on real flows.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      if (u.protocol === "https:" && !isLocalHost(u.hostname)) return u.origin;
    } catch {
      /* fall through */
    }
  }
  // 2) Gateway-forwarded host — correct on production-style deployments where
  //    the proxy preserves the public host; used for direct (non-click)
  //    navigations that carry no Referer.
  const xfh = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim().toLowerCase();
  if (xfh && !isLocalHost(xfh)) {
    const proto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
    return `${proto === "http" ? "http" : "https"}://${xfh}`;
  }
  // 3) The request's own origin.
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

  // The origin the browser is actually on, and the redirect URI Google would
  // send it back to.
  const origin = realOrigin(req);
  const directUri = googleCallbackUri(origin);

  let redirectUri = directUri;
  let returnOrigin: string | null = null;

  if (!(await redirectUriRegistered(directUri))) {
    if (isPreviewOrigin(origin)) {
      // THE OWNER'S ORIGINAL STRATEGY, RESTORED: the preview host is never
      // part of the redirect flow and never needs console registration. The
      // authorize request always uses the REGISTERED production callback
      // (redirect_uri resolved from env, exactly like the imported repo's
      // /api/auth/google did with NEXT_PUBLIC_SITE_URL), the production
      // callback relays the browser back to this preview origin via the
      // signed server-side state, and THIS callback exchanges the code and
      // hosts the session.
      const relay = await productionRelayStatus();
      if (relay.ok) {
        redirectUri = productionRelayCallbackUri();
        returnOrigin = origin;
      } else {
        // Production is not running this build yet — verified live, stated
        // truthfully, with the ONE activation step (deploy). Never a
        // registration instruction for a preview host, never a dead end at
        // a production 404 after Google's consent screen.
        const detail =
          relay.status === 404
            ? `production currently answers HTTP 404 on that route (an older build is live there)`
            : relay.status === null
              ? `that host is not answering right now`
              : `production answers HTTP ${relay.status} on that route`;
        return redirectToPath(`${PORTALS[portal].door}?error=${encodeURIComponent(
          `Google sign-in on this preview runs through the registered callback ${productionRelayCallbackUri()} — no console changes needed. It activates the moment the current build is deployed: ${detail}. Until then, use email and password.`,
        )}`);
      }
    } else {
      return redirectToPath(`${PORTALS[portal].door}?error=${encodeURIComponent(
        `Google sign-in is not activated for ${origin} yet. Add this exact Authorized redirect URI on the Google client: ${directUri} — it starts working within a minute of saving it.`,
      )}`);
    }
  }

  // Optional same-site redirect override (e.g. ?redirect=/account).
  let redirectTo = PORTALS[portal].destination;
  const requested = searchParams.get("redirect");
  if (requested && requested.startsWith("/") && !requested.startsWith("//")) {
    redirectTo = requested;
  }

  // Single-use signed state, stored server-side. The redirect_uri rides in
  // the state row so the callback exchanges against the exact same URI.
  const binding = newBrowserBinding();
  const state = await createOAuthState(portal, redirectTo, redirectUri, returnOrigin, binding.hash);
  if (!state) {
    return fail("Could not create a sign-in state. Please try again.", 500);
  }

  const res = NextResponse.redirect(googleAuthUrl(state, redirectUri));
  res.cookies.set(OAUTH_BROWSER_COOKIE, binding.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60, // 15 minutes — comfortably longer than the 10-min state TTL
  });
  return res;
}
