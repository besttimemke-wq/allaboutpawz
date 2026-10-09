"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowsCounterClockwise,
  Check,
  MapPin,
  Minus,
  PawPrint,
  Plus,
  ShoppingBag,
  Truck,
} from "@phosphor-icons/react"
import { useCart, parsePriceToCents, formatCents } from "@/lib/wizard/cart-store"
import { track, priceToDollars } from "@/lib/analytics"

// ---------------------------------------------------------------------------
// Product page islands (used ONLY by /products/[slug] — internals may change,
// export names are the public contract).
//
//   <ProductBuyBox /> — the whole right buy column: price header, Autoship /
//                       Buy-once purchase options (Chewy-style radios), qty
//                       stepper + ADD TO BAG / START AUTOSHIP, stock +
//                       delivery lines, and the pickup block.
//   <ReviewForm />    — "WRITE A REVIEW" form → POST /api/shop/reviews
//                       (reviews land with visible:false, pending moderation).
//   <ProductGallery />— main image + thumbnail strip (up to 8).
//
// Palette: explicit navy #002B5C / gold #F2C500 on white/neutral — never the
// oklch cream/gold-deep tokens (they render brown; owner rejected brown).
// ---------------------------------------------------------------------------

const NAVY = "#002B5C"

export type BuyBoxProduct = {
  id: string
  name: string
  /** Active display price ("$24.99") — the "Buy once" price. */
  price: string
  /** Same price in cents (authoritative); null → fall back to parsing `price`. */
  priceCents: number | null
  compareAtPriceCents?: number | null
  isOnSale?: boolean
  /** True when the listing's own variants span multiple prices → "From $X". */
  showFromPrice?: boolean
  image?: string | null
  alt?: string | null
  badge?: string | null
  category?: string | null
  inStock: boolean
  /** Stock urgency strip — computed SERVER-SIDE from app_settings stock.*
   *  keys (stock.low_threshold / stock.show_exact_count /
   *  stock.allow_backorder). null hides the strip. */
  urgency?: { message: string; tone: "urgent" | "backorder" } | null
  /** Site-wide Autoship program; null hides the Autoship option. */
  autoship?: { firstOrderPct: number; firstOrderCapCents: number; ongoingPct: number } | null
}

type PurchasePlan = "autoship" | "once"

