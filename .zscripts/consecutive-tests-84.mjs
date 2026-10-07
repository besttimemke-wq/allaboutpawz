// 84 — fire 3 CONSECUTIVE real test emails through the admin Notifications
// test endpoint (the exact pipeline real alerts ride), capture messageIds +
// audit rows. The owner asked for consecutive test emails she can look for.
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")

const payload = { sub: "00000000-0000-4000-8000-000000000001", email: "allaboutpawz901@gmail.com", name: "Salon Owner", role: "admin", scope: "admin", membershipRole: "admin", exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }
const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", KEY).update(b64).digest("base64url")
const cookie = `pawz_session=${b64}.${mac}`

for (let i = 1; i <= 3; i++) {
  const r = await fetch("http://localhost:3000/api/admin/notifications/test", { method: "POST", headers: { cookie } })
  const d = await r.json().catch(() => ({}))
  console.log(`test #${i}: HTTP ${r.status} | ok=${d.ok} | sentTo=${d.sentTo || d.destination || "?"} | messageId=${d.messageId || "?"} | ${d.error || ""}`)
  await new Promise(res => setTimeout(res, 1200))
}
