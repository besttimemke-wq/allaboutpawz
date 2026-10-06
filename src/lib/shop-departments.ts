// ---------------------------------------------------------------------------
// Shared client-side department tree — one fetch, memoized for the session.
// Used by the shop department bar (ShopNavBar) and the /shop landing rail,
// so both consume the exact same live taxonomy from /api/shop/categories.
//
// Carries the admin-controlled mega-menu fields (migration 0013):
// featured_in_mega_menu, promo_blurb, hero_image, sort_order — so a
// department the admin creates or reorders flows to the storefront bar.
// ---------------------------------------------------------------------------

export type ShopDepartment = {
  id: number
  name: string
  slug: string
  productCount: number
  children: ShopDepartment[]
  /** Canonical customer-facing route (e.g. /shop/dog/grooming) — joined
   *  server-side by /api/shop/categories. Null when no presentation node
   *  owns this raw category; consumers fall back to the legacy
   *  /shop/category/<slug> redirect. */
  navPath?: string | null
  /** Admin-controlled mega-menu fields (optional — fixtures without them
   *  keep type-checking). */
  featuredInMegaMenu?: boolean | null
  promoBlurb?: string | null
  heroImage?: string | null
  sortOrder?: number | null
}

let cache: Promise<ShopDepartment[]> | null = null

export function loadShopDepartments(): Promise<ShopDepartment[]> {
  if (!cache) {
    // no-store: the taxonomy is admin-editable and the in-memory memo IS the
    // cache layer — the HTTP cache must never pin a stale tree (navPath join,
    // new categories, sort changes) for the session.
    cache = fetch("/api/shop/categories", { cache: "no-store" })
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
