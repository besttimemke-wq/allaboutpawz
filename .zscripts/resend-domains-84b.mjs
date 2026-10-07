import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const m = env.match(/^RESEND_API_KEY\s*=\s*["']?(re_[A-Za-z0-9_]+)["']?/m)
const key = m?.[1] || ""
console.log("key present:", !!key, "len:", key.length)
if (key) {
  const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } })
  console.log("domains status:", r.status)
  const domains = await r.json()
  for (const d of (Array.isArray(domains) ? domains : [])) console.log(`  ${d.name} → ${d.status}`)
}
