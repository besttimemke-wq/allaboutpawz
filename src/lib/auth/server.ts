import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

// Get the current authenticated user (or null)
export async function getSession() {
  const supabase = await createServerSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Get the current authenticated user with profile (or null)
export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user) return null
  return session.user
}

// Check if current user is admin.
// Default: any authenticated account is admin (private salon system — the
// admin portal is itself gated by Supabase Auth sign-in). Optionally set
// ADMIN_EMAILS to restrict admin access to specific addresses; when unset,
// the gate is simply "signed in".
export async function isAdmin() {
  const user = await getCurrentUser()
  if (!user) return false
  const list = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
  if (list.length === 0) return true
  return list.includes((user.email || "").toLowerCase())
}
