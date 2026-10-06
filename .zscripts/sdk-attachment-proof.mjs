// SDK serialization proof: build the EXACT payload our route constructs
// (ics → base64 → attachments) and run it through the Resend SDK's send
// with a fetch stub that captures the serialized request body.
const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "SUMMARY:test", "END:VEVENT", "END:VCALENDAR"].join("\r\n") + "\r\n"
const payload = {
  from: "All About Pawz <notifications@confirmation.aapawz.com>",
  to: "booking@aapawz.com",
  subject: "SDK serialization proof",
  html: "<p>proof</p>",
  attachments: [{ filename: "all-about-pawz-appointment.ics", content: Buffer.from(ics, "utf8").toString("base64") }],
}
let captured = null
const { Resend } = await import("resend")
const r = new Resend("re_test_dummy")
const origFetch = globalThis.fetch
globalThis.fetch = async (url, init) => {
  captured = { url: String(url), body: init?.body }
  return new Response(JSON.stringify({ id: "proof-id" }), { status: 200, headers: { "content-type": "application/json" } })
}
try {
  const { data, error } = await r.emails.send(payload)
  globalThis.fetch = origFetch
  const body = JSON.parse(captured.body)
  console.log("SDK posted to:", captured.url)
  console.log("attachments serialized:", JSON.stringify(body.attachments?.map((a) => ({ filename: a.filename, contentBytes: Math.round((a.content?.length || 0) * 3 / 4) }))))
  const ok = body.attachments?.[0]?.filename === "all-about-pawz-appointment.ics" && body.attachments?.[0]?.content === payload.attachments[0].content
  console.log("ICS RIDES THE EMAIL:", ok)
} catch (e) {
  globalThis.fetch = origFetch
  console.log("ERR", e.message)
}
