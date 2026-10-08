// ---------------------------------------------------------------------------
// taxonomy-db — LIVE Supabase taxonomy for the shop route system.
//
// The single source of truth for /shop/<animal>/<group>/<subcategory> is the
// `taxonomy_nodes` table (feed-sync maintains it from the supplier feeds).
// This module replaces the hand-mirrored static tree in shop-nav.ts for all
// SERVER resolution: route matching, landing-page children, product scoping
// and PLP facets. The static mirror stays only for client islands (mega
// menu / flyout) and is regenerated from this data by scripts/gen-shop-nav.ts.
//
// Association model (verified against live data Oct 2026):
//   - product_nodes (product_id ↔ node_id) — 10.8k rows, primary
//   - products.category_id → taxonomy_nodes.id — direct column, also honored
//   Both are OR-joined so every published product is reachable.
//
// All queries go through pgQuery (session pooler). Tree + counts are cached
// in-process with a TTL so a burst of page views costs one round trip.
// ---------------------------------------------------------------------------

import { pgQuery } from "@/lib/pg"

// ----------------------------- Types ---------------------------------------

export type TaxNodeRow = {
  id: string
  parentId: string | null
  nodeType: string
  name: string
  displayName: string
  slug: string
  depth: number
  sortOrder: number
}

export type TaxSub = {
  id: string
  slug: string
  name: string
  /** Live product count for this node's whole subtree. */
  productCount: number
  hasChildren: boolean
}

export type TaxGroup = {
  id: string
  slug: string
  name: string
  nodeType: string
  subcategories: TaxSub[]
  productCount: number
}

export type TaxAnimal = {
  id: string
  slug: string
  name: string
  groups: TaxGroup[]
  productCount: number
}

// ----------------------------- Tree ----------------------------------------

type NodeRec = TaxNodeRow & { productCount: number; childCount: number; children: NodeRec[] }

const TREE_TTL_MS = 5 * 60 * 1000
let treeCacheAt = 0
let treeCache: TaxAnimal[] | null = null

async function fetchTree(): Promise<TaxAnimal[]> {
  const nodeRows = await pgQuery<{
    id: string; parent_id: string | null; node_type: string; name: string;
    display_name: string | null; slug: string; depth: number; sort_order: number;
  }>(
    `SELECT id, parent_id, node_type, name, display_name, slug, depth, sort_order
       FROM taxonomy_nodes
      WHERE status = 'published'
      ORDER BY sort_order, name`,
  )

  // Live per-node product counts — product_nodes join table UNION the
  // products.category_id direct column (both verified against live data).
  const countRows = await pgQuery<{ node_id: string; n: number }>(
    `SELECT node_id, count(*)::int AS n FROM (
        SELECT pn.node_id, pn.product_id
          FROM product_nodes pn
          JOIN products p ON p.id = pn.product_id AND p.status = 'published'
        UNION
        SELECT p.category_id AS node_id, p.id AS product_id
          FROM products p
         WHERE p.status = 'published' AND p.category_id IS NOT NULL
      ) t GROUP BY node_id`,
  )
  const countByNode = new Map<string, number>()
  for (const r of countRows) countByNode.set(r.node_id, Number(r.n) || 0)

  const byId = new Map<string, NodeRec>()
  for (const r of nodeRows) {
    byId.set(r.id, {
      id: r.id,
      parentId: r.parent_id,
      nodeType: r.node_type,
      name: r.name,
      displayName: r.display_name || r.name,
      slug: r.slug,
      depth: r.depth,
      sortOrder: r.sort_order,
      productCount: countByNode.get(r.id) ?? 0,
      childCount: 0,
      children: [],
    })
  }
  const roots: NodeRec[] = []
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n)
      byId.get(n.parentId)!.childCount++
    } else {
      roots.push(n)
    }
  }

  // Rollup subtree counts bottom-up.
  const rollup = (n: NodeRec): number => {
    let total = n.productCount
    for (const c of n.children) total += rollup(c)
    n.productCount = total
    return total
  }
  for (const r of roots) rollup(r)

  // Animals = depth-1 nodes. Groups = depth-2 children. Subs = depth-3
  // children (their own children stay in the product scope via the CTE but
  // are not nav-rendered).
  const animals: TaxAnimal[] = []
  for (const a of roots.filter((n) => n.depth === 1)) {
    const groups: TaxGroup[] = a.children.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.displayName,
      nodeType: g.nodeType,
      productCount: g.productCount,
      subcategories: g.children.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.displayName,
        productCount: s.productCount,
        hasChildren: s.children.length > 0,
      })),
    }))
    animals.push({
      id: a.id,
      slug: a.slug,
      name: a.displayName,
      groups,
      productCount: a.productCount,
    })
  }
  return animals
}

