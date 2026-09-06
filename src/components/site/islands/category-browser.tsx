"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Funnel, PawPrint, X, CaretDown } from "@phosphor-icons/react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Category Browser — the /shop/category/[slug] collection view.
//
//   The sidebar is the design library's specific category-page sidebar:
//
//   Left rail (desktop, STICKY — the page expands, never a scrollbar) /
//   collapsible panel (mobile):
//   FILTERS header + CLEAR ALL
//   CATEGORIES      — the departments as links with counts. The current
//                     route's department is active; on department pages it
//                     expands INLINE to present this route's subcategories
//                     only (wrapper label + leaves). Never the whole tree.
//   SUBCATEGORY     — non-department pages: the parent's name + the
//                     subcategory links relevant to this route (current
//                     one active).
//   PRICE           — accordion: min/max inputs + data-backed quick buckets.
//   RATING          — accordion: star-row checkboxes (floor semantics).
//   AVAILABILITY    — accordion: In stock / Backordered (data-backed).
//   MAPPED FILTERS  — accordions, one per taxonomy filter mapped to this
//                     category: select → checkbox rows w/ live counts, color →
//                     swatch chips, boolean → toggle buttons.
//
//   Sections COLLAPSE (accordion) so the rail never grows a scrollbar —
//   the design spec is explicit: no scroll containers in the sidebar.
//   Sections with active selections stay open.
//
//   Sort: FEATURED (catalog order) / PRICE asc+desc / TOP RATED / NEWEST.
//   Grid: the same catalog card the /shop collection uses.
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
  materials?: string | null
  specs?: string | null
  ingredients?: string | null
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

// ---- sidebar navigation (the design library's category sidebar) ----
export type BrowserNavItem = { id: number; name: string; slug: string; count: number }
export type BrowserNavGroup = { label: string | null; items: BrowserNavItem[] }
export type BrowserNav = {
  /** The departments — links with live counts (never a tree). */
  departments: BrowserNavItem[]
  /** This route's department slug (rendered active). */
  activeSlug: string | null
  /** Department pages: the active department expands inline with its own
   *  subcategory group (wrapper label + leaves). Null otherwise. */
  expandedGroups: BrowserNavGroup[] | null
  /** Non-department pages: parent name + the subcategory links relevant to
   *  this route (the current one active). Null on department pages. */
  subSection: { heading: string; groups: BrowserNavGroup[]; currentSlug: string | null } | null
}

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
const sectionTitleCls = "text-[9.5px] font-bold tracking-[0.16em] text-ink uppercase"
const numInputCls =
  "w-full min-w-0 border border-gold/35 bg-cream px-2.5 py-2 text-[11px] text-ink placeholder:text-ink-soft/50 " +
  "focus:outline-none focus:ring-1 focus:ring-gold-deep [appearance:textfield] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

// Swatch hexes for the Color filter (fallback = soft gold).
const SWATCH: Record<string, string> = {
  black: "#1F1B18", white: "#F5F1EA", gray: "#9A938C", brown: "#7d441d",
  red: "#B0492F", orange: "#D97742", yellow: "#D9B94A", green: "#5F7A5A",
  blue: "#5A7188", purple: "#8A6E8F", pink: "#D9A8A8", multicolor: "linear-gradient(135deg,#D9B94A 0%,#B0492F 50%,#5A7188 100%)",
}

const centsOf = (p: BrowserProduct) => parsePriceToCents(p.price)
const inStock = (p: BrowserProduct) => (p.stock == null ? true : p.stock > 0)

// Full text of a product, lowercased — the live data the filters match on.
function searchTextOf(p: BrowserProduct): string {
  return [p.name, p.category, p.shortDescription, p.description, p.materials, p.specs, p.ingredients]
    .filter(Boolean)
    .join(" · ")
    .toLowerCase()
}

