"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, X, Tag, ArrowRight } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// ShopFlyout — professional mega-menu flyout per spec A.
// Left rail: Cat, Dog, Sale, Promotions, Gift Cards, Brands.
// Main panel: 3-column grid of departments + subcategories (for hovered animal).
// Brand logos section: 8+ brand cards in a 2-column grid.
// Promo banner: CTA with discount code + Shop Now button.
// Stays open while mouse is inside (grace period managed by parent).
// Esc closes, keyboard navigable.
// ---------------------------------------------------------------------------

const BRANDS = [
  { name: "All About Pawz", slug: "all-about-pawz" },
  { name: "Hill's Science Diet", slug: "hills-science-diet" },
  { name: "Blue Buffalo", slug: "blue-buffalo" },
  { name: "Purina Pro Plan", slug: "purina-pro-plan" },
  { name: "Stella & Chewy's", slug: "stella-and-chewys" },
  { name: "The Honest Kitchen", slug: "the-honest-kitchen" },
  { name: "Merrick", slug: "merrick" },
  { name: "Nulo", slug: "nulo" },
  { name: "ACANA", slug: "acana" },
  { name: "Earthbath", slug: "earthbath" },
  { name: "Burt's Bees Pets", slug: "burts-bees-pets" },
  { name: "Kong", slug: "kong" },
]

export function ShopFlyout({ onClose, onEnter, onLeave }: { onClose: () => void; onEnter: () => void; onLeave: () => void }) {
  const [hoveredAnimal, setHoveredAnimal] = useState<string | null>("cat")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === hoveredAnimal)

  return (
    <div
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed left-[232px] top-0 z-[60] flex h-screen w-[calc(100vw-232px)] bg-white shadow-2xl"
    >
      {/* Close button */}
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink">
        <X className="h-4 w-4" />
      </button>

      {/* Left rail: animal selector + quick links */}
      <div className="w-52 shrink-0 border-r border-[#D4C5B9] px-5 py-8">
        <p className="mb-3 text-[9px] font-bold tracking-[0.2em] text-[#8B7355]">SHOP BY</p>
        <div className="space-y-0.5">
          {SHOP_NAV_TAXONOMY.map(a => (
            <button
              key={a.slug}
              onMouseEnter={() => setHoveredAnimal(a.slug)}
              onClick={() => setHoveredAnimal(a.slug)}
              className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-xs font-bold tracking-[0.1em] transition-colors ${hoveredAnimal === a.slug ? "bg-[#C4A77D] text-white" : "text-ink hover:bg-[#D4C5B9]/40"}`}
            >
              {a.name}
              <ChevronRight size={10} />
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-0.5 border-t border-[#D4C5B9] pt-4">
          <Link href="/shop/sale" onClick={onClose} className="flex items-center gap-2 rounded px-3 py-2 text-xs font-bold tracking-[0.1em] text-ink hover:bg-[#D4C5B9]/40">
            <Tag size={11} /> SALE
          </Link>
          <Link href="/shop/collections" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.1em] text-ink hover:bg-[#D4C5B9]/40">PROMOTIONS</Link>
          <Link href="/gift-cards" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.1em] text-ink hover:bg-[#D4C5B9]/40">GIFT CARDS</Link>
          <Link href="/shop/brands" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.1em] text-ink hover:bg-[#D4C5B9]/40">SHOP BY BRAND</Link>
        </div>

        {/* Promo banner CTA in left rail */}
        <Link
          href="/book/appointment"
          onClick={onClose}
          className="mt-5 block rounded bg-[#8B7355] px-4 py-3 text-center text-[10px] font-bold tracking-[0.14em] text-white transition hover:bg-[#6B5A45]"
        >
          BOOK A GROOM →
        </Link>
      </div>

      {/* Main panel: departments + subcategories + brands + promo */}
      <div className="flex-1 overflow-y-auto">
        {/* Department grid */}
        {animal && (
          <div className="border-b border-[#D4C5B9] px-8 py-8">
            <Link
              href={`/shop/${animal.slug}`}
              onClick={onClose}
              className="font-display text-xl font-bold tracking-[0.04em] text-ink hover:text-[#8B7355]"
            >
              {animal.name}
            </Link>
            <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-4">
              {animal.departments.map(dept => (
                <div key={dept.slug}>
                  <Link
                    href={departmentPath(animal.slug, dept.slug)}
                    onClick={onClose}
                    className="text-xs font-bold tracking-[0.06em] text-ink hover:text-[#8B7355]"
                  >
                    {dept.name}
                  </Link>
                  {dept.subcategories.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {dept.subcategories.map(sub => (
                        <li key={sub.slug}>
                          <Link
                            href={subcategoryPath(animal.slug, dept.slug, sub.slug)}
                            onClick={onClose}
                            className="text-[11px] leading-relaxed text-ink-soft hover:text-ink hover:underline"
                          >
                            {sub.name}
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

        {/* Shop by Brand — logo grid */}
        <div className="border-b border-[#D4C5B9] px-8 py-6">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold tracking-[0.2em] text-[#8B7355]">SHOP BY BRAND</p>
            <Link href="/shop/brands" onClick={onClose} className="text-[10px] font-semibold text-ink-soft hover:text-ink">View all →</Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {BRANDS.slice(0, 12).map(brand => (
              <Link
                key={brand.slug}
                href={`/shop/brands/${brand.slug}`}
                onClick={onClose}
                className="flex items-center justify-center rounded border border-[#D4C5B9]/50 bg-white px-2 py-3 text-center transition hover:border-[#8B7355] hover:shadow-sm"
              >
                <span className="text-[10px] font-bold text-ink">{brand.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Promo banner with CTA */}
        <div className="px-8 py-6">
          <Link
            href="/book/appointment"
            onClick={onClose}
            className="flex items-center justify-between rounded-lg bg-[#8B7355] px-6 py-5 transition hover:bg-[#6B5A45]"
          >
            <div>
              <p className="text-sm font-bold text-white">First Groom 10% Off</p>
              <p className="mt-1 text-xs text-white/80">Use code PAWZ10 at booking</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-white">
              BOOK NOW <ArrowRight size={12} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
