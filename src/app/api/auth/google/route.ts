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
  productionRelayStatus,
  redirectUriRegistered,
} from "@/lib/pawz-auth";

// ============================================================================
// GET /api/auth/google
//
// THE OWNER'S ORIGINAL ROUTE (Serviceportals), restored as the primary Google
// sign-in entry. The Google button on his imported LandingLoginView navigates
// here. His contract, kept exactly:
//   - ?portal=admin|groomer is INFORMATIONAL ONLY — "DB is source of truth".
//     The callback resolves the user's role from their salon records and
//     routes to that role's dashboard (/admin, /groomer, /customer).
//   - The redirect_uri is the registered callback for the origin the browser
//     is on (verified live); sandbox preview origins ride the registered
//     production callback via the relay — never a per-preview registration.
//
// Under the hood this uses the same OAuth engine as /api/auth/google/start
// (single-use signed server-side state, browser-binding CSRF guard), but the
// state's redirect_to is "AUTO": the callback routes by resolved role instead
// of by door, and unknown emails are rejected — his salon gate (no public
// self-registration; clients are created at checkout/booking/walk-in).
// ============================================================================

function isLocalHost(host: string): boolean {
  const bare = host.split(":")[0].toLowerCase();
  return bare === "localhost" || bare === "127.0.0.1" || bare === "::1" || bare.endsWith(".localhost");
}

function realOrigin(req: NextRequest): string {
  // Referer-first: the outer gateway rewrites Host/X-Forwarded-Host, so the
  // Referer of the sign-in page click is the reliable public-origin signal.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      if (u.protocol === "https:" && !isLocalHost(u.hostname)) return u.origin;
    } catch {
      /* fall through */
    }
  }
  const xfh = (req.headers.get("x-forwarded-host") || "").split(",")[0].trim().toLowerCase();
  if (xfh && !isLocalHost(xfh)) {
    const proto = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
    return `${proto === "http" ? "http" : "https"}://${xfh}`;
  }
  return (req.nextUrl.origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
}

/** Which door did the click come from? (For error bounces only — the actual
 *  routing is decided by the database at callback time.) */
function portalFromReferer(referer: string | null, fallback: PortalId): PortalId {
  if (!referer) return fallback;
  try {
    const p = new URL(referer).pathname.replace(/\/$/, "");
    if (p === "/admin-login") return "admin";
    if (p === "/access-groomer") return "groomer";
    if (p === "/access-frontdesk") return "frontdesk";
    if (p === "/learn/sign-in") return "lms";
    if (p === "/access-customer") return "customer";
  } catch {
    /* fall through */
  }
  return fallback;
}

/** Relative redirect — resolves against the origin the browser is on. */
function redirectToPath(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const portalParam = searchParams.get("portal") as PortalId | null;
  const referer = req.headers.get("referer");

  // The portal hint is informational (his design). It is used ONLY to pick
  // the door an error message bounces back to.
  const portal: PortalId =
    portalParam && PORTALS[portalParam]
      ? portalParam
      : portalFromReferer(referer, "customer");

  if (!googleConfigured()) {
    return redirectToPath(`${PORTALS[portal].door}?error=${encodeURIComponent(
      "Google sign-in is not configured on this deployment yet. Use email and password for now.",
    )}`);
  }

  const origin = realOrigin(req);
  const directUri = googleCallbackUri(origin);

  let redirectUri = directUri;
  let returnOrigin: string | null = null;

  if (!(await redirectUriRegistered(directUri))) {
    if (isPreviewOrigin(origin)) {
      // Preview host — flow rides the REGISTERED production callback (his
      // original strategy: the preview host is never registered with Google).
      const relay = await productionRelayStatus();
      if (relay.ok) {
        redirectUri = productionRelayCallbackUri();
        returnOrigin = origin;
      } else {
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

  // "AUTO" = the repo's semantics: the callback resolves the role from the
  // database and routes to that role's dashboard. No door validation.
  const binding = newBrowserBinding();
  const state = await createOAuthState(portal, "AUTO", redirectUri, returnOrigin, binding.hash);
  if (!state) {
    return redirectToPath(`${PORTALS[portal].door}?error=${encodeURIComponent(
      "Could not create a sign-in state. Please try again.",
    )}`);
  }

  const res = NextResponse.redirect(googleAuthUrl(state, redirectUri));
  res.cookies.set(OAUTH_BROWSER_COOKIE, binding.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
  });
  return res;
}
