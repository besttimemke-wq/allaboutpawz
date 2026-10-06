// Mint a customer pawz_session cookie for browser E2E (dev only, test user).
// The HMAC key mirrors pawz-auth's secret(): SERVICE_KEY or "pawz-dev-secret".
import { createHmac } from "crypto"

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
const secret = SERVICE_KEY || "pawz-dev-secret"
const b64url = (s: string) => Buffer.from(s, "utf-8").toString("base64url")

const [authUserId, email, name] = process.argv.slice(2)
if (!authUserId || !email) { console.error("usage: mint-session.ts <authUserId> <email> [name]"); process.exit(1) }

const payload = {
  sub: authUserId,
  email,
  name: name || email.split("@")[0],
  role: "customer",
  stationName: null,
  avatarUrl: null,
  scope: "customer",
  membershipRole: "customer",
  exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
}
const body = b64url(JSON.stringify(payload))
const mac = createHmac("sha256", secret).update(body).digest("base64url")
console.log(`${body}.${mac}`)