/** Cached live taxonomy tree (TTL + per-process). */
export async function getTaxonomyTree(): Promise<TaxAnimal[]> {
  if (treeCache && Date.now() - treeCacheAt < TREE_TTL_MS) return treeCache
  const tree = await fetchTree()
  if (tree.length > 0) {
    treeCache = tree
    treeCacheAt = Date.now()
  }
  return treeCache ?? tree
}

// ----------------------------- Resolver ------------------------------------

/** Legacy static-tree slugs → live taxonomy_nodes canonical paths. */
const ANIMAL_ALIASES: Record<string, string> = {
  "small-pet": "small-animal",
  "fish-aquatics": "fish",
}
const GROUP_ALIASES: Record<string, string> = {
  // dog
  "grooming-bathing": "grooming",
  "treats-chews": "treats",
  "crates-containment": "travel-crates",
  "apparel-accessories": "clothes-accessories",
  "cleaning-potty-supplies": "cleanup-potty",
  "collars-harnesses-leashes": "collars-leashes-harnesses",
  "training-behavior-supplies": "training-behavior",
  // cat
  "bowls-feeders": "bowls-feeding",
  "litter-litter-boxes-accessories": "litter",
  "flea-tick-solutions-for-cats": "flea-tick",
  "cleaners-waste-disposal": "cleanup-potty",
  "flea-tick-solutions-for-dogs": "flea-tick",
}

export type ResolvedTaxPath = {
  animal: TaxAnimal
  group: TaxGroup | null
  sub: TaxSub | null
  /** Deepest matched node's whole subtree id scope (for product queries). */
  nodeIds: string[]
  /** Deepest matched node still has children (render landing, not PLP). */
  deepestHasChildren: boolean
  /** When matched through a legacy alias, the canonical path to 301 to. */
  canonicalPath: string | null
  /** Animal matched but a deeper segment did not — render notFound(). */
  notFound: boolean
}

function subtreeIds(ids: string[], childrenOf: (id: string) => string[]): string[] {
  const out = new Set<string>(ids)
  const stack = [...ids]
  while (stack.length) {
    const cur = stack.pop()!
    for (const c of childrenOf(cur)) {
      if (!out.has(c)) {
        out.add(c)
        stack.push(c)
      }
    }
  }
  return [...out]
}

/**
 * Resolve /shop/<animal>[/<group>[/<sub>]] against the LIVE taxonomy.
 * Legacy slugs resolve too — with a canonicalPath for the 301.
 */
