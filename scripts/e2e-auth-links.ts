// E2E helper: creates a throwaway customer auth user and generates the exact
// links the branded Supabase emails carry (recovery + invite), pointed at the
// local dev server so agent-browser can walk the full journey:
//   email link → /auth/set-password → new-password box → signed-in portal.
//
//   bun --env-file=.env run scripts/e2e-auth-links.ts
//
// Prints JSON: { email, userId, recoveryLink, inviteLink } — cleanup is
// scripts/e2e-auth-links.ts --cleanup <userId> <email>

import { createClient } from "@supabase/supabase-js"

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const BASE = "http://localhost:3000"

async function main() {
  const cleanupIdx = process.argv.indexOf("--cleanup")
  if (cleanupIdx !== -1) {
    const userId = process.argv[cleanupIdx + 1]
    const { error } = await admin.auth.admin.deleteUser(userId)
    console.log(JSON.stringify({ deleted: !error, userId, error: error?.message || null }))
    return
  }

  const email = `e2e-reset-${Date.now()}@example.com`
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: "customer", full_name: "E2E Reset Journey" },
  })
  if (createError || !created?.user) {
    console.error("createUser failed:", createError?.message)
    process.exit(1)
  }

  const [recovery, invite] = await Promise.all([
    admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${BASE}/auth/set-password` },
    }),
    admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo: `${BASE}/auth/set-password` },
    }),
  ])

  console.log(
    JSON.stringify(
      {
        email,
        userId: created.user.id,
        recoveryLink: recovery.data?.properties?.action_link ?? null,
        inviteLink: invite.data?.properties?.action_link ?? null,
      },
      null,
      2,
    ),
  )
}

main()
