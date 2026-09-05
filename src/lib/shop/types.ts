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
  price: string
  priceCents: number | null
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
