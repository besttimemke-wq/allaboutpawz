"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Minus, PawPrint, Plus, X } from "lucide-react"
import { SHOP_ANIMALS } from "@/lib/shop-nav"
import {
  loadLiveShopNav,
  staticNavFallback,
  cachedLiveNav,
  type NavAnimal,
  type NavDepartment,
} from "@/lib/shop/nav-client"

// ---------------------------------------------------------------------------
// ShopFlyout — full-screen category menu with image-led department cards.
//
// Data source: the LIVE taxonomy tree (/api/shop/nav → taxonomy_nodes).
// Every animal renders ALL of its department cards, and every animal also
// gets a "Shop all categories" card grid so its L3 categories are directly
// routable — fish / bird / reptile / small-animal each have a single
// department, so without the L3 card grid users had nowhere to go.
//
// Paint strategy: static fallback instantly, swap to live tree when loaded.
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

type PanelView = "animal" | "brands"

function formatCount(n: number): string {
  return n > 0 ? `${n.toLocaleString()} products` : ""
}

/** Image-led card for a department. */
function DepartmentCard({
  dept,
  onClose,
}: {
  dept: NavDepartment
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const count = formatCount(dept.productCount)

  return (
    <article className="min-w-0 border border-neutral-200 bg-white">
      <Link
        href={dept.path}
        onClick={onClose}
        className="relative block aspect-[16/9] overflow-hidden bg-neutral-100"
      >
        {dept.image ? (
          <Image
            src={dept.image}
            alt={dept.name}
            fill
            sizes="(min-width: 1280px) 24vw, (min-width: 1024px) 32vw, 48vw"
            className="object-cover transition-transform duration-300 hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F8F6F1] to-[#EDE7DA]">
            <PawPrint className="h-8 w-8 text-[#002B5C]/40" strokeWidth={1.1} aria-hidden="true" />
          </span>
        )}
      </Link>
      <Link
        href={dept.path}
        onClick={onClose}
        className="flex min-h-12 items-center justify-between gap-2 px-3 py-2 text-[16px] font-semibold leading-snug text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline"
      >
        <span className="min-w-0">{dept.name}</span>
        {count && <span className="shrink-0 text-[12px] font-normal text-neutral-500">{count}</span>}
      </Link>
      {dept.subcategories.length > 0 && (
        <>
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Browse"} ${dept.name} categories`}
            onClick={() => setExpanded(e => !e)}
            className="flex min-h-11 w-full items-center justify-between border-t border-neutral-200 px-3 text-left text-[15px] text-neutral-700"
          >
            Browse categories
            {expanded ? <Minus size={16} /> : <Plus size={16} />}
          </button>
          {expanded && (
            <ul className="border-t border-neutral-200 px-3 py-2">
              {dept.subcategories.map(sub => (
                <li key={sub.slug}>
                  <Link
                    href={sub.path}
                    onClick={onClose}
                    className="flex items-center justify-between gap-2 py-1.5 text-[15px] leading-snug text-neutral-800 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline"
                  >
                    <span className="min-w-0">{sub.name}</span>
                    {sub.productCount > 0 && (
                      <span className="shrink-0 text-[12px] text-neutral-400">{sub.productCount}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  )
}

/**
 * L3 category card grid — the routing surface for single-department animals
 * (fish, bird, reptile, small-animal). Every L3 category becomes a
 * clickable card with its live product count.
 */
function AllCategoriesGrid({
  animal,
  onClose,
}: {
  animal: NavAnimal
  onClose: () => void
}) {
  const subs = animal.departments.flatMap(d =>
    d.subcategories.map(s => ({ ...s, deptName: d.name })),
  )
  if (subs.length === 0) return null

  return (
    <section className="mt-7" aria-label={`All ${animal.name} categories`}>
      <div className="flex items-end justify-between gap-4">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Shop all {subs.length} categories
        </h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {subs.map(sub => (
          <Link
            key={sub.slug}
            href={sub.path}
            onClick={onClose}
            className="group flex min-w-0 flex-col border border-neutral-200 bg-white transition-colors hover:border-[#F2C500]"
          >
            <span className="relative block aspect-[16/10] overflow-hidden bg-neutral-100">
              {sub.image ? (
                <Image
                  src={sub.image}
                  alt={sub.name}
                  fill
                  sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 24vw, 48vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#F8F6F1] to-[#EDE7DA]">
                  <PawPrint className="h-6 w-6 text-[#002B5C]/40" strokeWidth={1.1} aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="flex min-h-11 flex-col justify-center px-2.5 py-1.5">
              <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 group-hover:underline">
                {sub.name}
              </span>
              {sub.productCount > 0 && (
                <span className="text-[11.5px] text-neutral-500">
                  {sub.productCount.toLocaleString()} products
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function ShopFlyout({
  onClose,
  onEnter,
  onLeave,
}: {
  onClose: () => void
  onEnter?: () => void
  onLeave?: () => void
}) {
  const [nav, setNav] = useState<NavAnimal[]>(() => cachedLiveNav() ?? staticNavFallback())
  const [selectedAnimal, setSelectedAnimal] = useState<string>(nav[0]?.slug || "cat")
  const [view, setView] = useState<PanelView>("animal")
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hydrate the live tree (module-level cache — one fetch per session).
  useEffect(() => {
    let alive = true
    loadLiveShopNav().then(live => {
      if (alive) setNav(live)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Reset scroll when switching animal so each panel starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [selectedAnimal, view])

  const animal = nav.find(a => a.slug === selectedAnimal) ?? nav[0]
  const selectedAnimalName =
    SHOP_ANIMALS.find(a => a.slug === selectedAnimal)?.name ?? animal?.name ?? "Shop"
  const selectedAnimalHref =
    SHOP_ANIMALS.find(a => a.slug === selectedAnimal)?.href ?? "/shop"

  const handleAnimalSelect = (slug: string) => {
    setSelectedAnimal(slug)
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

        <p className="mb-3 pr-10 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          Shop by
        </p>

        <div>
          {nav.map(a => (
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
              {selectedAnimal === a.slug && view === "animal" ? (
                <Minus size={16} aria-hidden="true" />
              ) : (
                <Plus size={16} aria-hidden="true" />
              )}
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

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
        {view === "animal" && animal && (
          <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
            <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h2 className="font-display text-[26px] font-bold leading-tight text-[#002B5C]">
                  {animal.name}
                </h2>
                {animal.tagline && <p className="mt-1 text-[15px] text-neutral-700">{animal.tagline}</p>}
                {animal.productCount > 0 && (
                  <p className="mt-0.5 text-[13px] font-medium text-neutral-500">
                    {animal.productCount.toLocaleString()} products in stock
                  </p>
                )}
              </div>
              <Link
                href={selectedAnimalHref}
                onClick={onClose}
                className="shrink-0 text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4"
              >
                Shop all
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {animal.departments.map(dept => (
                <DepartmentCard key={dept.slug} dept={dept} onClose={onClose} />
              ))}
            </div>

            {/* L3 routing grid — critical for single-department animals. */}
            <AllCategoriesGrid animal={animal} onClose={onClose} />
          </div>
        )}

        {view === "animal" && !animal && (
          <div className="flex-1 px-8 py-8">
            <p className="text-[15px] text-neutral-700">Browse the catalog.</p>
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
