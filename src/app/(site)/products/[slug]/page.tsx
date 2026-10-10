import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import {
  ArrowRight,
  Bone,
  Dog,
  Factory,
  HeartPulse,
  Layers,
  Palette,
  PawPrint,
  Plus,
  Ruler,
  Scale,
  ShieldCheck,
  Star,
  Tag,
  type LucideIcon,
} from "lucide-react"
import { loadPdpData } from "@/lib/shop/pdp"
import type { MiniRec, PdpData } from "@/lib/shop/taxonomy-db"
import { cleanText } from "@/lib/shop/clean-text"
import { getStockSettings } from "@/lib/app-settings"
import { GUIDES_DIRECTORY } from "@/lib/seopages/taxonomy-data"
import {
  ProductBuyBox,
  ProductGallery,
  ReviewForm,
  type BuyBoxProduct,
} from "@/components/site/islands/product-detail"
import { ProductCard } from "@/components/site/shop/product-card"
import { SITE_URL } from "@/lib/site-url"

// ---------------------------------------------------------------------------
// Product detail — /products/[slug]
//
// Dense national-chain-style PDP (Chewy/Petco pattern), one page, per the
// owner's section list:
//   TOP   breadcrumb · gallery | center info + variant pickers | buy column
//   BELOW at-a-glance · frequently-bought-together · Q&A · reviews ·
//         attributes · ingredients · directions · warranty · the details ·
//         3 recommendation rails · associated articles
//
// Data: loadPdpData() ONLY (feed catalog first, legacy fallback) — cached 60s
// and pool-budgeted. Never imports listCatalogProducts / getNavTree (those
// exhausted the Supabase session pooler once already).
//
// Palette: explicit navy #002B5C / gold #F2C500 on white/neutral. The oklch
// cream/gold-deep utility tokens are BANNED here (they render brown; owner
// rejected brown on product pages).
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = await loadPdpData(slug)
  if (!product) return { title: "Product — All About Pawz Shop" }
  return {
    title: `${product.name} — All About Pawz Shop`,
    description: cleanText(product.shortDescription) || cleanText(product.description?.slice(0, 160)) || product.name,
    alternates: { canonical: `${SITE_URL}/products/${slug}` },
  }
}

// ------------------------------ helpers ------------------------------------

const fmt = (cents: number): string =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })

const hasText = (v: string | null | undefined): v is string =>
  typeof v === "string" && v.trim().length > 0

function fmtDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

/** Split a "·"-separated spec string into attribute/value rows. */
function specRows(specs: string): { attr: string; value: string }[] {
  return specs
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((row) => {
      const idx = row.indexOf(":")
      if (idx === -1) return { attr: "Detail", value: row }
      const attr = row.slice(0, idx).trim()
      const value = row.slice(idx + 1).trim()
      return { attr: attr || "Detail", value: value || row }
    })
}

/** Parse "Free of: a, b, c" out of an ingredient string. */
function parseFreeOf(ingredients: string): { main: string; freeOf: string[] | null } {
  const idx = ingredients.indexOf("Free of:")
  if (idx === -1) return { main: ingredients, freeOf: null }
  const main = ingredients.slice(0, idx).trim()
  const list = ingredients
    .slice(idx + "Free of:".length)
    .split(/[.;]/)[0]
    .split(",")
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
  return { main, freeOf: list.length ? list : null }
}

// ---- "At a glance" — pick 3-5 spec rows that read as quick facts ----------

const GLANCE_RULES: { re: RegExp; Icon: LucideIcon }[] = [
  { re: /life\s*stage/i, Icon: Dog },
  { re: /breed\s*size/i, Icon: Ruler },
  { re: /veterinarian|\bvet\b/i, Icon: ShieldCheck },
  { re: /flavor/i, Icon: Bone },
  { re: /health\s*feature|\bhealth\b/i, Icon: HeartPulse },
  { re: /made\s*in|country\s*of\s*origin/i, Icon: Factory },
  { re: /material/i, Icon: Layers },
  { re: /weight|capacity/i, Icon: Scale },
  { re: /color|colour/i, Icon: Palette },
]

