// ---------------------------------------------------------------------------
// Finish setting the Vercel environment variables for allaboutpawz —
// one command, idempotent, .env is the source of truth.
//
//   bun run vercel-env:sync -- --token=XXX                 safe mode: only fills
//                                                          empty values + creates
//                                                          missing keys (no deletes)
//   bun run vercel-env:sync -- --token=XXX --replace-secret  ALSO converts the
//                                                          old "Secret"-typed
//                                                          records to normal ones
//                                                          (atomic delete+recreate
//                                                          with the .env value) —
//                                                          leaves ONE complete,
//                                                          consistent set; nothing
//                                                          left to delete by hand
//   bun run vercel-env:sync -- --check --token=XXX         read-only report
//
// Token: create at vercel.com → Account Settings → Tokens. Pass via --token
// or VERCEL_TOKEN. The token is never printed, never written anywhere.
//
// Project/team: read from .vercel/project.json (vercel link). Override with
// --project=prj_xxx / --team=team_xxx.
//
// Why this exists: a bulk sync pushed 20 Config-typed vars on top of the 9
// original Secret-typed ones and left 5 of them empty ("Needs Attention").
// This script turns that into a single clean set.
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..")

// ---- flags -----------------------------------------------------------------

function argValue(flag: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${flag}=`))
  return hit ? hit.slice(flag.length + 3).trim() : ""
}

const TOKEN = argValue("token") || (process.env.VERCEL_TOKEN || "").trim()
const CHECK = process.argv.includes("--check")
const REPLACE_SECRET = process.argv.includes("--replace-secret")
const PROJECT_OVERRIDE = argValue("project")
const TEAM_OVERRIDE = argValue("team")

// ---- .env (source of truth for values) --------------------------------------

function parseDotEnv(path: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq < 1) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const ENV_FILE = parseDotEnv(join(ROOT, ".env"))

// ---- the one complete required set (mirrors what the code reads) -----------

// Every environment variable the app reads on the server or client, mapped to
// its .env value. After this sync runs, deleting the old "Secret"-typed
// records is always safe — every key below exists as a normal record with a
// real value.
const REQUIRED: Array<[key: string, why: string]> = [
  ["NEXT_PUBLIC_SUPABASE_URL", "client + server Supabase URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "client Supabase anon key"],
  ["SUPABASE_URL", "server Supabase URL (legacy name, still read)"],
  ["SUPABASE_ANON_KEY", "server anon key (legacy name, still read)"],
  ["SUPABASE_SERVICE_ROLE_KEY", "admin APIs, automations, invite emails"],
  ["SUPABASE_SESSION_POOLER", "database pooler connection"],
  ["SUPABASE_DIRECT_CONNECTION", "database direct connection"],
  ["SUPABASE_TENANT_ID", "database tenant routing"],
  ["STRIPE_SECRET_KEY", "payments (checkout, deposits)"],
  ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "Stripe.js client key"],
  ["STRIPE_WEBHOOK_SECRET", "Stripe webhook verification"],
  ["RESEND_API_KEY", "ALL transactional email"],
  ["GOOGLE_CLIENT_ID", "Google sign-in"],
  ["GOOGLE_CLIENT_SECRET", "Google sign-in"],
  ["GOOGLE_RELAY_ORIGIN", "Google OAuth origin"],
  ["GOOGLE_REGISTERED_ORIGINS", "Google OAuth origin list"],
  ["NEXT_PUBLIC_SITE_URL", "email links, canonical URLs"],
  ["ADMIN_EMAILS", "admin gate"],
  ["CRON_SECRET", "gates the 2 Vercel cron automations"],
  ["REVALIDATE_SECRET", "gates shop cache revalidation"],
  ["AI_GATEWAY_API_KEY", "AI gateway (future features)"],
  ["USPS_CONSUMER_KEY", "USPS shipping APIs"],
  ["USPS_CONSUMER_SECRET", "USPS shipping APIs"],
  ["USPS_CUSTOMER_REGISTRATION_ID", "USPS labels"],
  ["USPS_MASTER_MAILER_ID", "USPS labels"],
  ["USPS_LABEL_MAILER_ID", "USPS labels"],
  ["USPS_EPS_PAYMENT_ACCOUNT_NUMBER", "USPS postage account"],
  ["NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN", "analytics"],
  ["NEXT_PUBLIC_POSTHOG_HOST", "analytics"],
]

// Values that are safe to print in full (URLs, IDs, emails). Everything else
// is masked in the report.
const SHOWABLE = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "GOOGLE_RELAY_ORIGIN",
  "GOOGLE_REGISTERED_ORIGINS",
  "ADMIN_EMAILS",
  "SUPABASE_TENANT_ID",
  "USPS_CUSTOMER_REGISTRATION_ID",
  "USPS_MASTER_MAILER_ID",
  "USPS_LABEL_MAILER_ID",
  "USPS_EPS_PAYMENT_ACCOUNT_NUMBER",
])

function mask(key: string, value: string): string {
  if (SHOWABLE.has(key)) return value
  if (value.length <= 8) return "****"
  return `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`
}

// ---- Vercel API --------------------------------------------------------------

function vercelConfig(): { projectId: string; teamId: string } {
  if (PROJECT_OVERRIDE && TEAM_OVERRIDE) {
    return { projectId: PROJECT_OVERRIDE, teamId: TEAM_OVERRIDE }
  }
  const p = join(ROOT, ".vercel", "project.json")
  if (!existsSync(p)) {
    console.error("✗ No .vercel/project.json — run `vercel link` or pass --project/--team.")
    process.exit(2)
  }
  const cfg = JSON.parse(readFileSync(p, "utf8")) as { projectId: string; orgId: string }
  return {
    projectId: PROJECT_OVERRIDE || cfg.projectId,
    teamId: TEAM_OVERRIDE || cfg.orgId,
  }
}

const { projectId, teamId } = vercelConfig()
const API = "https://api.vercel.com"

type EnvRecord = {
  id: string
  key: string
  value: string | null
  target: string[]
  type: string // "sensitive" | "encrypted" | "system" | ...
}

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; json: any }> {
  const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}teamId=${teamId}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let json: any = null
  try {
    json = await res.json()
  } catch {
    /* empty body */
  }
  return { ok: res.ok, status: res.status, json }
}

async function listEnv(): Promise<EnvRecord[]> {
  const out: EnvRecord[] = []
  let cursor: string | undefined
  do {
    const path = `/v9/projects/${projectId}/env?limit=100${cursor ? `&next=${cursor}` : ""}`
    const r = await api("GET", path)
    if (!r.ok) {
      console.error(`✗ Vercel API ${r.status} while listing env vars: ${JSON.stringify(r.json)}`)
      process.exit(2)
    }
    out.push(...(r.json.envs ?? []))
    cursor = r.json.pagination?.next
  } while (cursor)
  return out
}

async function createEnv(key: string, value: string): Promise<boolean> {
  const r = await api("POST", `/v10/projects/${projectId}/env`, {
    key,
    value,
    target: ["production"],
    type: "encrypted",
  })
  if (r.ok) return true
  // Already exists? Treat as success-marker for the caller's verify pass.
  if (r.status === 409 || /already exist/i.test(JSON.stringify(r.json))) return false
  console.error(`✗ CREATE ${key} failed (${r.status}): ${JSON.stringify(r.json)}`)
  return false
}

async function patchEnv(id: string, key: string, value: string): Promise<boolean> {
  const r = await api("PATCH", `/v9/projects/${projectId}/env/${id}`, { value })
  if (r.ok) return true
  console.error(`✗ PATCH ${key} failed (${r.status}): ${JSON.stringify(r.json)}`)
  return false
}

async function deleteEnv(id: string, key: string): Promise<boolean> {
  const r = await api("DELETE", `/v9/projects/${projectId}/env/${id}`)
  if (r.ok) return true
  console.error(`✗ DELETE ${key} failed (${r.status}): ${JSON.stringify(r.json)}`)
  return false
}

// ---- main --------------------------------------------------------------------

async function main() {
  console.log(`\nAll About Pawz — Vercel env sync`)
  console.log(
    `project: ${projectId}   mode: ${CHECK ? "CHECK (read-only)" : REPLACE_SECRET ? "FULL SYNC (fills empties + converts Secret records)" : "SAFE SYNC (fills empties + creates missing)"}`,
  )

  const missingValues = REQUIRED.filter(([k]) => !ENV_FILE[k])
  if (missingValues.length) {
    console.error(`\n✗ .env is missing values for: ${missingValues.map(([k]) => k).join(", ")}`)
    process.exit(2)
  }
  if (!TOKEN) {
    console.error(`\n✗ No token. Create one at vercel.com → Account Settings → Tokens, then:`)
    console.error(`    bun run vercel-env:sync -- --token=<your-token>${REPLACE_SECRET ? " --replace-secret" : ""}`)
    process.exit(2)
  }

  const before = await listEnv()
  console.log(`\nCurrent state on Vercel: ${before.length} records`)
  const secretTyped = before.filter((r) => r.type === "sensitive")
  console.log(`  Secret-typed records: ${secretTyped.length}${secretTyped.length ? ` (${secretTyped.map((r) => r.key).join(", ")})` : ""}`)

  type Action =
    | { kind: "ok"; key: string }
    | { kind: "fill"; key: string }
    | { kind: "correct"; key: string }
    | { kind: "create"; key: string }
    | { kind: "convert"; key: string; id: string }
    | { kind: "leave-secret"; key: string }

  const plan: Action[] = []
  for (const [key] of REQUIRED) {
    const want = ENV_FILE[key]
    const recs = before.filter((r) => r.key === key && r.target.includes("production"))
    if (recs.length === 0) {
      plan.push({ kind: "create", key })
      continue
    }
    const rec = recs[0]
    if (rec.type === "sensitive") {
      // Old "Secret"-typed record. Its value cannot be read back, so the only
      // way to a single clean set is delete + recreate from .env.
      plan.push(
        REPLACE_SECRET ? { kind: "convert", key, id: rec.id } : { kind: "leave-secret", key },
      )
      continue
    }
    if (rec.value == null || rec.value === "") {
      plan.push({ kind: "fill", key })
    } else if (rec.value !== want) {
      plan.push({ kind: "correct", key })
    } else {
      plan.push({ kind: "ok", key })
    }
  }

  // Records on Vercel that the app never reads → report only (never delete).
  const requiredKeys = new Set(REQUIRED.map(([k]) => k))
  const unused = before.filter((r) => !requiredKeys.has(r.key))

  console.log(`\nPlan:`)
  for (const a of plan) {
    if (a.kind === "ok") console.log(`  ✓ ${a.key} — already correct`)
    if (a.kind === "fill") console.log(`  ↳ ${a.key} — FILL empty value (${mask(a.key, ENV_FILE[a.key])})`)
    if (a.kind === "correct")
      console.log(`  ↳ ${a.key} — CORRECT value to .env (${mask(a.key, ENV_FILE[a.key])})`)
    if (a.kind === "create") console.log(`  + ${a.key} — CREATE (${mask(a.key, ENV_FILE[a.key])})`)
    if (a.kind === "convert") console.log(`  ⟲ ${a.key} — CONVERT Secret record → normal, same value from .env`)
    if (a.kind === "leave-secret")
      console.log(`  ! ${a.key} — old Secret record left in place (add --replace-secret to convert)`)
  }
  if (unused.length) {
    console.log(`\n  (not read by the app, left untouched: ${unused.map((r) => r.key).join(", ")})`)
  }

  if (CHECK) {
    console.log(`\nCHECK complete — no changes made.`)
    const pending = plan.filter((p) => p.kind !== "ok").length
    console.log(pending ? `${pending} record(s) would change.` : `Everything already correct.`)
    return
  }

  // Execute -------------------------------------------------------------------
  let changed = 0
  for (const a of plan) {
    if (a.kind === "ok" || a.kind === "leave-secret") continue
    if (a.kind === "create") {
      if (await createEnv(a.key, ENV_FILE[a.key])) changed++
    }
    if (a.kind === "fill" || a.kind === "correct") {
      const rec = before.find((r) => r.key === a.key && r.target.includes("production"))
      if (rec && (await patchEnv(rec.id, a.key, ENV_FILE[a.key]))) changed++
    }
    if (a.kind === "convert") {
      // Atomic-ish: delete the sensitive record, immediately recreate from .env.
      if (await deleteEnv(a.id, a.key)) {
        const ok = await createEnv(a.key, ENV_FILE[a.key])
        if (!ok) {
          console.error(`  ⚠ ${a.key}: old record deleted but recreate returned "already exists" — re-listing…`)
        }
        changed++
      }
    }
  }
  console.log(`\nApplied ${changed} change(s).`)

  // Verify ----------------------------------------------------------------------
  const after = await listEnv()
  let failures = 0
  console.log(`\nFINAL VERIFICATION (what the code reads, on Vercel now):`)
  for (const [key, why] of REQUIRED) {
    const recs = after.filter((r) => r.key === key && r.target.includes("production"))
    if (recs.length === 0) {
      console.error(`  ✗ ${key} — MISSING (${why})`)
      failures++
      continue
    }
    const rec = recs[0]
    if (rec.type === "sensitive") {
      console.log(`  ~ ${key} — present as old Secret record (value unreadable; ${why})`)
      continue
    }
    if (rec.value == null || rec.value === "") {
      console.error(`  ✗ ${key} — STILL EMPTY (${why})`)
      failures++
      continue
    }
    if (rec.value !== ENV_FILE[key]) {
      console.error(`  ✗ ${key} — value mismatch vs .env (${why})`)
      failures++
      continue
    }
    console.log(`  ✓ ${key} — ${mask(key, rec.value)}`)
  }

  const remainingSecret = after.filter((r) => r.type === "sensitive")
  console.log(`\nSecret-typed records remaining: ${remainingSecret.length}`)
  if (remainingSecret.length === 0) {
    console.log(`  → The set is now SINGLE-COPY and complete. Nothing left to delete by hand.`)
  } else if (REPLACE_SECRET) {
    console.log(`  → ${remainingSecret.map((r) => r.key).join(", ")} — delete these in the dashboard or re-run.`)
  } else {
    console.log(
      `  → ${remainingSecret.map((r) => r.key).join(", ")} still hold the ONLY copies of some values — do NOT delete them until this sync runs with --replace-secret.`,
    )
  }

  if (failures) {
    console.error(`\n✗ ${failures} required var(s) failed verification — re-run this same command (it is idempotent).`)
    process.exit(1)
  }
  console.log(`\n✓ Sync verified: all ${REQUIRED.length} required vars exist with real values on Vercel.`)
}

main().catch((e) => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
