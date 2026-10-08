"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, X, ArrowRight } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// ShopFlyout — mega-menu flyout that opens to the RIGHT of the hamburger
// sidebar when the SHOP row is hovered. Matches the reference image
// (pasted_image_1791407269619.png) exactly:
//
//   ┌──────────────────┬──────────────────────────────────────┐
//   │  LEFT RAIL       │         MAIN PANEL                   │
//   │  (260px fixed)   │     (flex-grow, full height)         │
//   │                  │                                      │
//   │  SHOP BY    [X]  │   "Hover an animal to browse        │
//   │  ─────────       │    departments" (default empty)     │
//   │  Cat Supplies  > │                                      │
//   │  Dog Supplies  > │   OR 3-4 col dept grid (on hover)    │
//   │  ─────────       │                                      │
//   │  SALE            │   OR brand logo grid (SHOP BY BRAND) │
//   │  PROMOTIONS      │                                      │
//   │  GIFT CARDS      │                                      │
//   │  ─────────       │                                      │
//   │  SHOP BY BRAND   │                                      │
//   │                  │                                      │
//   │                  │   ──────────────────────────────     │
//   │                  │   PROMO BANNER (bottom, dark bg)    │
//   └──────────────────┴──────────────────────────────────────┘
//
// Left rail: cream bg, SHOP BY header (muted gray), Cat/Dog with chevrons,
//   two dividers (one before SALE group, one before SHOP BY BRAND).
//   Close button in top-right of the LEFT RAIL.
// Main panel: starts empty ("Hover an animal..."), populates with dept grid
//   on hover, shows brand grid when SHOP BY BRAND is hovered. Promo banner
//   at the bottom (dark brown bg, white text).
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

type PanelView = "empty" | "animal" | "brands"