function glanceChips(specs: string | null): { label: string; Icon: LucideIcon }[] {
  if (!hasText(specs)) return []
  const rows = specs.split("·").map((s) => s.trim()).filter(Boolean)
  const chips: { label: string; Icon: LucideIcon }[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    if (chips.length >= 4) break
    const rule = GLANCE_RULES.find((r) => r.re.test(row))
    if (rule && !seen.has(row.toLowerCase())) {
      seen.add(row.toLowerCase())
      chips.push({ label: row.length > 42 ? `${row.slice(0, 40).trimEnd()}…` : row, Icon: rule.Icon })
    }
  }
  // Keyword misses but specs exist → fall back to the first rows.
  if (chips.length === 0) {
    for (const row of rows.slice(0, 4)) {
      chips.push({ label: row.length > 42 ? `${row.slice(0, 40).trimEnd()}…` : row, Icon: Tag })
    }
  }
  return chips.slice(0, 4)
}

// ---- Variant-picker heading heuristic -------------------------------------

const COLOR_WORDS = new Set([
  "black", "white", "blue", "red", "green", "pink", "purple", "orange", "yellow",
  "brown", "gray", "grey", "beige", "tan", "navy", "teal", "charcoal", "silver",
  "gold", "cream", "turquoise", "lavender", "burgundy", "mint", "coral", "multi",
])

const SIZE_WORD_RE =
  /\b\d+(\.\d+)?\s?(oz|ounce|lb|lbs|pound|pounds|kg|g|ml|l)\b|\b(count|pack|packs|small|medium|large|x-small|extra-small|xs|sm|md|lg|xl|xxl|2xl|3xl|giant|jumbo|mini|petite|tall|short)\b/i

/**
 * "Color" when every name carries a color word and stripping them leaves the
 * same string; "Size" when every name carries a size/count word; else "Option".
 */
function optionHeading(names: string[]): string {
  if (names.length < 2) return "Option"
  const wordLists = names.map((n) =>
    n.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean),
  )
  const allHaveColor = wordLists.every((ws) => ws.some((w) => COLOR_WORDS.has(w)))
  if (allHaveColor) {
    const stripped = new Set(
      wordLists.map((ws) => ws.filter((w) => !COLOR_WORDS.has(w)).join(" ")),
    )
    if (stripped.size === 1) return "Color"
  }
  if (names.every((n) => SIZE_WORD_RE.test(n))) return "Size"
  return "Option"
}

// ---- Associated articles (guides) ------------------------------------------
// Sourced from the owner's seopages Education Center (his Grooming pillar,
// split dog/cat by subcategory). hrefs use the owner's own canonical paths.

type ArticlePick = { slug: string; title: string; animal: "dog" | "cat"; href: string }

const GROOMING_SUBCATS =
  GUIDES_DIRECTORY.find((pillar) => pillar.pillar === "Grooming")?.subcategories ?? []
const DOG_GROOMING_ITEMS = (GROOMING_SUBCATS.find((s) => s.name.startsWith("Dog Breed"))?.items ?? []).map(
  (i): ArticlePick => ({ slug: i.slug, title: i.name, animal: "dog", href: i.path }),
)
const CAT_GROOMING_ITEMS = (GROOMING_SUBCATS.find((s) => s.name.startsWith("Cat Breed"))?.items ?? []).map(
  (i): ArticlePick => ({ slug: i.slug, title: i.name, animal: "cat", href: i.path }),
)
const ALL_ARTICLE_PICKS = [...DOG_GROOMING_ITEMS, ...CAT_GROOMING_ITEMS]

function articlePicks(petKind: string | null): ArticlePick[] {
  const kind = petKind?.toLowerCase() ?? ""
  const want = kind.startsWith("dog") ? "dog" : kind.startsWith("cat") ? "cat" : null
  const pool = want ? ALL_ARTICLE_PICKS.filter((g) => g.animal === want) : ALL_ARTICLE_PICKS
  return pool.slice(0, 3)
}

// ---- Recommendation card mapping (global ProductCard contract) -------------

function recToCard(mp: MiniRec) {
  return {
    id: mp.id,
    name: mp.name,
    slug: mp.slug,
    price: mp.priceCents != null ? fmt(mp.priceCents) : "",
    image: mp.image,
    category: mp.brand,
    shortDescription: mp.shortDescription,
    isOnSale: mp.isOnSale,
    isNew: mp.isNew,
    isBestseller: mp.isBestseller,
    priceCents: mp.priceCents,
  }
}