const MAX_PER_ITEM = 10

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-3.5 py-3 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:border-[#002B5C] focus:outline-none focus:ring-2 focus:ring-[#002B5C]/25"
const labelCls = "mb-1.5 block text-[11px] font-bold tracking-[0.12em] text-[#002B5C] uppercase"

// ===========================================================================
// Buy box — the right-hand purchase column (client island)
// ===========================================================================

export function ProductBuyBox({ product }: { product: BuyBoxProduct }) {
  const s = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const unitCents = product.priceCents ?? parsePriceToCents(product.price) ?? 0
  const a = product.autoship ?? null
  const autoshipAvailable = a != null && unitCents > 0
  const [plan, setPlan] = useState<PurchasePlan>("autoship")
  // NOTE: when navigating between sibling variants the page keys this island
  // with key={product.id}, which remounts it and resets qty/added state.

  // Autoship math: first-order discount = pct off, capped; ongoing = pct off.
  const firstDiscount =
    a != null ? Math.min(Math.round((unitCents * a.firstOrderPct) / 100), a.firstOrderCapCents) : 0
  const firstOrderCents = a != null ? Math.max(0, unitCents - firstDiscount) : unitCents
  const ongoingCents =
    a != null ? Math.max(0, Math.round((unitCents * (100 - a.ongoingPct)) / 100)) : unitCents

  const autoshipSelected = plan === "autoship" && autoshipAvailable
  const finalCents = autoshipSelected ? firstOrderCents : unitCents
  const finalPriceStr = finalCents > 0 ? formatCents(finalCents) : product.price

  // GA4 view_item — once per product id.
  const viewed = useRef<string | null>(null)
  useEffect(() => {
    if (viewed.current === product.id) return
    viewed.current = product.id
    track.viewItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category ?? undefined,
      price: priceToDollars(finalPriceStr || product.price),
    })
  }, [product.id, product.name, product.category, finalPriceStr, product.price])

  const inStock = product.inStock
  const canBuy = inStock && finalCents > 0

  const strikeCents =
    product.isOnSale && product.compareAtPriceCents != null && product.compareAtPriceCents > unitCents
      ? product.compareAtPriceCents
      : null
  const saveCents = strikeCents != null ? strikeCents - unitCents : 0

  const addToBag = () => {
    if (!canBuy) return
    const existing = s.items.find((i) => i.productId === product.id)
    s.add({
      productId: product.id,
      name: product.name,
      price: finalPriceStr,
      image: product.image,
      alt: product.alt,
      badge: product.badge,
      category: product.category,
    })
    if (qty > 1) {
      s.setQty(product.id, Math.min(MAX_PER_ITEM, (existing?.quantity ?? 0) + qty))
    }
    setAdded(true)
  }

  const radioCircle = (checked: boolean) => (
    <span
      aria-hidden
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
        checked ? "border-[#002B5C]" : "border-neutral-400"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${checked ? "bg-[#F2C500]" : "bg-transparent"}`} />
    </span>
  )

  const bullet = "flex items-start gap-2 text-[12.5px] leading-snug text-neutral-600"

  return (
    <div>
      {/* Price header */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {product.showFromPrice && (
          <span className="text-[14px] font-medium text-neutral-500">From</span>
        )}
        <span className="text-[32px] font-bold leading-none text-[#002B5C]">
          {unitCents > 0 ? formatCents(unitCents) : product.price || "—"}
        </span>
        {strikeCents != null && (
          <span className="text-[16px] font-medium text-neutral-400 line-through">
            {formatCents(strikeCents)}
          </span>
        )}
        {saveCents > 0 && (
          <span className="rounded bg-[#F2C500] px-2 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[#002B5C]">
            Save {formatCents(saveCents)}
          </span>
        )}
      </div>

      {/* Purchase options — Autoship (Chewy-style) vs Buy once */}
      {a != null && unitCents > 0 && (
        <div role="radiogroup" aria-label="Purchase options" className="mt-5 space-y-2.5">
          <button
            type="button"
            role="radio"
            aria-checked={plan === "autoship"}
            onClick={() => setPlan("autoship")}
            className={`block w-full cursor-pointer rounded-lg border bg-white p-4 text-left transition-colors ${
              plan === "autoship"
                ? "border-[#002B5C] ring-1 ring-[#002B5C]"
                : "border-neutral-300 hover:border-[#002B5C]/50"
            }`}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex items-start gap-2.5">
                {radioCircle(plan === "autoship")}
                <span className="text-[14px] font-bold text-neutral-900">Save with Autoship</span>
              </span>
              <span className="text-[18px] font-bold text-[#002B5C]">
                {formatCents(firstOrderCents)}
              </span>
            </span>
            <span className="mt-2.5 ml-8 inline-block rounded bg-[#002B5C] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-white">
              {a.firstOrderPct}% off first order (up to {formatCents(a.firstOrderCapCents)})
            </span>
            <span className="mt-2.5 ml-8 block space-y-1.5">
              <span className={bullet}>
                <Check size={13} weight="bold" className="mt-1 shrink-0 text-[#002B5C]" />
                Save {a.ongoingPct}% on all future Autoship orders
              </span>
              <span className={bullet}>
                <Check size={13} weight="bold" className="mt-1 shrink-0 text-[#002B5C]" />
                Get your delivery on your schedule. Change it or skip it anytime
              </span>
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={plan === "once"}
            onClick={() => setPlan("once")}
            className={`block w-full cursor-pointer rounded-lg border bg-white p-4 text-left transition-colors ${
              plan === "once"
                ? "border-[#002B5C] ring-1 ring-[#002B5C]"
                : "border-neutral-300 hover:border-[#002B5C]/50"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                {radioCircle(plan === "once")}
                <span className="text-[14px] font-bold text-neutral-900">Buy once</span>
              </span>
              <span className="text-[18px] font-bold text-neutral-900">
                {formatCents(unitCents)}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Quantity + add to bag */}
      <div className="mt-5 flex flex-col gap-3">
        <div className="inline-flex items-center self-start rounded-md border border-neutral-300 bg-white">
          <button
            type="button"
            onClick={() => {
              setQty((q) => Math.max(1, q - 1))
              setAdded(false)
            }}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-neutral-900 transition-colors hover:text-[#002B5C] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={15} weight="bold" />
          </button>
          <span className="w-10 text-center text-[15px] font-bold text-neutral-900" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => {
              setQty((q) => Math.min(MAX_PER_ITEM, q + 1))
              setAdded(false)
            }}
            disabled={qty >= MAX_PER_ITEM}
            aria-label="Increase quantity"
            className="flex h-11 w-11 cursor-pointer items-center justify-center text-neutral-900 transition-colors hover:text-[#002B5C] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus size={15} weight="bold" />
          </button>
        </div>
        <button
          type="button"
          onClick={addToBag}
          disabled={!canBuy}
          aria-label={
            autoshipSelected
              ? `Start Autoship for ${product.name} at ${finalPriceStr}`
              : `Add ${qty} ${qty === 1 ? "unit" : "units"} of ${product.name} to bag`
          }
          className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-md px-4 text-[14px] font-bold uppercase tracking-[0.08em] transition-colors ${
            canBuy ? "bg-[#002B5C] text-white hover:bg-[#0A3D7C]" : "cursor-not-allowed bg-neutral-200 text-neutral-500"
          }`}
        >
          {!inStock ? (
            "Out of stock"
          ) : added ? (
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} weight="bold" /> Added to bag
            </span>
          ) : autoshipSelected ? (
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag size={15} weight="fill" />
              Start Autoship{finalCents > 0 ? ` — ${formatCents(finalCents * qty)}` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag size={15} weight="fill" />
              Add to bag{finalCents > 0 ? ` — ${formatCents(finalCents * qty)}` : ""}
            </span>
          )}
        </button>
      </div>

      {added && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-neutral-700">
          <Check size={14} weight="bold" className="text-[#002B5C]" />
          Added to your bag.
          <Link
            href="/shop/bag"
            className="font-bold text-[#002B5C] underline underline-offset-4 hover:text-[#0A3D7C]"
          >
            VIEW BAG
          </Link>
        </p>
      )}

      {/* Stock + delivery + returns */}
      <div className="mt-4 space-y-2 text-[13px]">
        <p className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className={`inline-block h-2 w-2 rounded-full ${inStock ? "bg-[#F2C500]" : "bg-neutral-300"}`}
          />
          <span className={`font-bold ${inStock ? "text-[#002B5C]" : "text-neutral-500"}`}>
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
          <span className="text-neutral-600">· FREE 1-3 day delivery</span>
        </p>
        {product.urgency && (
          <p
            role="status"
            className={`rounded-md border px-3 py-2 text-[12.5px] font-bold ${
              product.urgency.tone === "urgent"
                ? "border-[#F2C500]/60 bg-[#F2C500]/15 text-[#7A5A00]"
                : "border-[#002B5C]/20 bg-[#002B5C]/5 text-[#002B5C]"
            }`}
          >
            {product.urgency.message}
          </p>
        )}
        <p className="flex items-center gap-2 text-neutral-600">
          <ArrowsCounterClockwise size={15} className="shrink-0 text-[#002B5C]" />
          Free 365-day returns
        </p>
      </div>

      {/* Pickup / ships-from block */}
      <div className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-[13px]">
        <p className="flex items-start gap-2.5">
          <MapPin size={17} className="mt-0.5 shrink-0 text-[#002B5C]" />
          <span>
            <span className="block font-bold text-neutral-900">Pickup at 699 Waring Rd</span>
            <span className="block text-neutral-600">Ready in 2 hours during store hours</span>
          </span>
        </p>
        <p className="mt-3 flex items-start gap-2.5 border-t border-neutral-200 pt-3">
          <Truck size={17} className="mt-0.5 shrink-0 text-[#002B5C]" />
          <span>
            <span className="block font-bold text-neutral-900">Ships from Memphis, TN</span>
            <span className="block text-neutral-600">1-3 day delivery</span>
          </span>
        </p>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-neutral-400">
        <PawPrint size={12} aria-hidden /> All About Pawz · Memphis pet supplies since 2019
      </p>
    </div>
  )
}

// ===========================================================================
// Review form — posts with visible:false (pending salon moderation)
// ===========================================================================

export function ReviewForm({ productId }: { productId: string }) {
  const [author, setAuthor] = useState("")
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setError(null)
    if (author.trim().length < 2) return setError("Please add your name (at least 2 characters).")
    if (body.trim().length < 10) return setError("Please write a few words (at least 10 characters).")
    setSubmitting(true)
    try {
      const res = await fetch("/api/shop/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, author, rating, title, body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "Could not submit your review. Please try again.")
        return
      }
      setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Network error — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-[#F2C500] bg-neutral-50 p-7 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#002B5C]">
          <Check size={20} weight="bold" className="text-white" />
        </div>
        <p className="mt-3 text-[13px] font-bold tracking-[0.04em] text-neutral-900">
          Thank you — your review is pending approval.
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-[12px] leading-[1.7] text-neutral-600">
          Our salon team reads every review before it appears on the site. Watch for yours soon.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 lg:p-8">
      <p className="eyebrow">WRITE A REVIEW</p>
      <h3 className="mt-2 font-display text-[20px] text-neutral-900">Share your experience</h3>
      <p className="mt-1 text-[12.5px] text-neutral-600">
        Tell other pet parents how it worked for your pup.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor={`rr-name-${productId}`}>
            Your name *
          </label>
          <input
            id={`rr-name-${productId}`}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Maya & Biscuit"
            maxLength={80}
            className={inputCls}
          />
        </div>
        <div>
          <span className={labelCls}>Your rating *</span>
          <div className="flex min-h-[46px] items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                role="radio"
                aria-checked={rating === n}
                aria-label={`Rate ${n} out of 5`}
                className={`h-11 w-11 cursor-pointer rounded-md border text-[13px] font-bold transition-colors ${
                  n === rating
                    ? "border-[#F2C500] bg-[#F2C500] text-[#002B5C]"
                    : "border-neutral-300 bg-white text-neutral-500 hover:border-[#F2C500]"
                }`}
              >
                {n}
              </button>
            ))}
            <span className="ml-2 text-[15px] font-bold text-[#002B5C]">{rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className={labelCls} htmlFor={`rr-title-${productId}`}>
          Title
        </label>
        <input
          id={`rr-title-${productId}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum it up in a few words"
          maxLength={100}
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className={labelCls} htmlFor={`rr-body-${productId}`}>
          Your review *
        </label>
        <textarea
          id={`rr-body-${productId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="How did it work for your dog or cat?"
          maxLength={1500}
          className={inputCls}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-neutral-300 bg-neutral-50 px-4 py-2 text-[12.5px] font-medium text-[#002B5C]"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className={`mt-5 inline-flex min-h-[46px] items-center justify-center gap-2 rounded-md px-6 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors ${
          submitting ? "cursor-wait bg-neutral-300 text-neutral-600" : "cursor-pointer bg-[#002B5C] text-white hover:bg-[#0A3D7C]"
        }`}
      >
        <PawPrint size={14} weight="fill" /> {submitting ? "SUBMITTING…" : "SUBMIT REVIEW"}
      </button>
      <p className="mt-2.5 text-[11px] text-neutral-500">
        Reviews are moderated by our salon team before being published.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// <ProductGallery /> — main image + thumbnail strip (up to 8, from
// product_media). Click a thumb to swap the main image. Server page hands
// us the media array; the island only owns which one is showing.
// ---------------------------------------------------------------------------

export type GalleryImage = { url: string; alt: string | null }

export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: GalleryImage[]
  name: string
  badge?: string | null
}) {
  const [active, setActive] = useState(0)
  const main = images[active] ?? images[0]

  if (!main) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 sm:h-[420px] lg:h-[480px]">
        <PawPrint className="h-10 w-10 text-[#002B5C]/30" weight="regular" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {badge && (
          <span
            className="absolute left-4 top-4 z-10 rounded px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
            style={{ backgroundColor: NAVY }}
          >
            {badge}
          </span>
        )}
        <img
          src={main.url}
          alt={main.alt || name}
          width={900}
          height={900}
          className="h-[320px] w-full bg-white object-contain sm:h-[420px] lg:h-[480px]"
        />
      </div>
      {images.length > 1 && (
        <div
          className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1"
          role="tablist"
          aria-label={`${name} images`}
        >
          {images.slice(0, 8).map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Show image ${i + 1} of ${name}`}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition-colors ${
                i === active ? "border-[#002B5C]" : "border-neutral-200 hover:border-[#F2C500]"
              }`}
            >
              <img
                src={img.url}
                alt=""
                width={128}
                height={128}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
