"use client"

import { useMemo, useState, Fragment } from "react"
import Link from "next/link"
import { Plus, Funnel, PawPrint, CaretDown } from "@phosphor-icons/react"
import { SlidersHorizontal } from "lucide-react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Category Browser — the /shop/category/[slug] collection view.
//
//   The departments live in the header MEGA MENU (every shop route), so the
//   sidebar stays CLEAN with just the subcategories:
//
//   Left rail (desktop, STICKY — the page expands, never a scrollbar) /
//   collapsible panel (mobile):
//   FILTERS header (serif + sliders icon) + Clear all
//   SUBCATEGORIES  — the only nav: THIS route's subcategory links (department
//                    pages: wrapper label + leaves; sub pages: the parent's
//                    group with the current one active).
//   PRICE RANGE     — the range SLIDER + "$ min to $ max" inputs.
//   RATING / AVAILABILITY / FACETS — visible by default below price (the
//                    /shop landing's filter card treatment: star rows, In
//                    stock / Backordered, checkbox rows w/ live counts,
//                    color → swatch squares, boolean → button tiles). The
//                    toolbar FILTERS icon toggles them; selections keep them
//                    surfaced.
//
//   Sort: Best selling / Price asc+desc / Customer Rating / Newest Arrivals.
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

// ---- sidebar navigation (the route's subcategories — the departments live
// in the header mega menu, not here) ----
export type BrowserNavItem = { id: number; name: string; slug: string; count: number }
export type BrowserNavGroup = { label: string | null; items: BrowserNavItem[] }
export type BrowserNav = {
  /** Department pages: THIS route's subcategory group (wrapper label +
   *  leaves). Null otherwise. */
  expandedGroups: BrowserNavGroup[] | null
  /** Non-department pages: parent name + the subcategory links relevant to
   *  this route (the current one active). Null on department pages. */
  subSection: { heading: string; groups: BrowserNavGroup[]; currentSlug: string | null } | null
}

type SortKey = "featured" | "price-asc" | "price-desc" | "rating" | "newest"

// Sort labels per the design library's toolbar.
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Best selling" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Customer Rating" },
  { value: "newest", label: "Newest Arrivals" },
]

// Swatch hexes for the Color filter (fallback = soft gold).
const SWATCH: Record<string, string> = {
  black: "#1F1B18", white: "#F5F1EA", gray: "#9A938C", brown: "#7d441d",
  red: "#B0492F", orange: "#D97742", yellow: "#D9B94A", green: "#5F7A5A",
  blue: "#5A7188", purple: "#8A6E8F", pink: "#D9A8A8", multicolor: "linear-gradient(135deg,#D9B94A 0%,#B0492F 50%,#5A7188 100%)",
}

const centsOf = (p: BrowserProduct) => parsePriceToCents(p.price)

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

