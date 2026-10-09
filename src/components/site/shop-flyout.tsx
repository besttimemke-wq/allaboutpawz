"use client"

import { Fragment, useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Minus, PawPrint, Plus, X } from "lucide-react"
import { SHOP_ANIMALS, SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { categoryImage } from "@/lib/shop/category-images"
import { cachedLiveNav, loadLiveShopNav } from "@/lib/shop/nav-client"

// ---------------------------------------------------------------------------
// ShopFlyout — full-screen category menu with image-led department cards.
//
// SYMMETRY PATCH (data-only, design untouched): the static tree gives fish /
// bird / reptile / small-animal a SINGLE department each, so those panels had
// one route while dog / cat had 12-15 cards. When the live nav is available,
// a single-department animal's L3 categories render as extra cards INSIDE the
// same grid, using the exact same card markup and image rules. Dog / cat
// panels and every visual class are untouched.
// ---------------------------------------------------------------------------

/** Hydrated L3 card (live nav only — never rendered from the static fallback). */
type LiveSubCard = { name: string; path: string; image: string | null }

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
  // "<animal>/<dept>" → L3 cards for single-department animals (live nav only)
  const [liveSubCards, setLiveSubCards] = useState<Record<string, LiveSubCard[]>>({})
  // "<animal>/<dept>" → live subcategory links for EVERY department. The
  // static tree's L3 slugs predate the feed import; the LIVE sub slugs are
  // what the server actually routes. Same markup — only hrefs/names upgrade.
  const [liveSubLinks, setLiveSubLinks] = useState<Record<string, { slug: string; name: string; href: string }[]>>({})

  useEffect(() => {
    let alive = true
    loadLiveShopNav().then(() => {
      const nav = cachedLiveNav()
      if (!alive || !nav) return // API unavailable — keep the static design
      const next: Record<string, LiveSubCard[]> = {}
      const links: Record<string, { slug: string; name: string; href: string }[]> = {}
      for (const a of nav) {
        for (const dept of a.departments) {
          if (dept.subcategories.length === 0) continue
          const entry = dept.subcategories.map((s) => ({ slug: s.slug, name: s.name, href: s.path }))
          links[`${a.slug}/${dept.slug}`] = entry
          // Also join the STATIC panel key ("cat/food" → cat-cat-food's live
          // subs) so the owner-designed static tree links live routes.
          const sk = dept.staticKey
          if (sk && sk !== dept.slug && !links[`${a.slug}/${sk}`]) {
            links[`${a.slug}/${sk}`] = entry
          }
        }
        if (a.departments.length !== 1) continue
        const dept = a.departments[0]
        if (dept.subcategories.length === 0) continue
        const key = `${a.slug}/${dept.slug}`
        next[key] = dept.subcategories.map((s) => ({
          name: s.name,
          path: s.path,
          image: s.image,
        }))
        // Static-nav alias: SHOP_NAV_TAXONOMY calls this animal "small-pet".
        if (a.slug === "small-animal") next[`small-pet/${dept.slug}`] = next[key]
      }
      setLiveSubCards(next)
      setLiveSubLinks(links)
    })
    return () => { alive = false }
  }, [])

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
      <div className="relative flex w-[200px] shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-4 py-7 sm:w-[270px] sm:px-6">
        <button
          onClick={onClose}
          aria-label="Close mega menu"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center text-neutral-600 transition-colors hover:text-black"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="mb-3 pr-10 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Shop by</p>

        <div>
          {ANIMALS.map(a => (
            <button
              key={a.slug}
              onMouseEnter={() => handleAnimalSelect(a.slug)}
              onClick={() => handleAnimalSelect(a.slug)}
              className={`flex w-full items-center justify-between gap-2 py-2.5 text-left text-[16px] leading-snug underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline ${
                selectedAnimal === a.slug && view === "animal"
                  ? "font-semibold text-[#002B5C] underline"
                  : "text-neutral-900"
              }`}
            >
              {a.name}
              {selectedAnimal === a.slug && view === "animal"
                ? <Minus size={16} aria-hidden="true" />
                : <Plus size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="my-4 border-t border-neutral-200" />

        <div>
          <Link href="/shop/sale" onClick={onClose} className="block py-2.5 text-[16px] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">Sale</Link>
          <Link href="/shop/collections" onClick={onClose} className="block py-2.5 text-[16px] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">Promotions</Link>
          <Link href="/gift-cards" onClick={onClose} className="block py-2.5 text-[16px] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">Gift cards</Link>
        </div>

        <div className="my-4 border-t border-neutral-200" />

        <button
          onMouseEnter={handleBrandHover}
          onClick={handleBrandHover}
          className={`block w-full py-2.5 text-left text-[16px] underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline ${
            view === "brands" ? "font-semibold text-[#002B5C] underline" : "text-neutral-900"
          }`}
        >
          Shop by brand
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {view === "animal" && (
          <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h2 className="font-display text-[26px] font-bold leading-tight text-[#002B5C]">{selectedAnimalName}</h2>
                {animal?.tagline && <p className="mt-1 text-[15px] text-neutral-700">{animal.tagline}</p>}
              </div>
              <Link href={selectedAnimalHref} onClick={onClose} className="shrink-0 text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4">
                Shop all
              </Link>
            </div>

            {animal ? (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {animal.departments.map(dept => {
                  const departmentKey = `${animal.slug}/${dept.slug}`
                  const imageName = DEPARTMENT_IMAGES[departmentKey]
                  // Wikimedia species/department imagery as fallback for
                  // departments without a generated image (fish, bird, reptile,
                  // small-pet). categoryImage already walks up to the species.
                  const departmentSrc = imageName
                    ? `/Shop/departments/${imageName}.jpeg`
                    : categoryImage(departmentKey)
                  const expanded = expandedDepartment === departmentKey
                  // Live L3 cards for single-department animals (fish / bird /
                  // reptile / small-animal). Same card markup, same image rules.
                  const hydratedCards = liveSubCards[departmentKey]
                  return (
                    <Fragment key={dept.slug}>
                    <article className="min-w-0 border border-neutral-200 bg-white">
                      <Link href={departmentPath(animal.slug, dept.slug)} onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-neutral-100">
                        {departmentSrc && (
                          <Image
                            src={departmentSrc}
                            alt={dept.name}
                            fill
                            sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, 48vw"
                            className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                          />
                        )}
                        {!departmentSrc && <PawPrint className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#002B5C]/40" strokeWidth={1.1} aria-hidden="true" />}
                      </Link>
                      <Link href={departmentPath(animal.slug, dept.slug)} onClick={onClose} className="flex min-h-12 items-center px-3 text-[16px] font-semibold leading-snug text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
                        {dept.name}
                      </Link>
                      {dept.subcategories.length > 0 && (
                        <>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? "Hide" : "Browse"} ${dept.name} categories`}
                            onClick={() => setExpandedDepartment(expanded ? null : departmentKey)}
                            className="flex min-h-11 w-full items-center justify-between border-t border-neutral-200 px-3 text-left text-[15px] text-neutral-700"
                          >
                            Browse categories
                            {expanded ? <Minus size={16} /> : <Plus size={16} />}
                          </button>
                          {expanded && (() => {
                            // Live sub slugs when the nav has them (they are
                            // what the server routes); static list otherwise.
                            const subs = liveSubLinks[departmentKey] ?? dept.subcategories.map(s => ({ slug: s.slug, name: s.name, href: subcategoryPath(animal.slug, dept.slug, s.slug) }))
                            return (
                            <ul className="border-t border-neutral-200 px-3 py-2">
                              {subs.map(sub => (
                                <li key={sub.slug}>
                                  <Link href={sub.href} onClick={onClose} className="block py-1.5 text-[15px] leading-snug text-neutral-800 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
                                    {sub.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                            )
                          })()}
                        </>
                      )}
                    </article>
                    {hydratedCards?.map(card => (
                      <article key={card.path} className="min-w-0 border border-neutral-200 bg-white">
                        <Link href={card.path} onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-neutral-100">
                          {card.image ? (
                            <Image
                              src={card.image}
                              alt={card.name}
                              fill
                              sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, 48vw"
                              className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                            />
                          ) : (
                            <PawPrint className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#002B5C]/40" strokeWidth={1.1} aria-hidden="true" />
                          )}
                        </Link>
                        <Link href={card.path} onClick={onClose} className="flex min-h-12 items-center px-3 text-[16px] font-semibold leading-snug text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
                          {card.name}
                        </Link>
                      </article>
                    ))}
                    </Fragment>
                  )
                })}
              </div>
            ) : (
              <p className="mt-5 text-[15px] text-neutral-700">Browse the {selectedAnimalName.toLowerCase()} catalog.</p>
            )}
          </div>
        )}

        {/* --- Brand grid --- */}
        {view === "brands" && (
          <div className="flex-1 px-8 py-8">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Shop by brand</p>
              <Link href="/shop/brands" onClick={onClose} className="text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4">View all</Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {BRANDS.slice(0, 12).map(brand => (
                <Link
                  key={brand.slug}
                  href={`/shop/brands/${brand.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-center border border-neutral-200 bg-white px-3 py-5 text-center transition-colors hover:border-[#F2C500]"
                >
                  <span className="text-[15px] font-semibold text-neutral-900">{brand.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
