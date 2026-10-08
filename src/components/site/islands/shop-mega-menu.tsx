"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { SquaresFour, CaretDown } from "@phosphor-icons/react"
import { loadShopDepartments, type ShopDepartment } from "@/lib/shop-departments"
import {
  loadLiveShopNav,
  staticNavFallback,
  cachedLiveNav,
  type NavAnimal,
  type NavDepartment,
} from "@/lib/shop/nav-client"
import { TAXONOMY_ENABLED } from "@/lib/taxonomy-flag"

// ---------------------------------------------------------------------------
// Shop mega menu — national-chain standard. Full-width dropdown rendering the
// LIVE taxonomy tree (/api/shop/nav → taxonomy_nodes): all six animals, all
// departments, subcategory links with live product counts.
//
// The static SHOP_NAV_TAXONOMY is only the instant-paint fallback; the live
// tree replaces it as soon as it loads, so reptile / bird / fish /
// small-animal users get every category, not the single hardcoded card.
//
// Design rules (per focus group feedback):
//   • Readable fonts: button 14px, department headers 16px bold,
//     subcategory links 14px regular
//   • Full-width dropdown panel, scrollable when the tree is tall
//   • Minimum 44px touch targets for accessibility
//   • +N more links for departments with many subcategories
// ---------------------------------------------------------------------------

const MAX_SUBS_PER_DEPT = 6

function DepartmentColumn({
  dept,
  onNavigate,
}: {
  dept: NavDepartment
  onNavigate: () => void
}) {
  const shown = dept.subcategories.slice(0, MAX_SUBS_PER_DEPT)
  const more = dept.subcategories.length - shown.length
  const count = dept.productCount > 0 ? dept.productCount.toLocaleString() : null

  return (
    <div>
      <Link
        href={dept.path}
        onClick={onNavigate}
        className="flex items-baseline justify-between gap-2 text-base font-bold text-ink transition-colors hover:text-gold-deep hover:underline"
      >
        <span className="min-w-0">{dept.name}</span>
        {count && <span className="shrink-0 text-[11.5px] font-normal text-ink-soft/70">{count}</span>}
      </Link>
      <ul className="mt-2 space-y-2">
        {shown.map(sub => (
          <li key={sub.slug}>
            <Link
              href={sub.path}
              onClick={onNavigate}
              className="text-sm leading-relaxed text-ink-soft transition-colors hover:text-gold-deep hover:underline"
            >
              {sub.name}
            </Link>
          </li>
        ))}
        {more > 0 && (
          <li>
            <Link
              href={dept.path}
              onClick={onNavigate}
              className="text-sm font-semibold text-gold-deep transition-colors hover:underline"
            >
              + {more} more
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}

function TaxonomySection({
  animal,
  onNavigate,
}: {
  animal: NavAnimal
  onNavigate: () => void
}) {
  return (
    <section aria-label={animal.name}>
      <Link
        href={`/shop/${animal.slug}`}
        onClick={onNavigate}
        className="mb-3 flex items-baseline justify-between gap-3 border-b border-gold/20 pb-2"
      >
        <span className="text-lg font-bold tracking-wide text-gold-deep">{animal.name}</span>
        {animal.productCount > 0 && (
          <span className="text-[12px] font-medium text-ink-soft/70">
            {animal.productCount.toLocaleString()} products
          </span>
        )}
      </Link>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
        {animal.departments.map(dept => (
          <DepartmentColumn key={dept.slug} dept={dept} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  )
}

function OldDepartmentColumn({ dept, onNavigate }: { dept: ShopDepartment; onNavigate: () => void }) {
  const leaves = dept.children.flatMap(c => (c.children.length > 0 ? c.children : [c]))
  const shown = leaves.slice(0, MAX_SUBS_PER_DEPT)
  const more = leaves.length - shown.length

  return (
    <div>
      <Link
        href={dept.navPath || `/shop/category/${dept.slug}`}
        onClick={onNavigate}
        className="block text-base font-bold text-ink transition-colors hover:text-gold-deep hover:underline"
      >
        {dept.name}
      </Link>
      <ul className="mt-2 space-y-2">
        {shown.map(s => (
          <li key={s.id}>
            <Link
              href={s.navPath || `/shop/category/${s.slug}`}
              onClick={onNavigate}
              className="text-sm leading-relaxed text-ink-soft transition-colors hover:text-gold-deep hover:underline"
            >
              {s.name}
            </Link>
          </li>
        ))}
        {more > 0 && (
          <li>
            <Link
              href={dept.navPath || `/shop/category/${dept.slug}`}
              onClick={onNavigate}
              className="text-sm font-semibold text-gold-deep transition-colors hover:underline"
            >
              + {more} more
            </Link>
          </li>
        )}
      </ul>
    </div>
  )
}

export function ShopMegaMenu() {
  const [open, setOpen] = useState(false)
  const [departments, setDepartments] = useState<ShopDepartment[] | null>(null)
  const [nav, setNav] = useState<NavAnimal[]>(() => cachedLiveNav() ?? staticNavFallback())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    loadLiveShopNav().then(live => {
      if (alive) setNav(live)
    })
    if (TAXONOMY_ENABLED) return // New taxonomy needs no legacy fetch
    loadShopDepartments().then(d => {
      if (alive) setDepartments(d)
    })
    return () => {
      alive = false
    }
  }, [])

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
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Browse all departments — All About Pawz shop"
        className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-bold tracking-[0.15em] text-ink-soft transition-colors hover:text-gold-deep"
      >
        <SquaresFour size={16} weight="bold" className="text-gold-deep" aria-hidden="true" />
        <span className="hidden sm:inline">ALL DEPARTMENTS</span>
        <span className="sm:hidden">SHOP</span>
        <CaretDown
          size={14}
          weight="bold"
          className={`text-gold-deep transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className="absolute inset-x-0 top-full z-40 animate-in fade-in slide-in-from-top-2 duration-150 border-b border-gold/40 bg-white shadow-[0_18px_36px_-18px_rgba(31,27,24,0.35)]"
          data-purpose="departments-mega-menu"
        >
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
            {/* Header row */}
            <div className="mb-6 flex items-center justify-between border-b border-gold/25 pb-3">
              <span className="text-sm font-bold tracking-[0.18em] text-gold-deep">
                SHOP ALL DEPARTMENTS
              </span>
              <Link
                href="/shop"
                onClick={close}
                className="text-sm font-bold tracking-[0.12em] text-ink-soft transition-colors hover:text-gold-deep"
              >
                VIEW FULL SHOP →
              </Link>
            </div>

            {TAXONOMY_ENABLED ? (
              // Live taxonomy — every animal, every department, scrollable.
              <nav
                aria-label="Shop departments"
                className="max-h-[72vh] space-y-8 overflow-y-auto pr-3 shop-nav-scroll"
              >
                {nav.map(animal => (
                  <TaxonomySection key={animal.slug} animal={animal} onNavigate={close} />
                ))}
              </nav>
            ) : departments === null ? (
              // Old taxonomy loading state
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 xl:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="h-4 w-32 animate-pulse bg-ink/10" />
                    <div className="h-3.5 w-28 animate-pulse bg-ink/5" />
                    <div className="h-3.5 w-36 animate-pulse bg-ink/5" />
                  </div>
                ))}
              </div>
            ) : (
              // Old taxonomy — loaded departments
              <div className="max-h-[72vh] overflow-y-auto pr-3 shop-nav-scroll">
                <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 xl:grid-cols-5">
                  {departments.map(dept => (
                    <OldDepartmentColumn key={dept.id} dept={dept} onNavigate={close} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