export async function resolveTaxPath(segments: string[]): Promise<ResolvedTaxPath | null> {
  if (segments.length === 0) return null
  const tree = await getTaxonomyTree()

  const rawAnimalSlug = segments[0]
  const canonicalAnimal = ANIMAL_ALIASES[rawAnimalSlug] || rawAnimalSlug
  const animal = tree.find((a) => a.slug === canonicalAnimal)
  if (!animal) return null

  const aliasedAnimal = canonicalAnimal !== rawAnimalSlug

  if (segments.length === 1) {
    return {
      animal,
      group: null,
      sub: null,
      nodeIds: [animal.id],
      deepestHasChildren: true,
      canonicalPath: aliasedAnimal ? `/shop/${animal.slug}` : null,
      notFound: false,
    }
  }

  // Group lookup needs the raw node tree for descendant scoping — refetch
  // node records from the tree cache via a flat index.
  const nodes = await getNodeIndex()
  const childrenOf = (id: string) => nodes.childrenMap.get(id) ?? []

  const rawGroupSlug = segments[1]
  const canonicalGroup = GROUP_ALIASES[rawGroupSlug] || rawGroupSlug
  const group = animal.groups.find((g) => g.slug === canonicalGroup)

  if (!group) {
    // Unknown second segment under a known animal — hard 404 (do NOT fall
    // through to the legacy dog-only resolver for fish/bird/etc.).
    return { animal, group: null, sub: null, nodeIds: [animal.id], deepestHasChildren: true, canonicalPath: null, notFound: true }
  }

  const aliasedGroup = canonicalGroup !== rawGroupSlug || aliasedAnimal

  if (segments.length === 2) {
    return {
      animal,
      group,
      sub: null,
      nodeIds: subtreeIds([group.id], childrenOf),
      deepestHasChildren: group.subcategories.length > 0,
      canonicalPath: aliasedGroup ? `/${["shop", animal.slug, group.slug].join("/")}` : null,
      notFound: false,
    }
  }

  const rawSubSlug = segments[2]
  let sub = group.subcategories.find((s) => s.slug === rawSubSlug) ?? null

  if (!sub) {
    // Not a direct depth-3 child — the slug may be a deeper node (depth-4+)
    // or a supplier-tree variant. BFS the group's subtree for the first
    // published node with this slug so EVERY live slug resolves to a page.
    const seen = new Set<string>([group.id])
    const stack = [...(nodes.childrenMap.get(group.id) ?? [])]
    while (stack.length > 0) {
      const cur = stack.pop()!
      if (seen.has(cur)) continue
      seen.add(cur)
      const rec = nodes.byId.get(cur)
      if (rec && rec.slug === rawSubSlug) {
        const childCount = (nodes.childrenMap.get(rec.id) ?? []).length
        const cnt = await pgQuery<{ n: number }>(
          `SELECT count(*)::int AS n FROM (
             SELECT pn.product_id FROM product_nodes pn WHERE pn.node_id = ANY($1::uuid[])
             UNION
             SELECT p.id FROM products p
              WHERE p.category_id = ANY($1::uuid[]) AND p.status = 'published'
           ) t`,
          [[rec.id]],
        )
        sub = {
          id: rec.id,
          slug: rec.slug,
          name: rec.name,
          productCount: Number(cnt[0]?.n) || 0,
          hasChildren: childCount > 0,
        }
        break
      }
      for (const c of nodes.childrenMap.get(cur) ?? []) stack.push(c)
    }
  }

  if (!sub) {
    return { animal, group, sub: null, nodeIds: subtreeIds([group.id], childrenOf), deepestHasChildren: true, canonicalPath: null, notFound: true }
  }

  return {
    animal,
    group,
    sub,
    nodeIds: subtreeIds([sub.id], childrenOf),
    deepestHasChildren: sub.hasChildren,
    canonicalPath: null,
    notFound: false,
  }
}

// ----------------------------- Node index ----------------------------------

/** Whole subtree of node ids (self + all descendants) — product scope. */
export async function subtreeNodeIds(id: string): Promise<string[]> {
  const nodes = await getNodeIndex()
  const out = new Set<string>([id])
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    for (const c of nodes.childrenMap.get(cur) ?? []) {
      if (!out.has(c)) {
        out.add(c)
        stack.push(c)
      }
    }
  }
  return [...out]
}

type NodeIndex = {
  byId: Map<string, { id: string; slug: string; name: string; parentId: string | null }>
  childrenMap: Map<string, string[]>
}
let nodeIndexCache: NodeIndex | null = null
let nodeIndexAt = 0

async function getNodeIndex(): Promise<NodeIndex> {
  if (nodeIndexCache && Date.now() - nodeIndexAt < TREE_TTL_MS) return nodeIndexCache
  const rows = await pgQuery<{ id: string; parent_id: string | null; name: string; display_name: string | null; slug: string }>(
    `SELECT id, parent_id, name, display_name, slug FROM taxonomy_nodes WHERE status = 'published'`,
  )
  const byId = new Map<string, { id: string; slug: string; name: string; parentId: string | null }>()
  const childrenMap = new Map<string, string[]>()
  for (const r of rows) {
    byId.set(r.id, { id: r.id, slug: r.slug, name: r.display_name || r.name, parentId: r.parent_id })
    if (r.parent_id) {
      if (!childrenMap.has(r.parent_id)) childrenMap.set(r.parent_id, [])
      childrenMap.get(r.parent_id)!.push(r.id)
    }
  }
  nodeIndexCache = { byId, childrenMap }
  nodeIndexAt = Date.now()
  return nodeIndexCache
}

// ----------------------------- Products ------------------------------------