// Does a filter VALUE name match the product text? Multi-word names match as
// a phrase; tiny tokens (S, M, L…) must match on word boundaries so they
// don't hit random letters.
function valueMatches(text: string, valueName: string): boolean {
  const v = valueName.toLowerCase()
  if (v.length <= 3) return new RegExp(`(^|[^a-z0-9])${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text)
  return text.includes(v)
}

// ---------------------------------------------------------------------------
// Accordion section — collapsible so the rail never grows a scrollbar.
// A section with active selections stays open (its badge shows the count).
// ---------------------------------------------------------------------------
function Section({
  id,
  title,
  badge,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  badge: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-gold/15 pb-3.5 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`filter-section-${id}`}
        className="flex w-full cursor-pointer items-center justify-between py-1.5 text-left"
      >
        <span className="flex items-center gap-1.5">
          <span className={sectionTitleCls}>{title}</span>
          {badge > 0 && (
            <span className="flex h-3.5 min-w-3.5 items-center justify-center bg-gold-deep px-1 text-[8px] font-bold leading-none text-cream">
              {badge}
            </span>
          )}
        </span>
        <CaretDown
          size={11}
          weight="bold"
          aria-hidden="true"
          className={`shrink-0 text-ink-soft transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div id={`filter-section-${id}`} className="mt-2.5">
          {children}
        </div>
      )}
    </div>
  )
}

