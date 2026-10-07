// Mint a CUSTOMER-scope pawz_session cookie for the landing-modal E2E
// (Task 84-a). Same HMAC shape as signSession(); never printed beyond the
// cookie value.
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")

const payload = {
  sub: "00000000-0000-4000-8000-0000000084a1",
  email: "landing-e2e-84a@aapawz.com",
  name: "Landing E2E Tester",
  role: "customer",
  scope: "customer",
  exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
}
const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", key).update(body).digest("base64url")
console.log("COOKIE=" + `${body}.${mac}`)
