"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronDown, X, PawPrint } from "lucide-react"
import type { NavCategory } from "@/lib/shop/types"

// ---------------------------------------------------------------------------
// MegaMenu — storefront hover mega menu for the shop catalog.
//
// Reads the live customer-facing nav tree from /api/shop/nav on mount and
// renders a horizontal bar of top-level species/department links (Dog, …).
// Hovering, focusing, or tapping a top item opens a panel containing:
//   • A 2–3 column grid of the item's direct children as links.
//   • A "Featured" column with descendants flagged featured_in_mega_menu=true
//     (migration 0013 — surfaces curated destinations).
//   • The parent category's promo_blurb, when set.
//
// Two variants:
//   - variant="bar"       — the desktop horizontal bar (used in the header).
//   - variant="accordion" — the mobile collapsible list (used inside the
//                           existing mobile drawer; augments, not replaces,
//                           the existing mobile nav).
//
// Accessibility:
//   • Arrow-key nav across top items (Left/Right).
//   • Enter/Space/ArrowDown opens the panel; Escape closes and returns focus.
//   • Click-outside closes the panel.
//   • Touch devices: a tap toggles the panel open/closed.
// ---------------------------------------------------------------------------

type NavResponse = {
  ready: boolean
  categories: NavCategory[]
  flat: NavCategory[]
}

