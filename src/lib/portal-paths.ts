// ---------------------------------------------------------------------------
// Portal route detector.
//
// The All About Pawz application is split into two worlds:
//   • the PUBLIC MARKETING SITE — (site) route group: /, /about, /services,
//     /shop, /book, /policies … — where non-essential cookies may be used and
//     the cookie statement + analytics stack belong;
//   • THE PORTALS — admin OS, groomer station, customer portal and their
//     entry/auth screens — authenticated tools that run on strictly-necessary
//     cookies ONLY. No cookie statement, no consent banner, no marketing
//     analytics: nothing that requires consent ever loads there, so no
//     statement is needed (the GDPR-correct posture for internal tools).
//
// Every consent/analytics component (CookieConsent, GoogleAnalytics,
// PostHogProvider, Clarity, the consent boot script) consults this list so
// behavior stays consistent across the whole stack.
// ---------------------------------------------------------------------------

/** Route prefixes of the portals and their auth/entry screens. */
const PORTAL_PREFIXES = [
  "/admin", // admin OS (+ legacy /admin routes)
  "/admin-login",
  "/groomer", // groomer station
  "/customer", // customer portal
  "/frontdesk", // front desk portal
  "/learn", // LMS / learning center portal (+ /learn/sign-in door)
  "/access-customer", // bifurcated portal entry screens
  "/access-groomer",
  "/access-frontdesk",
  "/account",
  "/auth", // OAuth callback / set-password
  "/api", // never a rendered page — listed for safety
] as const;

/**
 * True when the given pathname belongs to a portal (or its auth screens)
 * rather than the public marketing site. Exact-prefix matching:
 * "/admin" and "/admin/…" match, "/admin-login" is matched by its own entry.
 */
export function isPortalPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  for (const prefix of PORTAL_PREFIXES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return true;
  }
  return false;
}
