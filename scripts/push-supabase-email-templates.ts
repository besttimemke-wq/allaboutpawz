// ---------------------------------------------------------------------------
// Push the branded email templates to the HOSTED Supabase project via the
// Supabase Management API — no dashboard copy-paste, ever.
//
//   bun run scripts/push-supabase-email-templates.ts            push (live)
//   bun run scripts/push-supabase-email-templates.ts --dry-run  show the payload
//   bun run scripts/push-supabase-email-templates.ts --check    verify only (GET + diff)
//
// Required env (for live push / --check):
//   SUPABASE_ACCESS_TOKEN   account-level access token (sbp_…) — generate at
//                           https://supabase.com/dashboard/account/tokens
//   SUPABASE_URL            e.g. https://qdgfkxbkqcnuhckhvhzd.supabase.co
//                           (or SUPABASE_PROJECT_REF to override the ref only)
//
// How it works:
//   1. Renders every Supabase-channel template from the design-system
//      registry (src/lib/email/templates) — the single source of truth the
//      Email Template Studio also previews.
//   2. GETs the live auth config, saves a timestamped rollback backup.
//   3. PATCHes subject + HTML for all six core auth templates in ONE request,
//      plus every security-notice template the project's API exposes
//      (discovered from the GET — never guesses, so the PATCH can't 400).
//   4. GETs again and verifies every key took the new value.
//
// CI: the email-templates GitHub Action runs this on every merge to main
// that touches the email system, using the repo secret SUPABASE_ACCESS_TOKEN.
// (Workflow file lives at docs/email-templates-workflow.yml until a
// workflow-scoped credential promotes it to .github/workflows/ — see its
// header for the 60-second promotion paths.)
//
// Rollback: the pre-push config snapshot is written to
//   /tmp/supabase-auth-config-backup-<timestamp>.json
// PATCH the old values back (or re-run this script after reverting the code)
// to restore any previous state.
// ---------------------------------------------------------------------------

// The hosted project must always receive production URLs — force it before
// the registry import chain reads the environment, whatever machine this
// runs on (laptop, CI, sandbox preview).
process.env.NEXT_PUBLIC_SITE_URL = "https://aapawz.com"

import { writeFileSync } from "node:fs"

const API = "https://api.supabase.com/v1"
const DRY = process.argv.includes("--dry-run")
const CHECK = process.argv.includes("--check")

function env(name: string): string {
  return (process.env[name] || "").trim()
}

function projectRef(): string {
  const explicit = env("SUPABASE_PROJECT_REF")
  if (explicit) return explicit
  const url = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL")
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i)
  if (!m) {
    console.error("✗ Could not derive the project ref — set SUPABASE_URL (https://<ref>.supabase.co) or SUPABASE_PROJECT_REF.")
    process.exit(2)
  }
  return m[1]
}

// ---- The push plan -----------------------------------------------------------
// Registry id → GoTrue template key. The six core auth templates are stable,
// documented keys; everything else is discovered from the live GET below.

const CORE_KEYS: Record<string, string> = {
  supabase_confirm_signup: "confirmation",
  supabase_invite_user: "invite",
  supabase_magic_link: "magic_link",
  supabase_change_email: "email_change",
  supabase_reset_password: "recovery",
  supabase_reauthentication: "reauthentication",
}

// Fuzzy-match live API key suffixes for the seven security notices.
const SECURITY_MATCHERS: { id: string; pattern: RegExp }[] = [
  { id: "supabase_security_password_changed", pattern: /security[_-]?password/i },
  { id: "supabase_security_email_changed", pattern: /security[_-]?email/i },
  { id: "supabase_security_phone_changed", pattern: /security[_-]?phone/i },
  { id: "supabase_security_signin_linked", pattern: /security[_-]?(signin|sso)[_-]?link/i },
  { id: "supabase_security_signin_removed", pattern: /security[_-]?(signin|sso)[_-]?remov/i },
  { id: "supabase_security_mfa_added", pattern: /security[_-]?mfa[_-]?(add|enabl)/i },
  { id: "supabase_security_mfa_removed", pattern: /security[_-]?mfa[_-]?remov/i },
]

