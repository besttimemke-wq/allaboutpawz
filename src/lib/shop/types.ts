// ---------------------------------------------------------------------------
// Shop shared types + constants (client-safe — no server-only imports).
// The server data layer (src/lib/shop/catalog.ts) re-exports these; client
// islands (sidebar, toolbar) import directly from here so `server-only`
// never leaks into a Client Component module.
// ---------------------------------------------------------------------------

export type Rating = { avg: number; count: number }

export type ShopProduct = {
  id: string
  name: string
  slug: string
  /** Active display price formatted as a string ("$30.00"). Falls back to base
   *  price when not on sale; equals the sale price when on sale. Backward-compat
   *  alias for {@link displayPrice}. */
  price: string
  /** Active display price in cents. Backward-compat alias for
   *  {@link displayPriceCents}. */
  priceCents: number | null
  /** Original list price parsed from `base_price`, in cents. */
  basePriceCents: number | null
  /** Promotional price parsed from `sale_price`, in cents. Null when no
   *  sale price is set or it can't be parsed. */
  salePriceCents: number | null
  /** Compare-at reference price parsed from `compare_at_price`, in cents. */
  compareAtPriceCents: number | null
  /** The active storefront price in cents — `salePriceCents` when on sale,
   *  otherwise `basePriceCents`. Null when neither parses. */
  displayPriceCents: number | null
  /** Formatted active storefront price ("$30.00"). */
  displayPrice: string | null
  image: string | null
  alt: string | null
  badge: string | null
  category: string | null
  categoryId: number | null
  stock: number | null
  shortDescription: string | null
  description: string | null
  createdAt: string | null
  order: number | null
  featured: boolean
  rating: Rating
  isNew: boolean
  isBestseller: boolean
  /** True when `sale_price` < `base_price` OR `compare_at_price` > `base_price`. */
  isOnSale: boolean
}

/** Customer-facing category node (flattened presentation of raw SQL nodes). */
export type NavCategory = {
  /** Customer-facing slug (unique per parent). */
  key: string
  displayName: string
  /** Canonical route, e.g. /shop/dog/grooming. */
  path: string
  /** 0 = virtual parent landing (Dog), 1 = primary category, 2 = leaf. */
  level: number
  /** Rolled-up count of visible products in this node's subtree. */
  count: number
  /** Raw SQL node ids merged into this presentation node (scope ids). */
  rawIds: number[]
  children: NavCategory[]
  parentKey: string | null
  /** Promo blurb aggregated from the raw SQL nodes folded into this node
   *  (migration 0013). Null when none is set. */
  promoBlurb?: string | null
  /** True when any raw SQL node folded into this node has
   *  `featured_in_mega_menu = true` (migration 0013). */
  featuredInMegaMenu?: boolean
  /** Hero image aggregated from the raw SQL nodes folded into this node. */
  heroImage?: string | null
}

export type FilterOption = { value: string; label: string; count: number }

export type FilterSection =
  | { kind: "price"; label: "Price Range"; buckets: FilterOption[] }
  | { kind: "rating"; label: "Rating"; rows: FilterOption[] }
  | { kind: "check"; key: string; label: string; options: FilterOption[] }

export type AppliedFilters = {
  minPrice?: number
  maxPrice?: number
  rating?: number
  availability?: string[]
}

export type SortKey = "best-selling" | "newest" | "price-asc" | "price-desc" | "top-rated"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "best-selling", label: "Best Selling" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "top-rated", label: "Top Rated" },
]

export type MerchCollection = { key: string; displayName: string; path: string; count: number }
export type MerchKey = "new-arrivals" | "sale"

export const MERCH_META: Record<MerchKey, { displayName: string; blurb: string }> = {
  "new-arrivals": { displayName: "New Arrivals", blurb: "The latest additions to the Pawz collection." },
  sale: { displayName: "Sale", blurb: "Marked-down favorites while they last." },
}
