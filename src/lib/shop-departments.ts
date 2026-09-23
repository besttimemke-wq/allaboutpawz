// ---------------------------------------------------------------------------
// Shared client-side department tree — one fetch, memoized for the session.
// Used by the shop mega menu (header) and the /shop landing rail, so both
// consume the exact same live taxonomy from /api/shop/categories.
// ---------------------------------------------------------------------------

export type ShopDepartment = {
  id: number
  name: string
  slug: string
  productCount: number
  children: ShopDepartment[]
  /** Admin-controlled mega-menu fields (migration 0013). */
  featuredInMegaMenu?: boolean | null
  promoBlurb?: string | null
  heroImage?: string | null
  sortOrder?: number | null
}

let cache: Promise<ShopDepartment[]> | null = null

export function loadShopDepartments(): Promise<ShopDepartment[]> {
  if (!cache) {
    cache = fetch("/api/shop/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const cats: ShopDepartment[] = d && Array.isArray(d.categories) ? d.categories : []
        // The generic "pet-supplies" umbrella root (no products, no children)
        // is never a department link.
        const filtered = cats.filter((c) => c.slug !== "pet-supplies")
        // Sort by admin-controlled sort_order (falls back to name).
        filtered.sort((a, b) => {
          const sa = a.sortOrder ?? 99
          const sb = b.sortOrder ?? 99
          if (sa !== sb) return sa - sb
          return a.name.localeCompare(b.name)
        })
        return filtered
      })
      .catch(() => {
        // Transient failure — retry on the next mount instead of caching [].
        cache = null
        return []
      })
  }
  return cache
}
