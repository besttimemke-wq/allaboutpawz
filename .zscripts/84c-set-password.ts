import { getSupabaseAdmin } from "@/lib/pawz-auth"
const admin = getSupabaseAdmin()
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const user = (list?.users || []).find((u: any) => String(u.email || "").toLowerCase() === "shop-auth-e2e@aapawz.com")
if (!user) { console.log("NO USER"); process.exit(1) }
const { error } = await admin.auth.admin.updateUserById(user.id, { password: "PawzTest84c!" })
console.log(error ? "ERR " + error.message : "PASSWORD SET for " + user.email)
process.exit(error ? 1 : 0)
