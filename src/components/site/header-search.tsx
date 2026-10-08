"use client"

// ---------------------------------------------------------------------------
// Header search bar — true e-commerce search experience (Petco-scale).
//
// Desktop (lg+): a persistent input CENTERED in the header middle, sized at
// 60% of the viewport width (max-w-[60vw]) — the same scale Petco/Chewy use
// for their primary search. Pill-shaped white input with a magnifying glass
// icon on the left and a clear (X) button on the right when text is entered.
//
// Mobile (< lg): a search-icon trigger button that expands a full-width
// overlay covering the header. The overlay carries the same input +
// dropdown + close button.
//
// Type-ahead dropdown (appears when query length >= 2):
//   1. Shop Categories  — up to 5 matching cat + dog departments
//   2. Subcategories    — up to 5 matching subcategories
//   3. Guides           — up to 3 matching grooming guides
//   4. Popular Searches — always shown (Dog Food, Cat Litter, Flea & Tick,
//      Dog Beds, Cat Treats, Grooming)
//
// Behavior: 150ms debounce; Esc / outside-click / blur (with 150ms grace for
// click capture) closes the dropdown; Up/Down moves the highlight, Enter
// navigates to the highlighted row (or submits to /shop?q=… when no row is
// highlighted); route change closes both the dropdown and the mobile overlay.
//
// The component is SSR-safe: no window references during render; all
// document listeners are attached inside useEffect.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowRight, PawPrint, Search, X } from "lucide-react"
import {
  SHOP_NAV_TAXONOMY,
  departmentPath,
  subcategoryPath,
} from "@/lib/shop-nav"
import {
  GROOMING_COAT_TYPES,
  GROOMING_FIRST_TIMER,
  GROOMING_GENERAL,
  GROOMING_GUIDES,
} from "@/lib/guides-data"

// ---------------------------------------------------------------------------
// Static guide list — guides-data.ts exports 4 grooming arrays rather than
// a single GUIDES list. Flatten them here for substring matching.
// ---------------------------------------------------------------------------

type GuideEntry = { slug: string; title: string; href: string }

const ALL_GUIDES: GuideEntry[] = [
  ...GROOMING_GUIDES.map((g) => ({ slug: g.slug, title: g.title, href: `/guides/grooming/${g.slug}` })),
  ...GROOMING_FIRST_TIMER.map((g) => ({ slug: g.slug, title: g.title, href: `/guides/grooming/${g.slug}` })),
  ...GROOMING_COAT_TYPES.map((g) => ({ slug: g.slug, title: g.title, href: `/guides/grooming/${g.slug}` })),
  ...GROOMING_GENERAL.map((g) => ({ slug: g.slug, title: g.title, href: `/guides/grooming/${g.slug}` })),
]

// ---------------------------------------------------------------------------
// Popular searches — always rendered at the bottom of the dropdown.
// ---------------------------------------------------------------------------

const POPULAR_SEARCHES: { label: string; query: string }[] = [
  { label: "Dog Food", query: "Dog Food" },
  { label: "Cat Litter", query: "Cat Litter" },
  { label: "Flea & Tick", query: "Flea & Tick" },
  { label: "Dog Beds", query: "Dog Beds" },
  { label: "Cat Treats", query: "Cat Treats" },
  { label: "Grooming", query: "Grooming" },
]

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

type CategoryResult = { label: string; href: string; animalName: string; rank: number }
type SubResult = { label: string; href: string; parentLabel: string; rank: number }
type GuideResult = { label: string; href: string; rank: number }

type SearchResults = {
  categories: CategoryResult[]
  subcategories: SubResult[]
  guides: GuideResult[]
  hasAny: boolean
}

type FlatRow =
  | { kind: "category"; href: string; label: string }
  | { kind: "subcategory"; href: string; label: string }
  | { kind: "guide"; href: string; label: string }
  | { kind: "popular"; query: string; label: string }

