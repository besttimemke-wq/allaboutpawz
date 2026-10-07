"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath, type ShopNavAnimal, type ShopNavDepartment } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// ShopFlyout — multi-level flyout for the Shop nav item in the sidebar.
// Per spec A: hover opens (desktop), tap opens (touch), Esc closes, keyboard
// navigable. Shows 6 items: Cat, Dog, Sale, Promotions, Gift Cards, Brands.
// Hovering Cat/Dog extends to departments → subcategories.
// ---------------------------------------------------------------------------

const TOP_ITEMS = [
  { label: "Cat", slug: "cat", href: "/shop/cat", isAnimal: true },
  { label: "Dog", slug: "dog", href: "/shop/dog", isAnimal: true },
  { label: "Sale", href: "/shop/sale", isAnimal: false },
  { label: "Promotions", href: "/shop/collections", isAnimal: false },
  { label: "Gift Cards", href: "/gift-cards", isAnimal: false },
  { label: "Shop by Brand", href: "/shop/brands", isAnimal: false },
]

function DepartmentFlyout({ animalSlug, dept, onClose }: { animalSlug: string; dept: ShopNavDepartment; onClose: () => void }) {
  return (
    <div>
      <Link
        href={departmentPath(animalSlug, dept.slug)}
        onClick={onClose}
        className="block py-1.5 text-sm font-bold text-black hover:underline"
      >
        {dept.name}
      </Link>
      {dept.subcategories.length > 0 && (
        <div className="pl-3">
          {dept.subcategories.map(sub => (
            <Link
              key={sub.slug}
              href={subcategoryPath(animalSlug, dept.slug, sub.slug)}
              onClick={onClose}
              className="block py-1 text-xs text-gray-600 hover:text-black hover:underline"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function ShopFlyout({ onClose }: { onClose: () => void }) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [hoveredDept, setHoveredDept] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div ref={ref} className="absolute left-full top-0 z-50 ml-1 w-56 rounded border border-gray-200 bg-white p-4 shadow-xl" onMouseLeave={() => { setHoveredItem(null); setHoveredDept(null) }}>
      {/* Top-level items */}
      <div className="space-y-1">
        {TOP_ITEMS.map(item => (
          <div
            key={item.label}
            onMouseEnter={() => setHoveredItem(item.isAnimal ? item.slug : null)}
          >
            <Link
              href={item.href}
              onClick={onClose}
              className="flex items-center justify-between py-1.5 text-sm font-semibold text-black hover:underline"
            >
              {item.label}
              {item.isAnimal && <ChevronRight size={12} className="text-gray-400" />}
            </Link>
          </div>
        ))}
      </div>

      {/* Second level: departments for hovered animal */}
      {hoveredItem && (() => {
        const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === hoveredItem)
        if (!animal) return null
        return (
          <div
            className="absolute left-full top-0 ml-1 w-56 rounded border border-gray-200 bg-white p-4 shadow-xl"
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Link
              href={`/shop/${animal.slug}`}
              onClick={onClose}
              className="block py-1.5 text-sm font-bold text-black hover:underline"
            >
              All {animal.name}
            </Link>
            <div className="mt-2 space-y-2">
              {animal.departments.map(dept => (
                <div
                  key={dept.slug}
                  onMouseEnter={() => setHoveredDept(dept.slug)}
                >
                  <Link
                    href={departmentPath(animal.slug, dept.slug)}
                    onClick={onClose}
                    className="flex items-center justify-between py-1 text-sm text-gray-700 hover:text-black hover:underline"
                  >
                    {dept.name}
                    {dept.subcategories.length > 0 && <ChevronRight size={10} className="text-gray-400" />}
                  </Link>

                  {/* Third level: subcategories for hovered department */}
                  {hoveredDept === dept.slug && dept.subcategories.length > 0 && (
                    <div
                      className="absolute left-full top-0 ml-1 w-52 rounded border border-gray-200 bg-white p-3 shadow-xl"
                      onMouseLeave={() => setHoveredDept(null)}
                    >
                      {dept.subcategories.map(sub => (
                        <Link
                          key={sub.slug}
                          href={subcategoryPath(animal.slug, dept.slug, sub.slug)}
                          onClick={onClose}
                          className="block py-1 text-xs text-gray-600 hover:text-black hover:underline"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
