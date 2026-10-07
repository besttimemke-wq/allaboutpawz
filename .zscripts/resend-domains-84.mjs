import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const key = env.match(/^RESEND_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "") || ""
if (!key) { console.log("no RESEND_API_KEY"); process.exit(0) }
const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } })
const domains = await r.json()
console.log("status:", r.status)
for (const d of (Array.isArray(domains) ? domains : [])) {
  console.log(`domain: ${d.name} | status: ${d.status} | created: ${d.created_at}`)
}
// also check the recent sends (last 10) and their statuses
const s = await fetch("https://api.resend.com/emails?limit=10", { headers: { Authorization: `Bearer ${key}` } })
const sends = await s.json()
const data = Array.isArray(sends?.data) ? sends.data : []
console.log("\nrecent sends:")
for (const e of data) {
  console.log(`  ${e.created_at} | to:${Array.isArray(e.to) ? e.to.join(",") : e.to} | ${e.subject?.slice(0, 50)} | ${e.last_event_status || e.status?.toLowerCase?.() || "?"}`)
}
