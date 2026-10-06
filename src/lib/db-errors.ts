// ---------------------------------------------------------------------------
// db-errors.ts — customer-facing database error policy.
//
// WHY THIS EXISTS (production incident, owner-reported):
//   A salon customer (the owner herself) saw this on the live booking wizard:
//     Supabase 400: {"code":"42804","message":"column \"acct_customer_id\" is
//     of type uuid but expression is of type text"}
//   Raw Postgres/PostgREST payloads must NEVER reach a visitor. A customer
//   cannot act on a Postgres error code — and it looks unprofessional.
//
// TWO layers of defense:
//   1. FRIENDLY MAPPING — every customer-facing write API returns plain,
//      actionable language. The raw error is logged server-side with a short
//      reference code so the salon can find the moment in the logs.
//   2. SELF-HEAL GUARD — the exact 42804/acct_customer_id signature means a
//      known-broken identity-sync trigger re-appeared on a booking table
//      (installed by a dashboard schema re-run; previously dropped in the
//      2026-10-05 hotfix and migration 0014). The guard drops ONLY those two
//      named triggers (zero application readers — pure liability) and retries
//      the write ONCE. A regression self-repairs on the very first booking
//      instead of turning customers away.
// ---------------------------------------------------------------------------

import { withPg } from "@/lib/crm/enterprise"
import { sanitizeApiErrorText } from "@/lib/api-error-text"

export { sanitizeApiErrorText }

// The known-broken objects, by exact name. Never anything else.
const KNOWN_BROKEN = [
  { table: "public.customers", trigger: "trigger_sync_customer_identities" },
  { table: "public.crm_customers", trigger: "trigger_crm_sync" },
] as const
const KNOWN_BROKEN_FUNCTIONS = [
  "public.handle_sync_customer_identities",
  "public.handle_crm_to_auth_sync",
] as const

// Match the repo layer's error text: `Supabase 400: {"code":"42804",...}`
const SUPABASE_ERR = /^Supabase (\d{3}):/
const PG_CODE = /"code"\s*:\s*"([0-9A-Z]{5})"/

export function extractDbStatusCode(err: unknown): number | null {
  const msg = String((err as any)?.message || err || "")
  const m = msg.match(SUPABASE_ERR)
  return m ? parseInt(m[1], 10) : null
}

export function extractDbCode(err: unknown): string | null {
  const msg = String((err as any)?.message || err || "")
  const m = msg.match(PG_CODE)
  return m ? m[1] : null
}

// The exact production signature: 42804 (datatype mismatch) mentioning the
// identity-links column. This is ONLY produced by the broken triggers.
export function isBrokenIdentityTrigger(err: unknown): boolean {
  const msg = String((err as any)?.message || err || "")
  return extractDbCode(err) === "42804" && /acct_customer_id|platform_customer_identity_links/.test(msg)
}

// Drop the known-broken triggers + their functions (idempotent, IF EXISTS).
// Returns true when at least one trigger actually existed (i.e. we healed
// something). Returns false when nothing to heal OR no direct-DB credentials
// are configured (Vercel without SUPABASE_SESSION_POOLER) — callers then
// fall back to the friendly error only.
export async function dropKnownBrokenTriggers(): Promise<boolean> {
  return withPg(async (client) => {
    const pre = await client.query<{ n: number }>(`
      SELECT count(*)::int AS n
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE NOT t.tgisinternal AND ns.nspname = 'public'
        AND (
          (c.relname = 'customers'   AND t.tgname = 'trigger_sync_customer_identities')
          OR (c.relname = 'crm_customers' AND t.tgname = 'trigger_crm_sync')
        )`)
    const existed = (pre.rows[0]?.n ?? 0) > 0
    for (const { table, trigger } of KNOWN_BROKEN) {
      await client.query(`DROP TRIGGER IF EXISTS ${trigger} ON ${table}`)
    }
    for (const fn of KNOWN_BROKEN_FUNCTIONS) {
      await client.query(`DROP FUNCTION IF EXISTS ${fn}()`)
    }
    return existed
  }).then((v) => v === true).catch((e) => {
    console.error("[self-heal] trigger drop failed:", (e as any)?.message || e)
    return false
  })
}

// Run a booking write with the self-heal: on the known-broken signature,
// drop the rogue triggers and retry ONCE. Anything else propagates.
export async function withTriggerSelfHeal<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op()
  } catch (err) {
    if (!isBrokenIdentityTrigger(err)) throw err
    const healed = await dropKnownBrokenTriggers()
    console.error(
      `[self-heal] broken identity trigger hit a booking write; ${healed ? "trigger found and dropped — retrying" : "trigger not found by name — retrying anyway"}; raw=${String((err as any)?.message || err).slice(0, 300)}`,
    )
    return await op() // single retry; a second failure surfaces to the mapper
  }
}

// ---------------------------------------------------------------------------
// Friendly mapping — the ONLY text a visitor ever sees for a save failure.
// ---------------------------------------------------------------------------

function shortRef(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase()
}

export type FriendlyDbError = { error: string; ref: string; raw: string }

// Map ANY thrown error to visitor-safe copy. The raw message is returned
// alongside for server logs — never send `raw` to the client.
export function friendlyDbError(err: unknown, what: string): FriendlyDbError {
  const raw = String((err as any)?.message || err || "unknown error")
  const status = extractDbStatusCode(err)
  const code = extractDbCode(err)
  const ref = shortRef()

  let message: string
  if (status === 503 || /fetch failed|network|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(raw)) {
    message =
      `We couldn't reach the booking system just now — please check your connection and try again. ` +
      `Your ${what} hasn't been sent yet.`
  } else if (status && status >= 500) {
    message =
      `The booking system is briefly unavailable — please tap Continue again in a moment. ` +
      `Your ${what} hasn't been sent yet.`
  } else {
    message =
      `We hit a snag saving your ${what}. Please try again — if it keeps happening, call the salon ` +
      `and we'll get you booked right away.`
  }

  console.error(`[booking save failed] ref=${ref} code=${code || "-"} status=${status || "-"} raw=${raw.slice(0, 500)}`)
  return { error: `${message} (ref: ${ref})`, ref, raw }
}