const numSpinCls =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

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
  const [minRating, setMinRating] = useState(0)
  // Selected mapped-filter values: { [filterId]: Set<valueSlug> } — booleans
  // store the filter's own slug under its id.
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<SortKey>("featured")
  const [mobileOpen, setMobileOpen] = useState(false)
  // The FILTERS icon state: the rail renders subcategories + price by default;
  // the FILTERS icon in the toolbar surfaces the facet sections (rating /
  // availability / mapped rows) below price ON CLICK. Selections keep them
  // surfaced. (Reference behavior — the imported repo's category pages.)
  const [facetsOpen, setFacetsOpen] = useState(false)
  // Availability buckets ("instock" / "backorder") — same rule as the
  // /shop landing sidebar: stock == null → in stock; stock === 0 → backorder.
  const [stockBuckets, setStockBuckets] = useState<string[]>([])

  const texts = useMemo(() => products.map((p) => ({ p, t: searchTextOf(p) })), [products])

  // ---- mapped filters (everything except the special-cased ones: price,
  // rating and availability carry dedicated sections; brand and material
  // render as regular checkbox rows like the reference) ----
  const mappedFilters = useMemo(
    () =>
      filters
        .filter((f) => !["price", "rating", "availability"].includes(f.slug))
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [filters],
  )

  // ---- rating rows (repo markup: 5 / 4+ / 3+ Stars) ----
  const ratingRows = useMemo(() => {
    const rated = products.filter((p) => (ratings[p.id]?.count ?? 0) > 0)
    if (rated.length === 0) return []
    return [5, 4, 3].map((v) => ({
      stars: v,
      count: rated.filter((p) => (ratings[p.id]?.avg ?? 0) >= v).length,
    }))
  }, [products, ratings])

  // ---- price bounds for the range slider (live data) ----
  const priceBounds = useMemo(() => {
    const cs = products.map(centsOf).filter((c): c is number => c != null)
    if (cs.length === 0) return { min: 0, max: 100 }
    const min = Math.floor(Math.min(...cs) / 100)
    const max = Math.ceil(Math.max(...cs) / 100)
    return { min, max: Math.max(max, min + 1) }
  }, [products])

  const sliderMax = useMemo(() => {
    const v = parseFloat(maxPrice)
    if (maxPrice.trim() !== "" && isFinite(v)) return Math.max(priceBounds.min, Math.min(priceBounds.max, Math.round(v)))
    return priceBounds.max
  }, [maxPrice, priceBounds])

  const activeCount =
    (minPrice.trim() ? 1 : 0) +
    (maxPrice.trim() ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (stockBuckets.length > 0 ? 1 : 0) +
    Object.keys(selected).length

  // Facets stay surfaced while any facet selection is live (the user must
  // always be able to see and clear what they checked).
  const hasFacetSelections =
    minRating > 0 || stockBuckets.length > 0 || Object.keys(selected).length > 0
  const showFacets = facetsOpen || hasFacetSelections

  // ---- availability counts (In stock / Backordered — live data) ----
  const stockCounts = useMemo(
    () => ({
      inStock: products.filter((p) => (p.stock == null ? true : p.stock > 0)).length,
      backordered: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  )

  // The desktop FILTERS toggle only renders when there is something to show.
  const hasAnyFacets =
    mappedFilters.length > 0 ||
    ratingRows.length > 0 ||
    stockCounts.inStock > 0 ||
    stockCounts.backordered > 0

  const clearAll = () => {
    setMinPrice("")
    setMaxPrice("")
    setMinRating(0)
    setStockBuckets([])
    setSelected({})
  }

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

  // ---- filtering ----
  const visible = useMemo(() => {
    const min = parseFloat(minPrice)
    const max = parseFloat(maxPrice)
    const hasMin = minPrice.trim() !== "" && isFinite(min)
    const hasMax = maxPrice.trim() !== "" && isFinite(max)
    const valueNameBySlug = new Map<string, string>()
    for (const f of mappedFilters) for (const v of f.values) valueNameBySlug.set(v.slug, v.name)
    const filterById = new Map(mappedFilters.map((f) => [f.id, f]))

    return products.filter((p, idx) => {
      const c = centsOf(p)
      if (hasMin && (c == null || c < Math.round(min * 100))) return false
      if (hasMax && (c == null || c > Math.round(max * 100))) return false
      if (minRating > 0) {
        const r = ratings[p.id]
        if (!r || r.count === 0 || r.avg < minRating) return false
      }

      // Availability: OR across the checked buckets.
      if (stockBuckets.length > 0) {
        const inStock = p.stock == null ? true : p.stock > 0
        const ok = stockBuckets.some((k) => (k === "instock" ? inStock : p.stock === 0))
        if (!ok) return false
      }

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
  }, [products, texts, ratings, minPrice, maxPrice, minRating, stockBuckets, selected, mappedFilters])

  // ---- sorting ----
  const sorted = useMemo(() => {
    const arr = [...visible]
    const nameOf = (p: BrowserProduct) => String(p.name)
    switch (sort) {
      case "price-asc":
        arr.sort((a, b) => (centsOf(a) ?? Infinity) - (centsOf(b) ?? Infinity) || nameOf(a).localeCompare(nameOf(b)))
        break
      case "price-desc":
        arr.sort((a, b) => (centsOf(b) ?? -Infinity) - (centsOf(a) ?? -Infinity) || nameOf(a).localeCompare(nameOf(b)))
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

  // Count of products matching a value (for facet counts).
  const countFor = (valueName: string) => texts.filter(({ t }) => valueMatches(t, valueName)).length
  const countForName = (name: string) => texts.filter(({ t }) => t.includes(name.toLowerCase())).length

  // ---- the rail (shared by desktop sidebar + mobile collapsible) — the
  // design library's exact sidebar markup ----
  const rail = (
    <div className="space-y-6" aria-label={`Filters for ${node.name}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#d8c2b7]/50 pb-3.5">
        <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-[#1F1B18]">
          <SlidersHorizontal className="h-4 w-4 text-[#7d441d]" aria-hidden="true" />
          Filters
        </h2>
        <button
          type="button"
          onClick={clearAll}
          className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-[#7d441d] hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* SUBCATEGORIES — the only nav in the rail (the departments live in
          the header mega menu, not here). Department pages present THIS
          route's subcategory group; sub pages present the parent's group
          with the current one active. */}
      {(nav.expandedGroups || nav.subSection) && (
        <div>
          <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
            {nav.subSection ? nav.subSection.heading : "Subcategories"}
          </h3>
          <ul className="space-y-1 text-xs">
            {(nav.subSection ? nav.subSection.groups : nav.expandedGroups!).map((g, gi) => (
              <div key={gi}>
                {g.label && (
                  <div className="py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#85736a]">
                    {g.label}
                  </div>
                )}
                <ul className="space-y-1">
                  {g.items.map((s) => {
                    const isCurrent = s.slug === nav.subSection?.currentSlug
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/shop/category/${s.slug}`}
                          aria-current={isCurrent ? "page" : undefined}
                          className={`flex items-center rounded-none px-2 py-1.5 transition ${
                            isCurrent
                              ? "bg-[#ebdcd4] font-bold text-[#7d441d]"
                              : "text-[#53443b] hover:bg-[#ebdcd4]/40 hover:text-[#1F1B18]"
                          }`}
                        >
                          <span>{s.name}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </ul>
        </div>
      )}

      <div className="h-px bg-[#d8c2b7]/50" />

      {/* PRICE RANGE — the repo's slider + $ min/max inputs */}
      <div>
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
          Price Range
        </h3>
        <div className="space-y-3">
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={sliderMax}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Maximum price"
            className="h-1 w-full cursor-pointer appearance-none rounded-none bg-[#d8c2b7]/50 accent-[#7d441d]"
          />
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-none border border-[#d8c2b7] bg-[#FAF8F5] px-2.5 py-1.5">
              <span className="mr-1 text-xs text-[#85736a]">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={String(priceBounds.min)}
                aria-label="Minimum price"
                className={`w-full border-0 bg-transparent p-0 text-xs text-[#1F1B18] outline-none focus:ring-0 ${numSpinCls}`}
              />
            </div>
            <span className="text-xs text-[#85736a]">to</span>
            <div className="flex flex-1 items-center rounded-none border border-[#d8c2b7] bg-[#FAF8F5] px-2.5 py-1.5">
              <span className="mr-1 text-xs text-[#85736a]">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={String(priceBounds.max)}
                aria-label="Maximum price"
                className={`w-full border-0 bg-transparent p-0 text-xs text-[#1F1B18] outline-none focus:ring-0 ${numSpinCls}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RATING — star checkbox rows, visible by default below price (same
          as the /shop landing filter card). */}
      {showFacets && ratingRows.length > 0 && (
        <>
          <div className="h-px bg-[#d8c2b7]/40" />
          <div>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
              Rating
            </h3>
            <div className="space-y-2 text-xs">
              {[5, 4, 3].map((stars) => (
                <label key={stars} className="flex cursor-pointer items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={minRating === stars}
                      onChange={() => setMinRating(minRating === stars ? 0 : stars)}
                      className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-[#7d441d]"
                    />
                    <span className="flex text-xs text-amber-500">
                      {"★".repeat(stars)}
                      {"☆".repeat(5 - stars)}
                    </span>
                  </div>
                  <span className="text-[#85736a]">{stars === 5 ? "5 Stars" : `${stars}+ Stars`}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* AVAILABILITY — In stock / Backordered (same rule + markup as the
          /shop landing sidebar: stock == null → in stock, stock === 0 →
          backordered; only rows that match products render). */}
      {showFacets && (stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
        <>
          <div className="h-px bg-[#d8c2b7]/40" />
          <div>
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
              Availability
            </h3>
            <div className="space-y-2 text-xs">
              {stockCounts.inStock > 0 && (
                <label className="flex cursor-pointer items-center justify-between text-xs text-[#53443b] hover:text-[#1F1B18]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stockBuckets.includes("instock")}
                      onChange={() =>
                        setStockBuckets((b) =>
                          b.includes("instock") ? b.filter((k) => k !== "instock") : [...b, "instock"],
                        )
                      }
                      className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-0"
                    />
                    <span>In stock</span>
                  </div>
                  <span className="text-[11px] text-[#85736a]">({stockCounts.inStock})</span>
                </label>
              )}
              {stockCounts.backordered > 0 && (
                <label className="flex cursor-pointer items-center justify-between text-xs text-[#53443b] hover:text-[#1F1B18]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stockBuckets.includes("backorder")}
                      onChange={() =>
                        setStockBuckets((b) =>
                          b.includes("backorder") ? b.filter((k) => k !== "backorder") : [...b, "backorder"],
                        )
                      }
                      className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-0"
                    />
                    <span>Backordered</span>
                  </div>
                  <span className="text-[11px] text-[#85736a]">({stockCounts.backordered})</span>
                </label>
              )}
            </div>
          </div>
        </>
      )}

      {/* MAPPED FILTER SECTIONS — checkbox rows w/ live counts · color →
          swatch squares · boolean → button tiles. Visible by default below
          price (all open, no accordions). */}
      {showFacets && mappedFilters.map((f) => {
        const selectedVals = selected[f.id] || []
        const isColor = f.slug === "color"
        const isBool = f.filterType === "boolean"

        if (isBool) {
          const on = selectedVals.includes(f.slug)
          const count = countForName(f.name)
          return (
            <Fragment key={f.id}>
              <div className="h-px bg-[#d8c2b7]/40" />
              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
                  {f.name}
                </h3>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleValue(f.id, f.slug)}
                    aria-pressed={on}
                    className={`cursor-pointer rounded-none py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? "border border-[#7d441d] bg-[#7d441d] text-white"
                        : count > 0
                          ? "border border-[#d8c2b7] bg-[#FAF8F5] text-[#53443b] hover:border-[#7d441d]"
                          : "cursor-default border border-[#d8c2b7] bg-[#FAF8F5] text-[#53443b]/40"
                    }`}
                  >
                    {f.name}
                  </button>
                </div>
              </div>
            </Fragment>
          )
        }

        if (f.values.length === 0) return null
        return (
          <Fragment key={f.id}>
            <div className="h-px bg-[#d8c2b7]/40" />
            <div>
              <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
                {f.name}
              </h3>
              {isColor ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {f.values.map((v) => {
                    const on = selectedVals.includes(v.slug)
                    const count = countFor(v.name)
                    return (
                      <button
                        key={v.id}
                        type="button"
                        title={`${v.name}${count === 0 ? " (0)" : ""}`}
                        aria-label={`${f.name}: ${v.name}`}
                        aria-pressed={on}
                        onClick={() => count > 0 && toggleValue(f.id, v.slug)}
                        style={{ backgroundColor: SWATCH[v.slug] || "rgba(157,124,64,0.35)" }}
                        className={`h-6 w-6 cursor-pointer rounded-none shadow-xs transition-transform hover:scale-105 ${
                          on ? "border-2 border-[#7d441d]" : "border border-[#d8c2b7]"
                        } ${count === 0 ? "cursor-default opacity-40" : ""}`}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  {f.values.map((v) => {
                    const on = selectedVals.includes(v.slug)
                    const count = countFor(v.name)
                    return (
                      <label
                        key={v.id}
                        className={`flex items-center justify-between text-xs text-[#53443b] ${
                          count > 0 ? "cursor-pointer hover:text-[#1F1B18]" : "cursor-default opacity-40"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => count > 0 && toggleValue(f.id, v.slug)}
                            className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-0"
                          />
                          <span>{v.name}</span>
                        </div>
                        <span className="text-[11px] text-[#85736a]">({count})</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </Fragment>
        )
      })}
    </div>
  )

  return (
    <div className="mt-2 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      {/* Desktop filter rail — the repo's sidebar card. STICKY while the page
          expands; natural height, no scroll container. Subcategories +
          price + the facet sections (rating / availability / mapped rows),
          all visible by default — the FILTERS icon toggles them. */}
      <aside
        id="collection-filters"
        className="hidden w-[220px] shrink-0 self-start space-y-6 rounded-none border border-[#d8c2b7]/70 bg-[#FAF8F5] p-5 shadow-xs lg:sticky lg:top-8 lg:block"
        data-purpose="product-filters"
      >
        {rail}
      </aside>

      <div className="min-w-0">
        {/* Toolbar — repo pattern: collection name + "Showing all N products"
            + the FILTERS icon (real: surfaces the facets) + Sort by select */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#d8c2b7]/60 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-display text-xl font-bold text-[#1F1B18]">{node.name}</h2>
            <p className="mt-0.5 text-xs text-[#85736a]">
              {sorted.length === products.length
                ? products.length === 1
                  ? "Showing 1 product"
                  : `Showing all ${products.length} products`
                : `Showing ${sorted.length} of ${products.length} products`}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* The FILTERS icon (desktop): collapses/expands the facet
                sections below price in the rail (they render open by
                default now). */}
            {hasAnyFacets && (
              <button
                type="button"
                onClick={() => setFacetsOpen((o) => !o)}
                aria-expanded={showFacets}
                aria-controls="collection-filters"
                className={`hidden min-h-[40px] cursor-pointer items-center gap-2 rounded-none border px-4 py-2 text-[9.5px] font-bold tracking-[0.14em] transition-colors lg:inline-flex ${
                  facetsOpen
                    ? "border-[#7d441d] bg-[#ebdcd4] text-[#7d441d]"
                    : "border-[#d8c2b7] bg-[#FAF8F5] text-[#53443b] hover:border-[#7d441d] hover:text-[#7d441d]"
                }`}
              >
                <Funnel size={12} weight="bold" />
                FILTERS
                {activeCount > 0 && (
                  <span className="flex h-[16px] min-w-[16px] items-center justify-center bg-[#7d441d] px-1 text-[8.5px] font-bold leading-none text-white">
                    {activeCount}
                  </span>
                )}
                <CaretDown
                  size={10}
                  weight="bold"
                  className={`text-[#7d441d] transition-transform duration-200 ${showFacets ? "rotate-180" : ""}`}
                />
              </button>
            )}

            {/* Mobile: the FILTERS icon opens the full rail panel (and
                surfaces the facets). */}
            <button
              type="button"
              onClick={() => {
                setFacetsOpen(true)
                setMobileOpen((o) => !o)
              }}
              aria-expanded={mobileOpen}
              aria-controls="collection-filters"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-none border border-[#d8c2b7] bg-[#FAF8F5] px-4 py-2 text-[9.5px] font-bold tracking-[0.14em] text-[#53443b] transition-colors hover:border-[#7d441d] hover:text-[#7d441d] lg:hidden"
            >
              <Funnel size={12} weight="bold" />
              FILTERS
              {activeCount > 0 && (
                <span className="flex h-[16px] min-w-[16px] items-center justify-center bg-[#7d441d] px-1 text-[8.5px] font-bold leading-none text-white">
                  {activeCount}
                </span>
              )}
              <Plus size={10} weight="bold" className={`transition-transform duration-300 ${mobileOpen ? "rotate-45" : ""}`} />
            </button>

            <label className="ml-auto flex items-center gap-2.5">
              <span className="hidden text-xs font-medium text-[#53443b] sm:inline">Sort by:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                aria-label="Sort products"
                className="cursor-pointer rounded-none border border-[#d8c2b7]/70 bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1F1B18] focus:border-[#7d441d] focus:outline-none"
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
          <div id="collection-filters-mobile" className="mt-4 animate-in fade-in slide-in-from-top-1 duration-150 rounded-none border border-[#d8c2b7]/70 bg-[#FAF8F5] p-5 lg:hidden">
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
          <div className="mt-8 rounded-none border border-[#d8c2b7]/60 bg-[#FAF8F5] px-6 py-12 text-center">
            {products.length === 0 ? (
              <>
                <PawPrint size={36} className="mx-auto text-[#d8c2b7]" />
                <h2 className="mt-4 font-display text-[22px] text-[#1F1B18]">No products here yet</h2>
                <p className="mx-auto mt-2 max-w-sm text-[12px] leading-[1.8] text-[#53443b]">
                  This category is part of our expanding collection — check back soon.
                </p>
                <div className="mt-6">
                  <Link href="/shop" className="btn-gold">BROWSE THE COLLECTION</Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-[#53443b]">No products match your filters.</p>
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
