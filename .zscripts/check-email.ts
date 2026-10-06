import { repo } from "@/lib/repo"
async function main() {
  const rows = (await repo.list("email_messages").catch(() => [])) as any[]
  const mine = rows.filter((r) => String(r.toEmail || "").toLowerCase() === "booking@aapawz.com")
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
  mine.slice(-4).forEach((r) => console.log(`[${r.createdAt?.slice(0,19)}] ${r.template} | ${r.subject} | status=${r.status}`))
  process.exit(0)
}
main()
