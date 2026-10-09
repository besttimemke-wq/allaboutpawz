// ---------------------------------------------------------------------------
// app_settings reader — the owner's key/value operations table.
//
// Rows (jsonb values) are business switches the storefront must honor:
//   • stock.low_threshold      — show the urgency strip when sellable qty ≤ N
//   • stock.show_exact_count   — "Only 3 left" vs generic "Low stock"
//   • stock.allow_backorder    — out-of-stock items can still be ordered
//   • catalog.products_per_page, pricing.* — consumed elsewhere
//
// Reads are cached (SWR + coalescing) — app_settings changes land within the
// TTL without a deploy. Every value is defensive: a missing/malformed row
// falls back to the documented default instead of throwing.
// ---------------------------------------------------------------------------

import { pgQuery } from "@/lib/pg"
import { cached } from "@/lib/cache"

const SETTINGS_TTL_MS = 5 * 60 * 1000

export type StockSettings = {
  /** Urgency threshold — display kicks in when sellable qty ≤ this. Default 5. */
  lowThreshold: number
  /** "Only 3 left" (true) vs "Low stock — order soon" (false). Default false. */
  showExactCount: boolean
  /** Out-of-stock products remain purchasable (backorder). Default false. */
  allowBackorder: boolean
}

const DEFAULT_STOCK: StockSettings = { lowThreshold: 5, showExactCount: false, allowBackorder: false }

function coerceNum(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}
function coerceBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === "boolean") return v
  if (typeof v === "string") return v.trim().toLowerCase() === "true"
  return fallback
}

/** Stock display policy from app_settings (stock.* keys), cached 5 min. */
export async function getStockSettings(): Promise<StockSettings> {
  return cached("app-settings:stock", SETTINGS_TTL_MS, async () => {
    try {
      const rows = await pgQuery<{ key: string; value: unknown }>(
        `SELECT key, value FROM app_settings WHERE key = ANY($1::text[])`,
        [["stock.low_threshold", "stock.show_exact_count", "stock.allow_backorder"]],
      )
      const byKey = new Map(rows.map((r) => [r.key, r.value]))
      return {
        lowThreshold: coerceNum(byKey.get("stock.low_threshold"), DEFAULT_STOCK.lowThreshold),
        showExactCount: coerceBool(byKey.get("stock.show_exact_count"), DEFAULT_STOCK.showExactCount),
        allowBackorder: coerceBool(byKey.get("stock.allow_backorder"), DEFAULT_STOCK.allowBackorder),
      }
    } catch {
      return DEFAULT_STOCK
    }
  })
}
