"use client"

import { SHOP_NAV_TAXONOMY } from "@/lib/shop-nav"

// ---------------------------------------------------------------------------
// Live shop nav loader — shared by ShopFlyout and ShopMegaMenu.
//
// The nav used to render the static SHOP_NAV_TAXONOMY, which hardcoded a
// single department card for fish / bird / reptile / small-animal and left
// users with nowhere to route. This loader fetches the LIVE taxonomy tree
// from /api/shop/nav (taxonomy_nodes + live product counts, server-resolved
// images) and caches it module-level for the session.
//
// Rendering strategy in both menus:
//   1. Paint the static fallback instantly (menu is never empty or blank).
//   2. Swap in the live tree once loaded — real paths, real counts, every
//      department and every L3 category routable.
// ---------------------------------------------------------------------------

export type NavSub = {
  slug: string
  name: string
  path: string
  productCount: number
  image: string | null
}

export type NavDepartment = {
  slug: string
  name: string
  path: string
  productCount: number
  image: string | null
  subcategories: NavSub[]
}

export type NavAnimal = {
  slug: string
  name: string
  tagline: string
  productCount: number
  departments: NavDepartment[]
}

let cache: NavAnimal[] | null = null
let inflight: Promise<NavAnimal[]> | null = null

/** Static instant-paint fallback — legacy slugs all resolve server-side. */
export function staticNavFallback(): NavAnimal[] {
  return SHOP_NAV_TAXONOMY.map((a) => ({
    slug: a.slug,
    name: a.name,
    tagline: a.tagline,
    productCount: 0,
    departments: a.departments.map((d) => ({
      slug: d.slug,
      name: d.name,
      path: `/shop/${a.slug}/${d.slug}`,
      productCount: 0,
      image: null,
      subcategories: d.subcategories.map((s) => ({
        slug: s.slug,
        name: s.name,
        path: `/shop/${a.slug}/${d.slug}/${s.slug}`,
        productCount: 0,
        image: null,
      })),
    })),
  }))
}

export function cachedLiveNav(): NavAnimal[] | null {
  return cache
}

export function loadLiveShopNav(): Promise<NavAnimal[]> {
  if (cache) return Promise.resolve(cache)
  if (inflight) return inflight

  inflight = fetch("/api/shop/nav")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`nav ${r.status}`))))
    .then((data: { animals?: NavAnimal[] }) => {
      const animals = data.animals ?? []
      // Only adopt non-empty trees — a 503/empty body keeps the static nav.
      if (animals.length > 0) cache = animals
      return cache ?? staticNavFallback()
    })
    .catch(() => staticNavFallback())
    .finally(() => {
      inflight = null
    })

  return inflight
}