// ------------------------------ small pieces --------------------------------

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)))
  return (
    <span
      className="inline-flex items-center gap-[2px]"
      role="img"
      aria-label={`Rated ${value.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          style={{ width: size, height: size }}
          strokeWidth={1.5}
          className={i <= rounded ? "fill-[#F2C500] text-[#F2C500]" : "fill-none text-neutral-300"}
        />
      ))}
    </span>
  )
}

function PdpSection({
  id,
  eyebrow,
  title,
  children,
  tone = "white",
}: {
  id?: string
  eyebrow: string
  title: string
  children: React.ReactNode
  tone?: "white" | "muted"
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 border-t border-neutral-200 px-4 py-9 sm:px-6 lg:px-10 lg:py-10 ${
        tone === "muted" ? "bg-neutral-50" : "bg-white"
      }`}
    >
      {/* Centered container — every PDP section aligns to the same column
          (owner ruling: nothing hangs to the far right on wide screens). */}
      <div className="mx-auto max-w-7xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-1.5 font-display text-[22px] leading-tight text-neutral-900 lg:text-[26px]">
          {title}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl space-y-3 text-[13.5px] leading-[1.85] text-neutral-700">
      {children}
    </div>
  )
}

function Rail({ items, priorityFirst = false }: { items: MiniRec[]; priorityFirst?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-6">
      {items.slice(0, 6).map((mp, i) => (
        <ProductCard key={mp.id} product={recToCard(mp)} priority={priorityFirst && i === 0} />
      ))}
    </div>
  )
}

function FbtCard({ item, isMain = false }: { item: MiniRec; isMain?: boolean }) {
  const cls =
    "flex min-w-0 flex-1 items-center gap-3.5 rounded-lg border border-neutral-200 bg-white p-3.5 lg:max-w-[300px]"
  const body = (
    <>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            width={160}
            height={160}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <PawPrint className="absolute inset-0 m-auto h-7 w-7 text-neutral-300" strokeWidth={1.2} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {isMain && (
          <span className="mb-1 inline-block rounded bg-[#F2C500] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#002B5C]">
            This item
          </span>
        )}
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-neutral-900">
          {item.name}
        </p>
        <p className="mt-1 text-[14px] font-bold text-[#002B5C]">
          {item.priceCents != null ? fmt(item.priceCents) : "—"}
        </p>
      </div>
    </>
  )
  return isMain ? (
    <div className={cls}>{body}</div>
  ) : (
    <Link href={`/products/${item.slug}`} className={`${cls} transition-colors hover:border-[#002B5C]`}>
      {body}
    </Link>
  )
}

// ------------------------------ the page ------------------------------------