export type TaxProduct = {
  id: string
  name: string
  slug: string
  brand: string | null
  image: string | null
  priceCents: number | null
  compareAtPriceCents: number | null
  isOnSale: boolean
  isNew: boolean
  isBestseller: boolean
  inStock: boolean
  ratingAvg: number | null
  ratingCount: number
}

const SORT_SQL: Record<string, string> = {
  "best-selling": `p.is_best_seller DESC NULLS LAST, review.n DESC NULLS LAST, p.created_at DESC`,
  "newest": `p.created_at DESC`,
  "price-asc": `price ASC NULLS LAST`,
  "price-desc": `price DESC NULLS LAST`,
  "top-rated": `review.avg DESC NULLS LAST, review.n DESC NULLS LAST`,
}

const SCOPE_SQL = (alias: string) => `
  WITH RECURSIVE sub AS (
    SELECT id FROM taxonomy_nodes WHERE id = ANY($1::uuid[])
    UNION ALL
    SELECT n.id FROM taxonomy_nodes n JOIN sub s ON n.parent_id = s.id
  ),
  scope AS (
    SELECT pn.product_id FROM product_nodes pn JOIN sub ON sub.id = pn.node_id
    UNION
    SELECT p.id FROM products p JOIN sub ON sub.id = p.category_id WHERE p.status = 'published'
  )
  SELECT p.id, p.slug, COALESCE(p.title, p.name) AS name, p.brand,
         p.is_sale, p.is_new, p.is_best_seller, p.created_at,
         v.price, v.compare_at, v.in_stock,
         m.url AS image,
         review.n AS review_n, review.avg AS review_avg
    FROM products p
    JOIN scope ON scope.product_id = p.id
    LEFT JOIN LATERAL (
      SELECT min(vv.price) AS price,
             min(vv.compare_at_price) FILTER (WHERE vv.compare_at_price > vv.price) AS compare_at,
             bool_or(vv.in_stock) AS in_stock
        FROM product_variants vv
       WHERE vv.product_id = p.id AND vv.status = 'active' AND vv.price IS NOT NULL
    ) v ON true
    LEFT JOIN LATERAL (
      SELECT mm.url FROM product_media mm
       WHERE mm.product_id = p.id AND mm.media_type = 'image'
       ORDER BY mm.sort_order LIMIT 1
    ) m ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS n, avg(rr.rating) AS avg
        FROM product_reviews rr
       WHERE rr."productId" = p.id::text AND rr.visible = true
    ) review ON true
   WHERE p.status = 'published'`

function toCents(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function mapProduct(r: Record<string, unknown>): TaxProduct {
  const priceCents = toCents(r.price)
  const compareAtCents = toCents(r.compare_at)
  const isOnSale = r.is_sale === true || (compareAtCents != null && priceCents != null && compareAtCents > priceCents)
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    slug: String(r.slug ?? ""),
    brand: (r.brand as string) || null,
    image: (r.image as string) || null,
    priceCents,
    compareAtPriceCents: isOnSale ? compareAtCents : null,
    isOnSale,
    isNew: r.is_new === true,
    isBestseller: r.is_best_seller === true,
    inStock: r.in_stock !== false,
    ratingAvg: r.review_avg != null ? Math.round(Number(r.review_avg) * 10) / 10 : null,
    ratingCount: Number(r.review_n) || 0,
  }
}

