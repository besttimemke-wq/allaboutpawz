import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const key = env.match(/^RESEND_API_KEY\s*=\s*["']?(re_[A-Za-z0-9_]+)["']?/m)?.[1] || ""
const r = await fetch("https://api.resend.com/emails/01a1141d-0931-7190-bad6-e323ae4f0608", { headers: { Authorization: `Bearer ${key}` } })
console.log("email lookup status:", r.status)
if (r.ok) {
  const d = await r.json()
  console.log(JSON.stringify({ to: d.to, subject: d.subject, last_event: d.last_event_status, created: d.created_at }, null, 2))
} else {
  console.log((await r.text()).slice(0, 200))
}
