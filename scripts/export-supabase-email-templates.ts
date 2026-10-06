// ---------------------------------------------------------------------------
// Exports the 13 Supabase Auth/Security email templates from the brand design
// system (src/lib/email/templates/auth.ts) into supabase/templates/*.html so
// they are:
//
//   1. version-controlled in this repo,
//   2. wired into the Supabase CLI local dev stack via supabase/config.toml
//      ([auth.email.template.*] content_path blocks), and
//   3. directly pasteable into the HOSTED project's dashboard
//      (Authentication → Email Templates) — the Email Template Studio
//      (Admin → Settings → Email Templates) remains the guided copy tool.
//
// Run:  bun run scripts/export-supabase-email-templates.ts
//
// Source of truth: src/lib/email/templates/auth.ts + index.ts.
// Edit there, re-run this script, commit the regenerated files.
// ---------------------------------------------------------------------------

import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { EMAIL_TEMPLATES } from "../src/lib/email/templates/index"

// GoTrue config.toml template keys for the six core auth emails.
// (The seven security notifications are fixed-system emails in GoTrue and
// have no config.toml block — they are exported as reference/paste files.)
const CONFIG_KEY_BY_ID: Record<string, string> = {
  supabase_confirm_signup: "confirmation",
  supabase_invite_user: "invite",
  supabase_magic_link: "magic_link",
  supabase_change_email: "email_change",
  supabase_reset_password: "recovery",
  supabase_reauthentication: "reauthentication",
}

const outDir = join(import.meta.dir, "..", "supabase", "templates")
mkdirSync(outDir, { recursive: true })

let core = 0
let security = 0
const written: string[] = []

for (const t of EMAIL_TEMPLATES) {
  if (t.channel !== "supabase") continue
  const key = CONFIG_KEY_BY_ID[t.id]
  const file = `${key ?? t.id}.html`
  // Pure HTML output — no injected comments before the doctype (a comment
  // there can flip email clients into quirks mode).
  writeFileSync(join(outDir, file), t.html + "\n", "utf8")
  if (key) core++
  else security++
  written.push(`  ${file.padEnd(38)} ${key ? `[auth.email.template.${key}]` : "(security notification)"} — ${t.subject}`)
}

console.log(`Exported ${core + security} Supabase email templates to supabase/templates/:\n`)
console.log(written.join("\n"))
console.log(`
Next steps:
  • Local CLI dev: supabase stop && supabase start  (config.toml picks these up)
  • Hosted project: paste from the Email Template Studio (Admin → Settings →
    Email Templates) or copy these files directly into
    Supabase Dashboard → Authentication → Email Templates.
`)
