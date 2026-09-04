import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

// POST /api/auth/invite
// Creates a Supabase Auth user, sends a magic link invitation email,
// links them to a CRM customer or staff record,
// and creates a Stripe customer if role is "customer".

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Lazy clients — module-level init would crash when env keys aren't set yet.
let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _supabase
}
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

export async function POST(req: NextRequest) {
  const { email, role, customerId, staffId, firstName, lastName } = await req.json()

  if (!email || !role) {
    return NextResponse.json({ error: "email and role required" }, { status: 400 })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: "Supabase is not configured. Set the Supabase keys in .env, then restart the dev server." }, { status: 503 })
  }
  const supabase = getSupabase()
  const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null

  // 1. Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u: any) => u.email === email)

  let userId: string

  if (existing) {
    userId = existing.id
  } else {
    // 2. Create Auth user with invitation
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { role, firstName, lastName, customerId: customerId || null, staffId: staffId || null },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    userId = newUser.user.id

    // 3. Send invitation magic link
    const { error: linkError } = await supabase.auth.admin.generateLink({
      type: "invite",
      email,
    })

    if (linkError) {
      console.error("[auth/invite] magic link failed:", linkError.message)
      // User is created — invite can be resent
    }
  }

  // 4. Link Auth user to CRM record
  const headers = {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  }

  if (customerId) {
    await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
      method: "PATCH", headers, body: JSON.stringify({ userId }),
    })

    // 5. Create Stripe customer if doesn't exist
    const custRes = await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}&select=stripeCustomerId,email,firstName,lastName,phone`, { headers })
    const custData = (await custRes.json())[0]

    if (custData && !custData.stripeCustomerId && stripe) {
      try {
        const stripeCustomer = await stripe.customers.create({
          email: custData.email,
          name: `${custData.firstName} ${custData.lastName}`.trim(),
          phone: custData.phone || undefined,
        })
        await fetch(`${supabaseUrl}/rest/v1/customers?id=eq.${customerId}`, {
          method: "PATCH", headers, body: JSON.stringify({ stripeCustomerId: stripeCustomer.id }),
        })
      } catch (e: any) {
        console.error("[auth/invite] Stripe customer failed:", e.message)
      }
    }
  }

  if (staffId) {
    await fetch(`${supabaseUrl}/rest/v1/staff?id=eq.${staffId}`, {
      method: "PATCH", headers, body: JSON.stringify({ userId }),
    })
  }

  return NextResponse.json({ ok: true, userId, role, invited: !existing })
}
