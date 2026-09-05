import "server-only"
import { cache } from "react"
import { repo, type Row } from "@/lib/repo"
import {
  type Rating,
  type ShopProduct,
  type NavCategory,
  type FilterOption,
  type FilterSection,
  type AppliedFilters,
  type SortKey,
  type MerchCollection,
  type MerchKey,
  SORT_OPTIONS,
  MERCH_META,
} from "./types"

export * from "./types"

// ---------------------------------------------------------------------------
// Price helpers (server-side twins of the cart-store utils)
// ---------------------------------------------------------------------------

export function parsePriceToCents(price: unknown): number | null {
  if (typeof price !== "string") return null
  const m = price.replace(/[$,\s]/g, "")
  const n = Number.parseFloat(m)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ---------------------------------------------------------------------------
// Raw catalog (React-cache'd per request — parallel sections share one fetch)
// ---------------------------------------------------------------------------

const getRaw = cache(async () => {
  const [catRows, productRows, reviewRows, filterRows, filterValueRows, mappingRows] =
    await Promise.all([
      repo.list("pet_product_categories"),
      repo.list("products"),
      repo.list("product_reviews"),
      repo.list("pet_product_filters"),
      repo.list("pet_product_filter_values"),
      repo.list("pet_category_filters"),
    ])
  return {
    categories: catRows,
    products: productRows,
    reviews: reviewRows,
    filters: filterRows,
    filterValues: filterValueRows,
    mappings: mappingRows,
  }
})

/** Visible products enriched with rating rollups + derived merch flags. */
export const getProducts = cache(async (): Promise<ShopProduct[]> => {
  const { products, reviews } = await getRaw()

  const rollup = new Map<string, Rating>()
  for (const r of reviews) {
    if (!(r.visible === true || r.status === "approved")) continue
    const cur = rollup.get(r.productId) || { avg: 0, count: 0 }
    rollup.set(r.productId, {
      avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
      count: cur.count + 1,
    })
  }

  const now = Date.now()
  return (products as Row[])
    .filter((p) => p.visible !== false && p.slug)
    .map((p) => {
      const rating = rollup.get(p.id) || { avg: 0, count: 0 }
      const created = p.createdAt ? new Date(p.createdAt).getTime() : 0
      const badge = typeof p.badge === "string" ? p.badge.toLowerCase() : ""
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        priceCents: parsePriceToCents(p.price),
        image: p.image ?? null,
        alt: p.alt ?? p.name,
        badge: p.badge ?? null,
        category: p.category ?? null,
        categoryId: p.categoryId ?? null,
        stock: p.stock ?? null,
        shortDescription: p.shortDescription ?? null,
        description: p.description ?? null,
        createdAt: p.createdAt ?? null,
        order: p.order ?? 99,
        featured: p.featured === true,
        rating,
        isNew: badge.includes("new") || (created > 0 && now - created < 60 * 24 * 3600 * 1000),
        isBestseller:
          badge.includes("bestseller") || badge.includes("best seller") || p.featured === true,
        isOnSale: false, // flips true when compare-at pricing lands in SQL
      }
    })
})

// ---------------------------------------------------------------------------
// Presentation layer — CategoryPresentationOverride map (spec §resolver).
// Raw SQL names are aliased/flattened here; the DB keeps its legacy shape.
// ---------------------------------------------------------------------------

type Override = {
  displayName?: string
  displaySlug?: string
  /** Hide the raw node from customer-facing navigation entirely. */
  hidden?: boolean
}

const OVERRIDES: Record<string, Override> = {
  // Legacy catch-all with no products — hidden from customers.
  "pet-supplies": { hidden: true },

  // Flattened primaries (raw root + intermediate collapse to one concept).
  "dog-feeding-watering-supplies": { hidden: true },
  "dog-grooming-supplies": { hidden: true },
  "dog-beds-furniture": { hidden: true },
  "dog-apparel-accessories": { hidden: true },
  "dog-chew-toys": { hidden: true },
  "dog-treat-cookies-biscuits-snacks": { displayName: "Treats", displaySlug: "treats" },
  "carriers-travel-products": { displayName: "Travel & Outdoor", displaySlug: "travel" },
  "health-supplies": { displayName: "Wellness", displaySlug: "wellness" },

  // Redundant intermediates (restate their parent concept).
  "feeding-watering-supplies": { displayName: "Feeding & Watering", displaySlug: "feeding-watering" },
  "apparel-accessories": { displayName: "Apparel & Accessories", displaySlug: "apparel-accessories" },
}