export default async function ProductPage({ params }: Params) {
  const { slug } = await params
  const product = await loadPdpData(slug)
  if (!product) notFound()

  const badgeChip =
    product.isOnSale ? "SALE" : product.isNew ? "NEW" : product.isBestseller ? "BEST SELLER" : null

  // ---- Variant pickers ----
  const optionCards: { label: string; price: string | null; slug: string; inStock: boolean; isCurrent: boolean }[] = [
    { label: product.name, price: product.priceCents != null ? fmt(product.priceCents) : null, slug: product.slug, inStock: product.inStock, isCurrent: true },
    ...product.siblingOptions.map((o) => ({
      label: o.label,
      price: o.priceCents != null ? fmt(o.priceCents) : null,
      slug: o.slug,
      inStock: o.inStock,
      isCurrent: false,
    })),
  ]
  const siblingHeading = optionHeading(optionCards.map((o) => o.label))
  const allOptionsOos = optionCards.every((o) => !o.inStock)
  const variantHeading = optionHeading(product.ownVariants.map((v) => v.label))

  const variantPrices = product.ownVariants
    .map((v) => v.priceCents)
    .filter((n): n is number => n != null)
  const showFromPrice = variantPrices.length > 1 && Math.max(...variantPrices) > (product.priceCents ?? 0)

  // ---- Stock urgency — policy lives in app_settings (stock.* keys):
  // stock.low_threshold shows the strip when sellable qty ≤ N,
  // stock.show_exact_count switches "Only 3 left" vs "Low stock — order soon",
  // stock.allow_backorder keeps out-of-stock items orderable.
  const stockSettings = await getStockSettings()
  const urgency: BuyBoxProduct["urgency"] = (() => {
    if (product.inStock && product.stockQuantity != null && product.stockQuantity <= stockSettings.lowThreshold) {
      const message =
        stockSettings.showExactCount && product.stockQuantity > 0
          ? `Only ${product.stockQuantity} left in stock — order soon`
          : "Low stock — order soon"
      return { message, tone: "urgent" as const }
    }
    if (!product.inStock && stockSettings.allowBackorder) {
      return { message: "Out of stock — available on backorder", tone: "backorder" as const }
    }
    return null
  })()

  // ---- Buy box payload ----
  const buyBoxProduct: BuyBoxProduct = {
    id: product.id,
    name: product.name,
    price: product.priceCents != null ? fmt(product.priceCents) : "",
    priceCents: product.priceCents,
    compareAtPriceCents: product.compareAtPriceCents,
    isOnSale: product.isOnSale,
    showFromPrice,
    image: product.media[0]?.url ?? null,
    alt: product.media[0]?.alt ?? null,
    badge: badgeChip,
    category: product.brand,
    inStock: product.inStock,
    urgency,
    reship: product.reship,
  }

  // ---- Detail content — all feed copy runs through cleanText() (entity
  //      decode + tag strip) so the page renders plain text, never "&amp;".
  const specs = hasText(product.specifications) ? specRows(cleanText(product.specifications)) : []
  const glance = glanceChips(hasText(product.specifications) ? cleanText(product.specifications) : null)
  const freeOf = hasText(product.ingredients) ? parseFreeOf(cleanText(product.ingredients)) : null
  const articles = articlePicks(product.petKind)
  const fbtTotal =
    product.priceCents != null
      ? product.frequentlyBoughtTogether.reduce((sum, m) => sum + (m.priceCents ?? 0), product.priceCents)
      : null
  const mainFbtItem: MiniRec = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: product.media[0]?.url ?? null,
    shortDescription: product.shortDescription,
    priceCents: product.priceCents,
    isBestseller: product.isBestseller,
    isOnSale: product.isOnSale,
    isNew: product.isNew,
  }

  // ---- Structured data ----
  const canonicalUrl = `${SITE_URL}/products/${slug}`
  const firstImage = product.media[0]?.url
  const productImage = firstImage
    ? firstImage.startsWith("/")
      ? `${SITE_URL}${firstImage}`
      : firstImage
    : undefined
  const productJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: cleanText(product.shortDescription) || cleanText(product.description) || product.name,
    url: canonicalUrl,
    sku: product.id,
  }
  if (productImage) productJsonLd.image = productImage
  if (product.brand) productJsonLd.brand = { "@type": "Brand", name: product.brand }
  if (product.priceCents != null) {
    productJsonLd.offers = {
      "@type": "Offer",
      price: product.priceCents / 100,
      priceCurrency: "USD",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: canonicalUrl,
    }
  }
  if (product.ratingCount > 0 && product.ratingAvg != null) {
    productJsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.ratingAvg,
      reviewCount: product.ratingCount,
    }
  }
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...product.breadcrumb.map((b, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: b.name,
        item: b.path.startsWith("/") ? `${SITE_URL}${b.path}` : b.path,
      })),
      {
        "@type": "ListItem",
        position: product.breadcrumb.length + 2,
        name: product.name,
        item: canonicalUrl,
      },
    ],
  }

  return (
    <>
      {/* 1 — Breadcrumb: Home / Shop / … / product */}
      <nav aria-label="Breadcrumb" className="border-b border-neutral-200 bg-white px-4 py-3 sm:px-6 lg:px-10">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          <li>
            <Link href="/" className="text-neutral-500 hover:text-[#002B5C] hover:underline">
              Home
            </Link>
          </li>
          {product.breadcrumb.map((b) => (
            <li key={b.path} className="flex items-center gap-2">
              <span aria-hidden className="text-neutral-300">/</span>
              <Link href={b.path} className="text-neutral-500 hover:text-[#002B5C] hover:underline">
                {b.name}
              </Link>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span aria-hidden className="text-neutral-300">/</span>
            <span aria-current="page" className="max-w-[240px] truncate font-semibold text-neutral-900 sm:max-w-[340px]">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* 2-6 — TOP: gallery | center info + pickers | buy column. Content is
          centered in the same max-w-7xl column as every section below. */}
      <section className="bg-white px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.74fr)] lg:gap-9">
        {/* 2 — Gallery */}
        <div>
          <ProductGallery images={product.media.slice(0, 8)} name={product.name} badge={badgeChip} />
        </div>

        {/* 3+4 — Center info + variant pickers */}
        <div className="min-w-0">
          {hasText(product.brand) && (
            <Link
              href={`/shop?brand=${encodeURIComponent(product.brand)}`}
              className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#002B5C] underline-offset-4 hover:underline"
            >
              {product.brand}
            </Link>
          )}
          <h1 className="mt-2 font-display text-[26px] leading-[1.15] text-neutral-900 lg:text-[30px]">
            {product.name}
          </h1>

          {/* Star row: rating + N Ratings + N Answered Questions (#qa) */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
            <Stars value={product.ratingAvg ?? 0} />
            {product.ratingCount > 0 && product.ratingAvg != null ? (
              <>
                <span className="font-bold text-neutral-900">{product.ratingAvg.toFixed(1)}</span>
                <a
                  href="#reviews"
                  className="text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-2 hover:text-[#0A3D7C]"
                >
                  {product.ratingCount} {product.ratingCount === 1 ? "Rating" : "Ratings"}
                </a>
              </>
            ) : (
              <span className="text-neutral-500">Not yet rated</span>
            )}
            <span aria-hidden className="text-neutral-300">|</span>
            <a
              href="#qa"
              className="text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-2 hover:text-[#0A3D7C]"
            >
              {product.qa.length} Answered {product.qa.length === 1 ? "Question" : "Questions"}
            </a>
          </div>

          {/* Badge chips */}
          {badgeChip && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.isOnSale && (
                <span className="rounded bg-[#F2C500] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#002B5C]">
                  Sale
                </span>
              )}
              {product.isNew && (
                <span className="rounded bg-[#002B5C] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-white">
                  New
                </span>
              )}
              {product.isBestseller && (
                <span className="rounded border border-[#002B5C] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#002B5C]">
                  Best Seller
                </span>
              )}
            </div>
          )}

          {/* Short description — clean plain text, no entities, no tags */}
          {hasText(product.shortDescription) && (
            <p className="mt-3.5 max-w-[520px] text-[13.5px] leading-[1.75] text-neutral-600">
              {cleanText(product.shortDescription)}
            </p>
          )}

          {/* 4a — Sibling listing picker (server-side variant switching) */}
          {optionCards.length > 1 && (
            <div className="mt-6 border-t border-neutral-200 pt-5">
              <p className="text-[13.5px] text-neutral-900">
                <span className="font-bold">{siblingHeading}:</span>{" "}
                <span className="text-neutral-600">{product.name}</span>
              </p>
              {allOptionsOos && (
                <p className="mt-1.5 text-[12px] font-semibold text-neutral-500">
                  Out of stock here — see available options below.
                </p>
              )}
              {/* Owner ruling: no inner scrollers — "only the page scrolls".
                  The variant list renders full-height; the page scrolls. */}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {optionCards.map((o) =>
                  o.isCurrent ? (
                    <div
                      key="current-option"
                      aria-current="true"
                      className="rounded-lg border border-[#002B5C] bg-[#002B5C]/[0.04] p-3 ring-1 ring-[#002B5C]"
                    >
                      <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-neutral-900">
                        {o.label}
                      </p>
                      {o.price && <p className="mt-1 text-[13.5px] font-bold text-[#002B5C]">{o.price}</p>}
                    </div>
                  ) : (
                    <Link
                      key={o.slug}
                      href={`/products/${o.slug}`}
                      className={`block rounded-lg border p-3 transition-colors ${
                        o.inStock
                          ? "border-neutral-300 hover:border-[#002B5C]"
                          : "border-neutral-200 opacity-50"
                      }`}
                    >
                      <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-neutral-900">
                        {o.label}
                      </p>
                      {o.price && <p className="mt-1 text-[13.5px] font-bold text-[#002B5C]">{o.price}</p>}
                      {!o.inStock && (
                        <p className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                          Out of stock
                        </p>
                      )}
                    </Link>
                  ),
                )}
              </div>
            </div>
          )}

          {/* 4b — Own-variant chips (informational, with prices) */}
          {product.ownVariants.length > 1 && (
            <div className="mt-5">
              <p className="text-[13.5px] text-neutral-900">
                <span className="font-bold">{variantHeading === "Option" ? "More options" : variantHeading}:</span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {product.ownVariants.map((v) => (
                  <span
                    key={`${v.productId}-${v.label}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3.5 py-2 text-[12.5px]"
                  >
                    <span className="font-semibold text-neutral-800">{v.label}</span>
                    {v.priceCents != null && (
                      <span className="font-bold text-[#002B5C]">{fmt(v.priceCents)}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5+6 — Buy column: price, purchase options, qty + ATC, stock, pickup.
            STICKY (owner ruling: "the sidebar on product pages are sticky —
            only the page scrolls"): the buy box pins under the header while
            the long content column scrolls. */}
        <div className="min-w-0 self-start lg:sticky lg:top-20 lg:border-l lg:border-neutral-200 lg:pl-9">
          {/* key remounts the island on variant navigation → qty/added state reset */}
          <ProductBuyBox key={product.id} product={buyBoxProduct} />
        </div>
        </div>
      </section>

      {/* 7 — At a glance */}
      {glance.length > 0 && (
        <PdpSection eyebrow="QUICK FACTS" title="At a glance">
          <ul className="flex flex-wrap gap-2.5">
            {glance.map(({ label, Icon }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-[12.5px] font-semibold text-neutral-800"
              >
                <Icon size={16} className="shrink-0 text-[#002B5C]" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </PdpSection>
      )}

      {/* 8 — Frequently bought together */}
      {product.frequentlyBoughtTogether.length > 0 && (
        <PdpSection eyebrow="COMBO DEAL" title="Frequently bought together">
          <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
            <FbtCard item={mainFbtItem} isMain />
            {product.frequentlyBoughtTogether.slice(0, 2).map((item) => (
              <div key={item.id} className="contents">
                <Plus
                  size={18}
                  aria-hidden
                  className="hidden shrink-0 self-center text-neutral-400 lg:block"
                />
                <FbtCard item={item} />
              </div>
            ))}
          </div>
          {fbtTotal != null && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
              <p className="text-[15px] text-neutral-900">
                Total price: <span className="font-bold text-[#002B5C]">{fmt(fbtTotal)}</span>
              </p>
              <p className="text-[12px] text-neutral-500">
                For this item + {product.frequentlyBoughtTogether.length}{" "}
                {product.frequentlyBoughtTogether.length === 1 ? "companion" : "companions"} — add each
                from its card
              </p>
            </div>
          )}
        </PdpSection>
      )}

      {/* 9 — Questions & Answers */}
      <PdpSection id="qa" eyebrow="Q&A" title="Questions & Answers">
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {product.qa.map((q) => (
            <li key={q.question} className="py-4 first:border-t-0 first:pt-0">
              <p className="flex gap-2 text-[14px] font-bold text-[#002B5C]">
                <span aria-hidden>Q.</span>
                <span>{q.question}</span>
              </p>
              <p className="mt-1.5 flex gap-2 text-[13.5px] leading-[1.75] text-neutral-700">
                <span aria-hidden className="font-bold text-neutral-400">A.</span>
                <span>{cleanText(q.answer)}</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[13px] text-neutral-600">
          Have a question? Ask in store or call{" "}
          <a href="tel:+19015550132" className="font-bold text-[#002B5C] hover:underline">
            (901) 555-0132
          </a>
          .
        </p>
      </PdpSection>

      {/* 10 — Reviews */}
      <PdpSection
        id="reviews"
        eyebrow="WHAT PET PARENTS SAY"
        title="Reviews"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <Stars value={product.ratingAvg ?? 0} size={18} />
          {product.ratingCount > 0 && product.ratingAvg != null ? (
            <p className="text-[14px] text-neutral-700">
              <span className="font-bold text-neutral-900">{product.ratingAvg.toFixed(1)}</span> ·{" "}
              {product.ratingCount} {product.ratingCount === 1 ? "rating" : "ratings"}
            </p>
          ) : (
            <p className="text-[13.5px] text-neutral-500">Be the first to review this product.</p>
          )}
        </div>

        {product.reviews.length > 0 && (
          <ul className="mt-5 divide-y divide-neutral-200 border-y border-neutral-200">
            {product.reviews.map((r) => (
              <li key={r.id} className="py-5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} size={14} />
                  {hasText(r.title) && (
                    <h3 className="text-[14px] font-bold text-neutral-900">{r.title}</h3>
                  )}
                </div>
                {hasText(r.body) && (
                  <p className="mt-1.5 max-w-3xl text-[13.5px] leading-[1.8] text-neutral-700">{r.body}</p>
                )}
                <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-neutral-500">
                  <span className="font-bold text-neutral-800">{r.author}</span>
                  {r.verified && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#002B5C]">
                      Verified buyer
                    </span>
                  )}
                  {r.createdAt && <span>{fmtDate(r.createdAt)}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-7">
          <ReviewForm productId={product.id} />
        </div>
      </PdpSection>

      {/* 11 — Attributes & specifications */}
      {specs.length > 0 && (
        <PdpSection eyebrow="FULL DETAILS" title="Attributes & Specifications">
          <div className="max-w-3xl overflow-x-auto">
            <table className="w-full border-collapse overflow-hidden rounded-lg border border-neutral-200 text-[13.5px]">
              <thead>
                <tr className="bg-[#002B5C] text-white">
                  <th
                    scope="col"
                    className="w-2/5 rounded-tl-lg px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em]"
                  >
                    Attributes
                  </th>
                  <th
                    scope="col"
                    className="rounded-tr-lg px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.12em]"
                  >
                    Specifications
                  </th>
                </tr>
              </thead>
              <tbody>
                {specs.map((row, i) => (
                  <tr key={`${row.attr}-${i}`} className={i % 2 === 1 ? "bg-neutral-50" : "bg-white"}>
                    <th
                      scope="row"
                      className="border-t border-neutral-200 px-4 py-2.5 text-left align-top font-semibold text-neutral-900"
                    >
                      {row.attr}
                    </th>
                    <td className="border-t border-neutral-200 px-4 py-2.5 align-top text-neutral-700">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PdpSection>
      )}

      {/* 12 — Ingredients */}
      {hasText(product.ingredients) && (
        <PdpSection eyebrow="INSIDE THE PRODUCT" title="Ingredients">
          <Prose>
            <p>{freeOf?.main ?? cleanText(product.ingredients)}</p>
          </Prose>
          {freeOf?.freeOf && (
            <div className="mt-4">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
                Free from
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {freeOf.freeOf.map((f) => (
                  <span
                    key={f}
                    className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-neutral-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </PdpSection>
      )}

      {/* 13 — Product directions */}
      {hasText(product.directions) && (
        <PdpSection eyebrow="HOW TO USE" title="Product Directions">
          <Prose>
            <p>{cleanText(product.directions)}</p>
          </Prose>
        </PdpSection>
      )}

      {/* 14 — Warranty */}
      {hasText(product.warranty) && (
        <PdpSection eyebrow="PEACE OF MIND" title="Warranty">
          <Prose>
            <p className="border-l-2 border-[#002B5C] pl-4">{cleanText(product.warranty)}</p>
          </Prose>
        </PdpSection>
      )}

      {/* 15 — The details — product.details, the trigger-written plain text */}
      {hasText(product.description) && (
        <PdpSection eyebrow="OVERVIEW" title="The Details">
          <Prose>
            <p className="whitespace-pre-line">{cleanText(product.description)}</p>
          </Prose>
        </PdpSection>
      )}

      {/* 16 — Customers also bought */}
      {product.alsoBought.length > 0 && (
        <PdpSection eyebrow="COMPLETE THE ROUTINE" title="Customers Also Bought" tone="muted">
          <Rail items={product.alsoBought} />
        </PdpSection>
      )}

      {/* 17 — You may also like */}
      {product.trending.length > 0 && (
        <PdpSection eyebrow="TRENDING NOW" title="You May Also Like" tone="muted">
          <Rail items={product.trending} />
        </PdpSection>
      )}

      {/* 18 — Best sellers for your pet (only when non-empty) */}
      {product.bestSellersForPet.length > 0 && (
        <PdpSection eyebrow="TOP RATED" title={`Best Sellers for Your ${product.petKind ?? "Pet"}`} tone="muted">
          <Rail items={product.bestSellersForPet} />
        </PdpSection>
      )}

      {/* 19 — Associated articles */}
      {articles.length > 0 && (
        <PdpSection eyebrow="GUIDES & TIPS" title="Associated Articles">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {articles.map((g) => (
              <Link
                key={g.slug}
                href={g.href}
                className="group flex flex-col rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-[#002B5C]"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
                  {g.animal === "dog" ? "Dog grooming guide" : "Cat grooming guide"}
                </p>
                <h3 className="mt-2 flex-1 font-display text-[17px] leading-snug text-neutral-900">
                  {g.title}
                </h3>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[#002B5C]">
                  Read the guide
                  <ArrowRight
                    size={14}
                    aria-hidden
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </Link>
            ))}
          </div>
        </PdpSection>
      )}

      {/* 20 — Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  )
}
