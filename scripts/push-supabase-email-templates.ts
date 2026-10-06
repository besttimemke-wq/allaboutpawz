// ---------------------------------------------------------------------------
// Push the branded email templates to the HOSTED Supabase project via the
// Supabase Management API — no dashboard copy-paste, ever.
//
//   bun run email-templates:push            push (live)
//   bun run email-templates:push --dry-run  show the payload (no token needed)
//   bun run email-templates:check           verify only (drift detector)
//
// Engine: src/lib/email/supabase-push.ts (shared with the admin API + CI).
//
// Required env (for live push / --check):
//   SUPABASE_ACCESS_TOKEN   account-level access token (sbp_…) — generate at
//                           https://supabase.com/dashboard/account/tokens
//   SUPABASE_URL            e.g. https://qdgfkxbkqcnuhckhvhzd.supabase.co
//
// Before every live push the current config is saved as a rollback snapshot:
//   /tmp/supabase-auth-config-backup-<timestamp>.json
// ---------------------------------------------------------------------------

// The hosted project must always receive production URLs — force it before
// the registry import chain reads the environment, whatever machine this
// runs on (laptop, CI, sandbox preview).
process.env.NEXT_PUBLIC_SITE_URL = "https://aapawz.com"

import { writeFileSync } from "node:fs"

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

async function main() {
  const { buildPlan, executeSupabaseTemplatePush, getSupabaseTemplateStatuses } = await import(
    "../src/lib/email/supabase-push"
  )

  const ref = projectRef()
  const token = env("SUPABASE_ACCESS_TOKEN")

  console.log(`\nAll About Pawz — Supabase email template push`)
  console.log(`project: ${ref}   mode: ${DRY ? "DRY RUN (no changes)" : CHECK ? "CHECK (verify only)" : "LIVE PUSH"}`)

  if (DRY && !token) {
    const plan = buildPlan(null)
    console.log(`\nTemplates to push: ${plan.length}`)
    for (const item of plan) {
      console.log(`    ${item.name.padEnd(34)} subject "${item.subject}"`)
      console.log(`      ${item.subjectKey} / ${item.contentKey}  (${item.html.length.toLocaleString()} bytes html)`)
    }
    console.log(`\nDRY RUN — nothing was changed. Re-run without --dry-run to push for real.`)
    return
  }

  if (!token) {
    console.error(`✗ SUPABASE_ACCESS_TOKEN is not set — required for live push / --check.`)
    console.error(`  Generate a fresh account access token: https://supabase.com/dashboard/account/tokens`)
    process.exit(2)
  }

  if (CHECK) {
    const status = await getSupabaseTemplateStatuses()
    if (!status.ok) {
      if (status.failure.kind === "token") {
        console.error(`✗ 401 Unauthorized — SUPABASE_ACCESS_TOKEN is missing, revoked, or expired.`)
        console.error(`  Generate a fresh token: https://supabase.com/dashboard/account/tokens`)
      } else {
        console.error(`✗ Could not read the live config:`, JSON.stringify(status.failure))
      }
      process.exit(1)
    }
    const stale = status.statuses.filter((s) => !s.inSync)
    console.log(`\nCHECK — ${stale.length === 0 ? "live project matches the registry ✓" : `${stale.length} template(s) out of sync (push to update):`}`)
    for (const s of status.statuses) {
      console.log(`  ${s.inSync ? "=" : "≠"} ${s.name.padEnd(34)} live subject: ${s.liveSubject ?? "(unset)"}`)
    }
    process.exit(stale.length === 0 ? 0 : 3)
  }

  // Live push — snapshot the current config first (rollback).
  const API = "https://api.supabase.com/v1"
  const liveRes = await fetch(`${API}/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!liveRes.ok) {
    if (liveRes.status === 401) {
      console.error(`✗ 401 Unauthorized — SUPABASE_ACCESS_TOKEN is missing, revoked, or expired.`)
      console.error(`  Generate a fresh token: https://supabase.com/dashboard/account/tokens`)
    } else {
      console.error(`✗ GET config failed: HTTP ${liveRes.status} ${(await liveRes.text()).slice(0, 300)}`)
    }
    process.exit(1)
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupPath = `/tmp/supabase-auth-config-backup-${stamp}.json`
  writeFileSync(backupPath, JSON.stringify(await liveRes.json(), null, 2), "utf8")
  console.log(`  rollback snapshot: ${backupPath}`)

  const result = await executeSupabaseTemplatePush()
  if (!result.ok) {
    const f = result.failure!
    if (f.kind === "token") {
      console.error(`✗ 401 Unauthorized — the token was rejected. Generate a fresh one: https://supabase.com/dashboard/account/tokens`)
    } else {
      console.error(`✗ Push failed:`, JSON.stringify(f).slice(0, 500))
    }
    process.exit(1)
  }

  console.log(`\nTemplates to push: ${result.plan.length}`)
  for (const item of result.plan) {
    console.log(`  ✓ ${item.name.padEnd(34)} subject "${item.subject}"`)
    console.log(`      ${item.subjectKey} / ${item.contentKey}  (${item.html.length.toLocaleString()} bytes html)`)
  }
  console.log(`\nVERIFIED: ${result.verified}/${result.plan.length} templates live on the hosted project ✓`)
  console.log(`\nDone — the hosted project now sends the branded emails. No dashboard pasting.`)
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
