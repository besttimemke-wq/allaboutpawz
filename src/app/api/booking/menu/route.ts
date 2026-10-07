import { NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import {
  getTaxRatePercent, priceStringToCents, listBookableServiceItems,
  weightRangeLabel, unitCentsFor, memberUnitCentsFor, type SizeTier,
} from "@/lib/booking/pricing"
import { isBathClubMember, listBathClubPlans } from "@/lib/subscriptions"
import { redemptionRate } from "@/lib/perks"

// ============================================================================
// GET /api/booking/menu — everything the 5-step booking flow needs in ONE
// round trip: the breeds dropdown, the service menu (packages with per-size
// standard + Bath Club member prices, premium treatments, flat-priced
// add-ons), the salon's tax rate, the location card, and the visitor's
// membership/points context.
//
// The client never guesses a price: it receives per-tier cents from here and
// the server re-verifies every number again at checkout. Member prices come
// from the tenant catalog (service_items member* columns) — never hardcoded.
// ============================================================================

function tierPrices(item: any) {
  return {
    SMALL: priceStringToCents(item.smallPrice) ?? priceStringToCents(item.price),
    MEDIUM: priceStringToCents(item.mediumPrice) ?? priceStringToCents(item.price),
    LARGE: priceStringToCents(item.largePrice) ?? priceStringToCents(item.price),
    XLARGE: priceStringToCents(item.xlargePrice) ?? priceStringToCents(item.price),
  }
}

function memberTierPrices(item: any) {
  return {
    SMALL: priceStringToCents(item.memberSmallPrice) ?? priceStringToCents(item.memberPrice),
    MEDIUM: priceStringToCents(item.memberMediumPrice) ?? priceStringToCents(item.memberPrice),
    LARGE: priceStringToCents(item.memberLargePrice) ?? priceStringToCents(item.memberPrice),
    XLARGE: priceStringToCents(item.memberXlargePrice) ?? priceStringToCents(item.memberPrice),
  }
}

export async function GET() {
  try {
    const [breedRows, items, taxRatePercent, settings, session, plans, perksRate] = await Promise.all([
      repo.list("dog_breeds").catch(() => []),
      listBookableServiceItems(),
      getTaxRatePercent(),
      repo.getSettings().catch(() => ({} as Record<string, string>)),
      sessionForSiteFlow().catch(() => ({ user: null }) as any),
      listBathClubPlans().catch(() => []),
      redemptionRate().catch(() => ({ pointsPerDollar: 100, pointsPerCent: 1 })),
    ])

    const email = session?.user?.email ? String(session.user.email).toLowerCase() : ""
    const isMember = email ? await isBathClubMember(email).catch(() => false) : false

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
      .filter((i) => i.isPackage && !i.isTreatment)
      .map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category || "Grooming",
        prices: tierPrices(i),
        memberPrices: memberTierPrices(i),
      }))
      .sort((a, b) => (a.prices.MEDIUM || 0) - (b.prices.MEDIUM || 0))

    // Premium Treatments — optional upgrade, max ONE, size-tiered, XL =
    // custom quote (xlargePrice null in the catalog).
    const treatments = unique
      .filter((i) => !!i.isTreatment)
      .map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category || "Premium Treatments",
        prices: tierPrices(i),
        memberPrices: memberTierPrices(i),
        note: i.treatmentNote || null,
      }))

    const addons = unique
      .filter((i) => !i.isPackage && !i.isTreatment && priceStringToCents(i.price) != null)
      .map((i) => ({
        id: i.id,
        name: i.name,
        category: i.category || "Add-On Services",
        priceCents: priceStringToCents(i.price)!,
        priceDisplay: String(i.price || ""),
        memberPriceCents: priceStringToCents(i.memberPrice),
      }))

    const salon = {
      name: settings.brandName || "All About Pawz",
      // Owner-confirmed current line — matches design.ts BRAND.phone.
      address: settings.addressLine1 || "Memphis",
      cityState: settings.addressLine2 || "Memphis, TN",
      phone: settings.phone || "901-722-1114",
    }

    // Size tiers — the pounds menu the pet step uses.
    const tiers: { tier: SizeTier; label: string; range: string }[] = (
      ["SMALL", "MEDIUM", "LARGE", "XLARGE"] as SizeTier[]
    ).map((t) => ({ tier: t, label: t[0] + t.slice(1).toLowerCase(), range: weightRangeLabel(t) }))

    // The Bath Club ladder for the in-flow member upsell — catalog-driven.
    const bathClub = plans.map((p) => ({
      id: p.id,
      sizeTier: p.sizeTier,
      sizeLabel: p.sizeLabel,
      weightRange: p.weightRange,
      monthlyPriceCents: p.monthlyPriceCents,
    }))

    const res = NextResponse.json({
      breeds,
      packages,
      treatments,
      addons,
      tiers,
      taxRatePercent,
      salon,
      depositCents: 2500,
      isMember,
      bathClub,
      perks: { pointsPerDollar: perksRate.pointsPerDollar },
    })
    // Reference data, but membership-aware — keep it private to the visitor.
    res.headers.set("Cache-Control", "private, max-age=30")
    return res
  } catch (err: any) {
    console.error("[GET /api/booking/menu]", err)
    return NextResponse.json({ error: err.message || "Failed to load menu" }, { status: 500 })
  }
}
