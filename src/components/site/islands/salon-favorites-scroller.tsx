"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import type { SalonFavorite } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// SalonFavoritesScroller — the homepage "AA Picks · Salon Favorites" trust
// surface, owner-curated via products.is_salon_favorite.
//
// Owner ruling after v2: the scroller is the SAME AA Pick banner that runs on
// every listing page (plp.tsx PromoBanner — product shot left on white with
// the gold AA PICK badge, navy panel right with brand / name / price and the
// gold GET THIS NOW CTA), rotating Chewy-hero style: auto-advance, dots, and
// a pause control. One pick per slide. NOT a rail of add-to-cart cards.
// ---------------------------------------------------------------------------

const ROTATE_MS = 6000

function BannerSlide({ f, active }: { f: SalonFavorite; active: boolean }) {
  const price = f.priceCents != null ? `$${(f.priceCents / 100).toFixed(2)}` : null
  const compareAt =
    f.isOnSale && f.compareAtPriceCents != null && f.priceCents != null
      ? `$${(f.compareAtPriceCents / 100).toFixed(2)}`
      : null

  return (
    <Link
      href={`/products/${f.slug}`}
      aria-label={`Get ${f.name}${price ? ` — ${price}` : ""}`}
      aria-roledescription="slide"
      aria-hidden={!active}
      tabIndex={active ? 0 : -1}
      className={`flex h-full flex-col border-2 border-[#002B5C] bg-[#002B5C] sm:flex-row sm:items-stretch ${
        active ? "relative" : "pointer-events-none absolute inset-0"
      }`}
    >
      {/* Product shot — white plate, gold AA PICK badge (same as the PLP banner).
          FIXED width so every slide shares the same geometry. */}
      <div className="relative h-36 w-full shrink-0 bg-white sm:h-full sm:w-64 lg:w-96">
        {f.image ? (
          <img
            src={f.image}
            alt={f.brand ? `${f.brand} — ${f.name}` : f.name}
            className="h-full w-full object-cover"
            loading={active ? "eager" : "lazy"}
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden="true">
            <span className="font-display text-4xl text-neutral-300">AA</span>
          </div>
        )}
        <span className="absolute left-4 top-4 bg-[#F2C500] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#002B5C]">
          AA Pick
        </span>
      </div>

      {/* Navy panel — brand eyebrow, name, price, GET THIS NOW. Name clamps
          to 2 lines so long titles can't grow the slide. */}
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2 overflow-hidden px-6 py-5 sm:px-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F2C500]">
          {f.brand || "All About Pawz"}
        </p>
        <h4 className="line-clamp-2 text-[20px] font-extrabold leading-[1.15] text-white lg:text-[24px]">{f.name}</h4>
        <p className="flex items-baseline gap-2.5">
          {price && <span className="text-[20px] font-extrabold text-white">{price}</span>}
          {compareAt && <span className="text-[14px] font-semibold text-white/60 line-through">{compareAt}</span>}
        </p>
        <span className="mt-1 inline-flex items-center gap-2 bg-[#F2C500] px-6 py-3 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#002B5C] transition-colors group-hover/carousel:bg-white">
          Get This Now
          <ChevronRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

export function SalonFavoritesScroller({ products }: { products: SalonFavorite[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const hover = useRef(false)

  const count = products.length
  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count])

  useEffect(() => {
    if (paused || hover.current || count < 2) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, count])

  if (count === 0) return null

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="AA Picks — Salon Favorites"
      className="group/carousel"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      onFocusCapture={() => (hover.current = true)}
      onBlurCapture={() => (hover.current = false)}
    >
      {/* FIXED height — every slide is the exact same size, no jumping */}
      <div className="relative h-[300px] sm:h-[240px] lg:h-[260px]">
        {products.map((f, i) => (
          <BannerSlide key={f.id} f={f} active={i === index} />
        ))}

        {/* Prev / next — desktop chrome, 44px targets */}
        <button
          type="button"
          onClick={() => go(index - 1)}
          aria-label="Previous pick"
          className="absolute top-1/2 left-3 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#002B5C] shadow-md transition-colors hover:bg-white sm:flex"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          aria-label="Next pick"
          className="absolute top-1/2 right-3 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#002B5C] shadow-md transition-colors hover:bg-white sm:flex"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* Carousel chrome — dots + pause, Chewy-hero pattern */}
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5">
          {products.map((f, i) => (
            <button
              key={`dot-${f.id}`}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to pick ${i + 1} of ${count}`}
              aria-current={i === index}
              className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${
                i === index ? "bg-[#F2C500]" : "bg-white/45 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play picks rotation" : "Pause picks rotation"}
          aria-pressed={paused}
          className="absolute right-3 bottom-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
        >
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
