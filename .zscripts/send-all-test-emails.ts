// ============================================================================
// Fire EVERY email template sequentially to one address for manual
// inspection. Resend-channel templates go through sendTemplateTest (the
// Studio's own test path); Supabase-channel templates (auth/security) are
// rendered HTML with GoTrue handlebars — sent as [TEST] previews so the
// whole catalog lands in one inbox.
//
// Run: bun .zscripts/send-all-test-emails.ts [to-address]
// ============================================================================

import { EMAIL_TEMPLATES } from "@/lib/email/templates"
import { sendTemplateTest, sendEmail } from "@/lib/email"

async function main() {
  const to = process.argv[2] || "allaboutpawz901@gmail.com"
  console.log(`== Sending ALL ${EMAIL_TEMPLATES.length} email templates to ${to} ==`)

  let sent = 0
  let failed = 0
  for (const def of EMAIL_TEMPLATES) {
    const prefix = def.channel === "resend" ? "" : "[SUPABASE PREVIEW] "
    try {
      let result: { ok: boolean; messageId?: string; error?: string }
      if (def.channel === "resend") {
        result = await sendTemplateTest(def.id, to)
      } else {
        // Supabase templates are sent by Supabase itself in production; this
        // is the rendered design with {{handlebars}} visible, wrapped with a
        // banner so it reads as a preview.
        const banner = `<div style="background:#fff3cd;border:1px solid #ffe08a;padding:10px 14px;font:600 12px/1.5 sans-serif;color:#7a5c00;margin-bottom:16px">PREVIEW — in production this email is sent by Supabase Auth with the live values filled in (the {{tokens}} below render as real data).</div>`
        const html = def.html.startsWith("<!doctype") || def.html.startsWith("<html")
          ? def.html.replace(/(<body[^>]*>)/i, `$1${banner}`)
          : banner + def.html
        result = await sendEmail({
          to,
          template: `studio_test_${def.id}`,
          subject: `[TEST] ${prefix}${def.subject}`,
          html,
        })
      }
      if (result.ok) {
        sent++
        console.log(`  ✓ [${def.group}] ${def.id}`)
      } else {
        failed++
        console.log(`  ✗ [${def.group}] ${def.id} — ${result.error}`)
      }
    } catch (e: any) {
      failed++
      console.log(`  ✗ [${def.group}] ${def.id} — ${e?.message || e}`)
    }
    // Sequential with a beat between sends — Resend breathes easy.
    await new Promise((r) => setTimeout(r, 1200))
  }
  console.log(`== DONE: ${sent} sent, ${failed} failed (of ${EMAIL_TEMPLATES.length}) ==`)
  process.exit(0)
}

main().catch((e) => {
  console.error("FAILED:", e)
  process.exit(1)
})
