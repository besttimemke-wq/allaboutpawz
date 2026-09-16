import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// LMS subdomain routing (the owner's spec): learn.aapawz.com serves the
// self-serve LMS portal. Host-based rewrite — /sign-in and every other
// path on the learn.* host map onto the /learn route tree
// (learn.aapawz.com/sign-in → /learn/sign-in). In the sandbox the preview
// gateway rewrites Host to localhost, so this never fires here; it takes
// effect the moment the subdomain is pointed at the production deployment.
//
// All other auth routes stay on the apex domain, untouched:
//   aapawz.com/access-customer · /access-groomer · /admin-login
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase()
  if (host.startsWith("learn.")) {
    const path = request.nextUrl.pathname
    if (path === "/sign-in" || path === "/sign-in/" || path === "" || path === "/") {
      return NextResponse.rewrite(new URL("/learn/sign-in", request.nextUrl.origin))
    }
    if (!path.startsWith("/learn")) {
      return NextResponse.rewrite(
        new URL(`/learn${path === "/" ? "" : path}`, request.nextUrl.origin)
      )
    }
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|assets|favicon).*)"],
}
