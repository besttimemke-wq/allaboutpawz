"use client"

import Link from "next/link"
import { Star, PawPrint, ShoppingBag } from "lucide-react"
import { useState } from "react"
import type { ShopProduct } from "@/lib/shop/catalog"
import { useCart } from "@/lib/wizard/cart-store"
import { WishlistButton } from "./wishlist-button"

const NAVY = "#002B5C"

// ---------------------------------------------------------------------------
// ProductCard — shared across PLP grids and merchandising rails.
// Client component: uses the cart store for the Add to Cart button.
// White background, navy #002B5C accents. NO brown/cream/gold.
// ---------------------------------------------------------------------------

export function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const href = `/products/${product.slug}`
  const add = useCart((s) => s.add)
  const [added, setAdded] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    add({
      productId: product.id,
      name: product.name,
      price: product.displayPrice ?? product.price,
      image: product.image,
      alt: product.alt,
      badge: product.badge,
      category: product.category,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const saleBadge = product.isOnSale ? "Sale" : null
  const cornerBadge = saleBadge ?? (product.badge ? product.badge : product.isNew ? "New" : null)

  const strikeCents =
    product.isOnSale && product.compareAtPriceCents != null
      ? product.compareAtPriceCents
      : product.isOnSale
        ? product.basePriceCents
        : null

  return (
    <article className="group relative flex flex-col rounded-lg border border-neutral-200 bg-white transition-all hover:border-[#002B5C] hover:shadow-md">
      {/* Image area */}
      <div className="relative overflow-hidden rounded-t-lg bg-neutral-50">
        {cornerBadge && (
          <span className="absolute left-0 top-0 z-10 bg-[#002B5C] px-2.5 py-1 text-[8px] font-bold tracking-[0.14em] text-white uppercase">
            {cornerBadge}
          </span>
        )}
        <WishlistButton productId={product.id} name={product.name} />
        <Link href={href} aria-label={`View ${product.name}`} className="block p-4">
          {product.image ? (
            <img
              src={product.image}
              alt={product.alt || product.name}
              width={512}
              height={640}
              loading={priority ? "eager" : "lazy"}
              className="mx-auto h-[190px] w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-[190px] items-center justify-center">
              <PawPrint className="h-10 w-10 text-neutral-300" strokeWidth={1.2} />
            </div>
          )}
        </Link>
      </div>

      {/* Info area */}
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="text-[8.5px] font-bold tracking-[0.18em] text-neutral-400 uppercase">
            {product.category}
          </p>
        )}
        <Link
          href={href}
          className="mt-1 text-[13px] leading-[1.4] font-semibold text-neutral-900 transition-colors hover:text-[#002B5C] line-clamp-2"
        >
          {product.name}
        </Link>

        {/* Rating stars */}
        {product.rating.count > 0 && (
          <div className="mt-1.5 flex items-center gap-1" aria-label={`Rated ${product.rating.avg.toFixed(1)} out of 5 from ${product.rating.count} reviews`}>
            <span className="flex items-center gap-[1px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-[11px] w-[11px] ${
                    i < Math.round(product.rating.avg) ? `fill-[${NAVY}] text-[${NAVY}]` : "fill-none text-neutral-300"
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span className="text-[10px] text-neutral-500">({product.rating.count})</span>
          </div>
        )}

        {/* Price */}
        <div className="mt-2 flex items-center gap-2">
          {strikeCents != null && (
            <span className="text-[12px] font-medium text-neutral-400 line-through">
              {`$${(strikeCents / 100).toFixed(2)}`}
            </span>
          )}
          <span className="text-[15px] font-bold text-neutral-900">
            {product.displayPrice ?? product.price}
          </span>
        </div>

        {/* Add to Cart button — navy blue */}
        <button
          onClick={handleAddToCart}
          disabled={added}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] text-white uppercase transition-colors disabled:opacity-70"
          style={{ backgroundColor: added ? "#16a34a" : NAVY }}
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
