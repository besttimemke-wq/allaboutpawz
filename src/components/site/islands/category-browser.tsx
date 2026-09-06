"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Funnel, PawPrint, X } from "@phosphor-icons/react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"
import { CategoryNavRail, type CategoryLinkNode } from "./category-nav"

// ---------------------------------------------------------------------------
// Category Browser — the /shop/category/[slug] collection view.
//
//   Left rail (desktop) / collapsible panel (mobile):
//     CATEGORIES — the 10 root departments with icons, rendered as LINKS
//                 (never checkboxes). The active department expands to its
//                 subcategory links — this page's own sidebar.
//     FILTERS    — price range + quick buckets, rating floor, availability.
//                 CHECKBOXES live here and ONLY here.
//
//   Sort: FEATURED (catalog order) / PRICE asc+desc / TOP RATED / NEWEST.
//   Grid: the same catalog card the /shop collection uses.
//
// Pure client state — no persistence, so no hydration gate is needed.
// ---------------------------------------------------------------------------

export type BrowserProduct = {
  id: string
  name: string
  price: string
  slug?: string | null
  shortDescription?: string | null
  description?: string | null
  badge?: string | null
  image?: string | null
  alt?: string | null
  category?: string | null
  categoryId?: number | null
  stock?: number | null
  order?: number | null
  createdAt?: string | null
}

export type BrowserRating = { avg: number; count: number }

export type BrowserFilter = {
  id: number
  name: string
  slug: string
  filterType: string
  isGlobal: boolean
  isMultiselect: boolean
  displayOrder: number
  values: { id: number; name: string; slug: string }[]
}

export type BrowserCategory = { id: number; name: string; slug: string }

export type BrowserCategoryNode = CategoryLinkNode

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "newest"

// Quick price buckets (data-backed — only rendered when products span them).
const PRICE_BUCKETS: { key: string; label: string; test: (cents: number) => boolean }[] = [
  { key: "under25", label: "Under $25", test: (c) => c < 2500 },
  { key: "25to50", label: "$25 – $50", test: (c) => c >= 2500 && c <= 5000 },
  { key: "over50", label: "Over $50", test: (c) => c > 5000 },
]

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "FEATURED" },
  { value: "price-asc", label: "PRICE: LOW TO HIGH" },
  { value: "price-desc", label: "PRICE: HIGH TO LOW" },
  { value: "rating", label: "TOP RATED" },
  { value: "newest", label: "NEWEST" },
]

const railHeadingCls = "text-[9px] font-bold tracking-[0.18em] text-gold-deep uppercase"
const numInputCls =
  "w-full min-w-0 border border-gold/35 bg-cream px-2.5 py-2 text-[11px] text-ink placeholder:text-ink-soft/50 " +
  "focus:outline-none focus:ring-1 focus:ring-gold-deep [appearance:textfield] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

const centsOf = (p: BrowserProduct) => parsePriceToCents(p.price)
const nameOf = (p: BrowserProduct) => String(p.name)
const inStock = (p: BrowserProduct) => (p.stock == null ? true : p.stock > 0)