export function MegaMenu({ variant = "bar" }: { variant?: "bar" | "accordion" }) {
  const [roots, setRoots] = useState<NavCategory[]>([])
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const topItemRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map())

  // Fetch once on mount. Failure is non-fatal — the bar still renders the
  // "Shop" link so customers always have a path into the catalog.
  useEffect(() => {
    let alive = true
    fetch("/api/shop/nav")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NavResponse | null) => {
        if (!alive || !d) return
        const list = Array.isArray(d.categories) ? d.categories : []
        setRoots(list)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  // Close on click-outside (desktop bar only).
  useEffect(() => {
    if (variant !== "bar") return
    if (openKey == null) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpenKey(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [openKey, variant])

  // Close on Escape (desktop bar only) — returns focus to the triggering
  // top item so keyboard users can resume navigation.
  useEffect(() => {
    if (variant !== "bar") return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openKey != null) {
        e.preventDefault()
        const k = openKey
        setOpenKey(null)
        topItemRefs.current.get(k)?.focus()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [openKey, variant])

  const onTopKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, root: NavCategory) => {
      const idx = roots.findIndex((r) => r.key === root.key)
      if (e.key === "ArrowRight") {
        e.preventDefault()
        const next = roots[(idx + 1) % roots.length]
        topItemRefs.current.get(next.key)?.focus()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        const prev = roots[(idx - 1 + roots.length) % roots.length]
        topItemRefs.current.get(prev.key)?.focus()
      } else if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setOpenKey(root.key)
      } else if (e.key === "Escape") {
        setOpenKey(null)
      }
    },
    [roots],
  )

  // ---- Accordion (mobile) variant ----
  if (variant === "accordion") {
    return <MobileAccordion roots={roots} loaded={loaded} />
  }

  // ---- Desktop bar variant ----
  return (
    <div
      ref={containerRef}
      className="relative border-b border-gold/25 bg-cream"
      onMouseLeave={() => setOpenKey(null)}
    >
      <div className="flex items-stretch gap-0 px-4 lg:px-8">
        {/* All Products link — always present, even before the tree loads. */}
        <Link
          href="/shop"
          className="flex items-center gap-1.5 px-3 py-2.5 text-[10.5px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:text-gold-deep"
        >
          <PawPrint className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.7} />
          ALL PRODUCTS
        </Link>
        <span className="my-2 w-px bg-gold/20" aria-hidden="true" />

        {roots.length === 0 && !loaded && (
          <div className="flex items-center px-3 py-2.5 text-[10px] text-ink-soft/60">
            Loading categories…
          </div>
        )}
        {roots.length === 0 && loaded && (
          <Link
            href="/shop"
            className="flex items-center px-3 py-2.5 text-[10.5px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:text-gold-deep"
          >
            BROWSE THE SHOP
          </Link>
        )}

        {roots.map((root) => {
          const open = openKey === root.key
          const hasChildren = root.children.length > 0
          return (
            <div
              key={root.key}
              className="relative"
              onMouseEnter={() => setOpenKey(hasChildren ? root.key : null)}
            >
              <button
                ref={(el) => {
                  topItemRefs.current.set(root.key, el)
                }}
                type="button"
                aria-expanded={open}
                aria-haspopup={hasChildren ? "menu" : undefined}
                onClick={() => {
                  if (!hasChildren) {
                    window.location.href = root.path
                    return
                  }
                  setOpenKey(open ? null : root.key)
                }}
                onKeyDown={(e) => onTopKeyDown(e, root)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[10.5px] font-bold tracking-[0.14em] transition-colors ${
                  open ? "text-gold-deep" : "text-ink-soft hover:text-gold-deep"
                }`}
              >
                {root.displayName.toUpperCase()}
                {hasChildren && (
                  <ChevronDown
                    className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* The hover panel — absolutely positioned, full-width strip below the
          bar. Single open panel at a time (the hovered root). */}
      {openKey != null && (
        <MegaPanel
          root={roots.find((r) => r.key === openKey)!}
          onClose={() => setOpenKey(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MegaPanel — the dropdown panel for one root category
// ---------------------------------------------------------------------------

function MegaPanel({ root, onClose }: { root: NavCategory; onClose: () => void }) {
  const children = root.children
  // Featured column: any descendant flagged featured_in_mega_menu. Walks the
  // whole subtree (migration 0013 surfaces curated destinations this way).
  const featured: NavCategory[] = []
  const seen = new Set<string>()
  const collectFeatured = (n: NavCategory) => {
    if (n.featuredInMegaMenu === true && !seen.has(n.key)) {
      featured.push(n)
      seen.add(n.key)
    }
    n.children.forEach(collectFeatured)
  }
  collectFeatured(root)

  // Slice children into up to 3 columns for scannability.
  const colCount = children.length > 8 ? 3 : children.length > 4 ? 2 : 1
  const cols: NavCategory[][] = Array.from({ length: colCount }, () => [])
  children.forEach((c, i) => {
    cols[i % colCount].push(c)
  })

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 border-b border-gold/25 bg-cream shadow-[0_18px_30px_-18px_rgba(15,31,53,0.18)]"
      role="menu"
      aria-label={`${root.displayName} menu`}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <div className="flex items-center justify-between pb-3">
          <Link
            href={root.path}
            onClick={onClose}
            className="font-display text-[15px] tracking-[0.12em] text-ink hover:text-gold-deep"
          >
            {root.displayName.toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-7 w-7 items-center justify-center text-ink-soft transition-colors hover:text-ink lg:hidden"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div
          className={`grid gap-x-8 gap-y-3 ${
            colCount === 3
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : colCount === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1"
          }`}
        >
          {cols.map((col, i) => (
            <ul key={i} className="space-y-1.5">
              {col.map((c) => (
                <li key={c.key}>
                  <Link
                    href={c.path}
                    onClick={onClose}
                    className="group flex items-baseline justify-between gap-2 text-[12px] text-ink-soft transition-colors hover:text-gold-deep"
                  >
                    <span className="font-medium">{c.displayName}</span>
                    {c.count > 0 && (
                      <span className="text-[9.5px] text-ink-soft/60 group-hover:text-gold-deep/80">
                        {c.count}
                      </span>
                    )}
                  </Link>
                  {/* One level of grandchild links — keeps the panel scannable. */}
                  {c.children.length > 0 && (
                    <ul className="mt-1 ml-3 space-y-1 border-l border-gold/15 pl-3">
                      {c.children.slice(0, 5).map((gc) => (
                        <li key={gc.key}>
                          <Link
                            href={gc.path}
                            onClick={onClose}
                            className="text-[11px] text-ink-soft/80 transition-colors hover:text-gold-deep"
                          >
                            {gc.displayName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ))}
        </div>

        {/* Featured column + promo blurb — shown only when one is set. */}
        {(featured.length > 0 || (root.promoBlurb && root.promoBlurb.trim())) && (
          <div className="mt-6 grid grid-cols-1 gap-6 border-t border-gold/15 pt-5 lg:grid-cols-[2fr_1fr]">
            {featured.length > 0 && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.18em] text-gold-deep">
                  FEATURED IN {root.displayName.toUpperCase()}
                </p>
                <ul className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {featured.slice(0, 6).map((f) => (
                    <li key={f.key}>
                      <Link
                        href={f.path}
                        onClick={onClose}
                        className="flex items-baseline justify-between gap-2 text-[12px] text-ink transition-colors hover:text-gold-deep"
                      >
                        <span className="font-medium">{f.displayName}</span>
                        <span className="text-[9px] font-bold tracking-[0.14em] text-gold-deep">
                          FEATURED
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {root.promoBlurb && root.promoBlurb.trim() && (
              <aside className="border-l border-gold/20 bg-cream-deep/60 px-5 py-4">
                <p className="text-[9px] font-bold tracking-[0.18em] text-gold-deep">
                  FROM {root.displayName.toUpperCase()}
                </p>
                <p className="mt-2 text-[12px] leading-[1.7] text-ink-soft">
                  {root.promoBlurb}
                </p>
                <Link
                  href={root.path}
                  onClick={onClose}
                  className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-ink hover:text-gold-deep"
                >
                  SHOP ALL {root.displayName.toUpperCase()}
                  <ChevronDown className="h-3 w-3 -rotate-90" strokeWidth={2} />
                </Link>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MobileAccordion — used inside the existing mobile drawer
// ---------------------------------------------------------------------------

function MobileAccordion({ roots, loaded }: { roots: NavCategory[]; loaded: boolean }) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="border-t border-gold/15 pt-4">
      <p className="px-1 text-[9px] font-bold tracking-[0.18em] text-gold-deep">
        SHOP CATEGORIES
      </p>
      <Link
        href="/shop"
        className="mt-2 flex items-center gap-2 px-1 py-1.5 text-[11px] font-bold tracking-[0.14em] text-ink-soft"
      >
        <PawPrint className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.7} />
        ALL PRODUCTS
      </Link>
      {!loaded && <p className="px-1 py-1.5 text-[10.5px] text-ink-soft/60">Loading…</p>}
      {loaded && roots.length === 0 && (
        <Link
          href="/shop"
          className="block px-1 py-1.5 text-[11px] font-bold tracking-[0.14em] text-ink-soft"
        >
          BROWSE THE SHOP
        </Link>
      )}
      <ul className="mt-1 space-y-0.5">
        {roots.map((root) => {
          const open = openKey === root.key
          const hasChildren = root.children.length > 0
          return (
            <li key={root.key}>
              <div className="flex items-center">
                <Link
                  href={root.path}
                  className="flex-1 px-1 py-1.5 text-[11px] font-bold tracking-[0.14em] text-ink-soft"
                >
                  {root.displayName.toUpperCase()}
                </Link>
                {hasChildren && (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? "Hide" : "Show"} ${root.displayName} subcategories`}
                    onClick={() => setOpenKey(open ? null : root.key)}
                    className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors hover:text-gold-deep"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      strokeWidth={2}
                    />
                  </button>
                )}
              </div>
              {open && hasChildren && (
                <ul className="ml-3 space-y-0.5 border-l border-gold/15 pl-3">
                  {root.children.map((c) => (
                    <li key={c.key}>
                      <Link
                        href={c.path}
                        className="block py-1 text-[11px] text-ink-soft transition-colors hover:text-gold-deep"
                      >
                        {c.displayName}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
