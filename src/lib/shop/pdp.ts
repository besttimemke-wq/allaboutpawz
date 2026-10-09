// ---------------------------------------------------------------------------
// pdp — the single loader behind /products/[slug].
//
//   1. LIVE feed catalog (products / product_variants / product_media via
//      getTaxPdpData) — the 10.7k feed-synced items the PLP cards link to.
//      60s in-process cache, ≤8 indexed queries, never touches the pool
//      beyond its budget.
//   2. Legacy normalized enterprise catalog (getCatalogProductBySlug) — the
//      hand-curated items. Mapped onto the same PdpData contract so ONE page
//      renders both sources with the full dense spec.
//
// The previous loader loaded the ENTIRE catalog into memory on every product
// view (listCatalogProducts) plus the whole nav tree — that is what pushed
// the Supabase session pooler past its 15-client limit (EMAXCONNSESSION) and
// made PDPs take 7-11s to render. This loader does neither.
// ---------------------------------------------------------------------------

import type { PdpData, MiniRec, PdpReview } from "@/lib/shop/taxonomy-db"
import { getTaxPdpData } from "@/lib/shop/taxonomy-db"
import { getCatalogProductBySlug } from "@/lib/enterprise/catalog"
import { repo } from "@/lib/repo"
import { cached } from "@/lib/cache"

const hasText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0

function composeLegacyQa(p: {
  name: string
  brand: string | null
  specifications: string | null
  directions: string | null
  warranty: string | null
  inStock: boolean
}): PdpData["qa"] {
  const qa: PdpData["qa"] = []
  const specs = (p.specifications ?? "").split("·").map((s) => s.trim()).filter(Boolean)
  if (specs.length > 0) {
    qa.push({ question: "What are the key details of this product?", answer: specs.slice(0, 3).join(" · ") })
  }
  if (hasText(p.directions)) {
    qa.push({ question: `How do I use the ${p.name}?`, answer: p.directions.split(/(?<=\.)\s+/).slice(0, 2).join(" ").slice(0, 320) })
  }
  if (hasText(p.warranty)) {
    qa.push({ question: "Is there a warranty?", answer: p.warranty.slice(0, 300) })
  }
  qa.push({
    question: "Can I pick this up at the Memphis shop instead of shipping?",
    answer:
      "Yes — order online and choose in-store pickup at 699 Waring Rd, Memphis, TN. We'll text you when it's ready (usually within 2 hours during store hours).",
  })
  if (!p.inStock) {
    qa.push({
      question: "When will this be back in stock?",
      answer:
        "This item is currently on backorder with our supplier. Reship customers get priority when stock arrives — sign up and we'll ship it as soon as it lands.",
    })
  }
  return qa.slice(0, 4)
}

export async function loadPdpData(slug: string): Promise<PdpData | null> {
  // The PDP route resolves the slug in BOTH generateMetadata and the page
  // component — without this wrapper the legacy fallback (full-catalog +
  // full-review-table reads) ran twice per view. Cached 60s with SWR:
  // repeat views render instantly, one background refresh keeps stock and
  // price current.
  return cached(`pdp:${slug.toLowerCase()}`, 60_000, () => loadPdpDataUncached(slug))
}

async function loadPdpDataUncached(slug: string): Promise<PdpData | null> {
  // 1 — live feed catalog (cached; the fast path).
  const feed = await getTaxPdpData(slug)
  if (feed) return feed

  // 2 — legacy normalized enterprise catalog → same contract.
  const legacy = await getCatalogProductBySlug(slug)
  if (!legacy) return null

  const [allReviews] = await Promise.all([repo.list("product_reviews")])
  const reviews: PdpReview[] = (allReviews as Record<string, unknown>[])
    .filter((r) => r.productId === legacy.id && r.visible)
    .sort((a, b) => new Date(String(b.createdAt ?? 0)).getTime() - new Date(String(a.createdAt ?? 0)).getTime())
    .slice(0, 6)
    .map((r) => ({
      id: String(r.id),
      author: String(r.author ?? "Pet parent"),
      rating: Number(r.rating) || 0,
      title: (r.title as string) ?? null,
      body: (r.body as string) ?? null,
      createdAt: (r.createdAt as string) ?? null,
      verified: r.verified !== false,
    }))
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  const alsoBought = ((legacy as unknown as { alsoBought?: MiniRec[] }).alsoBought ?? []) as MiniRec[]
  const alsoViewed = ((legacy as unknown as { alsoViewed?: MiniRec[] }).alsoViewed ?? []) as MiniRec[]

  return {
    id: String(legacy.id),
    source: "legacy",
    slug: String(legacy.slug ?? slug),
    name: legacy.name,
    brand: legacy.brand ?? null,
    brandId: legacy.brandId ?? null,
    shortDescription: legacy.shortDescription ?? null,
    description: legacy.description ?? null,
    ingredients: (legacy.ingredients as string) ?? null,
    directions: (legacy.directions as string) ?? null,
    warranty: (legacy.warranty as string) ?? null,
    specifications: (legacy.specs as string) ?? null,
    priceCents: legacy.priceCents ?? null,
    compareAtPriceCents: legacy.compareAtPriceCents ?? null,
    isOnSale: legacy.isOnSale,
    isNew: legacy.badge === "NEW",
    isBestseller: legacy.badge === "BEST SELLER",
    inStock: (legacy.stock ?? 0) > 0,
    stockQuantity: legacy.stock ?? null,
    ratingAvg: avg != null ? Math.round(avg * 10) / 10 : null,
    ratingCount: reviews.length,
    reviews,
    media: (legacy.media ?? []).map((m) => ({ url: String(m.url), alt: (m as { altText?: string | null }).altText ?? null })),
    breadcrumb: [{ name: "Shop", path: "/shop" }],
    petKind: null,
    ownVariants: [],
    siblingOptions: [],
    frequentlyBoughtTogether: alsoBought.filter((m) => m.priceCents != null).slice(0, 2),
    alsoBought: alsoBought.slice(0, 6),
    alsoViewed: alsoViewed.slice(0, 6),
    bestSellersForPet: [],
    trending: [],
    articles: [],
    qa: composeLegacyQa({
      name: legacy.name,
      brand: legacy.brand ?? null,
      specifications: (legacy.specs as string) ?? null,
      directions: (legacy.directions as string) ?? null,
      warranty: (legacy.warranty as string) ?? null,
      inStock: (legacy.stock ?? 0) > 0,
    }),
    reship: { firstOrderPct: 35, firstOrderCapCents: 2000, ongoingPct: 5 },
  }
}