// The virtual parent landing that groups the dog departments.
const VIRTUAL_DOG = { displayName: "Dog", slug: "dog" }

// ---------------------------------------------------------------------------
// Customer-facing nav tree (the resolver)
// ---------------------------------------------------------------------------

type RawNode = { id: number; name: string; slug: string; parentId: number | null; children: RawNode[]; count: number }

function buildRawTree(rows: Row[]): { roots: RawNode[]; byId: Map<number, RawNode> } {
  const nodes = new Map<number, RawNode>()
  for (const r of rows) {
    nodes.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parent_id ?? null,
      children: [],
      count: 0,
    })
  }
  const roots: RawNode[] = []
  for (const n of nodes.values()) {
    if (n.parentId == null) roots.push(n)
    else nodes.get(n.parentId)?.children.push(n)
  }
  return { roots, byId: nodes }
}

function subtreeIds(n: RawNode): number[] {
  return [n.id, ...n.children.flatMap(subtreeIds)]
}

function rollupRaw(n: RawNode, productCountByLeaf: Map<number, number>): number {
  const own = productCountByLeaf.get(n.id) || 0
  const total = own + n.children.reduce((s, c) => s + rollupRaw(c, productCountByLeaf), 0)
  n.count = total
  return total
}

/** Full customer-facing navigation, computed from live SQL data. */
export const getNavTree = cache(async (): Promise<NavCategory[]> => {
  const { categories } = await getRaw()
  const products = await getProducts()

  const leafCounts = new Map<number, number>()
  for (const p of products) {
    if (p.categoryId == null) continue
    leafCounts.set(p.categoryId, (leafCounts.get(p.categoryId) || 0) + 1)
  }

  const { roots } = buildRawTree(categories)
  for (const r of roots) rollupRaw(r, leafCounts)

  // Turn a raw node into a customer-facing NavCategory. `hiddenAncestors`
  // collects raw ids of redundant intermediates folded into this node.
  const toNav = (raw: RawNode, level: number, parentKey: string | null, pathPrefix: string): NavCategory | null => {
    const o = OVERRIDES[raw.slug]
    if (o?.hidden) return null
    const key = o?.displaySlug || raw.slug
    const displayName = o?.displayName || raw.name
    const path = `${pathPrefix}/${key}`
    const rawIds = [raw.id]
    const children: NavCategory[] = []
    for (const c of raw.children) {
      const co = OVERRIDES[c.slug]
      if (co?.hidden) {
        // Redundant intermediate: fold it into THIS node's scope and splice
        // its children one level up (the flattening rule).
        rawIds.push(c.id)
        for (const gc of c.children) {
          const nav = toNav(gc, level + 1, key, path)
          if (nav) {
            nav.rawIds.push(c.id)
            children.push(nav)
          }
        }
        continue
      }
      const nav = toNav(c, level + 1, key, path)
      if (nav) children.push(nav)
    }
    const scopeIds = [raw.id, ...raw.children.flatMap(subtreeIds)]
    return {
      key,
      displayName,
      path,
      level,
      count: scopeIds.reduce((s, id) => s + (leafCounts.get(id) || 0), 0),
      rawIds: Array.from(new Set([...rawIds, ...scopeIds])),
      children,
      parentKey,
    }
  }

  // Dog departments: every root in this SQL taxonomy is a dog department,
  // INCLUDING the "Dog X Supplies" roots that present as hidden (their
  // intermediate child is promoted as the primary below). Only the legacy
  // "Pet Supplies" catch-all is dropped entirely.
  const dogRoots: RawNode[] = []
  const catRoots: RawNode[] = []
  for (const r of roots) {
    if (r.slug === "pet-supplies") continue // legacy catch-all
    if (/^cat\b/i.test(r.name) || r.slug.startsWith("cat-")) catRoots.push(r)
    else dogRoots.push(r)
  }

  const dogChildren: NavCategory[] = []
  const dogRawIds: number[] = []
  for (const r of dogRoots) {
    dogRawIds.push(...subtreeIds(r))
    const o = OVERRIDES[r.slug]
    if (o?.hidden) {
      // Root is hidden (redundant): promote its intermediate child as the
      // primary presentation node, folding the root's id into its scope.
      const primary = r.children.find((c) => !OVERRIDES[c.slug]?.hidden)
      if (primary) {
        const nav = toNav(primary, 1, VIRTUAL_DOG.slug, `/shop/${VIRTUAL_DOG.slug}`)
        if (nav) {
          nav.rawIds.push(r.id)
          nav.rawIds = Array.from(new Set(nav.rawIds))
          dogChildren.push(nav)
        }
      }
    } else {
      const nav = toNav(r, 1, VIRTUAL_DOG.slug, `/shop/${VIRTUAL_DOG.slug}`)
      if (nav) dogChildren.push(nav)
    }
  }

  const nav: NavCategory[] = []
  if (dogChildren.length > 0) {
    nav.push({
      key: VIRTUAL_DOG.slug,
      displayName: VIRTUAL_DOG.displayName,
      path: `/shop/${VIRTUAL_DOG.slug}`,
      level: 0,
      count: dogRoots.reduce((s, r) => s + r.count, 0),
      rawIds: Array.from(new Set(dogRawIds)),
      children: dogChildren,
      parentKey: null,
    })
  }
  // Future cat departments group under their own virtual parent the same way.
  void catRoots
  return nav
})

