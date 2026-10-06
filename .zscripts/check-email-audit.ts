import { repo } from "@/lib/repo"
async function main() {
  const rows = (await repo.list("email_messages").catch(() => [])) as any[]
  const recent = rows
    .sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .slice(0, 6)
  for (const r of recent) {
    const branded = String(r.bodyHtml || r.html || "").includes("ALL ABOUT PAWZ") && String(r.bodyHtml || r.html || "").includes("We got it")
    console.log(`[${String(r.createdAt).slice(0, 19)}] to=${r.toEmail} tpl=${r.template} status=${r.status} subject="${r.subject}" brandedWeGotIt=${branded}`)
  }
  process.exit(0)
}
main()
