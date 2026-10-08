"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Minus, PawPrint, Plus, X } from "lucide-react"
import { SHOP_ANIMALS, SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// ShopFlyout — full-screen category menu with image-led department cards.
// ---------------------------------------------------------------------------

const ANIMALS = SHOP_ANIMALS
const DEPARTMENT_IMAGES: Record<string, string> = {
  "cat/beds-bedding": "cat-beds-bedding",
  "cat/bowls-feeders": "cat-bowls-feeders",
  "cat/carriers-containment": "cat-carriers-containment",
  "cat/cleaners-waste-disposal": "cat-cleaners-waste-disposal",
  "cat/clothing-accessories": "cat-clothing-accessories",
  "cat/food": "cat-food",
  "cat/furniture-scratchers": "cat-furniture-scratchers",
  "cat/grooming-bathing": "cat-grooming-bathing",
  "cat/health-wellness": "cat-health-wellness-extra",
  "cat/litter-litter-boxes-accessories": "cat-litter",
  "cat/steps-ramps": "cat-steps-ramps",
  "cat/toys": "cat-toys",
  "cat/training-behavior": "cat-training-behavior",
  "cat/treats": "cat-treats",
  "cat/flea-tick": "cat-flea-tick",
  "dog/apparel-accessories": "dog-apparel-accessories",
  "dog/beds-bedding": "dog-beds-bedding",
  "dog/bowls-feeding": "dog-bowls-feeding",
  "dog/crates-containment": "dog-crates-containment",
  "dog/cleaning-potty-supplies": "dog-cleaning-potty-supplies",
  "dog/collars-harnesses-leashes": "dog-collars-harnesses-leashes",
  "dog/food": "dog-food",
  "dog/flea-tick": "dog-flea-tick",
  "dog/grooming-bathing": "dog-grooming-bathing",
  "dog/health-wellness": "dog-health-wellness",
  "dog/outdoor-travel-gear": "dog-outdoor-travel-gear",
  "dog/toys": "dog-toys",
  "dog/treats-chews": "dog-treats-chews",
}
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
  const [selectedAnimal, setSelectedAnimal] = useState(SHOP_NAV_TAXONOMY[0]?.slug || "cat")
  const [view, setView] = useState<PanelView>("animal")
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === selectedAnimal)
  const selectedAnimalName = ANIMALS.find(a => a.slug === selectedAnimal)?.name || "Shop"
  const selectedAnimalHref = ANIMALS.find(a => a.slug === selectedAnimal)?.href || "/shop"

  const handleAnimalSelect = (slug: string) => {
    setSelectedAnimal(slug)
    setExpandedDepartment(null)
    setView("animal")
  }

  const handleBrandHover = () => {
    setView("brands")
  }

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed inset-0 z-[60] flex h-screen w-screen bg-white shadow-2xl"
    >
      <div className="relative flex w-[160px] shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-3 py-7 sm:w-[228px] sm:px-5">
        <button
          onClick={onClose}
          aria-label="Close mega menu"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center text-neutral-500 transition-colors hover:bg-[#F2C500] hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="mb-4 pr-10 text-[10px] font-bold tracking-[0.18em] text-neutral-400">SHOP BY</p>

        <div className="space-y-1">
          {ANIMALS.map(a => (
            <button
              key={a.slug}
              onMouseEnter={() => handleAnimalSelect(a.slug)}
              onClick={() => handleAnimalSelect(a.slug)}
              className={`flex w-full items-center justify-between gap-2 px-2 py-3 text-left text-[12px] font-medium leading-snug transition-colors sm:px-3 sm:text-[13px] ${
                selectedAnimal === a.slug && view === "animal"
                  ? "bg-[#F2C500] text-[#002B5C]"
                  : "text-neutral-800 hover:bg-[#F2C500] hover:text-[#002B5C]"
              }`}
            >
              {a.name}
              {selectedAnimal === a.slug && view === "animal"
                ? <Minus size={14} aria-hidden="true" />
                : <Plus size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="my-5 border-t border-neutral-200" />

        <div className="space-y-1">
          <Link href="/shop/sale" onClick={onClose} className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-800 transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]">SALE</Link>
          <Link href="/shop/collections" onClick={onClose} className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-800 transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]">PROMOTIONS</Link>
          <Link href="/gift-cards" onClick={onClose} className="block px-3 py-2.5 text-[12px] font-bold tracking-[0.12em] text-neutral-800 transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]">GIFT CARDS</Link>
        </div>

        <div className="my-5 border-t border-neutral-200" />

        <button
          onMouseEnter={handleBrandHover}
          onClick={handleBrandHover}
          className={`block w-full px-3 py-2.5 text-left text-[12px] font-bold tracking-[0.12em] transition-colors ${
            view === "brands" ? "bg-[#F2C500] text-[#002B5C]" : "text-neutral-800 hover:bg-[#F2C500] hover:text-[#002B5C]"
          }`}
        >
          SHOP BY BRAND
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {view === "animal" && (
          <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h2 className="font-display text-[20px] font-bold leading-tight text-[#002B5C]">{selectedAnimalName}</h2>
                {animal?.tagline && <p className="mt-1 text-[11px] text-neutral-600">{animal.tagline}</p>}
              </div>
              <Link href={selectedAnimalHref} onClick={onClose} className="shrink-0 text-[11px] font-bold text-neutral-900 underline underline-offset-2 transition-colors hover:text-[#806500]">
                Shop all
              </Link>
            </div>

            {animal ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {animal.departments.map(dept => {
                  const departmentKey = `${animal.slug}/${dept.slug}`
                  const imageName = DEPARTMENT_IMAGES[departmentKey]
                  const expanded = expandedDepartment === departmentKey
                  return (
                    <article key={dept.slug} className="min-w-0 border border-neutral-200 bg-white">
                      <Link href={departmentPath(animal.slug, dept.slug)} onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-neutral-100">
                        {imageName && (
                          <Image
                            src={`/Shop/departments/${imageName}.jpeg`}
                            alt={dept.name}
                            fill
                            sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, 48vw"
                            className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                          />
                        )}
                        {!imageName && <PawPrint className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#002B5C]/40" strokeWidth={1.1} aria-hidden="true" />}
                      </Link>
                      <Link href={departmentPath(animal.slug, dept.slug)} onClick={onClose} className="flex min-h-9 items-center px-2.5 text-[11px] font-bold leading-snug text-neutral-900 transition-colors hover:text-[#806500]">
                        {dept.name}
                      </Link>
                      {dept.subcategories.length > 0 && (
                        <>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Browse"} ${dept.name} categories`}
                            onClick={() => setExpandedDepartment(expanded ? null : departmentKey)}
                            className="flex min-h-8 w-full items-center justify-between border-t border-neutral-200 px-2.5 text-left text-[10px] text-neutral-600 transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]"
                          >
                            Browse categories
                            {expanded ? <Minus size={12} /> : <Plus size={12} />}
                          </button>
                          {expanded && (
                            <ul className="space-y-1 border-t border-neutral-200 px-2.5 py-2">
                              {dept.subcategories.map(sub => (
                                <li key={sub.slug}>
                                  <Link href={subcategoryPath(animal.slug, dept.slug, sub.slug)} onClick={onClose} className="block text-[10px] leading-snug text-neutral-700 transition-colors hover:text-[#806500] hover:underline">
                                    {sub.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="mt-5 text-[12px] text-neutral-600">Browse the {selectedAnimalName.toLowerCase()} catalog.</p>
            )}
          </div>
        )}

        {/* --- Brand grid --- */}
        {view === "brands" && (
          <div className="flex-1 px-8 py-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-400">SHOP BY BRAND</p>
              <Link href="/shop/brands" onClick={onClose} className="text-[11px] font-semibold text-neutral-500 transition-colors hover:text-[#806500]">View all</Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {BRANDS.slice(0, 12).map(brand => (
                <Link
                  key={brand.slug}
                  href={`/shop/brands/${brand.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-center border border-neutral-200 bg-white px-2 py-4 text-center transition-colors hover:border-[#F2C500] hover:bg-[#F2C500]"
                >
                  <span className="text-[10px] font-bold text-neutral-900">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
