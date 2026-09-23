import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

// LMS subdomain routing + multi-tenant role isolation.
//
// 1. learn.aapawz.com → host-based rewrite to /learn/* routes
// 2. /portal/* routes → role validation against Supabase user_roles table
//    Blocks access if the user doesn't have the required role.

const ROLE_ROUTES: Record<string, string> = {
  "/portal/admin": "admin",
  "/portal/groomer": "groomer",
  "/portal/grooming": "grooming_customer",
  "/portal/shop": "shop_customer",
  "/portal/learner": "learner",
}

export async function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase()
  const pathname = request.nextUrl.pathname

  // --- LMS subdomain rewrite ---
  if (host.startsWith("learn.")) {
    if (pathname === "/sign-in" || pathname === "/sign-in/" || pathname === "" || pathname === "/") {
      return NextResponse.rewrite(new URL("/learn/sign-in", request.nextUrl.origin))
    }
    if (!pathname.startsWith("/learn")) {
      return NextResponse.rewrite(
        new URL(`/learn${pathname === "/" ? "" : pathname}`, request.nextUrl.origin)
      )
    }
  }

  // --- Multi-tenant role isolation for /portal/* routes ---
  const matchedPrefix = Object.keys(ROLE_ROUTES).find(prefix => pathname.startsWith(prefix))

  if (matchedPrefix) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey && !supabaseUrl.startsWith("your-")) {
      let response = NextResponse.next({ request: { headers: request.headers } })

      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set({ name, value, ...options }))
          },
        },
      })

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url))
      }

      const requiredRole = ROLE_ROUTES[matchedPrefix]

      // Query the existing lms.lms_roles table for this user's active roles
      const { data: rolesData } = await supabase
        .from("lms_roles")
        .select("role, status")
        .eq("user_id", user.id)
        .eq("status", "active")

      const userRoles = rolesData?.map(r => r.role) || []

      // Also check staff table for groomer/owner roles
      if (!userRoles.includes(requiredRole)) {
        const { data: staffData } = await supabase
          .from("staff")
          .select("role")
          .eq("email", user.email)
        if (staffData) {
          staffData.forEach(s => {
            if (s.role === "owner" || s.role === "admin") userRoles.push("admin")
            if (s.role === "groomer" || s.role.includes("groomer")) userRoles.push("groomer")
          })
        }
      }

      if (!userRoles.includes(requiredRole)) {
        return NextResponse.redirect(new URL("/portal/unauthorized", request.url))
      }

      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|assets|favicon).*)"],
}