function buildWhere(
  filters: { minPrice?: number; maxPrice?: number; priceBucket?: string | null; rating?: number | null; availability?: string[]; q?: string | null },
  params: unknown[],
): string {
  const clauses: string[] = []
  const cents = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.round(n * 100) : null
  }
  if (filters.priceBucket) {
    // Canonical bucket bounds — must mirror parseSearchParams() in catalog.ts.
    const map: Record<string, [number | null, number | null]> = {
      "under-10": [null, 999],
      "10-25": [1000, 2499],
      "25-50": [2500, 5000],
      "50-100": [5001, 10000],
      "over-100": [10001, null],
    }
    const b = map[filters.priceBucket]
    if (b) {
      if (b[0] != null) clauses.push(`v.price >= $${params.push(b[0])}`)
      if (b[1] != null) clauses.push(`v.price < $${params.push(b[1])}`)
    }
  }
  if (filters.minPrice != null) {
    const c = cents(filters.minPrice)
    if (c != null) clauses.push(`v.price >= $${params.push(c)}`)
  }
  if (filters.maxPrice != null) {
    const c = cents(filters.maxPrice)
    if (c != null) clauses.push(`v.price <= $${params.push(c)}`)
  }
  if (filters.rating != null && Number.isFinite(Number(filters.rating))) {
    clauses.push(`review.avg >= $${params.push(Number(filters.rating))}`)
  }
  if (filters.availability && filters.availability.length > 0 && filters.availability.length < 2) {
    clauses.push(filters.availability[0] === "in-stock" ? `v.in_stock = true` : `v.in_stock = false`)
  }
  if (filters.q && filters.q.trim().length >= 2) {
    const tokens = filters.q.trim().toLowerCase().split(/\s+/).slice(0, 6)
    for (const t of tokens) {
      clauses.push(`(LOWER(COALESCE(p.title, p.name)) LIKE $${params.push("%" + t + "%")} OR LOWER(COALESCE(p.brand, '')) LIKE $${params.push("%" + t + "%")})`)
    }
  }
  if (filters.brands && filters.brands.length > 0) {
    const list = filters.brands.map((b) => b.toLowerCase())
    clauses.push(`LOWER(COALESCE(p.brand, '')) = ANY($${params.push(list)}::text[])`)
  }
  return clauses.length ? " AND " + clauses.join(" AND ") : ""
}

export type TaxQueryResult = {
  items: TaxProduct[]
  total: number
  page: number
  pages: number
}

export async function queryTaxProducts(opts: {
  nodeIds: string[]
  sort?: string
  page?: number
  perPage?: number
  filters?: { minPrice?: number; maxPrice?: number; priceBucket?: string | null; rating?: number | null; availability?: string[]; q?: string | null; brands?: string[] }
}): Promise<TaxQueryResult> {
  const perPage = Math.max(1, Math.min(48, opts.perPage ?? 12))
  const page = Math.max(1, opts.page ?? 1)
  const sort = SORT_SQL[opts.sort || "best-selling"] ? (opts.sort || "best-selling") : "best-selling"

  const params: unknown[] = [opts.nodeIds]
  const where = buildWhere(opts.filters ?? {}, params)
  const orderBy = SORT_SQL[sort]
  const offset = (page - 1) * perPage

  const [rows, countRows] = await Promise.all([
    pgQuery<Record<string, unknown>>(
      SCOPE_SQL("p") + where + ` ORDER BY ${orderBy} LIMIT ${perPage} OFFSET ${offset}`,
      params,
    ),
    pgQuery<{ n: number }>(
      `WITH RECURSIVE sub AS (
         SELECT id FROM taxonomy_nodes WHERE id = ANY($1::uuid[])
         UNION ALL
         SELECT n.id FROM taxonomy_nodes n JOIN sub s ON n.parent_id = s.id
       ),
       scope AS (
         SELECT pn.product_id FROM product_nodes pn JOIN sub ON sub.id = pn.node_id
         UNION
         SELECT p.id FROM products p JOIN sub ON sub.id = p.category_id WHERE p.status = 'published'
       )
       SELECT count(*)::int AS n
         FROM products p
         JOIN scope ON scope.product_id = p.id
        LEFT JOIN LATERAL (
          SELECT min(vv.price) AS price, bool_or(vv.in_stock) AS in_stock
            FROM product_variants vv
           WHERE vv.product_id = p.id AND vv.status = 'active' AND vv.price IS NOT NULL
        ) v ON true
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS n, avg(rr.rating) AS avg
            FROM product_reviews rr
           WHERE rr."productId" = p.id::text AND rr.visible = true
        ) review ON true
       WHERE p.status = 'published'` + where,
      params,
    ),
  ])

  const total = Number(countRows[0]?.n) || 0
  const pages = Math.max(1, Math.ceil(total / perPage))
  return {
    items: rows.map(mapProduct),
    total,
    page: Math.min(page, pages),
    pages,
  }
}

// ----------------------------- Facets --------------------------------------

export type TaxFacets = {
  brands: { name: string; count: number }[]
  priceBuckets: { value: string; label: string; count: number }[]
  ratingRows: { value: string; label: string; count: number }[]
  inStock: number
  outStock: number
}

