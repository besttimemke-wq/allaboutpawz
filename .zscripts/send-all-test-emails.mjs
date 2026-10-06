// Fire EVERY email template sequentially to one inbox for manual inspection.
//   - resend-channel → POST /api/admin/email-templates (the Studio's own test
//     path — same audit-trailed pipeline production uses)
//   - supabase-channel → rendered design sent via Resend REST with a PREVIEW
//     banner (in production Supabase Auth sends these with live values)
//
// Run: bun .zscripts/send-all-test-emails.mjs allaboutpawz901@gmail.com
import { readFileSync } from "node:fs"

const env = readFileSync("/home/z/my-project/.env", "utf8")
const resendKey = env.match(/^RESEND_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^"|"$/g, "")
const adminToken = readFileSync("/tmp/admin-token.txt", "utf8").trim().replace(/^TOKEN=/, "")

const to = process.argv[2] || "allaboutpawz901@gmail.com"
const base = "http://localhost:3000"

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // 1. The full catalog (admin-gated GET)
  const listRes = await fetch(`${base}/api/admin/email-templates`, {
    headers: { Cookie: `pawz_session=${adminToken}` },
  })
  if (!listRes.ok) {
    console.error("Catalog fetch failed:", listRes.status, await listRes.text())
    process.exit(1)
  }
  const { templates } = await listRes.json()
  console.log(`== Sending ALL ${templates.length} email templates to ${to} ==`)

  let sent = 0
  let failed = 0
  let i = 0
  for (const t of templates) {
    i++
    try {
      if (t.channel === "resend") {
        const res = await fetch(`${base}/api/admin/email-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: `pawz_session=${adminToken}` },
          body: JSON.stringify({ templateId: t.id, to }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.ok) {
          sent++
          console.log(`  ${String(i).padStart(2)}. ✓ [${t.group}] ${t.id}`)
        } else {
          failed++
          console.log(`  ${String(i).padStart(2)}. ✗ [${t.group}] ${t.id} — ${data.error || res.status}`)
        }
      } else {
        // Supabase design preview via Resend REST
        const banner = `<div style="background:#fff3cd;border:1px solid #ffe08a;padding:10px 14px;font:600 12px/1.5 sans-serif;color:#7a5c00;margin-bottom:16px">PREVIEW — in production this email is sent by Supabase Auth with live values filled in (the {{tokens}} below render as real data).</div>`
        const html = t.html.replace(/(<body[^>]*>)/i, `$1${banner}`)
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "All About Pawz <notifications@confirmation.aapawz.com>",
            to: [to],
            subject: `[TEST][SUPABASE PREVIEW] ${t.subject}`,
            html,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.id) {
          sent++
          console.log(`  ${String(i).padStart(2)}. ✓ [${t.group}] ${t.id} (preview)`)
        } else {
          failed++
          console.log(`  ${String(i).padStart(2)}. ✗ [${t.group}] ${t.id} — ${data.message || res.status}`)
        }
      }
    } catch (e) {
      failed++
      console.log(`  ${String(i).padStart(2)}. ✗ [${t.group}] ${t.id} — ${e?.message || e}`)
    }
    await sleep(1300)
  }
  console.log(`== DONE: ${sent} sent, ${failed} failed (of ${templates.length}) ==`)
  process.exit(0)
}

main().catch((e) => {
  console.error("FAILED:", e)
  process.exit(1)
})
