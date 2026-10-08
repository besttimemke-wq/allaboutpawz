"use client"

import Link from "next/link"
import { useState } from "react"
import { Star, ShoppingBag } from "lucide-react"
import { useCart } from "@/lib/wizard/cart-store"

const NAVY = "#002B5C"

// ---------------------------------------------------------------------------
// ProductCard — the ONE global card component per enterprise-page-spec.md §6.
// Used everywhere: PLP grid, sliders, compact rows.
// Anatomy (top → bottom):
//   1. Image (1:1 crop, lazy-loaded)
//   2. Badge (SALE → NEW → BEST SELLER, one max)
//   3. Category eyebrow (small caps, links to category)
//   4. Product name (2-line clamp, links to PDP)
//   5. Stars + count (empty state: ☆☆☆☆☆ (0) muted)
//   6. Price ($X bold + ~~$Y~~ muted + -N% badge IF compare_at)
//   7. ADD TO CART (full-width, always visible)
// ---------------------------------------------------------------------------

type ProductData = {
  id: string
  name: string
  slug: string
  price: string
  image: string | null
  alt?: string | null
  badge?: string | null
  category?: string | null
  isOnSale?: boolean
  isNew?: boolean
  isBestseller?: boolean
  compareAtPriceCents?: number | null
  priceCents?: number | null
  basePriceCents?: number | null
  rating?: { avg: number; count: number }
}

export function ProductCard({ product, priority = false }: { product: ProductData; priority?: boolean }) {
  const href = `/products/${product.slug}`
  const add = useCart((s) => s.add)
  const [added, setAdded] = useState(false)

  // Badge priority per spec: SALE → NEW → BEST SELLER (one max)
  const badge = product.isOnSale ? "SALE"
    : product.isNew ? "NEW"
    : product.isBestseller ? "BEST SELLER"
    : null

  // Discount percentage
  const discountPct = product.compareAtPriceCents && product.priceCents
    ? Math.round((1 - product.priceCents / product.compareAtPriceCents) * 100)
    : null

  // Strike price
  const strikePrice = product.isOnSale && product.compareAtPriceCents
    ? `$${(product.compareAtPriceCents / 100).toFixed(2)}`
    : null

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    add({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      alt: product.alt,
      badge: product.badge,
      category: product.category,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <article className="group flex flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden transition-all hover:border-[#002B5C] hover:shadow-md">
      {/* 1. Image — 1:1 crop */}
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        {badge && (
          <span className="absolute left-0 top-0 z-10 bg-[#002B5C] px-2.5 py-1 text-[8px] font-bold tracking-[0.14em] text-white uppercase">
            {badge}
          </span>
        )}
        <Link href={href} aria-label={`View ${product.name}`} className="block h-full w-full">
          {product.image ? (
            <img
              src={product.image}
              alt={product.alt || product.name}
              width={512}
              height={512}
              loading={priority ? "eager" : "lazy"}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-[10px] text-neutral-300">No image</span>
            </div>
          )}
        </Link>
      </div>

      {/* 2-7. Info block */}
      <div className="flex flex-1 flex-col p-3">
        {/* 3. Category eyebrow */}
        {product.category && (
          <Link
            href={`/shop?category=${encodeURIComponent(product.category)}`}
            className="text-[8px] font-bold tracking-[0.18em] text-neutral-400 uppercase hover:underline"
          >
            {product.category}
          </Link>
        )}

        {/* 4. Product name — 2-line clamp */}
        <Link
          href={href}
          className="mt-1 text-[13px] leading-[1.35] font-semibold text-neutral-900 hover:text-[#002B5C] transition-colors line-clamp-2"
        >
          {product.name}
        </Link>

        {/* 5. Stars + count — empty state: unfilled stars */}
        <div className="mt-1.5 flex items-center gap-1">
          <span className="flex items-center gap-[1px]" aria-label={`Rated ${product.rating?.avg?.toFixed(1) || 0} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-[11px] w-[11px] ${
                  product.rating && product.rating.count > 0 && i < Math.round(product.rating.avg)
                    ? "fill-[#002B5C] text-[#002B5C]"
                    : "fill-none text-neutral-300"
                }`}
                strokeWidth={1.5}
              />
            ))}
          </span>
          <span className="text-[10px] text-neutral-500">
            ({product.rating?.count || 0})
          </span>
        </div>

        {/* 6. Price row */}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[15px] font-bold text-neutral-900">{product.price}</span>
          {strikePrice && (
            <span className="text-[12px] text-neutral-400 line-through">{strikePrice}</span>
          )}
          {discountPct && discountPct > 0 && (
            <span className="text-[10px] font-bold text-[#002B5C]">-{discountPct}%</span>
          )}
        </div>

        {/* 7. ADD TO CART — full-width, always visible */}
        <button
          onClick={handleAddToCart}
          disabled={added}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[11px] font-bold tracking-[0.08em] uppercase transition-colors"
          style={{
            backgroundColor: added ? "#16a34a" : NAVY,
            color: "#fff",
          }}
        >
          {added ? (
            <>
              <ShoppingBag className="h-3.5 w-3.5" /> ADDED!
            </>
          ) : (
            <>
              <ShoppingBag className="h-3.5 w-3.5" /> ADD TO CART
            </>
          )}
        </button>
      </div>
    </article>
  )
}