export function CategoryBrowser({
  node,
  products,
  ratings,
  filters,
  nav,
}: {
  node: BrowserCategory
  products: BrowserProduct[]
  ratings: Record<string, BrowserRating>
  filters: BrowserFilter[]
  nav: BrowserNav
}) {
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [buckets, setBuckets] = useState<string[]>([])
  const [minRating, setMinRating] = useState(0)
  const [stockOnly, setStockOnly] = useState(false)
  const [backorderOnly, setBackorderOnly] = useState(false)
  // Selected mapped-filter values: { [filterId]: Set<valueSlug> } — booleans
  // store the filter's own slug under its id.
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<SortKey>("featured")
  const [mobileOpen, setMobileOpen] = useState(false)
  // Accordion open state — undefined falls back to the default map.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

  const texts = useMemo(() => products.map((p) => ({ p, t: searchTextOf(p) })), [products])

  // ---- price bucket availability ----
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
    return [5, 4, 3]
      .map((v) => ({
        value: v,
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

  // ---- mapped filters (everything except the special-cased ones) ----
  const mappedFilters = useMemo(
    () =>
      filters
        .filter((f) => !["price", "rating", "availability", "brand", "material"].includes(f.slug))
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [filters],
  )

  // Brand + Material have no values in the live framework yet — their section
  // names ride along under the mapped list when present but empty, exactly
  // like the old "coming" line.
  const frameworkWithoutValues = useMemo(
    () => filters.filter((f) => ["brand", "material"].includes(f.slug)),
    [filters],
  )

  // Default accordion state per the design library's sidebar (rating closed,
  // sections stay compact so the sticky rail fits the viewport). Only PRICE
  // opens by default; sections with active selections are always open.
  const defaultOpen = useMemo(() => {
    const map: Record<string, boolean> = { price: true }
    return map
  }, [])

  const sectionOpen = (key: string, hasActive: boolean) =>
    hasActive || (openSections[key] ?? defaultOpen[key] ?? false)

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !(sectionOpen(key, false)) }))

  const toggleValue = (filterId: number, valueSlug: string) => {
    setSelected((prev) => {
      const cur = prev[filterId] || []
      const next = cur.includes(valueSlug) ? cur.filter((v) => v !== valueSlug) : [...cur, valueSlug]
      const out = { ...prev }
      if (next.length === 0) delete out[filterId]
      else out[filterId] = next
      return out
    })
  }

  const activeCount =
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0) +
    buckets.length +
    (minRating > 0 ? 1 : 0) +
    (stockOnly ? 1 : 0) +
    (backorderOnly ? 1 : 0) +
    Object.keys(selected).length

  const clearAll = () => {
    setMinPrice("")
    setMaxPrice("")
    setBuckets([])
    setMinRating(0)
    setStockOnly(false)
    setBackorderOnly(false)
    setSelected({})
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
    const valueNameBySlug = new Map<string, string>()
    for (const f of mappedFilters) for (const v of f.values) valueNameBySlug.set(v.slug, v.name)
    const filterById = new Map(mappedFilters.map((f) => [f.id, f]))

    return products.filter((p, idx) => {
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

      // Mapped filters: AND across sections, OR within a section.
      const t = texts[idx].t
      for (const [fidStr, slugs] of Object.entries(selected)) {
        const f = filterById.get(Number(fidStr))
        if (!f || slugs.length === 0) continue
        // Boolean filter: its own name is the value (match against text).
        if (f.filterType === "boolean") {
          const any = slugs.some((s) => {
            if (s === f.slug) return t.includes(f.name.toLowerCase())
            const name = valueNameBySlug.get(s)
            return name ? valueMatches(t, name) : false
          })
          if (!any) return false
          continue
        }
        const any = slugs.some((s) => {
          const name = valueNameBySlug.get(s)
          return name ? valueMatches(t, name) : false
        })
        if (!any) return false
      }
      return true
    })
  }, [products, texts, ratings, minPrice, maxPrice, buckets, minRating, stockOnly, backorderOnly, selected, mappedFilters])

  // ---- sorting ----
  const sorted = useMemo(() => {
    const arr = [...visible]
    const nameOf = (p: BrowserProduct) => String(p.name)
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

  const checkRowCls = "flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft"
  const checkBoxCls = "h-3.5 w-3.5 shrink-0 accent-gold-deep"

  // Count of products matching a value (for facet counts).
  const countFor = (valueName: string) => texts.filter(({ t }) => valueMatches(t, valueName)).length
  const countForName = (name: string) => texts.filter(({ t }) => t.includes(name.toLowerCase())).length

  // ---- the rail (shared by desktop sidebar + mobile collapsible) ----
  const priceActive =
    (minPrice.trim() ? 1 : 0) + (maxPrice.trim() ? 1 : 0) + buckets.length
  const rail = (
    <div className="space-y-3.5" aria-label={`Filters for ${node.name}`}>
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

      {/* CATEGORIES — the departments as links with counts. The current
          route's department is active and, on department pages, expands
          inline to present THIS route's subcategories only (wrapper label +
          leaves). Never the full taxonomy tree, never a scrollbar. */}
      <div>
        <p className={sectionTitleCls}>Categories</p>
        <ul className="mt-2.5 space-y-0.5">
          {nav.departments.map((d) => {
            const isActive = d.slug === nav.activeSlug
            return (
              <li key={d.id} className="space-y-1">
                <Link
                  href={`/shop/category/${d.slug}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between rounded-sm px-1.5 py-1.5 text-[10px] font-bold tracking-[0.08em] transition-colors ${
                    isActive
                      ? "bg-cream-deep/70 text-gold-deep"
                      : "text-ink-soft hover:bg-gold/5 hover:text-gold-deep"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {isActive && (
                      <span className="h-1.5 w-1.5 shrink-0 bg-gold-deep" aria-hidden="true" />
                    )}
                    <span className="truncate">{d.name.toUpperCase()}</span>
                  </span>
                  <span
                    className={`ml-2 shrink-0 text-[9.5px] font-bold ${
                      isActive ? "text-gold-deep" : "text-ink-soft/60"
                    }`}
                  >
                    {d.count}
                  </span>
                </Link>

                {/* Department pages: the ACTIVE department presents its own
                    subcategory group inline — wrapper label + leaves (or
                    direct leaves). This is the repo's sidebar pattern. */}
                {isActive && nav.expandedGroups && (
                  <div className="mt-1 space-y-1 border-l border-gold/25 pl-2">
                    {nav.expandedGroups.map((g, gi) => (
                      <div key={gi} className="space-y-0.5">
                        {g.label && (
                          <p className="px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.14em] text-ink-soft/60 uppercase">
                            {g.label}
                          </p>
                        )}
                        <ul className="space-y-0">
                          {g.items.map((s) => (
                            <li key={s.id}>
                              <Link
                                href={`/shop/category/${s.slug}`}
                                className="flex items-center justify-between rounded-sm px-1.5 py-[3px] text-[9.5px] text-ink-soft transition-colors hover:bg-gold/5 hover:text-gold-deep"
                              >
                                <span className="truncate">{s.name}</span>
                                <span className="ml-2 shrink-0 text-[9px] text-ink-soft/50">
                                  {s.count}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* SUBCATEGORY SECTION — non-department pages: the parent's name + the
          subcategory links relevant to this route, the current one active. */}
      {nav.subSection && (
        <>
          <div className="h-px bg-gold/15" />
          <div>
            <p className={sectionTitleCls}>{nav.subSection.heading}</p>
            <ul className="mt-2.5 space-y-0.5">
              {nav.subSection.groups.map((g, gi) => (
                <div key={gi} className="space-y-0.5">
                  {g.label && (
                    <p className="px-1.5 py-0.5 text-[8.5px] font-bold tracking-[0.14em] text-ink-soft/60 uppercase">
                      {g.label}
                    </p>
                  )}
                  <ul className="space-y-0">
                    {g.items.map((s) => {
                      const isCurrent = s.slug === nav.subSection!.currentSlug
                      return (
                        <li key={s.id}>
                          <Link
                            href={`/shop/category/${s.slug}`}
                            aria-current={isCurrent ? "page" : undefined}
                            className={`flex items-center justify-between rounded-sm px-1.5 py-[3px] text-[9.5px] transition-colors ${
                              isCurrent
                                ? "bg-cream-deep/70 font-bold text-gold-deep"
                                : "text-ink-soft hover:bg-gold/5 hover:text-gold-deep"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              {isCurrent && (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 bg-gold-deep"
                                  aria-hidden="true"
                                />
                              )}
                              <span className="truncate">{s.name}</span>
                            </span>
                            <span className="ml-2 shrink-0 text-[9px] text-ink-soft/50">
                              {s.count}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="h-px bg-gold/15" />

      {/* PRICE — range + data-backed quick buckets */}
      <Section
        id="price"
        title="Price"
        badge={priceActive}
        open={sectionOpen("price", priceActive > 0)}
        onToggle={() => toggleSection("price")}
      >
        <div className="flex items-center gap-2">
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
              <label key={b.key} className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={buckets.includes(b.key)}
                  onChange={() => toggleBucket(b.key)}
                  className={checkBoxCls}
                />
                <span className="flex-1">{b.label}</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{b.count}</span>
              </label>
            ))}
          </div>
        )}
      </Section>

      {/* RATING — star rows, floor semantics (only when rated products exist) */}
      {ratingOptions.length > 0 && (
        <Section
          id="rating"
          title="Rating"
          badge={minRating > 0 ? 1 : 0}
          open={sectionOpen("rating", minRating > 0)}
          onToggle={() => toggleSection("rating")}
        >
          <div className="space-y-1.5">
            {ratingOptions.map((o) => (
              <label key={o.value} className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={minRating === o.value}
                  onChange={() => setMinRating(minRating === o.value ? 0 : o.value)}
                  className={checkBoxCls}
                />
                <span className="flex-1">
                  <span className="tracking-[0.1em] text-gold-deep">{"★".repeat(o.value)}</span>
                  <span className="ml-1.5 text-ink-soft">{o.value === 5 ? "5 Stars" : `${o.value}+ Stars`}</span>
                </span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{o.count}</span>
              </label>
            ))}
          </div>
        </Section>
      )}

      {/* AVAILABILITY — options that actually match products */}
      {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
        <Section
          id="availability"
          title="Availability"
          badge={(stockOnly ? 1 : 0) + (backorderOnly ? 1 : 0)}
          open={sectionOpen("availability", stockOnly || backorderOnly)}
          onToggle={() => toggleSection("availability")}
        >
          <div className="space-y-1.5">
            {stockCounts.inStock > 0 && (
              <label className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={() => setStockOnly((v) => !v)}
                  className={checkBoxCls}
                />
                <span className="flex-1">In stock</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{stockCounts.inStock}</span>
              </label>
            )}
            {stockCounts.backordered > 0 && (
              <label className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={backorderOnly}
                  onChange={() => setBackorderOnly((v) => !v)}
                  className={checkBoxCls}
                />
                <span className="flex-1">Backordered</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{stockCounts.backordered}</span>
              </label>
            )}
          </div>
        </Section>
      )}

      {/* MAPPED FILTERS — the taxonomy framework for this category, one
          accordion per section. Select → checkbox rows w/ counts · Color →
          swatches · Boolean → toggle buttons. Count-0 values render dimmed
          (honest dead-state). */}
      {mappedFilters.map((f) => {
        const selectedVals = selected[f.id] || []
        const isColor = f.slug === "color"
        const isBool = f.filterType === "boolean"

        if (isBool) {
          const on = selectedVals.includes(f.slug)
          const count = countForName(f.name)
          return (
            <Section
              key={f.id}
              id={`f${f.id}`}
              title={f.name}
              badge={selectedVals.length}
              open={sectionOpen(`f${f.id}`, selectedVals.length > 0)}
              onToggle={() => toggleSection(`f${f.id}`)}
            >
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleValue(f.id, f.slug)}
                  aria-pressed={on}
                  className={`py-1.5 text-[10px] font-bold tracking-[0.08em] transition-colors ${
                    on
                      ? "border border-gold-deep bg-gold-deep text-cream"
                      : count > 0
                        ? "border border-gold/35 bg-cream text-ink-soft hover:border-gold-deep hover:text-gold-deep"
                        : "cursor-default border border-gold/20 bg-cream/50 text-ink-soft/40"
                  }`}
                >
                  {f.name.toUpperCase()}
                </button>
              </div>
            </Section>
          )
        }

        if (f.values.length === 0) return null
        return (
          <Section
            key={f.id}
            id={`f${f.id}`}
            title={f.name}
            badge={selectedVals.length}
            open={sectionOpen(`f${f.id}`, selectedVals.length > 0)}
            onToggle={() => toggleSection(`f${f.id}`)}
          >
            {isColor ? (
              <div className="flex flex-wrap gap-1.5">
                {f.values.map((v) => {
                  const on = selectedVals.includes(v.slug)
                  const count = countFor(v.name)
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => count > 0 && toggleValue(f.id, v.slug)}
                      aria-pressed={on}
                      aria-label={`${f.name}: ${v.name}${count === 0 ? " (no matches)" : ""}`}
                      className={`flex items-center gap-1.5 border px-2 py-1 text-[10px] transition-colors ${
                        on
                          ? "border-gold-deep bg-gold/15 text-ink"
                          : count > 0
                            ? "border-gold/30 bg-cream text-ink-soft hover:border-gold-deep"
                            : "cursor-default border-gold/15 bg-cream/50 text-ink-soft/40"
                      }`}
                    >
                      <span
                        className="h-3 w-3 border border-ink/15"
                        style={{ background: SWATCH[v.slug] || "rgba(157,124,64,0.35)" }}
                        aria-hidden="true"
                      />
                      {v.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-1.5">
                {f.values.map((v) => {
                  const on = selectedVals.includes(v.slug)
                  const count = countFor(v.name)
                  return (
                    <label
                      key={v.id}
                      className={count > 0 ? checkRowCls : `${checkRowCls} cursor-default opacity-40`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => count > 0 && toggleValue(f.id, v.slug)}
                        className={checkBoxCls}
                      />
                      <span className="flex-1">{v.name}</span>
                      <span className="text-[9.5px] font-bold text-ink-soft/70">{count}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </Section>
        )
      })}

      {/* Framework filters with no values yet — names only, never fake controls */}
      {frameworkWithoutValues.length > 0 && (
        <div className="border-t border-gold/15 pt-3.5">
          <p className="text-[9px] font-bold tracking-[0.14em] text-ink-soft/70">
            MORE FILTERS COMING TO THIS CATEGORY
          </p>
          <p className="mt-1.5 line-clamp-3 text-[10.5px] leading-[1.7] text-ink-soft">
            {frameworkWithoutValues.map((f) => f.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      {/* Desktop filter rail — STICKY while the page expands. Natural height,
          accordions collapse, NO scrollbar ever (the spec forbids scroll
          containers in the sidebar). */}
      <aside className="hidden w-[220px] shrink-0 self-start border border-gold/25 bg-card p-5 lg:sticky lg:top-8 lg:block">
        {rail}
      </aside>

      <div className="min-w-0">
        {/* Toolbar: product count + mobile FILTERS toggle + sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/25 pb-4">
          <p className="text-[10px] font-bold tracking-[0.14em] text-ink-soft">
            {sorted.length === products.length
              ? `${products.length} ${products.length === 1 ? "PRODUCT" : "PRODUCTS"}`
              : `${sorted.length} OF ${products.length} PRODUCTS`}
          </p>

          <div className="flex items-center gap-3">
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
        </div>

        {/* Mobile collapsible filter panel (same rail content) */}
        {mobileOpen && (
          <div className="mt-4 border border-gold/25 bg-card p-5 lg:hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {rail}
          </div>
        )}

        {/* Product grid — the same catalog card as the shop collection.
            Empty categories keep the rail (filters); the empty card lives in
            the content column. */}
        {sorted.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-3">
            {sorted.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}

        {sorted.length === 0 && (
          <div className="mt-8 border border-gold/30 bg-cream-deep/50 px-6 py-12 text-center">
            {products.length === 0 ? (
              <>
                <PawPrint size={36} className="mx-auto text-gold/40" />
                <h2 className="mt-4 font-display text-[22px] text-ink">No products here yet</h2>
                <p className="mx-auto mt-2 max-w-sm text-[12px] leading-[1.8] text-ink-soft">
                  This category is part of our expanding collection — check back soon.
                </p>
                <div className="mt-6">
                  <Link href="/shop" className="btn-gold">BROWSE THE COLLECTION</Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-ink-soft">No products match your filters.</p>
                <button type="button" onClick={clearAll} className="btn-ghost mt-5">
                  CLEAR FILTERS
                </button>
              </>
            )}
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
