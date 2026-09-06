"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, Funnel, PawPrint, X } from "@phosphor-icons/react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Category Browser — the /shop/category/[slug] collection view.
//
//   Left rail (desktop, sticky) / collapsible panel (mobile):
//   DEPARTMENTS  — the 10 root categories as LINKS with live product counts;
//                 the active department auto-expands its intermediate and
//                 leaf nodes (indented links, exactly like the spec sidebar).
//   PRICE        — min/max inputs + data-backed quick buckets.
//   RATING       — star-row checkboxes (5 / 4 / 3 stars, floor semantics).
//   MAPPED
//   FILTERS      — every filter the taxonomy maps to this category, rendered
//                 per type: select → checkbox rows w/ live counts, color →
//                 swatch chips, boolean → toggle buttons. Products are
//                 matched against their live text (name, description,
//                 materials, specs, ingredients). Values that match nothing
//                 render dimmed — never a dead control that pretends to work.
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

export type BrowserNavNode = {
  id: number
  name: string
  slug: string
  productCount: number
  children: BrowserNavNode[]
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

// Is a node (or any descendant) the active category?
function subtreeHas(node: BrowserNavNode, id: number): boolean {
  if (node.id === id) return true
  return node.children.some((c) => subtreeHas(c, id))
}

export function CategoryBrowser({
  node,
  navTree,
  products,
  ratings,
  filters,
}: {
  node: BrowserCategory
  navTree: BrowserNavNode[]
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
  // Selected mapped-filter values: { [filterId]: Set<valueSlug> } — booleans
  // store the filter's own slug under its id.
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [sort, setSort] = useState<SortKey>("featured")
  const [mobileOpen, setMobileOpen] = useState(false)

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

  // ---- departments nav: which root is the active department? ----
  const activeRoot = navTree.find((r) => subtreeHas(r, node.id))

  const checkRowCls = "flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft"
  const checkBoxCls = "h-3.5 w-3.5 shrink-0 accent-gold-deep"

  // Count of products matching a value (for facet counts).
  const countFor = (valueName: string) => texts.filter(({ t }) => valueMatches(t, valueName)).length
  const countForName = (name: string) => texts.filter(({ t }) => t.includes(name.toLowerCase())).length

  // ---- the rail (shared by desktop sidebar + mobile collapsible) ----
  const rail = (
    <div className="space-y-6" aria-label={`Filters for ${node.name}`}>
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

      {/* DEPARTMENTS — links, counts, active root expands its subcategories */}
      {navTree.length > 0 && (
        <div>
          <p className={railHeadingCls}>Departments</p>
          <ul className="mt-2.5 space-y-0.5">
            <li>
              <Link
                href="/shop"
                className="flex items-center justify-between rounded-sm px-1.5 py-1.5 text-[10.5px] font-bold tracking-[0.08em] text-ink transition-colors hover:bg-gold/5 hover:text-gold-deep"
              >
                <span>ALL PRODUCTS</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{products.length}</span>
              </Link>
            </li>
            {navTree.map((root) => {
              const isActive = activeRoot?.id === root.id
              return (
                <li key={root.id} className="space-y-0.5">
                  <Link
                    href={`/shop/category/${root.slug}`}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center justify-between rounded-sm px-1.5 py-1.5 transition-colors ${
                      isActive
                        ? "bg-gold/10 text-[10.5px] font-bold tracking-[0.08em] text-gold-deep"
                        : "text-[10.5px] font-bold tracking-[0.08em] text-ink hover:bg-gold/5 hover:text-gold-deep"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isActive && <span className="h-1.5 w-1.5 shrink-0 bg-gold-deep" aria-hidden="true" />}
                      <span className="truncate">{root.name.toUpperCase()}</span>
                    </span>
                    <span className="shrink-0 text-[9.5px] font-bold text-ink-soft/70">{root.productCount}</span>
                  </Link>
                  {/* active department: intermediate + leaf links, indented */}
                  {isActive &&
                    root.children.map((child) => (
                      <div key={child.id} className="pl-3">
                        <Link
                          href={`/shop/category/${child.slug}`}
                          aria-current={node.id === child.id ? "page" : undefined}
                          className={`flex items-center justify-between rounded-sm px-1.5 py-1 transition-colors ${
                            node.id === child.id
                              ? "text-[10.5px] font-bold text-gold-deep"
                              : "text-[10.5px] text-ink-soft hover:text-gold-deep"
                          }`}
                        >
                          <span className="truncate">{child.name}</span>
                          <span className="shrink-0 text-[9.5px] font-bold text-ink-soft/60">{child.productCount}</span>
                        </Link>
                        {child.children.map((leaf) => (
                          <Link
                            key={leaf.id}
                            href={`/shop/category/${leaf.slug}`}
                            aria-current={node.id === leaf.id ? "page" : undefined}
                            className={`flex items-center justify-between rounded-sm py-[5px] pl-4 pr-1.5 transition-colors ${
                              node.id === leaf.id
                                ? "text-[10.5px] font-bold text-gold-deep"
                                : "text-[10.5px] text-ink-soft/90 hover:text-gold-deep"
                            }`}
                          >
                            <span className="truncate">{leaf.name}</span>
                            <span className="shrink-0 text-[9.5px] font-bold text-ink-soft/60">{leaf.productCount}</span>
                          </Link>
                        ))}
                      </div>
                    ))}
                </li>
              )
            })}
          </ul>
        </div>
      )}

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
      </div>

      {/* RATING — star rows, floor semantics (only when rated products exist) */}
      {ratingOptions.length > 0 && (
        <div>
          <p className={railHeadingCls}>Rating</p>
          <div className="mt-2.5 space-y-1.5">
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
        </div>
      )}

      {/* AVAILABILITY — options that actually match products */}
      {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
        <div>
          <p className={railHeadingCls}>Availability</p>
          <div className="mt-2.5 space-y-1.5">
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
        </div>
      )}

      {/* MAPPED FILTERS — the taxonomy framework for this category.
          Select → checkbox rows w/ counts · Color → swatches · Boolean →
          toggle buttons. Count-0 values render dimmed (honest dead-state). */}
      {mappedFilters.map((f) => {
        const selectedVals = selected[f.id] || []
        const isColor = f.slug === "color"
        const isBool = f.filterType === "boolean"

        if (isBool) {
          const on = selectedVals.includes(f.slug)
          const count = countForName(f.name)
          return (
            <div key={f.id}>
              <p className={railHeadingCls}>{f.name}</p>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
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
            </div>
          )
        }

        if (f.values.length === 0) return null
        return (
          <div key={f.id}>
            <p className={railHeadingCls}>{f.name}</p>
            {isColor ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
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
              <div className="mt-2.5 space-y-1.5">
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
          </div>
        )
      })}

      {/* Framework filters with no values yet — names only, never fake controls */}
      {frameworkWithoutValues.length > 0 && (
        <div className="border-t border-gold/15 pt-4">
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
      {/* Desktop filter rail — sticky while the catalog scrolls */}
      <aside className="hidden w-[220px] shrink-0 self-start border border-gold/25 bg-card p-5 lg:sticky lg:top-8 lg:block lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
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
            Empty categories keep the rail (departments nav + filters); the
            empty card lives in the content column. */}
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
