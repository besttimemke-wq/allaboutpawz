import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth/server"

// Gate for the admin data APIs (/api/admin/*).
//
// Access is granted when EITHER:
//   1. the caller is signed in via Supabase Auth and passes isAdmin()
//      (ADMIN_EMAILS restricts to specific addresses when set), or
//   2. ALLOW_OPEN_ADMIN_API=1 is set in the environment — a local
//      development convenience flag (.env is gitignored, so it never
//      reaches production).
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (process.env.ALLOW_OPEN_ADMIN_API === "1") return null
  try {
    if (await isAdmin()) return null
    return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 })
  } catch (e) {
    return NextResponse.json(
      { error: `Auth check failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 500 },
    )
  }
}
