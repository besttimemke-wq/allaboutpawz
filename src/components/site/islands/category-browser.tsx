"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Funnel, PawPrint, Star, X } from "@phosphor-icons/react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Category Browser — the /shop/category/[slug] collection view.
//
//   Left rail (desktop, sticky, white panel) / slide-over drawer (mobile):
//   ONLY data-backed, functional facets — price range + quick buckets,
//   rating floor, availability. Filters are STAGED and committed by the
//   pinned APPLY FILTERS button (same interaction model as the /shop rail).
//   Enterprise honesty: the taxonomy's mapped filters we can't apply to
//   live product rows (Brand, Material, Scent…) are listed as "coming"
//   names, never rendered as dead controls.
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

const railHeadingCls = "text-[9.5px] font-bold tracking-[0.16em] text-ink uppercase"
const checkRowCls = "flex min-h-[30px] cursor-pointer items-center gap-2.5 py-[3px] text-[11.5px] text-ink-soft transition-colors hover:text-ink"
const checkBoxCls = "h-4 w-4 shrink-0 accent-gold-deep"
const countCls = "text-[9.5px] font-bold text-ink-soft/60"
const numInputCls =
  "w-full min-w-0 min-h-[38px] border border-ink/15 bg-white px-3 py-2.5 text-[11.5px] text-ink placeholder:text-ink-soft/50 " +
  "focus:outline-none focus:ring-1 focus:ring-gold-deep [appearance:textfield] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

const RAIL_SCROLL =
  "overflow-y-auto " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-gold/40 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-gold-deep/60"

/** One staged filter snapshot — draft (rail) and applied (grid) pair. */
type CatFilterState = {
  min: string
  max: string
  buckets: string[]
  rating: number
  instock: boolean
  backorder: boolean
}
const EMPTY_FILTERS: CatFilterState = { min: "", max: "", buckets: [], rating: 0, instock: false, backorder: false }

const filterCount = (f: CatFilterState) =>
  (f.min.trim() ? 1 : 0) + (f.max.trim() ? 1 : 0) + f.buckets.length + (f.rating > 0 ? 1 : 0) + (f.instock ? 1 : 0) + (f.backorder ? 1 : 0)

const centsOf = (p: BrowserProduct) => parsePriceToCents(p.price)
const nameOf = (p: BrowserProduct) => String(p.name)
const inStock = (p: BrowserProduct) => (p.stock == null ? true : p.stock > 0)

