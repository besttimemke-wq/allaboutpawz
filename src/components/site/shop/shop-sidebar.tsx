"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { X, ChevronDown, Search, Star, PawPrint, ChevronUp } from "lucide-react"
import { CATEGORY_ICONS as ICONS } from "./category-icons"
import type { FilterSection, NavCategory, MerchCollection } from "@/lib/shop/types"

// ---------------------------------------------------------------------------
// ShopSidebar — the desktop rail / mobile drawer for every PLP.
//
// Architecture (enterprise faceting — the Petco/Amazon model):
//   CATEGORIES  → navigation. Icon + name + count rows that LINK to the
//                 category route. NO checkboxes. The current category gets
//                 an active state (weight + background + icon tint).
//   FILTERS     → INSTANT-APPLY refinement. Every checkbox, price bucket, and
//                 rating row commits to the URL the moment it's clicked —
//                 shareable, server-rendered, no separate APPLY step. The
//                 results grid behind updates immediately. Price MIN/MAX
//                 inputs commit on Enter/blur so typing isn't thrashed.
//                 "Clear all" sits at the top of the section.
//
//   FACETS      → Multi-select checkbox facets (Brand, Flavor, Size, ...).
//                 Each section can be:
//                   • searchable — renders a search-within input above the list.
//                   • collapsible — collapses options beyond defaultVisible
//                     behind a "Show more" toggle.
//                 Selected values commit to the URL as ?key=v1,v2,v3.
// ---------------------------------------------------------------------------

export type SidebarData = {
  /** Top-level customer categories (Dog + departments). */
  categories: NavCategory[]
  /** New Arrivals / Sale — merchandising destinations. */
  merch: MerchCollection[]
  /** The current route's category node (null = shop-all). */
  current: NavCategory | null
  /** Current merch key when on /shop/new-arrivals or /shop/sale. */
  currentMerch: string | null
  /** Data-resolved filter sections for the current scope. */
  filterSections: FilterSection[]
  /** Applied URL state. */
  applied: AppliedUrl
}

export type AppliedUrl = {
  minPrice: string
  maxPrice: string
  priceBucket: string | null
  rating: string | null
  availability: string[]
  /** Multi-select facet values keyed by facet key (brand, flavor, size, ...). */
  facets: Record<string, string[]>
  /** Free-text query (?q=) from the header search bar. */
  q: string
}

const EMPTY_APPLIED: AppliedUrl = {
  minPrice: "",
  maxPrice: "",
  priceBucket: null,
  rating: null,
  availability: [],
  facets: {},
  q: "",
}

function countApplied(a: AppliedUrl): number {
  const facetCount = Object.values(a.facets).reduce((s, vs) => s + vs.length, 0)
  return (
    (a.minPrice.trim() ? 1 : 0) +
    (a.maxPrice.trim() ? 1 : 0) +
    (a.priceBucket ? 1 : 0) +
    (a.rating ? 1 : 0) +
    a.availability.length +
    facetCount +
    (a.q.trim() ? 1 : 0)
  )
}

