// Mint an ADMIN-scope pawz_session cookie for browser verification of the
// dual-role guarantee: the owner/staff signs in, and their CUSTOMER portal
// (pets, appointments, orders) must open for them — same person, no wall.
// Same HMAC shape as signSession(); never printed beyond the cookie value.
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")

const payload = {
  sub: "00000000-0000-4000-8000-000000000001",
  email: "allaboutpawz901@gmail.com",
  name: "Salon Owner",
  role: "admin",
  scope: "admin",
  membershipRole: "admin",
  exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
}
const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", key).update(body).digest("base64url")
console.log("COOKIE=" + `${body}.${mac}`)
