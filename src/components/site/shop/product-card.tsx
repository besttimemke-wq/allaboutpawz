"use client"

import Link from "next/link"
import { useState } from "react"
import { Star, ShoppingBag, PawPrint } from "lucide-react"
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

export type ProductCardData = {
  id: string
  name: string
  slug: string
  price: string
  image: string | null
  /** Category-page image used when the feed product has no photo. */
  fallbackImage?: string | null
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

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const href = `/products/${product.slug}`
  const add = useCart((s) => s.add)
  const [added, setAdded] = useState(false)
  // Broken image URLs (feed catalog items with dead hosts) fall back to the
  // paw placeholder instead of a grey box.
  const [imgOk, setImgOk] = useState(true)
  const imageSrc = product.image || product.fallbackImage || null
  const showImage = imageSrc != null && imgOk

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
      image: imageSrc,
      alt: product.alt,
      badge: product.badge,
      category: product.category,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <article className="group flex flex-col rounded-lg border border-neutral-200 bg-white overflow-hidden transition-all hover:border-[#F2C500] hover:shadow-md">
      {/* 1. Image — 1:1 crop */}
      <div className="relative aspect-square overflow-hidden bg-neutral-50">
        {badge && (
          <span className="absolute left-0 top-0 z-10 bg-[#002B5C] px-3 py-1.5 text-[12px] font-bold tracking-[0.1em] text-white uppercase">
            {badge}
          </span>
        )}
        <Link href={href} aria-label={`View ${product.name}`} className="block h-full w-full">
          {showImage ? (
            <img
              src={imageSrc as string}
              alt={product.alt || product.name}
              width={512}
              height={512}
              loading={priority ? "eager" : "lazy"}
              onError={() => setImgOk(false)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center" aria-hidden="true">
              <PawPrint className="h-10 w-10 text-neutral-300" strokeWidth={1.2} />
            </div>
          )}
        </Link>
      </div>

      {/* 2-7. Info block */}
      <div className="flex flex-1 flex-col p-4">
        {/* 3. Category eyebrow */}
        {product.category && (
          <Link
            href={`/shop?category=${encodeURIComponent(product.category)}`}
            className="text-[12px] font-bold tracking-[0.12em] text-neutral-500 uppercase underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline"
          >
            {product.category}
          </Link>
        )}

        {/* 4. Product name — 2-line clamp */}
        <Link
          href={href}
          className="mt-1.5 text-[16px] leading-[1.35] font-semibold text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline line-clamp-2"
        >
          {product.name}
        </Link>

        {/* 5. Stars + count — empty state: unfilled stars */}
        <div className="mt-2 flex items-center gap-1.5">
          <span className="flex items-center gap-[2px]" aria-label={`Rated ${product.rating?.avg?.toFixed(1) || 0} out of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-[15px] w-[15px] ${
                  product.rating && product.rating.count > 0 && i < Math.round(product.rating.avg)
                    ? "fill-[#002B5C] text-[#002B5C]"
                    : "fill-none text-neutral-300"
                }`}
                strokeWidth={1.5}
              />
            ))}
          </span>
          <span className="text-[13px] text-neutral-600">
            ({product.rating?.count || 0})
          </span>
        </div>

        {/* 6. Price row */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[19px] font-bold text-neutral-900">{product.price}</span>
          {strikePrice && (
            <span className="text-[14px] text-neutral-500 line-through">{strikePrice}</span>
          )}
          {discountPct && discountPct > 0 && (
            <span className="text-[13px] font-bold text-[#002B5C]">-{discountPct}%</span>
          )}
        </div>

        {/* 7. ADD TO CART — full-width, always visible */}
        <button
          onClick={handleAddToCart}
          disabled={added}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md py-3 text-[14px] font-bold tracking-[0.06em] uppercase transition-colors"
          style={{
            backgroundColor: added ? "#16a34a" : NAVY,
            color: "#fff",
          }}
        >
          {added ? (
            <>
              <ShoppingBag className="h-4 w-4" /> ADDED!
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" /> ADD TO CART
            </>
          )}
        </button>
      </div>
    </article>
  )
}