export async function getTaxFacets(nodeIds: string[]): Promise<TaxFacets> {
  const rows = await pgQuery<{
    brand: string | null; price: number | null; in_stock: boolean | null;
    review_n: number; review_avg: number | null;
  }>(
    SCOPE_SQL("p"),
    [nodeIds],
  )
  const products = rows.map(mapProduct)
  const priced = products.filter((p) => p.priceCents != null)

  const brandCounts = new Map<string, number>()
  for (const p of products) {
    if (!p.brand) continue
    brandCounts.set(p.brand, (brandCounts.get(p.brand) || 0) + 1)
  }
  const brands = [...brandCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12)

  const bucketDefs: { value: string; label: string; min: number | null; max: number | null }[] = [
    { value: "under-10", label: "Under $10", min: null, max: 1000 },
    { value: "10-25", label: "$10 – $25", min: 1000, max: 2500 },
    { value: "25-50", label: "$25 – $50", min: 2500, max: 5001 },
    { value: "50-100", label: "$50 – $100", min: 5001, max: 10001 },
    { value: "over-100", label: "$100 & up", min: 10001, max: null },
  ]
  const priceBuckets = bucketDefs
    .map((b) => ({
      value: b.value,
      label: b.label,
      count: priced.filter((p) => {
        const c = p.priceCents!
        return (b.min == null || c >= b.min) && (b.max == null || c < b.max)
      }).length,
    }))
    .filter((b) => b.count > 0)

  const rated = products.filter((p) => p.ratingCount > 0 && p.ratingAvg != null)
  const ratingRows = [4, 3, 2, 1]
    .map((floor) => ({
      value: String(floor),
      label: `${floor}★ & up`,
      count: rated.filter((p) => (p.ratingAvg as number) >= floor).length,
    }))
    .filter((r) => r.count > 0)

  return {
    brands,
    priceBuckets,
    ratingRows,
    inStock: products.filter((p) => p.inStock).length,
    outStock: products.filter((p) => !p.inStock).length,
  }
}

// ----------------------------- Nav conversion ------------------------------

/** NavCategory-shaped conversion for the sidebar (same contract as
 *  buildNavTreeFromTaxonomy in shop-nav.ts, but built from LIVE data). */
export type NavLike = {
  key: string
  displayName: string
  path: string
  level: number
  count: number
  rawIds: string[]
  children: NavLike[]
  parentKey: string | null
}

export async function buildNavFromTaxonomyDb(): Promise<NavLike[]> {
  const tree = await getTaxonomyTree()
  return tree.map((a) => ({
    key: a.slug,
    displayName: a.name,
    path: `/shop/${a.slug}`,
    level: 0,
    count: a.productCount,
    rawIds: [a.id],
    parentKey: null,
    children: a.groups.map((g) => ({
      key: `${a.slug}/${g.slug}`,
      displayName: g.name,
      path: `/shop/${a.slug}/${g.slug}`,
      level: 1,
      count: g.productCount,
      rawIds: [g.id],
      parentKey: a.slug,
      children: g.subcategories.map((s) => ({
        key: `${a.slug}/${g.slug}/${s.slug}`,
        displayName: s.name,
        path: `/shop/${a.slug}/${g.slug}/${s.slug}`,
        level: 2,
        count: s.productCount,
        rawIds: [s.id],
        parentKey: `${a.slug}/${g.slug}`,
        children: [],
      })),
    })),
  }))
}

/** Every customer-facing taxonomy path (for the sitemap). */
export async function flattenTaxonomyDb(): Promise<{ path: string; name: string; count: number }[]> {
  const tree = await getTaxonomyTree()
  const out: { path: string; name: string; count: number }[] = []
  for (const a of tree) {
    out.push({ path: `/shop/${a.slug}`, name: a.name, count: a.productCount })
    for (const g of a.groups) {
      out.push({ path: `/shop/${a.slug}/${g.slug}`, name: `${a.name} — ${g.name}`, count: g.productCount })
      for (const s of g.subcategories) {
        out.push({ path: `/shop/${a.slug}/${g.slug}/${s.slug}`, name: s.name, count: s.productCount })
      }
    }
  }
  return out
}

// ----------------------------- PDP detail ---------------------------------

/**
 * Full product detail for /products/<slug> when the product comes from the
 * LIVE feed catalog (not the legacy enterprise layer). Returns a
 * CatalogProduct-shaped object so the PDP renders it without changes.
 */