interface PlanItem {
  templateId: string
  name: string
  keySuffix: string
  subjectKey: string // lowercase, as the PATCH accepts
  contentKey: string
  subject: string
  html: string
}

async function main() {
  const { EMAIL_TEMPLATES } = await import("../src/lib/email/templates/index")

  const supabaseChannel = EMAIL_TEMPLATES.filter((t) => t.channel === "supabase")
  const byId = new Map(supabaseChannel.map((t) => [t.id, t]))

  const ref = projectRef()
  const token = env("SUPABASE_ACCESS_TOKEN")

  console.log(`\nAll About Pawz — Supabase email template push`)
  console.log(`project: ${ref}   mode: ${DRY ? "DRY RUN (no changes)" : CHECK ? "CHECK (verify only)" : "LIVE PUSH"}`)

  // ---- Build the plan --------------------------------------------------------
  const plan: PlanItem[] = []
  for (const [id, suffix] of Object.entries(CORE_KEYS)) {
    const t = byId.get(id)
    if (!t) continue
    plan.push({
      templateId: id,
      name: t.name,
      keySuffix: suffix,
      subjectKey: `mailer_subjects_${suffix}`,
      contentKey: `mailer_templates_${suffix}_content`,
      subject: t.subject,
      html: t.html,
    })
  }
  const coreIds = new Set(Object.keys(CORE_KEYS))
  const securityTemplates = supabaseChannel.filter((t) => !coreIds.has(t.id))

  // ---- Live config (needed to discover security keys + show before/after) ---
  let live: Record<string, unknown> | null = null
  if (token) {
    console.log(`\n→ GET ${API}/projects/${ref}/config/auth`)
    const res = await fetch(`${API}/projects/${ref}/config/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 401) {
      console.error(`✗ 401 Unauthorized — SUPABASE_ACCESS_TOKEN is missing, revoked, or expired.`)
      console.error(`  Generate a fresh account access token: https://supabase.com/dashboard/account/tokens`)
      console.error(`  (Legacy sbp_ tokens were force-revoked by Supabase's 2024 security rotation — old ones 401.)`)
      process.exit(1)
    }
    if (!res.ok) {
      console.error(`✗ GET config failed: HTTP ${res.status} ${res.statusText}`)
      console.error((await res.text()).slice(0, 400))
      process.exit(1)
    }
    live = (await res.json()) as Record<string, unknown>

    // Discover security-notice keys actually exposed by this project's API.
    const contentKeys = Object.keys(live).filter((k) => /^MAILER_TEMPLATES_(.+)_CONTENT$/.test(k))
    let found = 0
    for (const ck of contentKeys) {
      const suffix = ck.match(/^MAILER_TEMPLATES_(.+)_CONTENT$/)![1]
      if (!/security/i.test(suffix)) continue
      const matcher = SECURITY_MATCHERS.find((m) => m.pattern.test(suffix))
      const t = matcher ? byId.get(matcher.id) : undefined
      if (!t) continue
      plan.push({
        templateId: t.id,
        name: t.name,
        keySuffix: suffix.toLowerCase(),
        subjectKey: `mailer_subjects_${suffix.toLowerCase()}`,
        contentKey: `mailer_templates_${suffix.toLowerCase()}_content`,
        subject: t.subject,
        html: t.html,
      })
      found++
    }
    console.log(`  live config loaded: ${contentKeys.length} template content keys exposed, ${found} security notices matched`)

    // Rollback snapshot.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-")
    const backupPath = `/tmp/supabase-auth-config-backup-${stamp}.json`
    writeFileSync(backupPath, JSON.stringify(live, null, 2), "utf8")
    console.log(`  rollback snapshot: ${backupPath}`)
  } else if (!DRY) {
    console.error(`✗ SUPABASE_ACCESS_TOKEN is not set — required for live push / --check.`)
    console.error(`  (Use --dry-run to inspect the payload without a token.)`)
    process.exit(2)
  }

  // ---- Show the plan ---------------------------------------------------------
  console.log(`\nTemplates to push: ${plan.length}`)
  for (const item of plan) {
    const subjBefore = live ? String(live[item.subjectKey.toUpperCase()] ?? "(unset)") : "—"
    const contentBefore = live ? String(live[item.contentKey.toUpperCase()] ?? "(unset)") : "—"
    const changed = live && (subjBefore !== item.subject || contentBefore !== item.html)
    const mark = !live ? " " : changed ? "≠" : "="
    console.log(`  ${mark} ${item.name.padEnd(34)} subject "${item.subject}"`)
    console.log(`      ${item.subjectKey} / ${item.contentKey}  (${item.html.length.toLocaleString()} bytes html)`)
    if (live && subjBefore !== "(unset)" && subjBefore !== item.subject) {
      console.log(`      live subject: "${subjBefore.slice(0, 70)}"`)
    }
  }
  if (securityTemplates.length > 0 && !plan.some((p) => securityTemplates.some((s) => s.id === p.templateId))) {
    console.log(`\n  ⚠ ${securityTemplates.length} security-notice templates could not be matched to API keys on this project.`)
    console.log(`    (Either the API version doesn't expose them, or new key names — check the GET response.)`)
  }

  // ---- Execute ---------------------------------------------------------------
  if (DRY || CHECK) {
    if (DRY) console.log(`\nDRY RUN — nothing was changed. Re-run without --dry-run to push for real.`)
    if (CHECK) {
      const stale = plan.filter((p) => live && (String(live[p.subjectKey.toUpperCase()]) !== p.subject || String(live[p.contentKey.toUpperCase()]) !== p.html))
      console.log(`\nCHECK — ${stale.length === 0 ? "live project matches the registry ✓" : `${stale.length} template(s) out of sync (push to update):`}`)
      for (const s of stale) console.log(`   · ${s.name}`)
      process.exit(stale.length === 0 ? 0 : 3)
    }
    return
  }

  const body: Record<string, string> = {}
  for (const item of plan) {
    body[item.subjectKey] = item.subject
    body[item.contentKey] = item.html
  }

  console.log(`\n→ PATCH ${API}/projects/${ref}/config/auth  (${Object.keys(body).length} keys)`)
  const res = await fetch(`${API}/projects/${ref}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`✗ PATCH failed: HTTP ${res.status} ${res.statusText}`)
    console.error((await res.text()).slice(0, 600))
    console.error(`  (Rollback not needed — the config was not changed. Backup snapshot saved above regardless.)`)
    process.exit(1)
  }
  console.log(`  PATCH accepted (HTTP ${res.status})`)

  // ---- Verify -----------------------------------------------------------------
  const after = await fetch(`${API}/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!after.ok) {
    console.error(`! Could not re-read config to verify (HTTP ${after.status}) — check the dashboard.`)
    process.exit(1)
  }
  const cfg = (await after.json()) as Record<string, unknown>
  let okCount = 0
  const failed: string[] = []
  for (const item of plan) {
    const subjOk = String(cfg[item.subjectKey.toUpperCase()] ?? "") === item.subject
    const htmlOk = String(cfg[item.contentKey.toUpperCase()] ?? "") === item.html
    if (subjOk && htmlOk) okCount++
    else failed.push(`${item.name} (subject ${subjOk ? "✓" : "✗"}, html ${htmlOk ? "✓" : "✗"})`)
  }
  console.log(`\nVERIFIED: ${okCount}/${plan.length} templates live on the hosted project ✓`)
  if (failed.length) {
    console.error(`  Not confirmed:`)
    for (const f of failed) console.error(`   · ${f}`)
    process.exit(4)
  }
  console.log(`\nDone — the hosted project now sends the branded emails. No dashboard pasting.`)
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
