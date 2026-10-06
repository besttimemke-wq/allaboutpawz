import { getSupabaseAdmin } from "@/lib/pawz-auth"
import { repo } from "@/lib/repo"

async function main() {
  const admin = getSupabaseAdmin()
  const email = "booking@aapawz.com"
  // Find or create the auth user for the seeded test customer
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 })
  let user = (list?.users || []).find((u: any) => String(u.email || "").toLowerCase() === email)
  if (!user) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: "Zoe Ztest", role: "customer" },
    })
    if (error) { console.log("CREATE ERR:", error.message); process.exit(1) }
    user = created.user
    console.log("CREATED auth user:", user.id)
  } else {
    console.log("EXISTS auth user:", user.id)
  }
  // Back-link the customer row
  const rows = (await repo.list("customers").catch(() => [])) as any[]
  const c = rows.find((r) => String(r.email || "").toLowerCase() === email)
  if (c && c.userId !== user.id) {
    await repo.update("customers", c.id, { userId: user.id })
    console.log("LINKED customer", c.id, "->", user.id)
  }
  process.exit(0)
}
main()