export function ShopFlyout({ onClose, onEnter, onLeave }: { onClose: () => void; onEnter: () => void; onLeave: () => void }) {
  // Start EMPTY — the reference shows "Hover an animal to browse departments"
  // as the default state, NOT pre-selected to cat.
  const [hoveredAnimal, setHoveredAnimal] = useState<string | null>(null)
  const [view, setView] = useState<PanelView>("empty")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === hoveredAnimal)

  const handleAnimalHover = (slug: string) => {
    setHoveredAnimal(slug)
    setView("animal")
  }

  const handleBrandHover = () => {
    setHoveredAnimal(null)
    setView("brands")
  }

  return (
    <div
      ref={ref}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed left-[232px] top-0 z-[60] flex h-screen w-[calc(100vw-232px)] bg-cream shadow-2xl"
    >
      {/* ===== LEFT RAIL (260px fixed) ===== */}
      <div className="relative w-[260px] shrink-0 border-r border-[#E8E4DC] px-7 py-8">
        {/* Close button — top-right of the LEFT RAIL (not the whole flyout) */}
        <button
          onClick={onClose}
          aria-label="Close mega menu"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-[#333] hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        {/* SHOP BY header — muted gray, small caps */}
        <p className="mb-4 text-[10px] font-bold tracking-[0.18em] text-[#888]">SHOP BY</p>

        {/* Cat Supplies + Dog Supplies — with right chevrons */}
        <div className="space-y-1">
          {SHOP_NAV_TAXONOMY.map(a => (
            <button
              key={a.slug}
              onMouseEnter={() => handleAnimalHover(a.slug)}
              onClick={() => handleAnimalHover(a.slug)}
              className={`flex w-full items-center justify-between px-3 py-3 text-[13px] font-medium transition-colors ${
                hoveredAnimal === a.slug && view === "animal"
                  ? "bg-cream-deep text-black"
                  : "text-[#222] hover:bg-cream-deep/60"
              }`}
            >
              {a.name}
              <ChevronRight size={12} className="text-[#666]" />
            </button>
          ))}
        </div>

        {/* Divider before SALE group */}
        <div className="my-5 border-t border-[#E8E4DC]" />

        {/* SALE / PROMOTIONS / GIFT CARDS */}
        <div className="space-y-1">
          <Link
            href="/shop/sale"
            onClick={onClose}
            className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-[#222] hover:bg-cream-deep/60 transition-colors"
          >
            SALE
          </Link>
          <Link
            href="/shop/collections"
            onClick={onClose}
            className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-[#222] hover:bg-cream-deep/60 transition-colors"
          >
            PROMOTIONS
          </Link>
          <Link
            href="/gift-cards"
            onClick={onClose}
            className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-[#222] hover:bg-cream-deep/60 transition-colors"
          >
            GIFT CARDS
          </Link>
        </div>

        {/* Divider before SHOP BY BRAND */}
        <div className="my-5 border-t border-[#E8E4DC]" />

        {/* SHOP BY BRAND */}
        <button
          onMouseEnter={handleBrandHover}
          onClick={handleBrandHover}
          className={`block w-full px-3 py-2.5 text-left text-[12px] font-bold tracking-[0.12em] transition-colors ${
            view === "brands" ? "bg-cream-deep text-black" : "text-[#222] hover:bg-cream-deep/60"
          }`}
        >
          SHOP BY BRAND
        </button>
      </div>

      {/* ===== MAIN PANEL (flex-grow, to the right of left rail) ===== */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* --- Default empty state --- */}
        {view === "empty" && (
          <div className="flex flex-1 items-center justify-center px-8">
            <p className="text-[14px] text-[#888]">Hover an animal to browse departments</p>
          </div>
        )}

        {/* --- Department grid (when Cat/Dog hovered) --- */}
        {view === "animal" && animal && (
          <div className="flex-1 px-8 py-8">
            {/* Animal name as a link to the animal landing */}
            <Link
              href={`/shop/${animal.slug}`}
              onClick={onClose}
              className="font-display text-[20px] font-bold text-[#222] hover:text-[#8B7355] transition-colors"
            >
              {animal.name}
            </Link>

            {/* 3-4 column grid of departments + subcategories */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-3 xl:grid-cols-4">
              {animal.departments.map(dept => (
                <div key={dept.slug}>
                  <Link
                    href={departmentPath(animal.slug, dept.slug)}
                    onClick={onClose}
                    className="text-[13px] font-bold text-[#222] hover:text-[#8B7355] transition-colors"
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
                            className="text-[12px] leading-relaxed text-[#555] hover:text-black hover:underline transition-colors"
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

        {/* --- Brand logo grid (when SHOP BY BRAND hovered) --- */}
        {view === "brands" && (
          <div className="flex-1 px-8 py-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-[#888]">SHOP BY BRAND</p>
              <Link
                href="/shop/brands"
                onClick={onClose}
                className="text-[11px] font-semibold text-[#555] hover:text-black transition-colors"
              >
                View all →
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {BRANDS.slice(0, 12).map(brand => (
                <Link
                  key={brand.slug}
                  href={`/shop/brands/${brand.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-center rounded border border-[#E8E4DC] bg-white px-2 py-4 text-center transition hover:border-[#8B7355] hover:shadow-sm"
                >
                  <span className="text-[10px] font-bold text-[#222]">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* --- Promo banner (bottom of main panel, dark brown bg) --- */}
        <div className="border-t border-[#E8E4DC] px-8 py-6">
          <Link
            href="/book/appointment"
            onClick={onClose}
            className="flex items-center justify-between rounded-lg bg-[#2C241B] px-6 py-5 transition hover:bg-[#1A1510]"
          >
            <div>
              <p className="text-[14px] font-bold text-white">First Groom 10% Off</p>
              <p className="mt-1 text-[12px] text-white/70">Use code PAWZ10 at booking</p>
            </div>
            <span className="flex items-center gap-1 text-[12px] font-bold text-white">
              BOOK NOW <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