export function CategoryBrowser({
  node,
  roots,
  products,
  ratings,
  filters,
}: {
  node: BrowserCategory
  roots?: BrowserCategoryNode[]
  products: BrowserProduct[]
  ratings: Record<string, BrowserRating>
  filters: BrowserFilter[]
}) {
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [buckets, setBuckets] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [stockOnly, setStockOnly] = useState(false)
  const [backorderOnly, setBackorderOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>("featured")
  const [mobileOpen, setMobileOpen] = useState(false)

  // ---- data-backed facet availability (never render dead controls) ----
  const bucketOptions = useMemo(
    () =>
      PRICE_BUCKETS.map((b) => ({
        ...b,
        count: products.filter((p) => {
          const c = centsOf(p)
          return c != null && b.test(c)
        }).length,
      })).filter((b) => b.count > 0),
    [products],
  )

  const ratingOptions = useMemo(() => {
    const rated = products.filter((p) => (ratings[p.id]?.count ?? 0) > 0)
    if (rated.length === 0) return []
    return [4, 3]
      .map((v) => ({
        value: v,
        label: `${v}★ & up`,
        count: rated.filter((p) => (ratings[p.id]?.avg ?? 0) >= v).length,
      }))
      .filter((o) => o.count > 0)
  }, [products, ratings])

  const stockCounts = useMemo(
    () => ({
      inStock: products.filter(inStock).length,
      backordered: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  )

  // Mapped taxonomy filters that carry no structured product data yet —
  // shown by name only as "coming" (price/rating render as real facets).
  const upcomingFilters = useMemo(
    () => filters.filter((f) => f.slug !== "price" && f.slug !== "rating"),
    [filters],
  )

  const activeCount =
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0) +
    buckets.length +
    (minRating > 0 ? 1 : 0) +
    (stockOnly ? 1 : 0) +
    (backorderOnly ? 1 : 0)

  const clearAll = () => {
    setMinPrice("")
    setMaxPrice("")
    setBuckets([])
    setMinRating(0)
    setStockOnly(false)
    setBackorderOnly(false)
  }

  const toggleBucket = (key: string) =>
    setBuckets((b) => (b.includes(key) ? b.filter((k) => k !== key) : [...b, key]))

  // ---- filtering ----
  const visible = useMemo(() => {
    const min = parseFloat(minPrice)
    const max = parseFloat(maxPrice)
    const hasMin = minPrice.trim() !== "" && isFinite(min)
    const hasMax = maxPrice.trim() !== "" && isFinite(max)
    const activeTests = PRICE_BUCKETS.filter((b) => buckets.includes(b.key))

    return products.filter((p) => {
      const c = centsOf(p)
      if (hasMin && (c == null || c < Math.round(min * 100))) return false
      if (hasMax && (c == null || c > Math.round(max * 100))) return false
      if (activeTests.length > 0) {
        const ok = activeTests.some((b) => c != null && b.test(c))
        if (!ok) return false
      }
      if (minRating > 0) {
        const r = ratings[p.id]
        if (!r || r.count === 0 || r.avg < minRating) return false
      }
      if (stockOnly && !inStock(p)) return false
      if (backorderOnly && p.stock !== 0) return false
      return true
    })
  }, [products, ratings, minPrice, maxPrice, buckets, minRating, stockOnly, backorderOnly])

  // ---- sorting ----
  const sorted = useMemo(() => {
    const arr = [...visible]
    switch (sort) {
      case "price-asc":
        arr.sort((a, b) => (centsOf(a) ?? Infinity) - (centsOf(b) ?? Infinity) || nameOf(a).localeCompare(nameOf(b)))
        break
      case "price-desc":
        arr.sort((a, b) => (centsOf(b) ?? 0) - (centsOf(a) ?? 0) || nameOf(a).localeCompare(nameOf(b)))
        break
      case "rating":
        arr.sort(
          (a, b) =>
            (ratings[b.id]?.count ? ratings[b.id].avg : -1) - (ratings[a.id]?.count ? ratings[a.id].avg : -1) ||
            (ratings[b.id]?.count ?? 0) - (ratings[a.id]?.count ?? 0) ||
            nameOf(a).localeCompare(nameOf(b)),
        )
        break
      case "newest":
        arr.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() ||
            nameOf(a).localeCompare(nameOf(b)),
        )
        break
      default:
        arr.sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || nameOf(a).localeCompare(nameOf(b)))
    }
    return arr
  }, [visible, sort, ratings])

  // ---- empty category (no products at all) ----
  if (products.length === 0) {
    return (
      <div className="mt-2 border border-gold/30 bg-cream-deep/60 px-6 py-16 text-center">
        <PawPrint size={36} className="mx-auto text-gold/40" />
        <h2 className="mt-4 font-display text-[22px] text-ink">No products here yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-[12px] leading-[1.8] text-ink-soft">
          This category is part of our expanding collection — check back soon.
        </p>
        <div className="mt-6">
          <Link href="/shop" className="btn-gold">BROWSE THE COLLECTION</Link>
        </div>
      </div>
    )
  }

  // ---- the rail (shared by desktop sidebar + mobile collapsible) ----
  const rail = (
    <div className="space-y-6" aria-label={`Shop by category and filters`}>
      {/* CATEGORIES — the 10 departments with icons, LINKS (no checkboxes).
          The active department expands to show its subcategory links. */}
      {roots && roots.length > 0 && (
        <CategoryNavRail roots={roots} activeSlug={node.slug} maxH="max-h-none" />
      )}

      <div className="flex items-center justify-between border-b border-gold/20 pb-3">
        <p className={railHeadingCls}>Filters</p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.14em] text-gold-deep transition-colors hover:text-ink"
          >
            <X size={10} weight="bold" /> CLEAR ALL
          </button>
        )}
      </div>

      {/* PRICE — range + data-backed quick buckets */}
      <div>
        <p className={railHeadingCls}>Price</p>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="MIN $"
            aria-label="Minimum price"
            className={numInputCls}
          />
          <span className="text-gold/60" aria-hidden="true">—</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="MAX $"
            aria-label="Maximum price"
            className={numInputCls}
          />
        </div>
        {bucketOptions.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {bucketOptions.map((b) => (
              <label key={b.key} className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={buckets.includes(b.key)}
                  onChange={() => toggleBucket(b.key)}
                  className="h-3.5 w-3.5 shrink-0 accent-gold-deep"
                />
                <span className="flex-1">{b.label}</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{b.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* RATING — only when there are rated products */}
      {ratingOptions.length > 0 && (
        <div>
          <p className={railHeadingCls}>Rating</p>
          <div className="mt-2.5 space-y-1.5">
            {ratingOptions.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={minRating === o.value}
                  onChange={() => setMinRating(minRating === o.value ? 0 : o.value)}
                  className="h-3.5 w-3.5 shrink-0 accent-gold-deep"
                />
                <span className="flex-1">{o.label}</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{o.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* AVAILABILITY — options that actually match products */}
      {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
        <div>
          <p className={railHeadingCls}>Availability</p>
          <div className="mt-2.5 space-y-1.5">
            {stockCounts.inStock > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={() => setStockOnly((v) => !v)}
                  className="h-3.5 w-3.5 shrink-0 accent-gold-deep"
                />
                <span className="flex-1">In stock</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{stockCounts.inStock}</span>
              </label>
            )}
            {stockCounts.backordered > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={backorderOnly}
                  onChange={() => setBackorderOnly((v) => !v)}
                  className="h-3.5 w-3.5 shrink-0 accent-gold-deep"
                />
                <span className="flex-1">Backordered</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{stockCounts.backordered}</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Taxonomy filters wired for this category that live product rows
          can't answer yet — names only, never fake controls. */}
      {upcomingFilters.length > 0 && (
        <div className="border-t border-gold/15 pt-4">
          <p className="text-[9px] font-bold tracking-[0.14em] text-ink-soft/70">
            MORE FILTERS COMING TO THIS CATEGORY
          </p>
          <p className="mt-1.5 line-clamp-3 text-[10.5px] leading-[1.7] text-ink-soft">
            {upcomingFilters.map((f) => f.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      {/* Desktop sidebar rail — sticky while the collection scrolls */}
      <aside className="hidden w-[220px] shrink-0 self-start border border-gold/25 bg-card p-5 lg:sticky lg:top-8 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto scrollbar-thin">
        {rail}
      </aside>

      <div className="min-w-0">
        {/* Toolbar: mobile FILTERS toggle + sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/25 pb-4">
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            className="inline-flex min-h-[40px] items-center gap-2 border border-gold/35 bg-cream px-4 py-2 text-[9.5px] font-bold tracking-[0.14em] text-ink transition-colors hover:border-gold-deep hover:text-gold-deep lg:hidden"
          >
            <Funnel size={12} weight="bold" />
            FILTERS
            {activeCount > 0 && (
              <span className="flex h-[16px] min-w-[16px] items-center justify-center bg-gold-deep px-1 text-[8.5px] font-bold leading-none text-cream">
                {activeCount}
              </span>
            )}
            <Plus size={10} weight="bold" className={`transition-transform duration-300 ${mobileOpen ? "rotate-45" : ""}`} />
          </button>

          <label className="ml-auto flex items-center gap-2.5">
            <span className="hidden text-[9px] font-bold tracking-[0.16em] text-ink-soft sm:inline">SORT BY</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort products"
              className="border border-gold/35 bg-cream px-3 py-2 text-[9.5px] font-bold tracking-[0.1em] text-ink focus:outline-none focus:ring-1 focus:ring-gold-deep"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Mobile collapsible filter panel (same rail content) */}
        {mobileOpen && (
          <div className="mt-4 border border-gold/25 bg-card p-5 lg:hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {rail}
          </div>
        )}

        {/* Product grid — the same catalog card as the shop collection */}
        <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-3">
          {sorted.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {sorted.length === 0 && (
          <div className="mt-2 border border-gold/30 bg-cream-deep/50 px-6 py-12 text-center">
            <p className="text-[12.5px] text-ink-soft">No products match your filters.</p>
            <button type="button" onClick={clearAll} className="btn-ghost mt-5">
              CLEAR FILTERS
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Product card — same design as the /shop catalog card (framed image with
// badge chip, hover VIEW DETAILS strip, category eyebrow, name link,
// clamped subtitle, price, gold VIEW DETAILS button).
// ---------------------------------------------------------------------------
function ProductCard({ p }: { p: BrowserProduct }) {
  const href = p.slug ? `/shop/${p.slug}` : null
  const subtitle = p.shortDescription || p.description

  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden border border-gold/25 bg-cream-deep p-4 transition-colors group-hover:border-gold-deep/50">
        {p.badge && (
          <span className="absolute left-0 top-0 z-10 bg-ink px-2.5 py-1 text-[8px] font-bold tracking-[0.14em] text-gold">
            {p.badge.toUpperCase()}
          </span>
        )}
        {href ? (
          <Link href={href} aria-label={`View ${p.name}`} className="block">
            {p.image ? (
              <img
                src={p.image}
                alt={p.alt || p.name}
                width={512}
                height={640}
                className="mx-auto h-[170px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-[170px] items-center justify-center">
                <PawPrint size={40} className="text-gold/40" />
              </div>
            )}
          </Link>
        ) : p.image ? (
          <img
            src={p.image}
            alt={p.alt || p.name}
            width={512}
            height={640}
            className="mx-auto h-[170px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-[170px] items-center justify-center">
            <PawPrint size={40} className="text-gold/40" />
          </div>
        )}
        {/* VIEW DETAILS affordance — slides up on hover (sm+) */}
        {href && (
          <Link
            href={href}
            className="absolute inset-x-0 bottom-0 hidden translate-y-full items-center justify-center gap-1 bg-ink/90 py-2 text-[8.5px] font-bold tracking-[0.16em] text-gold transition-transform duration-300 group-hover:translate-y-0 sm:flex"
          >
            VIEW DETAILS <Plus size={10} weight="bold" />
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col pt-4 text-center">
        {p.category && (
          <p className="text-[8.5px] font-bold tracking-[0.18em] text-gold-deep/80">{p.category.toUpperCase()}</p>
        )}
        {href ? (
          <Link
            href={href}
            className="mt-1 text-[12.5px] leading-[1.5] text-ink transition-colors hover:text-gold-deep"
          >
            {p.name}
          </Link>
        ) : (
          <h3 className="mt-1 text-[12.5px] leading-[1.5] text-ink">{p.name}</h3>
        )}
        {subtitle && <p className="mt-1 text-[10.5px] leading-[1.5] text-ink-soft line-clamp-2">{subtitle}</p>}
        <p className="mt-2 text-[13px] font-bold text-gold-deep">{p.price}</p>
        <div className="mt-auto pt-3">
          {href ? (
            <Link href={href} className="btn-gold w-full text-[9px]" aria-label={`View ${p.name} details`}>
              <span className="inline-flex items-center gap-1.5">VIEW DETAILS <Plus size={10} weight="bold" /></span>
            </Link>
          ) : (
            <p className="text-[9px] font-bold tracking-[0.14em] text-ink-soft">IN STORE ONLY</p>
          )}
        </div>
      </div>
    </article>
  )
}
