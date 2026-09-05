import Link from "next/link"
import { Star, PawPrint } from "lucide-react"
import type { ShopProduct } from "@/lib/shop/catalog"
import { WishlistButton } from "./wishlist-button"

// ---------------------------------------------------------------------------
// ProductCard — shared across PLP grids and merchandising rails.
// Server-rendered; the wishlist heart is the only client island and works
// independently of the card's product-page navigation.
// ---------------------------------------------------------------------------

export function ProductCard({ product, priority = false }: { product: ShopProduct; priority?: boolean }) {
  const href = `/products/${product.slug}`
  const subtitle = product.shortDescription || product.description

  const badge = product.badge
    ? product.badge
    : product.isNew
      ? "New"
      : null

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden border border-ink/10 bg-white transition-colors group-hover:border-gold-deep/40">
        {badge && (
          <span className="absolute left-0 top-0 z-10 bg-ink px-2.5 py-1 text-[8px] font-bold tracking-[0.14em] text-gold">
            {badge.toUpperCase()}
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
              className="mx-auto h-[190px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-[190px] items-center justify-center">
              <PawPrint className="h-10 w-10 text-gold/40" strokeWidth={1.2} />
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col pt-4 text-center">
        {product.category && (
          <p className="text-[8.5px] font-bold tracking-[0.18em] text-gold-deep/80">
            {product.category.toUpperCase()}
          </p>
        )}
        <Link
          href={href}
          className="mt-1 text-[12.5px] leading-[1.5] font-semibold text-ink transition-colors hover:text-gold-deep"
        >
          {product.name}
        </Link>
        {subtitle && (
          <p className="mt-1 text-[10.5px] leading-[1.5] text-ink-soft line-clamp-2">{subtitle}</p>
        )}

        <p className="mt-2 text-[13px] font-bold text-gold-deep">{product.price}</p>

        {product.rating.count > 0 && (
          <p className="mt-1 flex items-center justify-center gap-1" aria-label={`Rated ${product.rating.avg.toFixed(1)} out of 5 from ${product.rating.count} reviews`}>
            <span className="flex items-center gap-[2px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-[10px] w-[10px] ${
                    i < Math.round(product.rating.avg) ? "fill-gold-deep text-gold-deep" : "fill-none text-ink-soft/40"
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span className="text-[9.5px] text-ink-soft">({product.rating.count})</span>
          </p>
        )}

        <div className="mt-auto pt-3.5">
          <Link href={href} className="btn-gold w-full text-[9px]" aria-label={`View ${product.name} details`}>
            VIEW DETAILS
          </Link>
        </div>
      </div>
    </article>
  )
}
