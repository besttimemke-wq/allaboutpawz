import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Client as PgClient } from "pg"

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TENANT_ID = "00000000-0000-0000-0000-000000000001"
const DB_CONN = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION

function getSupabase() {
  if (!SB_URL || !SB_KEY || SB_URL.startsWith("your-")) return null
  return createClient(SB_URL, SB_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function insertLearnerProfile(userId: string, name: string) {
  if (!DB_CONN) return
  const client = new PgClient({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    await client.query(
      `INSERT INTO lms.learner_profiles (tenant_id, user_id, preferred_name, marketing_opt_in, created_at, updated_at) VALUES ($1, $2, $3, false, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [TENANT_ID, userId, name]
    )
    console.log("learner_profiles seeded for", userId)
  } catch (e) {
    console.error("learner_profiles insert error:", e instanceof Error ? e.message : e)
  } finally {
    await client.end()
  }
}

async function insertStaffRecord(userId: string, email: string, name: string, role: string) {
  if (!DB_CONN) return
  const client = new PgClient({ connectionString: DB_CONN, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    await client.query(
      `INSERT INTO staff (name, role, email, active, "sortOrder", "userId", tenant_id) VALUES ($1, $2, $3, true, 0, $4, $5) ON CONFLICT DO NOTHING`,
      [name, role, email, userId, TENANT_ID]
    )
    console.log("staff record created:", role, "for", email)
  } catch (e) {
    console.error("staff insert error:", e instanceof Error ? e.message : e)
  } finally {
    await client.end()
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, email, name, password, action } = body
    const supabase = getSupabase()

    // Google sign-in
    if (provider === "google") {
      if (supabase) {
        // Create auth user if needed
        const { data: existing } = await supabase.auth.admin.listUsers()
        const found = existing?.users?.find((u: any) => u.email === email)
        let userId = found?.id

        if (!userId) {
          const { data: newUser } = await supabase.auth.admin.createUser({
            email, password: "WelcomePawz123!", email_confirm: true,
            user_metadata: { name, full_name: name, role: "learner" }
          })
          userId = newUser?.user?.id
        }

        if (userId) {
          await insertLearnerProfile(userId, name || "Learner")
          await supabase.rpc("assign_lms_role", { p_tenant_id: TENANT_ID, p_user_id: userId, p_role: "learner" })
          if (email.toLowerCase() === "etnologicinc@gmail.com") {
            await insertStaffRecord(userId, email, name || "Admin", "owner")
          }
          // Fire notification
          await fetch(`${req.nextUrl.origin}/api/notify/enrollment`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, name, user_id: userId, timestamp: new Date().toISOString() })
          })
        }
      }

      const res = NextResponse.json({ user: { id: email, email, name: name || "Learner", role: "learner" }, redirect: "/learn/classroom" })
      res.cookies.set("leashed_user", JSON.stringify({ id: email, email, name: name || "Learner" }), { httpOnly: true, sameSite: "lax", maxAge: 604800, path: "/" })
      return res
    }

    // Email/password sign-in
    if (action === "signin" || (email && password)) {
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return NextResponse.json({ error: error.message }, { status: 401 })
        return NextResponse.json({ user: { id: data.user?.id, email: data.user?.email, role: "learner" }, redirect: "/learn/classroom" })
      }
      const res = NextResponse.json({ user: { id: email, email, name: name || email.split("@")[0], role: "learner" }, redirect: "/learn/classroom" })
      res.cookies.set("leashed_user", JSON.stringify({ id: email, email, name: name || email.split("@")[0] }), { httpOnly: true, sameSite: "lax", maxAge: 604800, path: "/" })
      return res
    }

    // New registration / enrollment
    if (action === "register" || (email && !password)) {
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email, password: password || "WelcomePawz123!", email_confirm: true,
          user_metadata: { name, full_name: name, role: "learner" }
        })
        if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

        const userId = authData.user.id
        await insertLearnerProfile(userId, name)
        await supabase.rpc("assign_lms_role", { p_tenant_id: TENANT_ID, p_user_id: userId, p_role: "learner" })

        if (email.toLowerCase() === "etnologicinc@gmail.com") {
          await insertStaffRecord(userId, email, name, "owner")
        }

        await fetch(`${req.nextUrl.origin}/api/notify/enrollment`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, user_id: userId, timestamp: new Date().toISOString() })
        })

        return NextResponse.json({ user: { id: userId, email, name, role: "learner" }, redirect: "/learn/classroom" })
      }
      const res = NextResponse.json({ user: { id: email, email, name, role: "learner" }, redirect: "/learn/classroom" })
      res.cookies.set("leashed_user", JSON.stringify({ id: email, email, name }), { httpOnly: true, sameSite: "lax", maxAge: 604800, path: "/" })
      return res
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Auth failed" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("leashed_user")?.value
  if (cookie) {
    try { return NextResponse.json({ user: JSON.parse(decodeURIComponent(cookie)) }) }
    catch { return NextResponse.json({ user: null }) }
  }
  const supabase = getSupabase()
  if (supabase) {
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
      if (data.user) return NextResponse.json({ user: { id: data.user.id, email: data.user.email, role: "learner" } })
    }
  }
  return NextResponse.json({ user: null })
}
