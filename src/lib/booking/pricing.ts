import { repo } from "@/lib/repo"

// ---------------------------------------------------------------------------
// Booking pricing — the SERVER is the only pricing authority.
//
// The client's cart is a list of {id, qty} pairs plus the pet's size tier.
// Everything money-related is recomposed here from the live service_items
// table and the salon's configured tax rate — the amounts the customer saw
// are re-verified before a booking is ever created or charged.
// ---------------------------------------------------------------------------

export type SizeTier = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE"

export type CartLineInput = { id: string; qty: number }

export type PricedLine = {
  id: string
  name: string
  category: string
  isPackage: boolean
  unitCents: number
  qty: number
  lineCents: number
}

export type PricedCart = {
  lines: PricedLine[]
  packageLine: PricedLine | null
  addonLines: PricedLine[]
  subtotalCents: number
  taxCents: number
  totalCents: number
  taxRatePercent: number
  sizeTier: SizeTier
}

// Weight (lbs) → size tier — the pounds menu from the pet step. The salon's
// packages price by these four tiers.
export function sizeTierFromWeight(weightLbs: number): SizeTier {
  if (weightLbs <= 20) return "SMALL"
  if (weightLbs <= 40) return "MEDIUM"
  if (weightLbs <= 60) return "LARGE"
  return "XLARGE"
}

export function weightRangeLabel(tier: SizeTier): string {
  switch (tier) {
    case "SMALL": return "0–20 lbs"
    case "MEDIUM": return "21–40 lbs"
    case "LARGE": return "41–60 lbs"
    case "XLARGE": return "61+ lbs"
  }
}

// Memphis combined rate (owner directive): 7.60% state + 2.65% local = 9.25%.
// The DB settings row (payment_tax_rate_percent) overrides this; the fallback
// only stands if the settings read ever fails.
const FALLBACK_TAX_PERCENT = 9.25

// The salon's configured tax rate (Settings → Business Profile). Live read,
// cached briefly so a settings change takes effect on the next booking.
let taxCache: { value: number; at: number } | null = null
export async function getTaxRatePercent(): Promise<number> {
  if (taxCache && Date.now() - taxCache.at < 60_000) return taxCache.value
  let pct = FALLBACK_TAX_PERCENT
  try {
    const s = await repo.getSettings()
    const raw = parseFloat(String(s.payment_tax_rate_percent || ""))
    if (Number.isFinite(raw) && raw >= 0 && raw < 50) pct = raw
  } catch { /* settings read is best-effort; fallback stands */ }
  taxCache = { value: pct, at: Date.now() }
  return pct
}

type ServiceItemRow = {
  id: string
  category: string | null
  name: string
  price: string | null
  smallPrice: string | null
  mediumPrice: string | null
  largePrice: string | null
  xlargePrice: string | null
  isPackage: boolean | null
  visible: boolean | null
}

// "$15 – $35" / "$115" / "115" → cents (takes the FIRST number in the string;
// range-priced add-ons book at their entry price, confirmed in person).
export function priceStringToCents(p: string | null | undefined): number | null {
  if (!p) return null
  const m = String(p).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const v = parseFloat(m[1])
  if (!Number.isFinite(v) || v <= 0) return null
  return Math.round(v * 100)
}

export function centsToDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export async function listBookableServiceItems(): Promise<ServiceItemRow[]> {
  const rows = (await repo.list("serviceItems").catch(() => [])) as ServiceItemRow[]
  return (rows || [])
    .filter((r) => r && r.id && r.name && r.visible !== false)
    .map((r) => ({ ...r, isPackage: !!r.isPackage }))
}

// The unit price for one service item at a size tier (packages tier-price,
// add-ons are flat).
export function unitCentsFor(item: ServiceItemRow, tier: SizeTier): number | null {
  if (item.isPackage) {
    switch (tier) {
      case "SMALL": return priceStringToCents(item.smallPrice) ?? priceStringToCents(item.price)
      case "MEDIUM": return priceStringToCents(item.mediumPrice) ?? priceStringToCents(item.price)
      case "LARGE": return priceStringToCents(item.largePrice) ?? priceStringToCents(item.price)
      case "XLARGE": return priceStringToCents(item.xlargePrice) ?? priceStringToCents(item.price)
    }
  }
  return priceStringToCents(item.price)
}

// Re-price a client-submitted cart from the live catalog. Returns null lines
// for ids that no longer exist / aren't priced — the caller rejects the
// checkout if a required package is missing.
export async function priceCart(
  cart: CartLineInput[],
  weightLbs: number,
): Promise<{ cart: PricedCart; unknownIds: string[] }> {
  const [items, taxRatePercent] = await Promise.all([listBookableServiceItems(), getTaxRatePercent()])
  const byId = new Map(items.map((i) => [i.id, i]))
  const sizeTier = sizeTierFromWeight(weightLbs)

  const lines: PricedLine[] = []
  const unknownIds: string[] = []

  for (const input of cart) {
    const item = byId.get(String(input.id))
    if (!item) { unknownIds.push(String(input.id)); continue }
    const unit = unitCentsFor(item, sizeTier)
    if (unit == null) continue // header rows (Haircuts, Styling) are never bookable
    const qty = Math.max(1, Math.min(10, Math.floor(input.qty || 1)))
    lines.push({
      id: item.id,
      name: item.name,
      category: item.category || "Services",
      isPackage: !!item.isPackage,
      unitCents: unit,
      qty,
      lineCents: unit * qty,
    })
  }

  // Exactly one package may be selected; add-ons are open.
  const packageLine = lines.find((l) => l.isPackage) || null
  const addonLines = lines.filter((l) => !l.isPackage)

  const subtotalCents = lines.reduce((sum, l) => sum + l.lineCents, 0)
  const taxCents = Math.round(subtotalCents * taxRatePercent) / 100
  const totalCents = subtotalCents + Math.round(taxCents)

  return {
    cart: {
      lines,
      packageLine,
      addonLines,
      subtotalCents,
      taxCents: Math.round(taxCents),
      totalCents,
      taxRatePercent,
      sizeTier,
    },
    unknownIds,
  }
}
