import { getSupabaseAdmin, signSession } from "@/lib/pawz-auth"

async function main() {
  const admin = getSupabaseAdmin()
  const email = "promos-e2e@aapawz.com"
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let user = (list?.users || []).find((u: any) => String(u.email || "").toLowerCase() === email)
  if (!user) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: "Promos E2E", role: "customer" },
    })
    if (error) { console.log("CREATE ERR:", error.message); process.exit(1) }
    user = created.user
  }
  const token = signSession({
    authUserId: user.id,
    email,
    name: "Promos E2E",
    role: "customer",
    stationName: undefined as any,
    avatarUrl: undefined as any,
    scope: "customer",
    membershipRole: "customer",
  })
  console.log("USER_ID=" + user.id)
  console.log("TOKEN=" + token)
  process.exit(0)
}
main()