export function ShopSidebar({ data, onClose }: { data: SidebarData; onClose?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()

  // The live filter state — kept in lockstep with the URL. Every change
  // COMMITS immediately (instant-apply faceting); there is no draft/apply
  // step, so the rail can never drift out of sync with the results.
  const [draft, setDraft] = useState<AppliedUrl>(data.applied)
  // Per-section search queries (keyed by section.key). Brand, Flavor, etc.
  const [sectionQueries, setSectionQueries] = useState<Record<string, string>>({})
  // Per-section "show more" toggles (keyed by section.key).
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const appliedCount = countApplied(data.applied)

  // ---- instant apply ----
  const buildHref = (next: AppliedUrl, path: string): string => {
    const params = new URLSearchParams()
    if (next.minPrice.trim()) params.set("minPrice", next.minPrice.trim())
    if (next.maxPrice.trim()) params.set("maxPrice", next.maxPrice.trim())
    if (next.priceBucket) params.set("priceBucket", next.priceBucket)
    if (next.rating) params.set("rating", next.rating)
    if (next.availability.length > 0) params.set("availability", next.availability.join(","))
    if (next.q.trim()) params.set("q", next.q.trim())
    for (const [key, values] of Object.entries(next.facets)) {
      if (values.length > 0) params.set(key, values.join(","))
    }
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
  }

  /** Commit a filter change to the URL — the results re-render server-side. */
  const commit = (next: AppliedUrl) => {
    setDraft(next)
    router.push(buildHref(next, pathname), { scroll: false })
  }

  const clearAll = () => {
    setDraft(EMPTY_APPLIED)
    setSectionQueries({})
    setExpandedSections({})
    router.push(pathname, { scroll: false })
  }

  // ---- helpers ----
  const toggleAvailability = (value: string) => {
    commit({
      ...draft,
      availability: draft.availability.includes(value)
        ? draft.availability.filter((v) => v !== value)
        : [...draft.availability, value],
    })
  }

  const toggleFacet = (key: string, value: string) => {
    const cur = draft.facets[key] || []
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
    commit({
      ...draft,
      facets: { ...draft.facets, [key]: next },
    })
  }

  const setBucket = (value: string) => {
    commit({ ...draft, priceBucket: draft.priceBucket === value ? null : value })
  }

  const setRating = (value: string) => {
    commit({ ...draft, rating: draft.rating === value ? null : value })
  }

  const isCurrent = (node: NavCategory | null) => {
    if (!node) return data.current == null && data.currentMerch == null
    if (data.current?.path === node.path) return true
    // Departments own their subtree (a leaf page keeps its department row
    // active, spec §4); the species row matches exactly only.
    return node.level === 1 && !!data.current?.path.startsWith(`${node.path}/`)
  }

  return (
    <div className="flex h-full flex-col bg-neutral-50">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <p className="text-[13px] font-bold tracking-[0.14em] text-ink">SHOP</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors hover:text-ink"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : (
          <span className="text-[9px] font-bold tracking-[0.14em] text-ink-soft/60">PAWZ &amp; CO.</span>
        )}
      </div>

      {/* ---- Scrollable body: CATEGORIES nav + FILTERS (instant-apply) ---- */}
      <div className="flex-1 overflow-y-auto px-5 pb-5 pt-5">
        {/* ================= CATEGORIES (navigation) ================= */}
        <nav aria-label="Shop categories">
          <p className="sectionLabel">CATEGORIES</p>
          <ul className="mt-3 space-y-0.5">
            {/* Shop-all row */}
            <li>
              <Link
                href="/shop"
                className={`navRow ${isCurrent(null) ? "navRowActive" : ""}`}
                aria-current={isCurrent(null) ? "page" : undefined}
              >
                <span className="navIconWrap">
                  <PawPrint className="h-[15px] w-[15px]" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <span className="navLabel">All Products</span>
                <CountTag n={data.categories.reduce((s, c) => s + c.count, 0)} />
              </Link>
            </li>

            {/* Species parents (Dog) + their departments as flat rows —
                the reference layout: Dog, Grooming, Wellness, Toys, … */}
            {data.categories.map((node) => {
              const Icon = ICONS[node.key] || PawPrint
              const active = isCurrent(node)
              return (
                <li key={node.key}>
                  <Link
                    href={node.path}
                    className={`navRow ${active ? "navRowActive" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="navIconWrap">
                      <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
                    </span>
                    <span className="navLabel">{node.displayName}</span>
                    <CountTag n={node.count} />
                  </Link>

                  {/* The species' departments render as top rows (nav, not
                      checkboxes); the active department additionally exposes
                      its subcategories as indented destinations. */}
                  <ul className="mt-0.5 space-y-0.5">
                    {node.children.map((c) => {
                      const CIcon = ICONS[c.key] || PawPrint
                      const cActive = isCurrent(c)
                      return (
                        <li key={c.key}>
                          <Link
                            href={c.path}
                            className={`navRow ${cActive ? "navRowActive" : ""}`}
                            aria-current={cActive ? "page" : undefined}
                          >
                            <span className="navIconWrap">
                              <CIcon className="h-[15px] w-[15px]" strokeWidth={1.7} />
                            </span>
                            <span className="navLabel">{c.displayName}</span>
                            <CountTag n={c.count} />
                          </Link>
                          {cActive && c.children.length > 0 && (
                            <ul className="mb-1 ml-[26px] space-y-0.5 border-l border-neutral-200 pl-3">
                              {c.children.map((gc) => (
                                <li key={gc.key}>
                                  <Link
                                    href={gc.path}
                                    className={`subRow ${data.current?.path === gc.path ? "subRowActive" : ""}`}
                                  >
                                    <span className="navLabel">{gc.displayName}</span>
                                    <CountTag n={gc.count} />
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}

            {/* Merchandising destinations */}
            {data.merch.length > 0 && (
              <li aria-hidden="true" className="my-3 border-t border-neutral-200" />
            )}
            {data.merch.map((m) => {
              const Icon = ICONS[m.key] || PawPrint
              const active = data.currentMerch === m.key
              return (
                <li key={m.key}>
                  <Link
                    href={m.path}
                    className={`navRow ${active ? "navRowActive" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="navIconWrap">
                      <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
                    </span>
                    <span className="navLabel">{m.displayName}</span>
                    <CountTag n={m.count} />
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ================= FILTERS (checkbox-driven) ================= */}
        {data.filterSections.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="sectionLabel">FILTERS{appliedCount > 0 ? ` (${appliedCount})` : ""}</p>
              {appliedCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[9px] font-bold tracking-[0.1em] uppercase text-gold-deep underline-offset-2 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mt-3 space-y-1">
              {data.filterSections.map((section) => (
                <FilterGroup key={section.kind === "check" ? section.key : section.kind} section={section}>
                  {section.kind === "price" && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <PriceInput
                          label="Min"
                          value={draft.minPrice}
                          placeholder="MIN"
                          onChange={(v) => setDraft((d) => ({ ...d, minPrice: v, priceBucket: null }))}
                          onCommit={() => commit(draft)}
                        />
                        <span className="text-[11px] text-ink-soft/70">—</span>
                        <PriceInput
                          label="Max"
                          value={draft.maxPrice}
                          placeholder="MAX"
                          onChange={(v) => setDraft((d) => ({ ...d, maxPrice: v, priceBucket: null }))}
                          onCommit={() => commit(draft)}
                        />
                      </div>
                      <ul className="space-y-0.5">
                        {section.buckets.map((b) => (
                          <li key={b.value}>
                            <CheckRow
                              checked={draft.priceBucket === b.value}
                              onToggle={() => setBucket(b.value)}
                              label={b.label}
                              count={b.count}
                              name="Price"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {section.kind === "rating" && (
                    <ul className="space-y-0.5">
                      {section.rows.map((r) => (
                        <li key={r.value}>
                          <CheckRow
                            checked={draft.rating === r.value}
                            onToggle={() => setRating(r.value)}
                            label={
                              <span className="flex items-center gap-1.5">
                                <span className="flex items-center gap-[1px]" aria-hidden="true">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-[11px] w-[11px] ${
                                        i < Number.parseInt(r.value, 10)
                                          ? "fill-gold-deep text-gold-deep"
                                          : "fill-none text-ink-soft/40"
                                      }`}
                                      strokeWidth={1.5}
                                    />
                                  ))}
                                </span>
                                <span className="sr-only">{r.label}</span>
                                <span aria-hidden="true" className="text-[10px] text-ink-soft">
                                  &amp; up
                                </span>
                              </span>
                            }
                            count={r.count}
                            name={`Rating ${r.label}`}
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.kind === "check" && section.key === "availability" && (
                    <ul className="space-y-0.5">
                      {section.options.map((o) => (
                        <li key={o.value}>
                          <CheckRow
                            checked={draft.availability.includes(o.value)}
                            onToggle={() => toggleAvailability(o.value)}
                            label={o.label}
                            count={o.count}
                            name={section.label}
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.kind === "check" && section.key !== "availability" && (
                    <FacetCheckList
                      section={section}
                      draft={draft}
                      onToggle={toggleFacet}
                      sectionQueries={sectionQueries}
                      setSectionQueries={setSectionQueries}
                      expandedSections={expandedSections}
                      setExpandedSections={setExpandedSections}
                    />
                  )}
                </FilterGroup>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function CountTag({ n }: { n: number }) {
  return <span className="ml-auto text-[9.5px] font-medium text-ink-soft/70">{n}</span>
}

/** Collapsible filter group — state survives open/close per the spec. */
function FilterGroup({
  section,
  children,
}: {
  section: FilterSection
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  const label = section.label
  return (
    <div className="border-b border-neutral-200 pb-1.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-2 text-left"
      >
        <span className="text-[10px] font-bold tracking-[0.14em] text-ink uppercase">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-ink-soft transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          strokeWidth={2}
        />
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  )
}

function PriceInput({
  label,
  value,
  placeholder,
  onChange,
  onCommit,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
  onCommit: () => void
}) {
  return (
    <label className="relative block flex-1">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-ink-soft/70">$</span>
      <span className="sr-only">{label} price</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onCommit()
          }
        }}
        placeholder={placeholder}
        aria-label={`${label} price in dollars`}
        className="w-full border border-neutral-300 bg-white py-1.5 pl-5 pr-2 text-[11px] text-ink placeholder:font-semibold placeholder:text-neutral-400 focus:border-gold-deep focus:outline-none"
      />
    </label>
  )
}

function CheckRow({
  checked,
  onToggle,
  label,
  count,
  name,
}: {
  checked: boolean
  onToggle: () => void
  label: React.ReactNode
  count: number
  name: string
}) {
  return (
    <label className="flex min-h-[30px] cursor-pointer items-center gap-2.5 py-0.5 text-[11.5px] text-ink select-none">
      <span className="relative flex h-[15px] w-[15px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle()}
          name={name}
          className="peer h-[15px] w-[15px] cursor-pointer appearance-none border border-neutral-400 bg-white checked:border-gold-deep checked:bg-gold-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep/40"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute h-[9px] w-[9px] text-cream opacity-0 peer-checked:opacity-100"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 6.5 4.5 9 10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className="text-[9.5px] text-ink-soft/70">({count})</span>
      )}
    </label>
  )
}

// ---------------------------------------------------------------------------
// FacetCheckList — renders a multi-select checkbox facet section
// (Brand, Flavor, Size, ...). Supports:
//   • search-within-this-facet input (when section.searchable === true)
//   • "Show more / Show less" toggle (when section.collapsible === true
//     and the option count exceeds section.defaultVisible)
//   • Per-facet applied state (draft.facets[key])
//   • Show count when > 0, hide when 0 (the owner wants facet scaffolding
//     visible even before product data populates it — those rows show with
//     no count suffix)
// ---------------------------------------------------------------------------

type FacetCheckListProps = {
  section: Extract<FilterSection, { kind: "check" }>
  draft: AppliedUrl
  onToggle: (key: string, value: string) => void
  sectionQueries: Record<string, string>
  setSectionQueries: React.Dispatch<React.SetStateAction<Record<string, string>>>
  expandedSections: Record<string, boolean>
  setExpandedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}

function FacetCheckList({
  section,
  draft,
  onToggle,
  sectionQueries,
  setSectionQueries,
  expandedSections,
  setExpandedSections,
}: FacetCheckListProps) {
  const key = section.key
  const query = sectionQueries[key] || ""
  const expanded = expandedSections[key] === true
  const defaultVisible = section.defaultVisible ?? 6
  const isSearchable = section.searchable === true
  const isCollapsible = section.collapsible === true

  // Sort options: checked first (so the user sees their picks at the top),
  // then alphabetical by label. Stable per render.
  const sortedOptions = [...section.options].sort((a, b) => {
    const aChecked = (draft.facets[key] || []).includes(a.value) ? 0 : 1
    const bChecked = (draft.facets[key] || []).includes(b.value) ? 0 : 1
    if (aChecked !== bChecked) return aChecked - bChecked
    return a.label.localeCompare(b.label)
  })

  // Filter by the section's search query (when searchable).
  const filtered = isSearchable
    ? sortedOptions.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : sortedOptions

  // Decide which options to actually render.
  const showAll = expanded || !isCollapsible || filtered.length <= defaultVisible
  const visibleOptions = showAll ? filtered : filtered.slice(0, defaultVisible)
  const hiddenCount = filtered.length - visibleOptions.length

  return (
    <div className="space-y-2">
      {isSearchable && (
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-soft/60"
            strokeWidth={2}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) =>
              setSectionQueries((q) => ({ ...q, [key]: e.target.value }))
            }
            placeholder={`Search ${section.label.toLowerCase()}…`}
            aria-label={`Search ${section.label}`}
            className="w-full border border-neutral-300 bg-white py-1.5 pl-7 pr-2 text-[11px] text-ink placeholder:text-neutral-400 focus:border-gold-deep focus:outline-none"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-1.5 text-[10.5px] italic text-ink-soft/70">
          {isSearchable && query ? "No matches in this facet." : "No options yet."}
        </p>
      ) : (
        <>
          <ul className="space-y-0.5">
            {visibleOptions.map((o) => {
              const checked = (draft.facets[key] || []).includes(o.value)
              return (
                <li key={o.value}>
                  <CheckRow
                    checked={checked}
                    onToggle={() => onToggle(key, o.value)}
                    label={o.label}
                    count={o.count}
                    name={section.label}
                  />
                </li>
              )
            })}
          </ul>

          {isCollapsible && filtered.length > defaultVisible && (
            <button
              type="button"
              onClick={() =>
                setExpandedSections((s) => ({ ...s, [key]: !expanded }))
              }
              className="flex w-full items-center justify-center gap-1 py-1 text-[10px] font-bold tracking-[0.1em] uppercase text-gold-deep hover:underline"
              aria-expanded={expanded}
              aria-label={`${expanded ? "Show less" : "Show more"} ${section.label}`}
            >
              {expanded ? (
                <>
                  SHOW LESS <ChevronUp className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                </>
              ) : (
                <>
                  SHOW {hiddenCount} MORE <ChevronDown className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}
