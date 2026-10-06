"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { SquaresFour, CaretDown } from "@phosphor-icons/react"
import { loadShopDepartments, type ShopDepartment } from "@/lib/shop-departments"

// ---------------------------------------------------------------------------
// Shop mega menu — the departments nav that used to live in the collection
// sidebar. Rendered in the PageHeader bar on every /shop route so the
// collection sidebar can stay clean: just this route's subcategories + price
// (the facet filters surface on demand from the FILTERS icon in the toolbar).
//
//   ALL DEPARTMENTS ▾  →  full-width panel under the header bar:
//   ┌────────────────────────────────────────────────────────────┐
//   │ 10 DEPARTMENTS                             VIEW COLLECTION │
//   │ [ Department name ] + subcategory links (capped, +N more)  │
//   └────────────────────────────────────────────────────────────┘
//
// Pattern: the design library's MainHeader mega dropdown (click to open,
// outside click / Escape closes), in the site token system.
// ---------------------------------------------------------------------------

const MAX_SUBS_PER_DEPT = 8

// A department's navigable leaves: direct leaf children plus every wrapper's
// leaves (the wrappers themselves are grouping labels, not destinations).
function leavesOf(dept: ShopDepartment): ShopDepartment[] {
  const out: ShopDepartment[] = []
  for (const c of dept.children) {
    if (c.children.length > 0) out.push(...c.children)
    else out.push(c)
  }
  return out
}

export function ShopMegaMenu() {
  const [open, setOpen] = useState(false)
  const [departments, setDepartments] = useState<ShopDepartment[] | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    loadShopDepartments().then((d) => {
      if (alive) setDepartments(d)
    })
    return () => {
      alive = false
    }
  }, [])

  // Outside click + Escape close (the design repo's dropdown pattern).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Browse all departments"
        className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"
      >
        <SquaresFour size={13} weight="bold" className="text-gold-deep" aria-hidden="true" />
        <span className="hidden sm:inline">ALL DEPARTMENTS</span>
        <span className="sm:hidden">DEPARTMENTS</span>
        <CaretDown
          size={11}
          weight="bold"
          className={`text-gold-deep transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute inset-x-0 top-full z-40 animate-in fade-in slide-in-from-top-2 duration-150 border-b border-gold/40 bg-cream shadow-[0_18px_36px_-18px_rgba(31,27,24,0.35)]"
          data-purpose="departments-mega-menu"
        >
          <div className="px-6 py-5 lg:px-10">
            <div className="mb-4 flex items-center justify-between border-b border-gold/25 pb-3">
              <span className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">
                ALL DEPARTMENTS{departments ? ` · ${departments.length}` : ""}
              </span>
              <Link
                href="/shop"
                onClick={close}
                className="text-[9.5px] font-bold tracking-[0.16em] text-ink-soft transition-colors hover:text-gold-deep"
              >
                VIEW FULL COLLECTION
              </Link>
            </div>

            {departments === null ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-28 animate-pulse bg-ink/10" />
                    <div className="h-2.5 w-24 animate-pulse bg-ink/5" />
                    <div className="h-2.5 w-32 animate-pulse bg-ink/5" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
                {departments.map((dept) => {
                  const leaves = leavesOf(dept)
                  const shown = leaves.slice(0, MAX_SUBS_PER_DEPT)
                  const more = leaves.length - shown.length
                  return (
                    <div key={dept.id}>
                      <Link
                        href={`/shop/category/${dept.slug}`}
                        onClick={close}
                        className="flex items-baseline justify-between gap-2 text-[11px] font-bold text-ink transition-colors hover:text-gold-deep hover:underline"
                      >
                        <span className="min-w-0 truncate">{dept.name}</span>
                        <span className="shrink-0 text-[10px] font-normal text-ink-soft/70">
                          {dept.productCount}
                        </span>
                      </Link>
                      <ul className="mt-1.5 space-y-1">
                        {shown.map((s) => (
                          <li key={s.id} className="min-w-0">
                            <Link
                              href={`/shop/category/${s.slug}`}
                              onClick={close}
                              className="block truncate text-[10.5px] leading-[1.55] text-ink-soft transition-colors hover:text-gold-deep hover:underline"
                            >
                              {s.name}
                            </Link>
                          </li>
                        ))}
                        {more > 0 && (
                          <li>
                            <Link
                              href={`/shop/category/${dept.slug}`}
                              onClick={close}
                              className="text-[10.5px] font-semibold text-gold-deep transition-colors hover:underline"
                            >
                              + {more} more
                            </Link>
                          </li>
                        )}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
