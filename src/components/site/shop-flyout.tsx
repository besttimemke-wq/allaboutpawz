"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Minus, Plus, X } from "lucide-react"
import { SHOP_ANIMALS, SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath, type ShopNavAnimal } from "@/lib/shop-nav"

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
type FlyoutTile = {
  key: string
  name: string
  href: string
  imageKey: string
  subcategories: { slug: string; name: string }[]
}

function flyoutTiles(animal: ShopNavAnimal): FlyoutTile[] {
  const showLeafCategories = !["cat", "dog"].includes(animal.slug)
  if (showLeafCategories) {
    return animal.departments.flatMap((department) =>
      department.subcategories.map((subcategory) => ({
        key: `${animal.slug}/${department.slug}/${subcategory.slug}`,
        name: subcategory.name,
        href: subcategoryPath(animal.slug, department.slug, subcategory.slug),
        imageKey: `${animal.slug}/${department.slug}`,
        subcategories: [],
      })),
    )
  }

  return animal.departments.map((department) => ({
    key: `${animal.slug}/${department.slug}`,
    name: department.name,
    href: departmentPath(animal.slug, department.slug),
    imageKey: `${animal.slug}/${department.slug}`,
    subcategories: department.subcategories,
  }))
}

export function ShopFlyout({ onClose }: { onClose: () => void }) {
  const [selectedAnimal, setSelectedAnimal] = useState(SHOP_NAV_TAXONOMY[0]?.slug || "cat")
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === selectedAnimal)
  const selectedAnimalName = ANIMALS.find(a => a.slug === selectedAnimal)?.name || "Shop"
  const selectedAnimalHref = ANIMALS.find(a => a.slug === selectedAnimal)?.href || "/shop"
  const tiles = animal ? flyoutTiles(animal) : []

  const handleAnimalSelect = (slug: string) => {
    setSelectedAnimal(slug)
    setExpandedDepartment(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex h-screen w-screen bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Shop departments">
      <div className="relative flex w-[200px] shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-[#f1f2ed] px-4 py-7 sm:w-[270px] sm:px-6">
        <button
          onClick={onClose}
          aria-label="Close mega menu"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center text-stone-600 transition-colors hover:text-orange-800"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="mb-3 pr-10 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Shop by</p>

        <div>
          {ANIMALS.map(a => (
            <button
              key={a.slug}
              onClick={() => handleAnimalSelect(a.slug)}
              className={`flex w-full items-center justify-between gap-2 py-2.5 text-left text-[16px] leading-snug underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline ${
                selectedAnimal === a.slug
                  ? "font-bold text-orange-800 underline"
                  : "text-stone-900"
              }`}
            >
              {a.name}
              {selectedAnimal === a.slug
                ? <Minus size={16} aria-hidden="true" />
                : <Plus size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="my-4 border-t border-stone-300" />

        <div>
          <Link href="/shop/sale" onClick={onClose} className="block py-2.5 text-[16px] text-stone-900 underline-offset-4 decoration-orange-600 decoration-2 hover:underline">Sale</Link>
          <Link href="/shop/collections" onClick={onClose} className="block py-2.5 text-[16px] text-stone-900 underline-offset-4 decoration-orange-600 decoration-2 hover:underline">Promotions</Link>
          <Link href="/gift-cards" onClick={onClose} className="block py-2.5 text-[16px] text-stone-900 underline-offset-4 decoration-orange-600 decoration-2 hover:underline">Gift cards</Link>
        </div>

        <div className="my-4 border-t border-stone-300" />

      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
            <div className="flex items-end justify-between gap-4 border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-[26px] font-black leading-tight text-stone-950">{selectedAnimalName}</h2>
                {animal?.tagline && <p className="mt-1 text-[15px] text-stone-700">{animal.tagline}</p>}
              </div>
              <Link href={selectedAnimalHref} onClick={onClose} className="shrink-0 text-[13px] font-bold text-stone-900 underline decoration-orange-600 decoration-2 underline-offset-4">
                Shop all
              </Link>
            </div>

            {animal ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tiles.map((tile) => {
                  const imageName = DEPARTMENT_IMAGES[tile.imageKey]
                  const expanded = expandedDepartment === tile.key
                  return (
                    <article key={tile.key} className="min-w-0 border border-stone-200 bg-white transition-colors hover:border-orange-600">
                      <Link href={tile.href} onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-stone-100">
                        {imageName && (
                          <Image
                            src={`/Shop/departments/${imageName}.jpeg`}
                            alt={tile.name}
                            fill
                            sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, 48vw"
                            className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                          />
                        )}
                        {!imageName && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Category</span>}
                      </Link>
                      <Link href={tile.href} onClick={onClose} className="flex min-h-12 items-center px-3 text-[16px] font-semibold leading-snug text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
                        {tile.name}
                      </Link>
                      {tile.subcategories.length > 0 && (
                        <>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Browse"} ${tile.name} categories`}
                            onClick={() => setExpandedDepartment(expanded ? null : tile.key)}
                            className="flex min-h-11 w-full items-center justify-between border-t border-neutral-200 px-3 text-left text-[15px] text-neutral-700"
                          >
                            Browse categories
                            {expanded ? <Minus size={16} /> : <Plus size={16} />}
                          </button>
                          {expanded && (
                            <ul className="border-t border-neutral-200 px-3 py-2">
                              {tile.subcategories.map(sub => (
                                <li key={sub.slug}>
                                  <Link href={`${tile.href}/${sub.slug}`} onClick={onClose} className="block py-1.5 text-[15px] leading-snug text-neutral-800 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
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
              <p className="mt-5 text-[15px] text-neutral-700">Browse the {selectedAnimalName.toLowerCase()} catalog.</p>
            )}
          </div>
      </div>
    </div>
  )
}
