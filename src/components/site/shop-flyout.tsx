"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, X } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// ShopFlyout — professional mega-menu flyout matching the site's design
// language. Warm cream background, bronze accents, wide letter-spacing,
// organized like the sitemap (Cat Supplies → departments → subcategories).
//
// Per spec A: hover opens, Esc closes, keyboard navigable.
// Panel extends right from the sidebar with two columns (Cat + Dog).
// ---------------------------------------------------------------------------

export function ShopFlyout({ onClose }: { onClose: () => void }) {
  const [hoveredAnimal, setHoveredAnimal] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute left-full top-0 z-[60] flex h-screen w-[calc(100vw-232px)] bg-cream shadow-2xl"
    >
      {/* Close button */}
      <button onClick={onClose} aria-label="Close flyout" className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-ink-soft hover:text-ink">
        <X className="h-4 w-4" />
      </button>

      {/* Left rail: animal selector + quick links */}
      <div className="w-48 shrink-0 border-r border-[#D4C5B9] bg-cream px-5 py-8">
        <p className="mb-4 text-[9px] font-bold tracking-[0.2em] text-[#8B7355]">SHOP BY</p>
        <div className="space-y-1">
          {SHOP_NAV_TAXONOMY.map(animal => (
            <button
              key={animal.slug}
              onMouseEnter={() => setHoveredAnimal(animal.slug)}
              onClick={() => setHoveredAnimal(animal.slug)}
              className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-xs font-bold tracking-[0.12em] transition-colors ${hoveredAnimal === animal.slug ? "bg-[#C4A77D] text-white" : "text-ink hover:bg-[#D4C5B9]/30"}`}
            >
              {animal.name}
              <ChevronRight size={10} />
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-1 border-t border-[#D4C5B9] pt-4">
          <Link href="/shop/sale" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.12em] text-ink hover:bg-[#D4C5B9]/30">SALE</Link>
          <Link href="/shop/collections" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.12em] text-ink hover:bg-[#D4C5B9]/30">PROMOTIONS</Link>
          <Link href="/gift-cards" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.12em] text-ink hover:bg-[#D4C5B9]/30">GIFT CARDS</Link>
          <Link href="/shop/brands" onClick={onClose} className="block rounded px-3 py-2 text-xs font-bold tracking-[0.12em] text-ink hover:bg-[#D4C5B9]/30">SHOP BY BRAND</Link>
        </div>
      </div>

      {/* Right panel: departments + subcategories for hovered animal */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {hoveredAnimal ? (
          (() => {
            const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === hoveredAnimal)
            if (!animal) return null
            return (
              <>
                <Link
                  href={`/shop/${animal.slug}`}
                  onClick={onClose}
                  className="font-display text-lg font-bold tracking-[0.06em] text-ink hover:text-[#8B7355]"
                >
                  {animal.name}
                </Link>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
                  {animal.departments.map(dept => (
                    <div key={dept.slug}>
                      <Link
                        href={departmentPath(animal.slug, dept.slug)}
                        onClick={onClose}
                        className="text-xs font-bold tracking-[0.08em] text-ink hover:text-[#8B7355]"
                      >
                        {dept.name}
                      </Link>
                      {dept.subcategories.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                          {dept.subcategories.map(sub => (
                            <li key={sub.slug}>
                              <Link
                                href={subcategoryPath(animal.slug, dept.slug, sub.slug)}
                                onClick={onClose}
                                className="text-[11px] leading-relaxed text-ink-soft hover:text-ink"
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
              </>
            )
          })()
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-soft">
            Hover an animal to browse departments
          </div>
        )}
      </div>
    </div>
  )
}
