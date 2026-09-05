import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Auth temporarily disabled — will be re-enabled when ready to ship.
// All /admin routes are accessible without login during development.
// (Next.js 16 renamed the middleware convention to "proxy".)

export function proxy(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|assets|favicon).*)"],
}