export async function getTaxProductDetailBySlug(
  slug: string,
): Promise<import("@/lib/enterprise/catalog").CatalogProduct | null> {
  const rows = await pgQuery<Record<string, unknown>>(
    `SELECT p.id, p.slug, COALESCE(p.title, p.name) AS name,
            p.short_description, p.details, p.specifications, p.directions, p.warnings,
            p.brand, p.brand_id, p.is_new, p.is_sale, p.is_best_seller, p.is_salon_favorite,
            p.is_featured, p.category_id, p.created_at, p.updated_at
       FROM products p
      WHERE p.slug = $1 AND p.status = 'published'
      LIMIT 1`,
    [slug],
  )
  const p = rows[0]
  if (!p) return null

  const [variantRows, mediaRows, brandNameRows] = await Promise.all([
    pgQuery<{ id: string; sku: string; price: unknown; compare_at_price: unknown; in_stock: boolean | null }>(
      `SELECT id, sku, price, compare_at_price, in_stock
         FROM product_variants
        WHERE product_id = $1 AND status = 'active'
        ORDER BY price ASC NULLS LAST`,
      [p.id],
    ),
    pgQuery<{ url: string; alt_text: string | null; sort_order: number | null }>(
      `SELECT url, alt_text, sort_order
         FROM product_media
        WHERE product_id = $1 AND media_type = 'image'
        ORDER BY sort_order ASC`,
      [p.id],
    ),
    pgQuery<{ name: string }>(`SELECT name FROM brands WHERE id = $1 LIMIT 1`, [p.brand_id]),
  ])

  const prices = variantRows.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0)
  const priceCents = prices.length ? Math.round(Math.min(...prices) * 100) : 0
  const compares = variantRows
    .map((v) => (v.compare_at_price != null ? Number(v.compare_at_price) : null))
    .filter((n): n is number => n != null && Number.isFinite(n) && Math.round(n * 100) > priceCents)
  const compareAtPriceCents = compares.length ? Math.round(Math.min(...compares) * 100) : null
  const isOnSale = compareAtPriceCents != null && compareAtPriceCents > priceCents

  const media = mediaRows.map((m, i) => ({
    id: `${p.id}-media-${i}`,
    url: m.url,
    altText: m.alt_text,
    sortOrder: m.sort_order ?? i,
    isPrimary: i === 0,
  }))

  const brandName = (p.brand as string) || brandNameRows[0]?.name || null

  // Best node names for the breadcrumb chain (category_id → node → ancestors).
  const categoryNodeRows = (p.category_id
    ? await pgQuery<{ id: string; name: string; display_name: string | null; slug: string; parent_id: string | null }>(
        `SELECT id, name, display_name, slug, parent_id FROM taxonomy_nodes WHERE id = $1 LIMIT 1`,
        [p.category_id],
      )
    : [])
  const category = categoryNodeRows[0]?.display_name || categoryNodeRows[0]?.name || null

  return {
    id: `tax-${p.id}`,
    productId: String(p.id),
    skuId: variantRows[0]?.id ?? String(p.id),
    sku: variantRows[0]?.sku ?? "",
    slug: String(p.slug),
    name: String(p.name ?? ""),
    description: (p.details as string) || null,
    shortDescription: (p.short_description as string) || null,
    brand: brandName,
    brandId: (p.brand_id as string) || null,
    priceCents,
    compareAtPriceCents,
    salePriceCents: isOnSale ? priceCents : null,
    isOnSale,
    media,
    image: media[0]?.url ?? null,
    alt: media[0]?.alt_text ?? String(p.name ?? ""),
    stock: variantRows.some((v) => v.in_stock !== false) ? 99 : 0,
    ecommerceEnabled: true,
    active: true,
    featured: p.is_featured === true,
    badge: p.is_new === true ? "NEW" : p.is_best_seller === true ? "BEST SELLER" : null,
    visible: true,
    categoryId: null,
    category,
    specs: (p.specifications as string) || null,
    materials: null,
    ingredients: null,
    directions: (p.directions as string) || null,
    warranty: null,
    stripeProductId: null,
    stripePriceId: null,
    sortOrder: 0,
    createdAt: (p.created_at as string) ?? new Date().toISOString(),
    updatedAt: (p.updated_at as string) ?? new Date().toISOString(),
  } as unknown as import("@/lib/enterprise/catalog").CatalogProduct
}
