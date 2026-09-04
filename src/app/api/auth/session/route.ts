import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// GET /api/auth/session
// Returns the current user's session + role + linked CRM record
// Used by the frontend to determine which portal to show (admin/groomer/customer)

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Lazy client — module-level init would crash when env keys aren't set yet.
let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _supabase
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ user: null })
  }

  const token = authHeader.replace("Bearer ", "")

  try {
    if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ user: null })
    const { data: { user }, error } = await getSupabase().auth.getUser(token)

    if (error || !user) {
      return NextResponse.json({ user: null })
    }

    const role = (user.user_metadata?.role as string) || "customer"
    const firstName = user.user_metadata?.firstName || ""
    const lastName = user.user_metadata?.lastName || ""

    // Find linked CRM customer
    let customer = null
    if (role === "customer") {
      const res = await fetch(`${supabaseUrl}/rest/v1/customers?userId=eq.${user.id}&select=*`, {
        headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` },
      })
      const customers = await res.json()
      customer = customers[0] || null
    }

    // Find linked staff record
    let staff = null
    if (role === "groomer" || role === "admin" || role === "manager" || role === "front_desk") {
      const res = await fetch(`${supabaseUrl}/rest/v1/staff?userId=eq.${user.id}&select=*`, {
        headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` },
      })
      const staffList = await res.json()
      staff = staffList[0] || null
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role,
        firstName,
        lastName,
        customerId: customer?.id || null,
        stripeCustomerId: customer?.stripeCustomerId || null,
        staffId: staff?.id || null,
        staffName: staff?.name || null,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
