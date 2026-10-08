"use client"

import { Fragment, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { X, Plus, Minus, Search, Star, ChevronUp, ChevronDown } from "lucide-react"
import type { FilterSection, NavCategory, MerchCollection } from "@/lib/shop/types"

// ---------------------------------------------------------------------------
// ShopSidebar — the rail for every PLP: one accordion list where Categories
// and each filter are peer rows (Plus/Minus), so it reads as a single control.
// Filters instant-apply to the URL; there is no separate Apply step.
//
// ---------------------------------------------------------------------------

export type SidebarData = {
  /** Top-level customer categories (Dog + departments). */
  categories: NavCategory[]
  /** New Arrivals / Sale — merchandising destinations. */
  merch: MerchCollection[]
  /** Parent categories above the current node, outermost first. */
  ancestors: { displayName: string; path: string }[]
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

  const newArrivals = data.merch.find((item) => item.key === "new-arrivals")
  const otherMerch = data.merch.filter((item) => item.key !== "new-arrivals")
  // Only one branch is shown at a time, so its children are listed; at /shop the six animals stay collapsed.
  const showChildren = data.categories.length === 1

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-[18px] font-semibold text-ink">Shop</p>
        <div className="flex items-center gap-3">
          {appliedCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4"
            >
              Clear all ({appliedCount})
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="flex h-9 w-9 items-center justify-center text-ink-soft transition-colors hover:text-ink"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* ---- Body: Categories nav + Filters (no internal scroller — the
          page gets longer when a filter section expands). ---- */}
      <div className="flex-1 px-5 pb-5">
        <AccordionRow label="Categories">
          <ul className="pb-1">
            {newArrivals && (
              <li>
                <CategoryLink href={newArrivals.path} active={pathname === newArrivals.path}>
                  {newArrivals.displayName}
                </CategoryLink>
              </li>
            )}
            {data.ancestors.map((ancestor) => (
              <li key={ancestor.path}>
                <CategoryLink href={ancestor.path} active={false}>
                  {ancestor.displayName}
                </CategoryLink>
              </li>
            ))}
            {data.categories.map((node) => (
              <Fragment key={node.key}>
                <li>
                  <CategoryLink href={node.path} active={pathname === node.path}>
                    {node.displayName}
                  </CategoryLink>
                </li>
                {showChildren &&
                  node.children.map((child) => (
                    <li key={child.key}>
                      <CategoryLink href={child.path} active={pathname === child.path} indent>
                        {child.displayName}
                      </CategoryLink>
                    </li>
                  ))}
              </Fragment>
            ))}
            {otherMerch.map((item) => (
              <li key={item.key}>
                <CategoryLink href={item.path} active={pathname === item.path}>
                  {item.displayName}
                </CategoryLink>
              </li>
            ))}
          </ul>
        </AccordionRow>

        {data.filterSections.map((section) => (
          <AccordionRow key={section.kind === "check" ? `check-${section.key}` : section.kind} label={section.label}>
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
                  <span className="text-[15px] text-ink-soft">—</span>
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
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-[2px]" aria-hidden="true">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-[14px] w-[14px] ${
                                  i < Number.parseInt(r.value, 10)
                                    ? "fill-[#002B5C] text-[#002B5C]"
                                    : "fill-none text-ink-soft/40"
                                }`}
                                strokeWidth={1.5}
                              />
                            ))}
                          </span>
                          <span className="sr-only">{r.label}</span>
                          <span aria-hidden="true" className="text-[14px] text-ink-soft">
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
          </AccordionRow>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const linkUnderline = "underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline"

function CategoryLink({
  href,
  active,
  indent = false,
  children,
}: {
  href: string
  active: boolean
  indent?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block py-2 text-[15px] leading-snug ${indent ? "pl-4" : ""} ${linkUnderline} ${
        active ? "font-semibold text-[#002B5C]" : "text-ink"
      }`}
    >
      {children}
    </Link>
  )
}

/** One row of the rail; Categories and every filter share it so they read as a single control. */
function AccordionRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-neutral-200">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3.5 text-left"
      >
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        {open ? (
          <Minus className="h-4 w-4 text-ink" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Plus className="h-4 w-4 text-ink" strokeWidth={2} aria-hidden="true" />
        )}
      </button>
      {open && <div className="pb-3">{children}</div>}
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
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-soft">$</span>
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
        className="w-full border border-neutral-300 bg-white py-2 pl-6 pr-2 text-[15px] text-ink placeholder:text-neutral-400 focus:border-[#002B5C] focus:outline-none"
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
    <label className="flex min-h-[36px] cursor-pointer items-center gap-3 py-1 text-[15px] text-ink select-none">
      <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle()}
          name={name}
          className="peer h-[18px] w-[18px] cursor-pointer appearance-none border border-neutral-400 bg-white checked:border-[#002B5C] checked:bg-[#002B5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F2C500]"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute h-[11px] w-[11px] text-white opacity-0 peer-checked:opacity-100"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 6.5 4.5 9 10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && (
        <span className="text-[14px] text-ink-soft">({count})</span>
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
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft"
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
            className="w-full border border-neutral-300 bg-white py-2 pl-9 pr-2 text-[15px] text-ink placeholder:text-neutral-400 focus:border-[#002B5C] focus:outline-none"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-1.5 text-[14px] italic text-ink-soft">
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
              className="flex w-full items-center justify-center gap-1 py-2 text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4"
              aria-expanded={expanded}
              aria-label={`${expanded ? "Show less" : "Show all"} ${section.label}`}
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                </>
              ) : (
                <>
                  Show all <ChevronDown className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  )
}
