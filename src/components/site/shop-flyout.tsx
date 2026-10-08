"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, X, ArrowRight } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// ShopFlyout — mega-menu flyout. White background, navy #002B5C accents.
// NO brown/cream. Default state shows the FIRST animal's departments (not
// "hover over" text — that wastes real estate). Max 8 subcategories per
// department with a "See More" link that goes to the department landing page.
// ---------------------------------------------------------------------------

const NAVY = "#002B5C"
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

type PanelView = "animal" | "brands"

export function ShopFlyout({ onClose, onEnter, onLeave }: { onClose: () => void; onEnter: () => void; onLeave: () => void }) {
  // Default to the FIRST animal (cat) — no empty "hover over" state.
  const [hoveredAnimal, setHoveredAnimal] = useState<string | null>(SHOP_NAV_TAXONOMY[0]?.slug || null)
  const [view, setView] = useState<PanelView>("animal")
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
      className="fixed left-[232px] top-0 z-[60] flex h-screen w-[calc(100vw-232px)] bg-white shadow-2xl"
    >
      {/* ===== LEFT RAIL (260px) ===== */}
      <div className="relative w-[260px] shrink-0 border-r border-neutral-200 px-7 py-8">
        <button
          onClick={onClose}
          aria-label="Close mega menu"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-neutral-500 hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="mb-4 text-[10px] font-bold tracking-[0.18em] text-neutral-400">SHOP BY</p>

        <div className="space-y-1">
          {SHOP_NAV_TAXONOMY.map(a => (
            <button
              key={a.slug}
              onMouseEnter={() => handleAnimalHover(a.slug)}
              onClick={() => handleAnimalHover(a.slug)}
              className={`flex w-full items-center justify-between px-3 py-3 text-[13px] font-medium transition-colors ${
                hoveredAnimal === a.slug && view === "animal"
                  ? `bg-neutral-100 text-[${NAVY}]`
                  : "text-neutral-800 hover:bg-neutral-50"
              }`}
              style={hoveredAnimal === a.slug && view === "animal" ? { color: NAVY } : undefined}
            >
              {a.name}
              <ChevronRight size={12} className="text-neutral-400" />
            </button>
          ))}
        </div>

        <div className="my-5 border-t border-neutral-200" />

        <div className="space-y-1">
          <Link href="/shop/sale" onClick={onClose} className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-800 hover:bg-neutral-50 transition-colors">SALE</Link>
          <Link href="/shop/collections" onClick={onClose} className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-800 hover:bg-neutral-50 transition-colors">PROMOTIONS</Link>
          <Link href="/gift-cards" onClick={onClose} className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-800 hover:bg-neutral-50 transition-colors">GIFT CARDS</Link>
        </div>

        <div className="my-5 border-t border-neutral-200" />

        <button
          onMouseEnter={handleBrandHover}
          onClick={handleBrandHover}
          className={`block w-full px-3 py-2.5 text-left text-[12px] font-bold tracking-[0.12em] transition-colors ${
            view === "brands" ? "bg-neutral-100" : "text-neutral-800 hover:bg-neutral-50"
          }`}
          style={view === "brands" ? { color: NAVY } : undefined}
        >
          SHOP BY BRAND
        </button>
      </div>

      {/* ===== MAIN PANEL ===== */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* --- Department grid (when Cat/Dog hovered) --- */}
        {view === "animal" && animal && (
          <div className="flex-1 px-8 py-8">
            <Link
              href={`/shop/${animal.slug}`}
              onClick={onClose}
              className="font-display text-[20px] font-bold text-neutral-900 transition-colors"
              style={{ color: NAVY }}
            >
              {animal.name}
            </Link>

            {/* 3-4 column grid. Max 8 subcategories per department + "See More" link. */}
            <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-3 xl:grid-cols-4">
              {animal.departments.map(dept => (
                <div key={dept.slug}>
                  <Link
                    href={departmentPath(animal.slug, dept.slug)}
                    onClick={onClose}
                    className="text-[13px] font-bold text-neutral-900 hover:underline transition-colors"
                    style={{ color: NAVY }}
                  >
                    {dept.name}
                  </Link>
                  {dept.subcategories.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {dept.subcategories.slice(0, 8).map(sub => (
                        <li key={sub.slug}>
                          <Link
                            href={subcategoryPath(animal.slug, dept.slug, sub.slug)}
                            onClick={onClose}
                            className="text-[12px] leading-relaxed text-neutral-600 hover:text-neutral-900 hover:underline transition-colors"
                          >
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                      {dept.subcategories.length > 8 && (
                        <li>
                          <Link
                            href={departmentPath(animal.slug, dept.slug)}
                            onClick={onClose}
                            className="text-[11px] font-bold text-neutral-500 hover:underline transition-colors"
                            style={{ color: NAVY }}
                          >
                            See {dept.subcategories.length - 8} more →
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- Brand grid --- */}
        {view === "brands" && (
          <div className="flex-1 px-8 py-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-400" style={{ color: NAVY }}>SHOP BY BRAND</p>
              <Link href="/shop/brands" onClick={onClose} className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors">View all →</Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {BRANDS.slice(0, 12).map(brand => (
                <Link
                  key={brand.slug}
                  href={`/shop/brands/${brand.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-center rounded border border-neutral-200 bg-white px-2 py-4 text-center transition hover:shadow-sm"
                  style={{ borderColor: NAVY + "40" }}
                >
                  <span className="text-[10px] font-bold text-neutral-900">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* --- Bottom CTA strip — use the real estate to promote/sell --- */}
        <div className="border-t border-neutral-200 px-8 py-6">
          <Link
            href="/book/appointment"
            onClick={onClose}
            className="flex items-center justify-between rounded-lg px-6 py-5 transition"
            style={{ backgroundColor: NAVY }}
          >
            <div>
              <p className="text-[14px] font-bold text-white">Book a Groom While You Shop</p>
              <p className="mt-1 text-[12px] text-white/70">Bath Only from $45 · Bath &amp; Haircut from $75</p>
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
