"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Check, Minus, Plus, ShoppingBag, Truck, Lock, Medal, PawPrint,
} from "@phosphor-icons/react"
import { useCart, parsePriceToCents, formatCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Product page islands.
//   <ProductBuyBox /> — qty stepper + ADD TO BAG + stock + assurance row.
//   <ReviewForm />    — "WRITE A REVIEW" form → POST /api/shop/reviews
//                       (reviews land with visible:false, pending moderation).
// ---------------------------------------------------------------------------

export type BuyBoxProduct = {
  id: string
  name: string
  price: string
  image?: string | null
  alt?: string | null
  badge?: string | null
  category?: string | null
  stock?: number | null
}

const MAX_PER_ITEM = 10

const inputCls =
  "w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep"
const labelCls = "mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep"

// ===========================================================================
// Buy box — quantity stepper + add-to-bag (client island on the product page)
// ===========================================================================
export function ProductBuyBox({ product }: { product: BuyBoxProduct }) {
  const s = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const inStock = (product.stock ?? 0) > 0
  const unitCents = parsePriceToCents(product.price) || 0

  const addToBag = () => {
    const existing = s.items.find((i) => i.productId === product.id)
    s.add({
      productId: product.id,
      name: product.name,
      price: product.price,
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

  return (
    <div className="mt-7">
      {/* Quantity + add to bag */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="inline-flex items-center self-start border border-gold/35 bg-cream">
          <button
            type="button"
            onClick={() => { setQty((q) => Math.max(1, q - 1)); setAdded(false) }}
            disabled={qty <= 1}
            aria-label="Decrease quantity"
            className="flex h-[46px] w-[46px] items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Minus size={14} weight="bold" />
          </button>
          <span className="w-10 text-center text-[14px] font-bold text-ink" aria-live="polite">{qty}</span>
          <button
            type="button"
            onClick={() => { setQty((q) => Math.min(MAX_PER_ITEM, q + 1)); setAdded(false) }}
            disabled={qty >= MAX_PER_ITEM}
            aria-label="Increase quantity"
            className="flex h-[46px] w-[46px] items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus size={14} weight="bold" />
          </button>
        </div>
        <button
          type="button"
          onClick={addToBag}
          className={`btn-gold flex-1 text-[10px] ${added ? "bg-ink" : ""}`}
          aria-label={`Add ${qty} ${qty === 1 ? "unit" : "units"} of ${product.name} to bag`}
        >
          {added ? (
            <span className="inline-flex items-center gap-1.5"><Check size={13} weight="bold" /> ADDED ✓</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag size={13} weight="fill" />
              ADD TO BAG{unitCents > 0 ? ` — ${formatCents(unitCents * qty)}` : ""}
            </span>
          )}
        </button>
      </div>

      {added && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-soft">
          <Check size={13} weight="bold" className="text-gold-deep" />
          Added to your bag.
          <Link
            href="/shop/bag"
            className="font-bold tracking-[0.1em] text-gold-deep underline decoration-gold/40 underline-offset-4 hover:decoration-gold-deep"
          >
            VIEW BAG
          </Link>
        </p>
      )}

      {/* Stock line */}
      <p className={`mt-3.5 flex items-center gap-2 text-[11.5px] ${inStock ? "text-ink-soft" : "text-gold-deep"}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${inStock ? "bg-gold-deep" : "bg-ink"}`} />
        {inStock ? "In stock · ships in 1–2 business days" : "Backordered — ships in about 2 weeks"}
      </p>

      {/* Assurance row */}
      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-gold/25 pt-5">
        {[
          { Icon: Truck, label: "Free shipping" },
          { Icon: Lock, label: "Secure checkout" },
          { Icon: Medal, label: "Groomer approved" },
        ].map(({ Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 text-center">
            <Icon size={18} weight="light" className="text-gold-deep" />
            <span className="text-[9px] font-bold tracking-[0.12em] text-ink-soft">{label.toUpperCase()}</span>
          </div>
        ))}
      </div>
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
    } catch (e: any) {
      setError(e.message || "Network error — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="border border-gold/30 bg-cream-deep p-7 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gold-deep">
          <Check size={20} weight="bold" className="text-cream" />
        </div>
        <p className="mt-3 text-[13px] font-bold tracking-[0.06em] text-ink">Thank you — your review is pending approval.</p>
        <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-[1.7] text-ink-soft">
          Our salon team reads every review before it appears on the site. Watch for yours soon.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-gold/30 bg-card p-6 lg:p-8">
      <p className="eyebrow">WRITE A REVIEW</p>
      <h3 className="mt-2 font-display text-[20px] text-ink">Share your experience</h3>
      <p className="mt-1 text-[11.5px] text-ink-soft">Tell other pet parents how it worked for your pup.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>YOUR NAME *</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="e.g. Maya & Biscuit"
            maxLength={80}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>YOUR RATING *</label>
          <div className="flex h-[46px] items-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                role="radio"
                aria-checked={rating === n}
                aria-label={`Rate ${n} out of 5`}
                className={`h-9 w-9 border text-[13px] font-bold transition-colors ${n === rating ? "border-gold-deep bg-gold-deep text-on-dark" : rating === 0 ? "border-gold/35 text-ink-soft" : "border-gold/25 text-ink-soft"} ${n <= rating && n !== rating ? "border-gold/50 bg-gold/15 text-gold-deep" : ""}`}
              >
                {n}
              </button>
            ))}
            <span className="ml-2 font-display text-[15px] text-gold-deep">{rating > 0 ? rating.toFixed(1) : "–"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className={labelCls}>TITLE</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum it up in a few words"
          maxLength={100}
          className={inputCls}
        />
      </div>

      <div className="mt-4">
        <label className={labelCls}>YOUR REVIEW *</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="How did it work for your dog's coat?…"
          maxLength={1500}
          className={inputCls}
        />
      </div>

      {error && (
        <p className="mt-3 border border-gold/40 bg-cream-deep px-4 py-2 text-[11.5px] text-gold-deep">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className={`btn-gold mt-5 text-[10px] ${submitting ? "cursor-wait opacity-70" : ""}`}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-1.5"><PawPrint size={12} weight="fill" /> SUBMITTING…</span>
        ) : (
          <span className="inline-flex items-center gap-1.5"><PawPrint size={12} weight="fill" /> SUBMIT REVIEW</span>
        )}
      </button>
      <p className="mt-2.5 text-[10.5px] text-ink-soft">
        Reviews are moderated by our salon team before being published.
      </p>
    </div>
  )
}
