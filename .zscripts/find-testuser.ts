import { getSupabaseAdmin } from "@/lib/pawz-auth"

async function main() {
  const admin = getSupabaseAdmin()
  if (!admin) { console.log("no admin"); process.exit(1) }
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  if (error) { console.log("ERR", error.message); process.exit(1) }
  const hit = (data?.users || []).find((u: any) => String(u.email || "").toLowerCase() === "booking@aapawz.com")
  console.log(hit ? `AUTH_USER_ID=${hit.id} email=${hit.email}` : "NOT FOUND")
  process.exit(0)
}
main()