// ---------------------------------------------------------------------------
// Matching — lowercase substring. Weighted:
//   name starts-with  → rank 0
//   name includes     → rank 1
//   tagline / parent  → rank 2
// Lower rank = higher relevance (rendered first).
// ---------------------------------------------------------------------------

function rankName(q: string, name: string): number {
  const n = name.toLowerCase()
  if (n.startsWith(q)) return 0
  if (n.includes(q)) return 1
  return -1
}

function buildResults(query: string): SearchResults {
  const q = query.trim().toLowerCase()
  if (q.length < 2) {
    return { categories: [], subcategories: [], guides: [], hasAny: false }
  }

  const cats: CategoryResult[] = []
  const subs: SubResult[] = []
  const guides: GuideResult[] = []

  for (const animal of SHOP_NAV_TAXONOMY) {
    const animalName = animal.name.replace(/ Supplies$/, "")
    const taglineHit = animal.tagline.toLowerCase().includes(q)
    for (const dept of animal.departments) {
      const r = rankName(q, dept.name)
      if (r >= 0) {
        cats.push({ label: dept.name, href: departmentPath(animal.slug, dept.slug), animalName, rank: r })
      } else if (taglineHit) {
        cats.push({ label: dept.name, href: departmentPath(animal.slug, dept.slug), animalName, rank: 2 })
      }
      const parentHit = dept.name.toLowerCase().includes(q)
      for (const sub of dept.subcategories) {
        const sr = rankName(q, sub.name)
        if (sr >= 0) {
          subs.push({
            label: sub.name,
            href: subcategoryPath(animal.slug, dept.slug, sub.slug),
            parentLabel: dept.name,
            rank: sr,
          })
        } else if (parentHit) {
          subs.push({
            label: sub.name,
            href: subcategoryPath(animal.slug, dept.slug, sub.slug),
            parentLabel: dept.name,
            rank: 2,
          })
        }
      }
    }
  }

  for (const g of ALL_GUIDES) {
    const r = rankName(q, g.title)
    if (r >= 0) {
      guides.push({ label: g.title, href: g.href, rank: r })
    }
  }

  cats.sort((a, b) => a.rank - b.rank)
  subs.sort((a, b) => a.rank - b.rank)
  guides.sort((a, b) => a.rank - b.rank)

  const topCats = cats.slice(0, 5)
  const topSubs = subs.slice(0, 5)
  const topGuides = guides.slice(0, 3)

  return {
    categories: topCats,
    subcategories: topSubs,
    guides: topGuides,
    hasAny: topCats.length + topSubs.length + topGuides.length > 0,
  }
}

// ---------------------------------------------------------------------------
// SearchField — the input + dropdown, used by both the desktop persistent
// placement and the mobile overlay. Stateless at the parent level; owns
// its own query + dropdown state.
// ---------------------------------------------------------------------------

