// Task 36-a one-off: seed the ZZTEST customer + two dogs, mint a pawz_session cookie.
// Never printed to stdout beyond the cookie value needed for browser verification.
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const url = env.match(/^SUPABASE_URL=(.+)$/m)[1].trim().replace(/^"|"$/g, "")
const key = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)[1].trim().replace(/^"|"$/g, "")

const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" }
const EMAIL = "booking@aapawz.com"

// 1. find-or-create the customer
let cust = (await (await fetch(`${url}/rest/v1/customers?select=id,email&email=eq.${EMAIL}`, { headers: H })).json())[0]
if (!cust) {
  cust = (await (await fetch(`${url}/rest/v1/customers`, {
    method: "POST", headers: H,
    body: JSON.stringify({ firstName: "Zoe", lastName: "Ztest", email: EMAIL, customerStatus: "ACTIVE" }),
  })).json())[0]
}
console.log("customer:", cust.id)

// 2. dogs — only if this customer has none
const dogs = await (await fetch(`${url}/rest/v1/dogs?select=id,name&customerId=eq.${cust.id}`, { headers: H })).json()
if (dogs.length === 0) {
  await fetch(`${url}/rest/v1/dogs`, {
    method: "POST", headers: H,
    body: JSON.stringify([
      { customerId: cust.id, name: "Mochi", breedName: "Beagle", weightLbs: "30", size: "MEDIUM", birthDate: "2021-04-01" },
      { customerId: cust.id, name: "Bruno", breedName: "Goldendoodle", weightLbs: "55", size: "LARGE", birthDate: "2020-06-15" },
    ]),
  })
  console.log("dogs: seeded Mochi + Bruno")
} else {
  console.log("dogs:", dogs.map((d) => d.name).join(", "))
}

// 3. mint the session cookie — same shape as signSession()
const payload = {
  sub: "00000000-0000-4000-8000-00000036a001",
  email: EMAIL,
  name: "Zoe Ztest",
  role: "customer",
  scope: "customer",
  exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
}
const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
const mac = createHmac("sha256", key).update(body).digest("base64url")
console.log("COOKIE=" + `${body}.${mac}`)