/** Flatten a nav tree depth-first. */
export function flattenNav(nodes: NavCategory[]): NavCategory[] {
  const out: NavCategory[] = []
  const walk = (n: NavCategory) => {
    out.push(n)
    n.children.forEach(walk)
  }
  nodes.forEach(walk)
  return out
}

// ---------------------------------------------------------------------------
// Category path resolution (server, per request)
// ---------------------------------------------------------------------------

export type ResolvedCategory = {
  node: NavCategory
  /** Chain from the top-level node down to this node (for breadcrumbs). */
  chain: NavCategory[]
  /** Parent PLP node (children shown as subcategory navigation), or null. */
  parentNode: NavCategory | null
  /** Sibling nodes (for Template 3 lateral browsing). */
  siblings: NavCategory[]
}

export const resolveCategory = cache(async (segments: string[]): Promise<ResolvedCategory | null> => {
  if (segments.length === 0 || segments.length > 3) return null
  const tree = await getNavTree()
  let current: NavCategory | null = null
  let pool = tree
  const chain: NavCategory[] = []
  for (const seg of segments) {
    const hit = pool.find((n) => n.key === seg)
    if (!hit) return null
    chain.push(hit)
    current = hit
    pool = hit.children
  }
  if (!current) return null
  const parentNode =
    current.parentKey != null
      ? flattenNav(tree).find((n) => n.key === current!.parentKey && n.level === current!.level - 1) || null
      : null
  const siblings = parentNode ? parentNode.children : tree
  return { node: current, chain, parentNode, siblings }
})

/** Resolve an OLD /shop/category/[slug] URL to its new canonical path. */
export async function resolveLegacyCategorySlug(slug: string): Promise<string | null> {
  const tree = await getNavTree()
  const { categories } = await getRaw()
  const rawNode = (categories as Row[]).find((c) => c.slug === slug)
  if (rawNode?.id != null) {
    const hit = findByRawId(tree, rawNode.id)
    if (hit) return hit.path
  }
  const hit = flattenNav(tree).find((n) => n.key === slug)
  return hit ? hit.path : null
}

/** Find the node that OWNS a raw id — the deepest (most specific) match wins. */
function findByRawId(nodes: NavCategory[], rawId: number): NavCategory | null {
  let best: NavCategory | null = null
  const walk = (list: NavCategory[]) => {
    for (const n of list) {
      if (n.rawIds.includes(rawId) && (!best || n.level > best.level)) best = n
      walk(n.children)
    }
  }
  walk(nodes)
  return best
}

/** Public helper: find the presentation node that owns a raw SQL category id. */
export function findByRawIdNav(flat: NavCategory[], rawId: number): NavCategory | null {
  let best: NavCategory | null = null
  for (const n of flat) {
    if (n.rawIds.includes(rawId) && (!best || n.level > best.level)) best = n
  }
  return best
}

/** Resolve a flat single-segment alias (/shop/grooming) to the canonical path. */
export async function resolveFlatAlias(slug: string): Promise<string | null> {
  const tree = await getNavTree()
  // Only primaries (level 1) get flat aliases, per the sidebar spec examples.
  const hit = flattenNav(tree).find((n) => n.level === 1 && n.key === slug)
  return hit ? hit.path : null
}

// ---------------------------------------------------------------------------
// Merch collections (New Arrivals / Sale) — live product data
// ---------------------------------------------------------------------------

