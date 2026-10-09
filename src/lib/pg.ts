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

// ---------------------------------------------------------------------------
// SERVERLESS CONNECTION BUDGET (root-cause fix for EMAXCONNSESSION).
// The SESSION pooler (:5432) gives every client a DEDICATED server session
// and caps concurrent clients at pool_size: 15 per project. Production is
// serverless (Vercel): each warm lambda instance parks its pool connections
// with keepAlive + a 5-min idle timeout, so a handful of instances
// permanently consume all 15 slots — the project answers every new dial with
// (EMAXCONNSESSION), production pages 500 ("Application error: a server-side
// exception"), and local dev + scripts starve.
// The TRANSACTION pooler (:6543 — same pooler host, same credentials)
// multiplexes each query over a shared server pool: clients do not own
// sessions, so many concurrent workers coexist under the same server budget.
// This app's pg usage is plain single-statement reads/writes (no SET, no
// LISTEN, no advisory locks, no temp tables, no named prepared statements),
// which is exactly the surface transaction mode supports.
// SUPABASE_TX_POOLER overrides; session URIs are auto-upgraded by port swap.
// ---------------------------------------------------------------------------
const rawConnectionString =
  process.env.SUPABASE_TX_POOLER ||
  process.env.SUPABASE_SESSION_POOLER ||
  process.env.SUPABASE_DIRECT_CONNECTION ||
  "";

function toTransactionPooler(cs: string): string {
  // Only Supavisor pooler hosts have a transaction endpoint; a DIRECT
  // (db.<ref>.supabase.co) connection must be passed through untouched.
  if (!cs.includes("pooler.supabase.com")) return cs;
  return cs.replace(/:5432(?=\/)/, ":6543");
}

const connectionString = toTransactionPooler(rawConnectionString);

/** Resolved pooler URI for consumers that need a one-off client (notifications). */
export const pgConnectionString = connectionString;

if (!connectionString && process.env.NODE_ENV !== "production") {
  console.error(
    "[pg] Missing SUPABASE_SESSION_POOLER env var — DB queries will return empty results.",
  );
}
// ---------------------------------------------------------------------------
// POOL SHAPE — still a process-wide singleton on globalThis (Turbopack-safe)
// with modest headroom. On the transaction pooler, client connections are
// cheap (they don't own server sessions), so POOL_MAX sizes local concurrency
// rather than a shared project budget.
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
    // KEEP-ALIVE BUDGET — the pool used to close idle connections after 30s,
    // so every request after a lull paid a full TLS handshake to the remote
    // Supabase region (~400-800ms) before the first byte of the query. That
    // handshake was the dominant "site is slow to render" cost on warm-browse
    // paths. Connections now stay parked for 5 min with TCP keepalives, so a
    // customer clicking through categories reuses a HOT socket instead of
    // re-handshaking per request.
    idleTimeoutMillis: 300_000,
    keepAlive: true,
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
  // NOTE: pool.connect() is INSIDE the try — when the remote Supavisor is at
  // its pool_size ceiling (15 slots are shared with the production deploy),
  // connect() rejects. An uncaught rejection here was surfacing as
  // "unhandledRejection" + "Application error: a server-side exception"
  // on every SSR page in the request burst; the never-throws contract
  // requires the connect attempt to be guarded too.
  try {
    const client = await getPool().connect();
    try {
      const { rows } = await client.query(text, params);
      return rows as T[];
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[pg] query failed:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

// Run a parameterized write (INSERT/UPDATE/DELETE); returns rows affected; never throws.
export async function pgExec(
  text: string,
  params: unknown[] = [],
): Promise<number> {
  if (!connectionString) return 0;
  // Same guard as pgQuery: connect() failures must not escape as rejections.
  try {
    const client = await getPool().connect();
    try {
      const { rowCount } = await client.query(text, params);
      return rowCount ?? 0;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[pg] exec failed:", e instanceof Error ? e.message : String(e));
    return 0;
  }
}