function SearchField({
  inputId,
  autoFocus,
  onClose,
}: {
  inputId: string
  autoFocus?: boolean
  onClose?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce the query — 150ms after the user stops typing. setState is
  // inside the timeout callback (not synchronous in the effect body), so
  // the set-state-in-effect rule does not fire.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(t)
  }, [query])

  // Close on route change — React's recommended "adjust state during
  // render when a prop/value changes" pattern (avoids setState-in-effect).
  // See https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  // Outside-click → close the dropdown.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  // Auto-focus the input when requested (mobile overlay opens).
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Cancel any pending blur-close when the field unmounts.
  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current)
    }
  }, [])

  const results = useMemo(() => buildResults(debouncedQuery), [debouncedQuery])

  const flatList = useMemo<FlatRow[]>(() => {
    const flat: FlatRow[] = []
    for (const c of results.categories) flat.push({ kind: "category", href: c.href, label: c.label })
    for (const s of results.subcategories) flat.push({ kind: "subcategory", href: s.href, label: s.label })
    for (const g of results.guides) flat.push({ kind: "guide", href: g.href, label: g.label })
    for (const p of POPULAR_SEARCHES) flat.push({ kind: "popular", query: p.query, label: p.label })
    return flat
  }, [results])

  // Section start offsets into flatList (for ID + active-row lookup).
  const catStart = 0
  const subStart = results.categories.length
  const guideStart = subStart + results.subcategories.length
  const popStart = guideStart + results.guides.length

  const showDropdown = open && debouncedQuery.trim().length >= 2

  // Reset the keyboard highlight whenever the debounced query changes —
  // same "adjust during render" pattern (avoids setState-in-effect).
  const [lastDebounced, setLastDebounced] = useState(debouncedQuery)
  if (debouncedQuery !== lastDebounced) {
    setLastDebounced(debouncedQuery)
    setActiveIndex(-1)
  }

  const navigateTo = (href: string) => {
    setOpen(false)
    onClose?.()
    router.push(href)
  }

  const submitSearch = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setOpen(false)
    onClose?.()
    router.push(`/shop?q=${encodeURIComponent(trimmed)}`)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (!showDropdown) {
        setOpen(true)
        return
      }
      e.preventDefault()
      setActiveIndex((i) => (i + 1 >= flatList.length ? 0 : i + 1))
    } else if (e.key === "ArrowUp") {
      if (!showDropdown) return
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? flatList.length - 1 : i - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (showDropdown && activeIndex >= 0 && flatList[activeIndex]) {
        const row = flatList[activeIndex]
        if (row.kind === "popular") {
          submitSearch(row.query)
        } else {
          navigateTo(row.href)
        }
      } else {
        submitSearch(query)
      }
    } else if (e.key === "Escape") {
      if (open) {
        setOpen(false)
      } else {
        onClose?.()
      }
    }
  }

  const activeRowId =
    showDropdown && activeIndex >= 0 && flatList[activeIndex]
      ? `${inputId}-opt-${activeIndex}`
      : undefined

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2.5 rounded-none border border-ink/15 bg-white px-4 py-2.5 shadow-sm focus-within:border-gold-deep focus-within:ring-2 focus-within:ring-gold-deep/30 transition-colors">
        <Search className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.7} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={query}
          enterKeyHint="search"
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open && e.target.value.trim().length >= 2) setOpen(true)
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true)
          }}
          onBlur={() => {
            // 150ms grace so suggestion clicks register before the
            // dropdown unmounts.
            if (blurTimer.current) clearTimeout(blurTimer.current)
            blurTimer.current = setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search for dog food, cat litter, flea & tick, beds…"
          aria-label="Search shop, breeds, and guides"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={activeRowId}
          className="min-w-0 flex-1 bg-transparent text-[13px] leading-tight text-ink placeholder:text-ink-soft/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("")
              setDebouncedQuery("")
              setActiveIndex(-1)
              inputRef.current?.focus()
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-soft hover:bg-cream hover:text-black"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id={`${inputId}-listbox`}
          role="listbox"
          className="custom-scrollbar absolute left-0 right-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-none border border-gold/35 bg-white shadow-lg"
        >
          {!results.hasAny && (
            <div className="px-3 py-3 text-[11px] leading-relaxed text-ink-soft">
              No matches — try{" "}
              <span className="font-semibold text-ink">&ldquo;dog food&rdquo;</span>,{" "}
              <span className="font-semibold text-ink">&ldquo;cat litter&rdquo;</span>,{" "}
              <span className="font-semibold text-ink">&ldquo;flea &amp; tick&rdquo;</span>…
            </div>
          )}

          {results.categories.length > 0 && (
            <SearchSection label="Shop Categories">
              {results.categories.map((c, i) => {
                const idx = catStart + i
                return (
                  <SearchRow
                    key={`cat-${c.href}`}
                    id={`${inputId}-opt-${idx}`}
                    active={idx === activeIndex}
                    onClick={() => navigateTo(c.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <PawPrint className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={1.7} aria-hidden="true" />
                    <span className="flex-1 truncate">
                      <span className="font-semibold">{c.label}</span>
                      <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
                        {c.animalName}
                      </span>
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-ink-soft" strokeWidth={1.7} aria-hidden="true" />
                  </SearchRow>
                )
              })}
            </SearchSection>
          )}

          {results.subcategories.length > 0 && (
            <SearchSection label="Subcategories">
              {results.subcategories.map((s, i) => {
                const idx = subStart + i
                return (
                  <SearchRow
                    key={`sub-${s.href}`}
                    id={`${inputId}-opt-${idx}`}
                    active={idx === activeIndex}
                    onClick={() => navigateTo(s.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <PawPrint className="h-3.5 w-3.5 shrink-0 text-ink-soft" strokeWidth={1.7} aria-hidden="true" />
                    <span className="flex-1 truncate">
                      <span className="font-semibold">{s.label}</span>
                      <span className="ml-2 text-[10px] text-ink-soft">in {s.parentLabel}</span>
                    </span>
                  </SearchRow>
                )
              })}
            </SearchSection>
          )}

          {results.guides.length > 0 && (
            <SearchSection label="Guides">
              {results.guides.map((g, i) => {
                const idx = guideStart + i
                return (
                  <SearchRow
                    key={`guide-${g.href}`}
                    id={`${inputId}-opt-${idx}`}
                    active={idx === activeIndex}
                    onClick={() => navigateTo(g.href)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <ArrowRight className="h-3 w-3 shrink-0 text-black" strokeWidth={1.7} aria-hidden="true" />
                    <span className="flex-1 truncate font-semibold">{g.label}</span>
                  </SearchRow>
                )
              })}
            </SearchSection>
          )}

          <SearchSection label="Popular Searches">
            {POPULAR_SEARCHES.map((p, i) => {
              const idx = popStart + i
              return (
                <SearchRow
                  key={`pop-${p.query}`}
                  id={`${inputId}-opt-${idx}`}
                  active={idx === activeIndex}
                  onClick={() => submitSearch(p.query)}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-ink-soft" strokeWidth={1.7} aria-hidden="true" />
                  <span className="flex-1 truncate">{p.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-ink-soft">Shop</span>
                </SearchRow>
              )
            })}
          </SearchSection>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section + row primitives — keep the field markup tidy and the styling
// spec in one place.
// ---------------------------------------------------------------------------

function SearchSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-gold/20 last:border-0">
      <div className="px-3 pt-2.5 pb-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

function SearchRow({
  id,
  active,
  onClick,
  onMouseEnter,
  children,
}: {
  id: string
  active: boolean
  onClick: () => void
  onMouseEnter: () => void
  children: ReactNode
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 px-3 py-2.5 text-[12px] text-ink hover:bg-cream ${
        active ? "bg-cream" : ""
      }`}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// HeaderSearch — the public entry. Renders the desktop persistent field
// (lg+), the mobile trigger button (< lg), and the mobile full-width
// overlay that takes over the header when open.
// ---------------------------------------------------------------------------

export function HeaderSearch() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile overlay on route change — "adjust during render"
  // pattern (avoids setState-in-effect).
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMobileOpen(false)
  }

  return (
    <>
      {/* Desktop: persistent input — Petco-scale, 60% of viewport width, centered */}
      <div className="hidden flex-1 max-w-[75vw] mx-auto lg:block">
        <SearchField inputId="header-search-desktop" />
      </div>

      {/* Mobile: trigger button */}
      <button
        type="button"
        aria-label="Search"
        onClick={() => setMobileOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded text-ink hover:bg-black/5 lg:hidden"
      >
        <Search className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
      </button>

      {/* Mobile overlay — absolute, covers the whole header when open.
          The sticky header is the positioning context (sticky acts as
          relative for absolutely-positioned descendants). */}
      {mobileOpen && (
        <div className="absolute inset-0 z-40 flex items-center gap-2 bg-cream px-3 lg:hidden">
          <div className="flex-1">
            <SearchField
              inputId="header-search-mobile"
              autoFocus
              onClose={() => setMobileOpen(false)}
            />
          </div>
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-ink hover:bg-black/5"
          >
            <X className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}
