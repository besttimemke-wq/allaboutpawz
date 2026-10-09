"use client"

import { useRef } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, PawPrint } from "lucide-react"
import type { SalonFavorite } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// SalonFavoritesScroller — the homepage trust surface ("AA Picks · Salon
// Favorites", owner-curated via products.is_salon_favorite).
//
// Owner ruling after v1: this rail is a TRUST SIGNAL, not a checkout surface.
// Cards are light picks — image, name, price, link to the product page —
// NO add-to-cart buttons. It scrolls ONE card per arrow click, about five
// picks visible on desktop, matching the front page's calm salon feel.
// ---------------------------------------------------------------------------

function PickCard({ f, priority = false }: { f: SalonFavorite; priority?: boolean }) {
  return (
    <Link
      href={`/products/${f.slug}`}
      aria-label={`View ${f.name}`}
      className="group block w-[168px] shrink-0 snap-start sm:w-[196px] lg:w-[212px]"
    >
      <div className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-white transition-colors group-hover:border-[#F2C500]">
        <span className="absolute left-0 top-0 z-10 bg-[#F2C500] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#002B5C]">
          AA Pick
        </span>
        {f.isOnSale && (
          <span className="absolute right-0 top-0 z-10 bg-[#002B5C] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
            Sale
          </span>
        )}
        {f.image ? (
          <img
            src={f.image}
            alt={f.brand ? `${f.brand} — ${f.name}` : f.name}
            width={424}
            height={424}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden="true">
            <PawPrint className="h-9 w-9 text-neutral-300" strokeWidth={1.2} />
          </div>
        )}
      </div>

      {f.brand && (
        <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
          {f.brand}
        </p>
      )}
      <p className="mt-1 line-clamp-2 text-[14px] font-semibold leading-[1.35] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 group-hover:underline">
        {f.name}
      </p>
      <p className="mt-1.5 text-[15px] font-bold text-[#002B5C]">
        {f.priceCents != null ? `$${(f.priceCents / 100).toFixed(2)}` : "—"}
      </p>
    </Link>
  )
}

export function SalonFavoritesScroller({ products }: { products: SalonFavorite[] }) {
  const rail = useRef<HTMLDivElement>(null)

  // One card per click — calm, predictable scrolling.
  const nudge = (dir: 1 | -1) => {
    const el = rail.current
    if (!el) return
    const card = el.querySelector<HTMLElement>("[data-card]")
    const step = card ? card.offsetWidth + 20 : 212
    el.scrollBy({ left: dir * step, behavior: "smooth" })
  }

  if (products.length === 0) return null

  return (
    <div className="relative">
      {/* Arrows — 44px+ targets, vertically centered over the rail, above the
          cards (z-10) so card overlays never swallow the click; hidden on
          touch widths where the rail swipes */}
      <div className="absolute top-1/2 right-6 z-10 hidden -translate-y-1/2 gap-2 lg:right-10 sm:flex">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll salon favorites left"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition-colors hover:border-[#002B5C] hover:text-[#002B5C]"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll salon favorites right"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition-colors hover:border-[#002B5C] hover:text-[#002B5C]"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={rail}
        role="region"
        aria-label="AA Picks — Salon Favorites products"
        className="shop-nav-scroll -mx-8 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-8 pb-2 lg:-mx-12 lg:px-12"
      >
        {products.map((f, i) => (
          <div key={f.id} data-card>
            <PickCard f={f} priority={i < 3} />
          </div>
        ))}

        {/* End card — routes into the full curation */}
        <Link
          href="/shop/collections/salon-favorites"
          className="group flex w-[168px] shrink-0 snap-start flex-col items-start justify-between rounded-md border border-[#002B5C]/25 bg-[#002B5C] p-4 transition-colors hover:border-[#002B5C] sm:w-[196px] lg:w-[212px]"
          aria-label="Shop all AA Picks salon favorites"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            The full curation
          </span>
          <span className="font-display text-[19px] leading-[1.25] text-white">
            Shop all<br />AA Picks
            <span className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