export async function getMerchCollections(): Promise<MerchCollection[]> {
  const products = await getProducts()
  const newArrivals = products.filter((p) => p.isNew)
  const sale = products.filter((p) => p.isOnSale)
  const out: MerchCollection[] = [
    {
      key: "new-arrivals",
      displayName: MERCH_META["new-arrivals"].displayName,
      path: "/shop/new-arrivals",
      count: newArrivals.length,
    },
    {
      key: "sale",
      displayName: MERCH_META["sale"].displayName,
      path: "/shop/sale",
      count: sale.length,
    },
  ]
  // Sale is hidden until it has products; New Arrivals always shows (the
  // route renders a healthy empty state while the catalog grows).
  return out.filter((m) => (m.key === "sale" ? m.count > 0 : true))
}

// ---------------------------------------------------------------------------
// Filter sections (the FILTERS rail — checkbox-driven, data-resolved)
// ---------------------------------------------------------------------------

const PRICE_BUCKETS: { value: string; label: string; min?: number; max?: number }[] = [
  { value: "under-25", label: "Under $25", max: 2499 },
  { value: "25-50", label: "$25 to $50", min: 2500, max: 5000 },
  { value: "over-50", label: "Over $50", min: 5001 },
]

/**
 * Build the filter sections for a product scope. Sections are pruned by the
 * visibility rule: a group renders only when in-scope products produce
 * usable values for it.
 */
export async function getFilterSections(scopeIds: number[] | null): Promise<FilterSection[]> {
  const products = await getProducts()
  const inScope = scopeIds
    ? products.filter((p) => p.categoryId != null && scopeIds.includes(p.categoryId))
    : products

  const sections: FilterSection[] = []

  // ---- Price Range ----
  const buckets = PRICE_BUCKETS.map((b) => ({
    value: b.value,
    label: b.label,
    count: inScope.filter((p) => {
      if (p.priceCents == null) return false
      if (b.min != null && p.priceCents < b.min) return false
      if (b.max != null && p.priceCents > b.max) return false
      return true
    }).length,
  })).filter((b) => b.count > 0)
  if (buckets.length > 0) sections.push({ kind: "price", label: "Price Range", buckets })

  // ---- Rating (star floors) ----
  const rated = inScope.filter((p) => p.rating.count > 0)
  if (rated.length > 0) {
    const rows = [4, 3, 2, 1]
      .map((floor) => ({
        value: String(floor),
        label: `${floor}★ & up`,
        count: rated.filter((p) => p.rating.avg >= floor).length,
      }))
      .filter((r) => r.count > 0)
    if (rows.length > 0) sections.push({ kind: "rating", label: "Rating", rows })
  }

  // ---- Availability ----
  const inStock = inScope.filter((p) => p.stock == null || p.stock > 0).length
  const outStock = inScope.filter((p) => p.stock != null && p.stock <= 0).length
  if (inStock + outStock > 0) {
    const options: FilterOption[] = []
    if (inStock > 0) options.push({ value: "in-stock", label: "In Stock", count: inStock })
    if (outStock > 0) options.push({ value: "out-of-stock", label: "Out of Stock", count: outStock })
    sections.push({ kind: "check", key: "availability", label: "Availability", options })
  }

  // ---- SQL-mapped filters (brand, coat type, …) ----
  // Mapped through pet_category_filters (global + category-scoped, inherited
  // through the resolved scope ids). A group renders only when in-scope
  // products carry a usable value for it — until structured attribute data
  // lands in SQL these stay pruned, then appear automatically.
  const { filters, mappings } = await getRaw()
  const scopeSet = new Set(scopeIds || [])
  const mappedFilterIds = new Set<number>()
  for (const m of mappings as Row[]) {
    if (scopeIds == null || scopeSet.has(m.category_id)) mappedFilterIds.add(m.filter_id)
  }
  const handled = new Set(["price", "rating", "availability", "brand"])
  for (const f of filters as Row[]) {
    if (!mappedFilterIds.has(f.id) || f.is_active === false) continue
    if (handled.has(f.slug)) continue
    const hasValues = inScope.some((p) => {
      const v = (p as unknown as Record<string, unknown>)[f.slug]
      return typeof v === "string" && v.trim().length > 0
    })
    if (!hasValues) continue
    sections.push({ kind: "check", key: f.slug, label: f.name, options: [] })
  }

  return sections
}

// ---------------------------------------------------------------------------
// Product query (URL-driven, executed per request)
// ---------------------------------------------------------------------------

export type ProductQuery = {
  scopeIds?: number[] | null
  merch?: MerchKey | null
  filters?: AppliedFilters
  sort?: SortKey
  page?: number
  perPage?: number
}

