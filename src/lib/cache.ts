// ---------------------------------------------------------------------------
// cache — process-wide TTL memoization for remote reads.
//
// Every uncached read in this app pays a network round trip to the REMOTE
// Supabase project (pg via session pooler or PostgREST over HTTPS). A customer
// browsing category pages re-runs identical queries second after second —
// paying that trip per view is why the storefront felt slow. This helper
// parks each result in a globalThis map (Turbopack-safe, like the pg pool)
// for a short TTL:
//
//   • taxonomy facet/section definitions — 5 min (owner edits rarely)
//   • PLP grids per (scope + filters + page) — 60 s
//   • CMS chrome reads (settings / services / testimonials …) — 60 s
//
// Writes invalidate their resource so admin edits are visible immediately
// (repo.ts calls invalidate()). Bounded size + TTL sweep keeps memory flat.
// ---------------------------------------------------------------------------

type Entry = { value: unknown; expiresAt: number }

const globalStore = globalThis as unknown as { __aapawzTtlCache?: Map<string, Entry> }

function store(): Map<string, Entry> {
  if (!globalStore.__aapawzTtlCache) globalStore.__aapawzTtlCache = new Map()
  return globalStore.__aapawzTtlCache
}

const MAX_ENTRIES = 500

/**
 * Return the cached value for `key` when fresh, else run `fn`, park the
 * result for `ttlMs` and return it. Never caches rejections — a failed fetch
 * is retried on the next call.
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const s = store()
  const hit = s.get(key)
  const now = Date.now()
  if (hit && hit.expiresAt > now) return hit.value as T
  const value = await fn()
  // Bound the map: when full, drop the soonest-expiring entries first.
  if (s.size >= MAX_ENTRIES) {
    const entries = [...s.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)
    for (const [k] of entries.slice(0, Math.ceil(MAX_ENTRIES / 4))) s.delete(k)
  }
  s.set(key, { value, expiresAt: now + ttlMs })
  return value
}

/** Drop every cache key that starts with `prefix` (pass nothing to clear all). */
export function invalidate(prefix?: string): void {
  const s = store()
  if (!prefix) {
    s.clear()
    return
  }
  for (const k of s.keys()) {
    if (k.startsWith(prefix)) s.delete(k)
  }
}
