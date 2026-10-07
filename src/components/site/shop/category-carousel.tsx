"use client"

// ---------------------------------------------------------------------------
// CategoryCarousel — a modern horizontal carousel (Petco / Netflix style).
// - Left + right chevron arrow buttons on each end of the carousel.
// - Clicking the arrows scrolls the carousel by one card width (with smooth
//   behavior). NO visible scrollbar (no-scrollbar utility hides it).
// - The arrows fade out when the carousel can't scroll further in that
//   direction (left arrow hidden at start, right arrow hidden at end).
// - Each card: image (full-bleed 4:3) + bold title + 1-sentence description.
// - Keyboard accessible: when the carousel container has focus, Left/Right
//   arrow keys scroll it one card.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type CategoryCard = {
  name: string
  description: string
  href: string
  image?: string
  imageAlt?: string
}

export function CategoryCarousel({
  title,
  cards,
  totalCount,
}: {
  title: string
  cards: CategoryCard[]
  totalCount?: number
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // Track whether the carousel can scroll left / right at its current
  // scroll position. Updated on scroll + on resize.
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const updateScrollState = () => {
    const el = scrollRef.current
    if (!el) return
    // 2px tolerance — any sub-pixel rounding shouldn't flip the arrows.
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  useEffect(() => {
    updateScrollState()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateScrollState, { passive: true })
    window.addEventListener("resize", updateScrollState)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [cards.length])

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    // Scroll by ~80% of the visible width — that's about 3-4 cards at a
    // time, which feels right for a 4-card-visible carousel. Smooth
    // behavior so the user sees the motion.
    const delta = Math.round(el.clientWidth * 0.8) * direction
    el.scrollBy({ left: delta, behavior: "smooth" })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      scrollByCards(-1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      scrollByCards(1)
    }
  }

  if (cards.length === 0) return null

  return (
    <section className="px-6 py-8 lg:px-12 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-[20px] font-bold text-ink lg:text-[24px]">{title}</h2>
          <span className="text-[11px] text-ink-soft">{totalCount ?? cards.length} categories</span>
        </div>

        {/* Carousel container — relative so the arrow buttons can absolute-
            position against it. The scroll container has overflow-x-auto +
            no-scrollbar so the user only sees the chevron arrows, never an
            ugly horizontal scrollbar. */}
        <div className="relative mt-5">
          {/* LEFT arrow — only visible when there's content to scroll left to. */}
          {canLeft && (
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              aria-label="Scroll left"
              className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-md transition-all hover:border-[#002B5C] hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B5C]/40"
            >
              <ChevronLeft className="h-5 w-5 text-ink" strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {/* RIGHT arrow — only visible when there's content to scroll right to. */}
          {canRight && (
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              aria-label="Scroll right"
              className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white shadow-md transition-all hover:border-[#002B5C] hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#002B5C]/40"
            >
              <ChevronRight className="h-5 w-5 text-ink" strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {/* The scroll container itself. */}
          <div
            ref={scrollRef}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="list"
            aria-label={title}
            className="no-scrollbar flex gap-4 overflow-x-auto scroll-smooth px-1 pb-2 outline-none"
          >
            {cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                role="listitem"
                className="group w-[240px] shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all hover:border-[#002B5C] hover:shadow-md sm:w-[260px] lg:w-[280px]"
              >
                {/* Image (full-bleed, 4:3 aspect). */}
                <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                  <img
                    src={c.image}
                    alt={c.imageAlt || `${c.name} — All About Pawz Memphis`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-[14px] font-bold text-ink group-hover:text-[#002B5C]">{c.name}</h3>
                  {c.description && (
                    <p className="mt-1 text-[12px] leading-snug text-ink-soft line-clamp-2">{c.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Subtle edge fade — keeps the visual hint that more cards are
              off-screen, in addition to the arrow buttons. The fade is
              8px wide on each side; the arrow buttons sit on top of it. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
        </div>
      </div>
    </section>
  )
}
