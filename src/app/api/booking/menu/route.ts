import { NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { getTaxRatePercent, priceStringToCents, listBookableServiceItems, weightRangeLabel, type SizeTier } from "@/lib/booking/pricing"

// ============================================================================
// GET /api/booking/menu — everything the 5-step booking flow needs in ONE
// round trip: the breeds dropdown, the service menu (packages with per-size
// prices + flat-priced add-ons), the salon's tax rate, and the location card.
// The client never guesses a price: it receives per-tier cents from here and
// the server re-verifies every number again at checkout.
// ============================================================================

function tierPrices(item: any) {
  // Keys match the SizeTier union (SMALL/MEDIUM/LARGE/XLARGE) exactly —
  // the client indexes prices by the tier the pet step selected.
  return {
    SMALL: priceStringToCents(item.smallPrice) ?? priceStringToCents(item.price),
    MEDIUM: priceStringToCents(item.mediumPrice) ?? priceStringToCents(item.price),
    LARGE: priceStringToCents(item.largePrice) ?? priceStringToCents(item.price),
    XLARGE: priceStringToCents(item.xlargePrice) ?? priceStringToCents(item.price),
  }
}

export async function GET() {
  try {
    const [breedRows, items, taxRatePercent, settings] = await Promise.all([
      repo.list("dog_breeds").catch(() => []),
      listBookableServiceItems(),
      getTaxRatePercent(),
      repo.getSettings().catch(() => ({} as Record<string, string>)),
    ])

    const breeds = (breedRows as any[])
      .filter((b) => b && b.name)
      .map((b) => ({ id: b.id, name: b.name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))

    // Dedupe by name — the catalog lists some services under two categories
    // (e.g. Bath & Brush in both GROOMING and BATH & SPA); the menu shows
    // each service once. First occurrence wins.
    const seen = new Set<string>()
    const unique = items.filter((i) => {
      const key = String(i.name).trim().toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const packages = unique
      .filter((i) => i.isPackage)
      .map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category || "Grooming",
        prices: tierPrices(i),
      }))
      .sort((a, b) => (a.prices.MEDIUM || 0) - (b.prices.MEDIUM || 0))

    const addons = unique
      .filter((i) => !i.isPackage && priceStringToCents(i.price) != null)
      .map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category || "Add-On Services",
        priceCents: priceStringToCents(i.price)!,
        priceDisplay: String(i.price || ""),
      }))

    const salon = {
      name: settings.brandName || "All About Pawz",
      address: settings.addressLine1 || "699 Waring Rd",
      cityState: settings.addressLine2 || "Memphis, TN 38122",
      phone: settings.phone || "(901) 722-1114",
    }

    // Size tiers — the pounds menu the pet step uses.
    const tiers: { tier: SizeTier; label: string; range: string }[] = (
      ["SMALL", "MEDIUM", "LARGE", "XLARGE"] as SizeTier[]
    ).map((t) => ({ tier: t, label: t[0] + t.slice(1).toLowerCase(), range: weightRangeLabel(t) }))

    const res = NextResponse.json({
      breeds,
      packages,
      addons,
      tiers,
      taxRatePercent,
      salon,
      depositCents: 2500,
    })
    // Reference data — safe to cache briefly in the browser.
    res.headers.set("Cache-Control", "public, max-age=60")
    return res
  } catch (err: any) {
    console.error("[GET /api/booking/menu]", err)
    return NextResponse.json({ error: err.message || "Failed to load menu" }, { status: 500 })
  }
}
