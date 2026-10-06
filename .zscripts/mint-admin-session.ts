import { getSupabaseAdmin, signSession } from "@/lib/pawz-auth"

async function main() {
  const admin = getSupabaseAdmin()
  const email = (process.env.ADMIN_EMAILS || "").split(",")[0].trim().toLowerCase()
  if (!email) { console.log("NO ADMIN_EMAILS"); process.exit(1) }
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  let user = (list?.users || []).find((u: any) => String(u.email || "").toLowerCase() === email)
  if (!user) { console.log("NO AUTH USER FOR " + email); process.exit(1) }
  const token = signSession({
    authUserId: user.id,
    email,
    name: "Owner",
    role: "admin",
    stationName: undefined as any,
    avatarUrl: undefined as any,
    scope: "admin",
    membershipRole: "owner",
  })
  console.log("TOKEN=" + token)
  process.exit(0)
}
main()
