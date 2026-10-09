"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Send } from "lucide-react"
import { ProductCard, type ProductCardData } from "@/components/site/shop/product-card"

// ---------------------------------------------------------------------------
// Client chrome for the homepage's final CTA:
//   1. NewCustomerSignup — "10% off for new customers" email capture.
//   2. SaleRail — the "on sale items scrolling" rail: dense uniform
//      ProductCards, arrows + Page X of Y, exactly like the reference rails.
// ---------------------------------------------------------------------------

export function NewCustomerSignup() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="mt-5 flex w-full max-w-[440px] flex-col gap-2.5 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const email = (form.elements.namedItem("email") as HTMLInputElement).value
        if (!email || busy) return
        setBusy(true)
        try {
          await fetch("/api/cms/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
          setDone(true)
          form.reset()
        } catch {
          /* keep the form usable on a blip */
        } finally {
          setBusy(false)
        }
      }}
    >
      {done ? (
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#F2C500]">
          You&apos;re in — check your inbox for your 10% code.
        </p>
      ) : (
        <>
          <input
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            aria-label="Email address for 10% off"
            className="min-h-[44px] w-full border border-white/25 bg-white px-4 py-2.5 text-[13px] text-ink placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#F2C500]"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 bg-[#F2C500] px-6 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors hover:bg-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {busy ? "Sending…" : "Get My 10% Off"}
          </button>
        </>
      )}
    </form>
  )
}

export function SaleRail({
  products,
  eyebrow,
  title,
  cta,
}: {
  products: ProductCardData[]
  eyebrow: string
  title: string
  cta?: { label: string; href: string }
}) {
  const rail = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const recalc = useCallback(() => {
    const el = rail.current
    if (!el) return
    const p = Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth))
    setPages(p)
    setPage(Math.min(p, Math.round(el.scrollLeft / el.clientWidth) + 1))
  }, [])

  useEffect(() => {
    recalc()
    window.addEventListener("resize", recalc)
    return () => window.removeEventListener("resize", recalc)
  }, [recalc, products.length])

  const nudge = (dir: 1 | -1) => {
    const el = rail.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" })
  }

  if (products.length === 0) return null

  return (
    <div>
      {/* Header row — title left, Page X of Y + arrows right (reference rails) */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 lg:px-12">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#002B5C]/70">{eyebrow}</p>
          <h3 className="mt-1.5 font-display text-[24px] font-bold leading-tight text-[#002B5C] lg:text-[28px]">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-neutral-500">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Previous sale items"
            disabled={page <= 1}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-[#002B5C] hover:text-[#002B5C] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Next sale items"
            disabled={page >= pages}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-[#002B5C] hover:text-[#002B5C] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Rail — dense uniform cards, edge to edge */}
      <div
        ref={rail}
        onScroll={recalc}
        className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 lg:px-12"
      >
        {products.map((p, i) => (
          <div key={p.id} className="w-[228px] shrink-0 snap-start sm:w-[248px]">
            <ProductCard product={p} priority={i < 4} />
          </div>
        ))}
        {cta && (
          <div className="flex w-[180px] shrink-0 snap-start items-center pl-2">
            <Link
              href={cta.href}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-bold uppercase tracking-[0.1em] text-[#002B5C] underline-offset-4 hover:underline"
            >
              {cta.label}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
