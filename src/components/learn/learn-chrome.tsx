"use client"

import { usePathname } from "next/navigation"
import { SiteChrome } from "@/components/site/site-chrome"

// ---------------------------------------------------------------------------
// LearnChrome — wraps the Learning Center in the site chrome (owner ruling:
// "the Learning Center is not wrapped in the site chrome").
//
// The LMS APP surfaces (admin console, instructor studio, the classroom
// itself, and the learner onboarding canvas) stay full-screen — they are
// tools, not storefront pages, so the public header/footer would just
// intrude on them. Every public learning page (catalog, course pages,
// sign-in, enroll) gets the same chrome as the rest of the site.
// ---------------------------------------------------------------------------

const APP_PREFIXES = [
  "/learn/admin",
  "/learn/instructor",
  "/learn/classroom",
  "/learn/learner-classroom-canvas",
  "/learn/learner-enroll-onboarding-steps",
]

export function LearnChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ""
  const isAppSurface = APP_PREFIXES.some((p) => pathname.startsWith(p))
  if (isAppSurface) return <>{children}</>
  return <SiteChrome>{children}</SiteChrome>
}
