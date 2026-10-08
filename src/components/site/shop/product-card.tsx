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

  // Show an explicit "SALE" pill alongside any existing badge when the product
  // is on sale. The image-corner badge slot stays single-purpose (Sale XOR the
  // product's own badge) to keep the corner uncluttered; a second in-card pill
  // is rendered below the title when both apply.
  const saleBadge = product.isOnSale ? "Sale" : null
  const cornerBadge = saleBadge ?? (product.badge ? product.badge : product.isNew ? "New" : null)
  const showSecondarySalePill = product.isOnSale && !!product.badge

  // Strikethrough reference price — the original price the customer saves
  // against. Prefer compare-at (the marketing reference); fall back to the
  // base list price when only a sale price is set.
  const strikeCents =
    product.isOnSale && product.compareAtPriceCents != null
      ? product.compareAtPriceCents
      : product.isOnSale
        ? product.basePriceCents
        : null

  return (
    <article className="group relative flex flex-col">
      {/* Canvas-native: the rail sits ON the marble canvas (deeper cream
          panel + hairline border) — never an opaque white block. */}
      <div className="relative overflow-hidden border border-ink/10 bg-white-deep/40 transition-colors group-hover:border-[#002B5C]/40">
        {cornerBadge && (
          <span className="absolute left-0 top-0 z-10 bg-ink px-2.5 py-1 text-[8px] font-bold tracking-[0.14em] text-[#002B5C]">
            {cornerBadge.toUpperCase()}
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
              <PawPrint className="h-10 w-10 text-[#002B5C]/40" strokeWidth={1.2} />
            </div>
          )}
        </Link>
      </div>

      <div className="flex flex-1 flex-col pt-4 text-center">
        {product.category && (
          <p className="text-[8.5px] font-bold tracking-[0.18em] text-[#002B5C]/80">
            {product.category.toUpperCase()}
          </p>
        )}
        <Link
          href={href}
          className="mt-1 text-[12.5px] leading-[1.5] font-semibold text-ink transition-colors hover:text-[#002B5C]"
        >
          {product.name}
        </Link>
        {subtitle && (
          <p className="mt-1 text-[10.5px] leading-[1.5] text-ink-soft line-clamp-2">{subtitle}</p>
        )}

        {/* Price row — strikethrough reference + bold active price. */}
        <div className="mt-2 flex items-center justify-center gap-2">
          {strikeCents != null && (
            <span className="text-[12px] font-medium text-ink-soft/70 line-through">
              {`$${(strikeCents / 100).toFixed(2)}`}
            </span>
          )}
          <span
            className={`text-[13px] font-bold ${
              product.isOnSale ? "text-ink" : "text-[#002B5C]"
            }`}
          >
            {product.displayPrice ?? product.price}
          </span>
        </div>

        {/* Secondary "Sale" pill — only when a product badge is also set so
            the corner badge stays single-purpose and the customer still sees
            the Sale flag in the body of the card. */}
        {showSecondarySalePill && (
          <span className="mt-1.5 inline-flex items-center self-center border border-[#002B5C]/40 bg-[#002B5C]/5 px-2 py-0.5 text-[8px] font-bold tracking-[0.14em] text-[#002B5C]">
            SALE
          </span>
        )}

        {product.rating.count > 0 && (
          <p className="mt-1 flex items-center justify-center gap-1" aria-label={`Rated ${product.rating.avg.toFixed(1)} out of 5 from ${product.rating.count} reviews`}>
            <span className="flex items-center gap-[2px]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-[10px] w-[10px] ${
                    i < Math.round(product.rating.avg) ? "fill-[#002B5C] text-[#002B5C]" : "fill-none text-ink-soft/40"
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </span>
            <span className="text-[9.5px] text-ink-soft">({product.rating.count})</span>
          </p>
        )}

        <div className="mt-auto pt-3.5">
          <Link href={href} className="inline-flex items-center justify-center rounded-md bg-[#002B5C] px-5 py-2.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#001F44] w-full text-[9px]" aria-label={`View ${product.name} details`}>
            VIEW DETAILS
          </Link>
        </div>
      </div>
    </article>
  )
}