export type ProductQueryResult = {
  items: ShopProduct[]
  total: number
  page: number
  pages: number
}

export async function queryProducts(q: ProductQuery): Promise<ProductQueryResult> {
  const products = await getProducts()
  let items = products

  if (q.scopeIds) {
    const scope = new Set(q.scopeIds)
    items = items.filter((p) => p.categoryId != null && scope.has(p.categoryId))
  }
  if (q.merch === "new-arrivals") items = items.filter((p) => p.isNew)
  if (q.merch === "sale") items = items.filter((p) => p.isOnSale)

  const f = q.filters || {}
  if (f.minPrice != null) items = items.filter((p) => p.priceCents != null && p.priceCents >= f.minPrice!)
  if (f.maxPrice != null) items = items.filter((p) => p.priceCents != null && p.priceCents <= f.maxPrice!)
  if (f.rating != null) items = items.filter((p) => p.rating.count > 0 && p.rating.avg >= f.rating!)
  if (f.availability && f.availability.length > 0) {
    const wantsIn = f.availability.includes("in-stock")
    const wantsOut = f.availability.includes("out-of-stock")
    items = items.filter((p) => {
      const inStock = p.stock == null || p.stock > 0
      return (wantsIn && inStock) || (wantsOut && !inStock)
    })
  }

  const sort: SortKey = q.sort || "best-selling"
  const sorted = [...items].sort((a, b) => {
    switch (sort) {
      case "newest":
        return (
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime() ||
          (a.order ?? 99) - (b.order ?? 99)
        )
      case "price-asc":
        return (a.priceCents ?? Infinity) - (b.priceCents ?? Infinity)
      case "price-desc":
        return (b.priceCents ?? -Infinity) - (a.priceCents ?? -Infinity)
      case "top-rated":
        return (
          b.rating.count - a.rating.count ||
          b.rating.avg - a.rating.avg ||
          (a.order ?? 99) - (b.order ?? 99)
        )
      default: {
        const rank = (p: ShopProduct) => (p.isBestseller ? 0 : 1)
        return rank(a) - rank(b) || (a.order ?? 99) - (b.order ?? 99)
      }
    }
  })

  const perPage = q.perPage ?? 12
  const total = sorted.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const page = Math.min(Math.max(1, q.page ?? 1), pages)
  return { items: sorted.slice((page - 1) * perPage, page * perPage), total, page, pages }
}

// ---------------------------------------------------------------------------
// searchParams → query state (the URL is the single source of truth)
// ---------------------------------------------------------------------------

export function parseSearchParams(sp: Record<string, string | string[] | undefined>): {
  filters: AppliedFilters
  sort: SortKey
  page: number
  priceBucket: string | null
} {
  const one = (k: string): string | null => {
    const v = sp[k]
    return typeof v === "string" && v.trim() !== "" ? v.trim() : null
  }
  const num = (k: string): number | undefined => {
    const v = one(k)
    if (v == null) return undefined
    const n = Number.parseFloat(v.replace(/[$,\s]/g, ""))
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined
  }
  const sortRaw = one("sort")
  const sort: SortKey =
    sortRaw && SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as SortKey) : "best-selling"
  const availabilityRaw = one("availability")

  // Price bucket → canonical min/max bounds (the URL keeps the bucket for the
  // rail's checked state; the query reads the bounds).
  let bucketMin = num("minPrice")
  let bucketMax = num("maxPrice")
  const priceBucket = one("priceBucket")
  if (priceBucket) {
    if (priceBucket === "under-25") {
      bucketMin = undefined
      bucketMax = 2499
    } else if (priceBucket === "25-50") {
      bucketMin = 2500
      bucketMax = 5000
    } else if (priceBucket === "over-50") {
      bucketMin = 5001
      bucketMax = undefined
    }
  }

  return {
    filters: {
      minPrice: bucketMin,
      maxPrice: bucketMax,
      rating: (() => {
        const r = one("rating")
        const n = r ? Number.parseInt(r, 10) : NaN
        return Number.isFinite(n) && n >= 1 && n <= 5 ? n : undefined
      })(),
      availability: availabilityRaw ? availabilityRaw.split(",").filter(Boolean) : undefined,
    },
    sort,
    page: (() => {
      const p = one("page")
      const n = p ? Number.parseInt(p, 10) : 1
      return Number.isFinite(n) && n > 0 ? n : 1
    })(),
    priceBucket,
  }
}
