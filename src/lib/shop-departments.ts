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
        return cats.filter((c) => c.slug !== "pet-supplies")
      })
      .catch(() => {
        // Transient failure — retry on the next mount instead of caching [].
        cache = null
        return []
      })
  }
  return cache
}
