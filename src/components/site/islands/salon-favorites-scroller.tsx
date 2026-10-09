"use client"

import { useRef } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductCard } from "@/components/site/shop/product-card"
import type { SalonFavorite } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// SalonFavoritesScroller — the homepage trust surface. One horizontal
// scroll-snap rail of the owner-curated "AA Picks · Salon Favorites"
// (products.is_salon_favorite). This curation — products the salon team
// actually uses — stands in place of a reviews wall: it is a trust signal a
// visitor can act on (every card is shoppable) instead of an anonymous
// star rating they have to take on faith.
// ---------------------------------------------------------------------------

export function SalonFavoritesScroller({ products }: { products: SalonFavorite[] }) {
  const rail = useRef<HTMLDivElement>(null)

  const nudge = (dir: 1 | -1) => {
    const el = rail.current
    if (!el) return
    // Scroll by roughly two cards on desktop, one on mobile.
    const card = el.querySelector<HTMLElement>("[data-card]")
    const step = card ? card.offsetWidth + 24 : 280
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" })
  }

  if (products.length === 0) return null

  const cards = products.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    price: f.priceCents != null ? `$${(f.priceCents / 100).toFixed(2)}` : "—",
    image: f.image,
    alt: f.brand ? `${f.brand} — ${f.name}` : f.name,
    badge: f.isBestseller ? "SALON PICK" : null,
    category: f.brand,
    isOnSale: f.isOnSale,
    isNew: f.isNew,
    isBestseller: f.isBestseller,
    compareAtPriceCents: f.compareAtPriceCents,
    priceCents: f.priceCents,
    rating: { avg: f.ratingAvg ?? 0, count: f.ratingCount },
  }))

  return (
    <div className="relative">
      {/* Arrow controls — 44px+ targets, hidden on touch-first widths where
          the rail swipes naturally */}
      <div className="absolute -top-1 right-0 hidden gap-2 sm:flex">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll favorites left"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-[#002B5C] hover:text-[#002B5C]"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll favorites right"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-[#002B5C] hover:text-[#002B5C]"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={rail}
        role="region"
        aria-label="AA Picks — Salon Favorites products"
        className="shop-nav-scroll -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 pb-4 lg:-mx-12 lg:px-12"
      >
        {cards.map((p, i) => (
          <div
            key={p.id}
            data-card
            className="w-[240px] shrink-0 snap-start sm:w-[264px]"
          >
            <ProductCard product={p as never} priority={i < 2} />
          </div>
        ))}

        {/* End card — routes into the full curation */}
        <div className="flex w-[200px] shrink-0 snap-start items-center">
          <Link
            href="/shop/collections/salon-favorites"
            className="group flex h-full min-h-[220px] w-full flex-col items-start justify-between rounded-lg border border-[#002B5C]/20 bg-cream p-5 transition-colors hover:border-[#002B5C]"
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
              The full curation
            </span>
            <span className="font-display text-[20px] leading-[1.2] text-[#002B5C]">
              Shop all AA Picks →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
