import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
const env = readFileSync("/home/z/my-project/.env", "utf8")
const KEY = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const payload = { sub: "00000000-0000-4000-8000-000000000001", email: "allaboutpawz901@gmail.com", name: "Salon Owner", role: "admin", scope: "admin", membershipRole: "admin", exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 }
const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", KEY).update(b64).digest("base64url")
const cookie = `pawz_session=${b64}.${mac}`
// switch destination to the gmail inbox
const p1 = await fetch("http://localhost:3000/api/admin/notifications", { method: "PATCH", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ alertEmail: "allaboutpawz901@gmail.com" }) })
console.log("destination switch:", p1.status)
for (let i = 1; i <= 2; i++) {
  const r = await fetch("http://localhost:3000/api/admin/notifications/test", { method: "POST", headers: { cookie } })
  const d = await r.json().catch(() => ({}))
  console.log(`gmail test #${i}: HTTP ${r.status} | ok=${d.ok} | messageId=${d.messageId || "?"}`)
  await new Promise(res => setTimeout(res, 1200))
}
// restore the salon inbox
const p2 = await fetch("http://localhost:3000/api/admin/notifications", { method: "PATCH", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify({ alertEmail: "booking@aapawz.com" }) })
console.log("destination restored:", p2.status)
