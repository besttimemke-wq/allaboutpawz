"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import type { SalonFavorite } from "@/lib/shop/salon-favorites"
// ---------------------------------------------------------------------------
// SalonFavoritesScroller — the homepage "AA Picks · Salon Favorites" trust
// surface, owner-curated via products.is_salon_favorite.
//
// Owner rulings (latest round):
//  - DENSE: multiple pick banners visible at once (1.1 / 2 / 3 across), not a
//    one-image hero carousel.
//  - NO blue tint: the navy panel is gone. Every banner is a white card with
//    the gold AA PICK badge, ink text, and the gold GET THIS NOW CTA.
//  - UNIFORM: every banner is the exact same fixed size — no jumping.
//  - FULL-BLEED: the rail runs edge to edge with no side gutters.
// ---------------------------------------------------------------------------

const ROTATE_MS = 4500
const INK = "#1a1a1a"
const GOLD = "#F2C500"

function PickCard({ f }: { f: SalonFavorite }) {
  const price = f.priceCents != null ? `$${(f.priceCents / 100).toFixed(2)}` : null
  const compareAt =
    f.isOnSale && f.compareAtPriceCents != null && f.priceCents != null
      ? `$${(f.compareAtPriceCents / 100).toFixed(2)}`
      : null
  // Dead feed URLs fall back to the AA monogram instead of a broken-image icon.
  const [imgOk, setImgOk] = useState(true)

  return (
    <Link
      href={`/products/${f.slug}`}
      aria-label={`Get ${f.name}${price ? ` — ${price}` : ""}`}
      className="group/pick flex h-full overflow-hidden border border-ink/10 bg-white transition-colors hover:border-[#F2C500]"
    >
      {/* Product shot — white plate, gold AA PICK badge. object-contain so
          packshots sit on the plate the same way every time. */}
      <div className="relative w-[42%] shrink-0 bg-white">
        {f.image && imgOk ? (
          <img
            src={f.image}
            alt={f.brand ? `${f.brand} — ${f.name}` : f.name}
            className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover/pick:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden="true">
            <span className="font-display text-4xl text-neutral-200">AA</span>
          </div>
        )}
        <span
          className="absolute left-0 top-3 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]"
          style={{ backgroundColor: GOLD, color: INK }}
        >
          AA Pick
        </span>
      </div>

      {/* Copy — brand eyebrow, name, price, GET THIS NOW. Name clamps to 2
          lines so long titles can never grow the card. */}
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-1.5 px-4 py-4 lg:px-5">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-soft">
          {f.brand || "All About Pawz"}
        </p>
        <h4 className="line-clamp-2 font-display text-[16px] font-bold leading-[1.2] text-ink lg:text-[17px]">
          {f.name}
        </h4>
        <p className="flex items-baseline gap-2">
          {price && <span className="text-[17px] font-extrabold text-ink">{price}</span>}
          {compareAt && <span className="text-[12.5px] font-semibold text-ink-soft line-through">{compareAt}</span>}
        </p>
        <span
          className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 text-[10.5px] font-extrabold uppercase tracking-[0.1em] transition-colors group-hover/pick:brightness-95"
          style={{ backgroundColor: GOLD, color: INK }}
        >
          Get This Now
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}

export function SalonFavoritesScroller({ products }: { products: SalonFavorite[] }) {
  const rail = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const hover = useRef(false)

  const count = products.length

  // One card = its rendered width + the rail gap.
  const step = useCallback(() => {
    const el = rail.current
    if (!el) return 0
    const card = el.querySelector<HTMLElement>("[data-pick-card]")
    if (!card) return el.clientWidth * 0.5
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0
    return card.offsetWidth + gap
  }, [])

  const goTo = useCallback(
    (i: number) => {
      const el = rail.current
      if (!el) return
      const target = ((i % count) + count) % count
      el.scrollTo({ left: target * step(), behavior: "smooth" })
    },
    [count, step],
  )

  // Keep the dot index in sync with manual swipes too.
  const onScroll = useCallback(() => {
    const el = rail.current
    if (!el) return
    const s = step()
    if (s <= 0) return
    const max = el.scrollWidth - el.clientWidth
    const i = el.scrollLeft >= max - 8 ? count - 1 : Math.round(el.scrollLeft / s)
    setIndex(Math.min(Math.max(i, 0), count - 1))
  }, [count, step])

  useEffect(() => {
    if (paused || hover.current || count < 2) return
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = setInterval(() => {
      const el = rail.current
      if (!el) return
      const max = el.scrollWidth - el.clientWidth
      if (el.scrollLeft >= max - 8) goTo(0)
      else goTo(index + 1)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [paused, count, index, goTo])

  if (count === 0) return null

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="AA Picks — Salon Favorites"
      className="group/carousel relative"
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      onFocusCapture={() => (hover.current = true)}
      onBlurCapture={() => (hover.current = false)}
    >
      {/* Full-bleed rail — multiple uniform banners visible, snap scrolling */}
      <div
        ref={rail}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-1 lg:gap-4 lg:px-8"
      >
        {products.map((f) => (
          <div
            key={f.id}
            data-pick-card
            className="h-[220px] w-[86%] shrink-0 snap-start sm:w-[calc(50%-7px)] lg:h-[240px] lg:w-[calc(33.333%-11px)]"
          >
            <PickCard f={f} />
          </div>
        ))}
      </div>

      {/* Prev / next — 44px targets, white chrome over the cream band */}
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        aria-label="Previous pick"
        className="absolute top-1/2 left-2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-ink shadow-md ring-1 ring-ink/10 transition-colors hover:bg-[#F2C500] sm:flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => goTo(index + 1)}
        aria-label="Next pick"
        className="absolute top-1/2 right-2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-ink shadow-md ring-1 ring-ink/10 transition-colors hover:bg-[#F2C500] sm:flex"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Dots + pause — bottom center, ink on cream */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {products.map((f, i) => (
          <button
            key={`dot-${f.id}`}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to pick ${i + 1} of ${count}`}
            aria-current={i === index}
            className={`h-2.5 w-2.5 cursor-pointer rounded-full transition-colors ${
              i === index ? "bg-ink" : "bg-ink/20 hover:bg-ink/40"
            }`}
          />
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play picks rotation" : "Pause picks rotation"}
          aria-pressed={paused}
          className="ml-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/10"
        >
          {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )
}