export function CategoryBrowser({
  node,
  products,
  ratings,
  filters,
}: {
  node: BrowserCategory
  products: BrowserProduct[]
  ratings: Record<string, BrowserRating>
  filters: BrowserFilter[]
}) {
  const [applied, setApplied] = useState<CatFilterState>(EMPTY_FILTERS)
  const [draft, setDraft] = useState<CatFilterState>(EMPTY_FILTERS)
  const [sort, setSort] = useState<SortKey>("featured")
  const [mobileOpen, setMobileOpen] = useState(false)

  // Lock body scroll while the mobile filter drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [mobileOpen])

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

  // The FILTERS button badge reflects the APPLIED state (what the grid
  // shows); the rail header count reflects the DRAFT (what's staged).
  const activeCount = filterCount(applied)
  const draftCount = filterCount(draft)

  const clearAll = () => {
    setDraft(EMPTY_FILTERS)
    setApplied(EMPTY_FILTERS)
  }

  const applyDraft = () => {
    setApplied(draft)
    setMobileOpen(false)
  }

  const toggleBucket = (key: string) =>
    setDraft((d) => ({ ...d, buckets: d.buckets.includes(key) ? d.buckets.filter((k) => k !== key) : [...d.buckets, key] }))

  // ---- filtering (uses the APPLIED snapshot) ----
  const visible = useMemo(() => {
    const min = parseFloat(applied.min)
    const max = parseFloat(applied.max)
    const hasMin = applied.min.trim() !== "" && isFinite(min)
    const hasMax = applied.max.trim() !== "" && isFinite(max)
    const activeTests = PRICE_BUCKETS.filter((b) => applied.buckets.includes(b.key))

    return products.filter((p) => {
      const c = centsOf(p)
      if (hasMin && (c == null || c < Math.round(min * 100))) return false
      if (hasMax && (c == null || c > Math.round(max * 100))) return false
      if (activeTests.length > 0) {
        const ok = activeTests.some((b) => c != null && b.test(c))
        if (!ok) return false
      }
      if (applied.rating > 0) {
        const r = ratings[p.id]
        if (!r || r.count === 0 || r.avg < applied.rating) return false
      }
      if (applied.instock && !inStock(p)) return false
      if (applied.backorder && p.stock !== 0) return false
      return true
    })
  }, [products, ratings, applied])

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

  // ---- the rail (shared by the desktop panel + mobile drawer) ----
  const railSections = (
    <div className="space-y-7" aria-label={`Filters for ${node.name}`}>
      <div className="flex items-center justify-between border-b border-ink/10 pb-3">
        <div className="flex items-baseline gap-2">
          <p className={railHeadingCls}>Filters</p>
          {draftCount > 0 && (
            <span className="text-[9px] font-bold text-gold-deep/80">({draftCount})</span>
          )}
        </div>
        {draftCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.14em] text-gold-deep transition-colors hover:text-ink"
          >
            <X size={10} weight="bold" /> CLEAR ALL
          </button>
        )}
      </div>

      {/* PRICE RANGE — $ min/max inputs + data-backed quick buckets */}
      <div>
        <p className={railHeadingCls}>Price Range</p>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={draft.min}
            onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
            placeholder="$ MIN"
            aria-label="Minimum price"
            className={numInputCls}
          />
          <span className="text-ink-soft/40" aria-hidden="true">—</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={draft.max}
            onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
            placeholder="$ MAX"
            aria-label="Maximum price"
            className={numInputCls}
          />
        </div>
        {bucketOptions.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {bucketOptions.map((b) => (
              <label key={b.key} className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={draft.buckets.includes(b.key)}
                  onChange={() => toggleBucket(b.key)}
                  className={checkBoxCls}
                />
                <span className="flex-1">{b.label}</span>
                <span className={countCls}>({b.count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* RATING — gold star rows with counts (only when rated products exist) */}
      {ratingOptions.length > 0 && (
        <div>
          <p className={railHeadingCls}>Rating</p>
          <div className="mt-2 space-y-0.5">
            {ratingOptions.map((o) => (
              <label key={o.value} className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={draft.rating === o.value}
                  onChange={() => setDraft((d) => ({ ...d, rating: d.rating === o.value ? 0 : o.value }))}
                  className={checkBoxCls}
                />
                <span className="flex flex-1 items-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      weight={i < o.value ? "fill" : "regular"}
                      className={i < o.value ? "text-gold" : "text-ink/25"}
                    />
                  ))}
                </span>
                <span className="sr-only">{`${o.value} stars & up`}</span>
                <span className={countCls}>({o.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* AVAILABILITY — options that actually match products */}
      {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
        <div>
          <p className={railHeadingCls}>Availability</p>
          <div className="mt-2 space-y-0.5">
            {stockCounts.inStock > 0 && (
              <label className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={draft.instock}
                  onChange={() => setDraft((d) => ({ ...d, instock: !d.instock }))}
                  className={checkBoxCls}
                />
                <span className="flex-1">In stock</span>
                <span className={countCls}>({stockCounts.inStock})</span>
              </label>
            )}
            {stockCounts.backordered > 0 && (
              <label className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={draft.backorder}
                  onChange={() => setDraft((d) => ({ ...d, backorder: !d.backorder }))}
                  className={checkBoxCls}
                />
                <span className="flex-1">Backordered</span>
                <span className={countCls}>({stockCounts.backordered})</span>
              </label>
            )}
          </div>
        </div>
      )}

      {/* Taxonomy filters wired for this category that live product rows
          can't answer yet — names only, never fake controls. */}
      {upcomingFilters.length > 0 && (
        <div className="border-t border-ink/10 pt-4">
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

  // The complete rail panel — category header, scrollable sections, and the
  // pinned APPLY FILTERS button (the frame the /shop rail shares).
  const railPanel = (
    <div className="flex min-h-0 flex-1 flex-col border border-ink/10 bg-white" aria-label={`Filters for ${node.name}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-4">
        <p className="truncate text-[10px] font-bold tracking-[0.22em] text-ink">
          {node.name.toUpperCase()}
        </p>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close filters"
          className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink lg:hidden"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
      <div className={`min-h-0 flex-1 p-5 ${RAIL_SCROLL}`}>{railSections}</div>
      <div className="shrink-0 border-t border-ink/10 p-4">
        <button type="button" onClick={applyDraft} className="btn-gold w-full">
          APPLY FILTERS
        </button>
      </div>
    </div>
  )

  return (
    <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
      {/* Desktop filter rail — sticky, sections scroll, APPLY pinned */}
      <aside className="hidden w-[260px] shrink-0 self-start lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-3rem)] lg:flex-col">
        {railPanel}
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

        {/* Mobile filter drawer — slide-over from the left with a scrim;
            APPLY commits + closes, the X and the scrim close too. */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[80] lg:hidden">
            <div
              className="absolute inset-0 bg-ink/45"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[330px] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-300">
              {railPanel}
            </div>
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
