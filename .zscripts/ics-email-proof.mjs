// Fire a SIGNED checkout.session.completed event at the live dev webhook —
// the exact path a real Stripe payment takes. The booking flips CONFIRMED
// and the confirmation email carries the .ics attachment. Then we read the
// email back from Resend's API to PROVE the attachment landed.
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const secret = env.match(/^STRIPE_WEBHOOK_SECRET=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "")
const resendKey = env.match(/^RESEND_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "")

const bookingId = process.argv[2]
const sessionId = process.argv[3]
const amountCents = Number(process.argv[4] || 12564)

const event = {
  id: "evt_test_ics_" + Date.now(),
  object: "event",
  api_version: "2024-06-20",
  created: Math.floor(Date.now() / 1000),
  type: "checkout.session.completed",
  livemode: false,
  pending_webhooks: 0,
  request: { id: null, idempotency_key: null },
  data: {
    object: {
      id: sessionId,
      object: "checkout.session",
      amount_total: amountCents,
      currency: "usd",
      payment_status: "paid",
      status: "complete",
      customer_details: { email: "booking@aapawz.com" },
      payment_intent: "pi_test_ics_" + Date.now(),
      metadata: { type: "booking_payment", bookingId, flow: "booking" },
    },
  },
}

const raw = JSON.stringify(event)
const t = Math.floor(Date.now() / 1000)
const sig = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex")

const res = await fetch("http://localhost:3000/api/stripe/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${sig}` },
  body: raw,
})
console.log("WEBHOOK:", res.status, await res.text())

// Give the email pipeline a beat, then read the latest booking_confirmed
// email back from Resend and inspect its attachments.
await new Promise((r) => setTimeout(r, 4000))
const list = await (await fetch("https://api.resend.com/emails?limit=5", {
  headers: { Authorization: `Bearer ${resendKey}` },
})).json()
const mine = (list.data || []).find((e) => e.subject?.includes("appointment is confirmed"))
if (!mine) {
  console.log("RESEND: no confirmation email found in last 5 — listing subjects:")
  for (const e of list.data || []) console.log(" -", e.subject, e.to)
  process.exit(0)
}
const full = await (await fetch(`https://api.resend.com/emails/${mine.id}`, {
  headers: { Authorization: `Bearer ${resendKey}` },
})).json()
console.log("EMAIL:", JSON.stringify({ id: mine.id, to: full.to, subject: full.subject }))
console.log("ATTACHMENTS:", JSON.stringify(full.attachments || null))
