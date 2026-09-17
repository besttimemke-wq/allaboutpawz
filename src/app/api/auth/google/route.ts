import { NextRequest, NextResponse } from "next/server";
import {
  PORTALS,
  PortalId,
  cookieDomainForHost,
  createOAuthState,
  googleAuthUrl,
  googleCallbackUri,
  googleConfigured,
  isPreviewOrigin,
  newBrowserBinding,
  OAUTH_BROWSER_COOKIE,
  productionRelayCallbackUri,
  redirectUriRegistered,
} from "@/lib/pawz-auth";

// ============================================================================
// GET /api/auth/google
//
// THE OWNER'S ROUTE (Serviceportals) — the one and only Google sign-in entry.
// The Google button on his imported LandingLoginView navigates here. His
// contract, kept exactly:
//   - ?portal is INFORMATIONAL ONLY — the DATABASE resolves the user's role
//     in the callback and routes to that role's dashboard. Nothing the user
//     picked is ever trusted.
//   - The redirect_uri is a REGISTERED callback, resolved the way his repo
//     resolves it — never the live host when the live host is a sandbox
//     preview:
//       1. If the origin's own callback IS registered on the Google client
//          (production, or any origin added in the console later — verified
//          live, cached 60 s), the flow runs direct against it.
//       2. Otherwise the flow runs against the REGISTERED production callback
//          (https://aapawz.com/api/auth/google/callback) — exactly his
//          repo's strategy. Preview flows additionally record returnOrigin
//          in the signed server-side state, so the callback relays the
//          browser back to the preview to finish sign-in there — active the
//          moment the current build answers on the registered callback.
//
// This route NEVER renders a message — every path is a redirect. If sign-in
// cannot start, the browser simply lands back on the sign-in page, clean.
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

/** Which door did the click come from? (Bounce destination only — the actual
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
  // the door the browser returns to — never to decide access.
  const portal: PortalId =
    portalParam && PORTALS[portalParam]
      ? portalParam
      : portalFromReferer(referer, "customer");

  if (!googleConfigured()) {
    // Cannot start — land on the sign-in page, clean. No message.
    return redirectToPath(PORTALS[portal].door);
  }

  const origin = realOrigin(req);
  const directUri = googleCallbackUri(origin);

  let redirectUri = directUri;
  let returnOrigin: string | null = null;

  if (!(await redirectUriRegistered(directUri))) {
    // Unregistered origin — the flow rides the REGISTERED production callback,
    // exactly like his repo (redirect_uri resolved from the registered site,
    // never from the live host).
    redirectUri = productionRelayCallbackUri();
    if (isPreviewOrigin(origin)) {
      // Sandbox preview: record where the browser actually is so the callback
      // can relay it back here to complete sign-in (single-use signed state,
      // preview-pattern-restricted — see /api/auth/google/callback).
      returnOrigin = origin;
    }
  }

  // "AUTO" = the repo's semantics: the callback resolves the role from the
  // database and routes to that role's dashboard. No door validation.
  const binding = newBrowserBinding();
  const state = await createOAuthState(portal, "AUTO", redirectUri, returnOrigin, binding.hash);
  if (!state) {
    // Cannot start — land on the sign-in page, clean. No message.
    return redirectToPath(PORTALS[portal].door);
  }

  const res = NextResponse.redirect(googleAuthUrl(state, redirectUri));
  // Cookie domain: on the salon's own hosts (aapawz.com / www.aapawz.com)
  // the binding cookie must survive the platform's apex→www 308 — the
  // registered Google callback is the apex, so a flow that starts on either
  // host always finishes on the other. Host-only cookies broke that handoff
  // and silently bounced the sign-in (see cookieDomainForHost). Host-only
  // everywhere else (localhost, previews).
  const bindingHost = (() => {
    try {
      return new URL(origin).host;
    } catch {
      return null;
    }
  })();
  res.cookies.set(OAUTH_BROWSER_COOKIE, binding.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 15 * 60,
    ...cookieDomainForHost(bindingHost),
  });
  return res;
}
