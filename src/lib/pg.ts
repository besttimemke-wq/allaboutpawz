// Server-side raw pg client for querying the live Supabase database.
// PostgREST (supabase-js) only exposes the public schema by default; the
// enterprise schema lives in multiple schemas (lms, crm, commerce, etc.).
// Raw pg bypasses PostgREST and can query any schema.
//
// POOL-BASED (was single-client). The previous implementation held ONE long-
// lived Client and shared it across every request. Under concurrent admin
// action bursts (e.g. /api/admin/*/actions), queries serialized on the
// single socket and timed out at 15s. Using pg.Pool gives us up to 10
// concurrent connections, auto-checked-out per query and released on
// completion. Each pgQuery/pgExec call acquires its own connection, so
// 12 parallel action handlers no longer block one another.

import { Pool, PoolClient } from "pg";

const connectionString = process.env.SUPABASE_SESSION_POOLER ?? "";

if (!connectionString && process.env.NODE_ENV !== "production") {
  console.error(
    "[pg] Missing SUPABASE_SESSION_POOLER env var — DB queries will return empty results.",
  );
}

// ---------------------------------------------------------------------------
// SESSION-POOLER BUDGET — Supabase's session pooler allows pool_size: 15
// clients PER PROJECT. The previous per-module pool could be instantiated
// once per Turbopack chunk graph (dev) and each opened up to 10 clients —
// two module instances + a script = EMAXCONNSESSION, which 500s every SSR
// page touching pg. The pool MUST be a process-wide singleton on globalThis
// and its `max` must leave headroom under 15 (this process is not the only
// consumer of the project's pooler budget).
// ---------------------------------------------------------------------------
const POOL_MAX = 5;

// globalThis survives Turbopack chunk duplication; a plain module-level
// `let` does not (each chunk gets its own copy of the module state).
const globalStore = globalThis as unknown as { __aapawzPgPool?: Pool };

function getPool(): Pool {
  if (globalStore.__aapawzPgPool) return globalStore.__aapawzPgPool;
  const pool = new Pool({
    connectionString,
    max: POOL_MAX,
    idleTimeoutMillis: 30_000,      // close idle conns after 30s
    connectionTimeoutMillis: 5_000, // wait up to 5s for a free conn
    // Statement-level timeout — a single bad query can't lock the pool.
    // Default 15s; if a query exceeds this, the pool reclaims the conn.
    query_timeout: 15_000,
    // Supabase pooler requires SSL.
    ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
  // Pool errors can surface as 'idle client timeout' / 'connection ended'
  // events — log them so we see flakiness in dev.
  pool.on("error", (err) => {
    console.error("[pg] pool error:", err.message);
  });
  globalStore.__aapawzPgPool = pool;
  return pool;
}

// Backwards-compat: returns a checked-out client for callers that still
// want a Client reference (e.g. withPg-style transaction blocks). Caller
// is responsible for releasing.
export async function getPg(): Promise<PoolClient> {
  return getPool().connect();
}

// Run a parameterized query and return rows; never throws (logs + returns []).
export async function pgQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (!connectionString) return [];
  const client = await getPool().connect();
  try {
    const { rows } = await client.query(text, params);
    return rows as T[];
  } catch (e) {
    console.error("[pg] query failed:", e instanceof Error ? e.message : String(e));
    return [];
  } finally {
    client.release();
  }
}

// Run a parameterized write (INSERT/UPDATE/DELETE); returns rows affected; never throws.
export async function pgExec(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  if (!connectionString) return 0;
  const client = await getPool().connect();
  try {
    const { rowCount } = await client.query(text, params);
    return rowCount ?? 0;
  } catch (e) {
    console.error("[pg] exec failed:", e instanceof Error ? e.message : String(e));
    return 0;
  } finally {
    client.release();
  }
}
