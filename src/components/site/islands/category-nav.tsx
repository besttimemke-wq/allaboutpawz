"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { List, X, CaretDown, CaretRight, PawPrint } from "@phosphor-icons/react"

// ---------------------------------------------------------------------------
// Category Nav — the shop's department navigation ("hamburger menu with the
// categories", Amazon/Alibaba style).
//
//   ☰ SHOP BY CATEGORY  → slide-down panel holding the FULL taxonomy tree
//   (10 root departments → mid levels → leaves). Every node links to its own
//   /shop/category/[slug] page; product counts are rolled up per subtree.
//
//   Next to the toggle: quick-link chips for departments that carry products
//   plus an ALL chip back to the shop catalog. The caller's search box is
//   rendered inline at the end of the bar.
//
// Pure client state (no persistence). Esc closes the panel; every interactive
// element is a native button/link so keyboard access is free.
// ---------------------------------------------------------------------------

export type NavCategory = {
  id: number
  name: string
  slug: string
  productCount: number
  children: NavCategory[]
}

// Subtle custom scrollbar for the panel's long taxonomy list.
const SCROLLBAR =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-gold/40 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-gold-deep/60"

const chipCls =
  "inline-flex items-center gap-1.5 border border-gold/35 bg-cream px-3 py-2 " +
  "text-[9.5px] font-bold tracking-[0.12em] text-ink-soft transition-colors " +
  "hover:border-gold-deep hover:text-gold-deep"

export function CategoryNav({ nodes, search }: { nodes: NavCategory[]; search?: ReactNode }) {
  const [open, setOpen] = useState(false)
  // Open the first department that actually carries products by default.
  const [expanded, setExpanded] = useState<number | null>(() => {
    const first = nodes.find((n) => n.productCount > 0)
    return first ? first.id : null
  })

  // Esc closes the panel (keyboard accessible, no focus trap required).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const stocked = nodes.filter((n) => n.productCount > 0)

  return (
    <div className="relative">
      {/* Toolbar: hamburger toggle + department quick links + search */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-gold/25 pb-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="shop-category-panel"
          className="inline-flex min-h-[44px] items-center gap-2.5 border border-ink bg-ink px-4 py-2.5 text-[10px] font-bold tracking-[0.16em] text-gold transition-colors hover:bg-gold-deep hover:text-on-dark"
        >
          {open ? <X size={14} weight="bold" /> : <List size={14} weight="bold" />}
          {open ? "CLOSE CATEGORIES" : "SHOP BY CATEGORY"}
        </button>

        <nav className="flex flex-wrap items-center gap-2" aria-label="Shop departments">
          <Link
            href="/shop#collection"
            onClick={() => setOpen(false)}
            className="inline-flex items-center border border-gold-deep/60 bg-ink px-3 py-2 text-[9.5px] font-bold tracking-[0.12em] text-gold transition-colors hover:bg-gold-deep hover:text-on-dark"
          >
            ALL
          </Link>
          {stocked.map((n) => (
            <Link key={n.id} href={`/shop/category/${n.slug}`} onClick={() => setOpen(false)} className={chipCls}>
              {n.name.toUpperCase()}
              <span className="text-gold-deep/80">· {n.productCount}</span>
            </Link>
          ))}
        </nav>

        {search}
      </div>

      {/* Slide-down department panel (mobile + desktop) */}
      {open && (
        <div
          id="shop-category-panel"
          role="region"
          aria-label="Shop by category"
          className="absolute inset-x-0 top-full z-30 border border-gold-deep/40 bg-cream animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between bg-ink px-5 py-3">
            <p className="eyebrow-dark">ALL DEPARTMENTS</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close categories"
              className="flex h-8 w-8 items-center justify-center text-gold transition-colors hover:text-cream"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className={`max-h-[70vh] overflow-y-auto ${SCROLLBAR}`}>
            {nodes.map((root) => {
              const isOpen = expanded === root.id
              const hasChildren = root.children.length > 0
              return (
                <div key={root.id} className="border-b border-gold/15 last:border-b-0">
                  <div className="flex items-stretch">
                    <Link
                      href={`/shop/category/${root.slug}`}
                      onClick={() => setOpen(false)}
                      className="group flex min-h-[44px] flex-1 items-center gap-3 px-5 py-3"
                    >
                      <span className="text-[11px] font-bold tracking-[0.12em] text-ink transition-colors group-hover:text-gold-deep">
                        {root.name.toUpperCase()}
                      </span>
                      {root.productCount > 0 && (
                        <span className="border border-gold/40 bg-gold-deep/10 px-1.5 py-0.5 text-[9px] font-bold text-gold-deep">
                          {root.productCount}
                        </span>
                      )}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : root.id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? `Collapse ${root.name}` : `Expand ${root.name}`}
                        className="flex w-12 items-center justify-center text-ink-soft transition-colors hover:text-gold-deep"
                      >
                        <CaretDown size={14} className={isOpen ? "rotate-180 text-gold-deep transition-transform" : "transition-transform"} />
                      </button>
                    )}
                  </div>

                  {isOpen && hasChildren && (
                    <div className="border-t border-gold/15 bg-cream-deep/40 px-5 pb-5 pt-4">
                      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                        {root.children.map((mid) => (
                          <div key={mid.id} className="min-w-0">
                            <Link
                              href={`/shop/category/${mid.slug}`}
                              onClick={() => setOpen(false)}
                              className="inline-flex items-center gap-1.5 text-[9.5px] font-bold tracking-[0.16em] text-gold-deep transition-colors hover:text-ink"
                            >
                              {mid.name.toUpperCase()}
                              {mid.productCount > 0 && <span>· {mid.productCount}</span>}
                              <CaretRight size={9} weight="bold" />
                            </Link>
                            {mid.children.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {mid.children.map((leaf) => (
                                  <li key={leaf.id}>
                                    <Link
                                      href={`/shop/category/${leaf.slug}`}
                                      onClick={() => setOpen(false)}
                                      className="flex items-baseline justify-between gap-2 text-[10.5px] text-ink-soft transition-colors hover:text-gold-deep"
                                    >
                                      <span className="min-w-0 truncate">{leaf.name}</span>
                                      {leaf.productCount > 0 && (
                                        <span className="shrink-0 text-[9px] font-bold text-gold-deep/70">
                                          {leaf.productCount}
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {nodes.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
                <PawPrint size={32} className="text-gold/40" />
                <p className="text-[11.5px] text-ink-soft">
                  Our department directory is being curated — browse the full collection below.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
