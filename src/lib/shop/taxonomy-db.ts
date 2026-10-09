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
import { cached, invalidate } from "@/lib/cache"
import { SHOP_NAV_TAXONOMY } from "@/lib/shop-nav"

// FACET/Grid TTLs — these reads hit the REMOTE Supabase over the pooler, so
// every uncached view costs a network round trip. Facet definitions and
// counts change only when the owner edits the taxonomy or a feed sync lands,
// so they cache 5 min; PLP grids (scope + filters + page) cache 60 s — long
// enough that a shopper paging through a category pays the query once, short
// enough that stock/price edits land within a minute. Feed-sync / admin
// product writes call invalidateTaxonomyCache().
const FACET_TTL_MS = 5 * 60 * 1000
const GRID_TTL_MS = 60 * 1000

export function invalidateTaxonomyCache(): void {
  invalidate("tax:")
}

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
  /** Selection-function hero (category-imagery pipeline); null until run. */
  heroImageUrl: string | null
}

export type TaxGroup = {
  id: string
  slug: string
  name: string
  nodeType: string
  subcategories: TaxSub[]
  productCount: number
  heroImageUrl: string | null
}

export type TaxAnimal = {
  id: string
  slug: string
  name: string
  groups: TaxGroup[]
  productCount: number
}

// ----------------------------- Tree ----------------------------------------

type NodeRec = TaxNodeRow & { productCount: number; childCount: number; heroImageUrl: string | null; children: NodeRec[] }

const TREE_TTL_MS = 5 * 60 * 1000
let treeCacheAt = 0
let treeCache: TaxAnimal[] | null = null

async function fetchTree(): Promise<TaxAnimal[]> {
  const nodeRows = await pgQuery<{
    id: string; parent_id: string | null; node_type: string; name: string;
    display_name: string | null; slug: string; depth: number; sort_order: number;
    hero_image_url: string | null;
  }>(
    `SELECT id, parent_id, node_type, name, display_name, slug, depth, sort_order, hero_image_url
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
      heroImageUrl: r.hero_image_url,
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
      heroImageUrl: g.heroImageUrl,
      subcategories: g.children.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.displayName,
        productCount: s.productCount,
        hasChildren: s.children.length > 0,
        heroImageUrl: s.heroImageUrl,
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

/**
 * ANIMAL-SCOPED department aliases — the static nav slugs whose canonical
 * live node differs per animal ("flea-tick-solutions" exists under BOTH cat
 * and dog with different live targets). Checked before GROUP_ALIASES.
 */
const ANIMAL_GROUP_ALIASES: Record<string, string> = {
  // Archived curated nodes → their surviving live twin (the owner retired
  // the curated seeds; old links must follow the products).
  "dog/beds-bedding": "dog-beds",
  "cat/beds-bedding": "cat-beds",
  "dog/treats": "dog-treats",
  // Static-nav slugs whose canonical live node differs per animal.
  "dog/treats-chews": "dog-treats",
  "dog/bowls-feeding-supplies": "bowls-feeding",
  "dog/crates-gates-housing-accessories": "travel-crates",
  "dog/grooming-supplies": "grooming",
  "dog/training-behavior-supplies": "training-behavior",
  "dog/flea-tick-solutions": "flea-tick",
  "cat/treats": "cat-cat-treats",
  "cat/carriers-containment": "carriers-travel",
  "cat/grooming-bathing": "grooming",
  "cat/flea-tick-solutions": "flea-tick",
  "cat/bowls-feeders": "bowls-feeding",
}

/**
 * TWIN DEPARTMENTS — the feed seeded the same concept twice under dog/cat
 * (a supplier-tree node AND the curated seed), and products landed in BOTH
 * (e.g. cat toys: 476 products on `toys`, 354 on `cat-cat-toys`). A route
 * scoped to just one twin silently hides the other half of the aisle.
 *
 * Values are the LIVE sibling slugs whose scopes UNION into the product
 * grid for every member. Routing itself stays on the requested slug —
 * both twins resolve, same content, no redirect ping-pong.
 */
const DEPT_TWINS: Record<string, string[]> = {
  // ---- dog ----
  "dog/food": ["dog-dog-food"],
  "dog/dog-dog-food": ["food"],
  "dog/toys": ["dog-dog-toys"],
  "dog/dog-dog-toys": ["toys"],
  "dog/grooming": ["dog-grooming-supplies"],
  "dog/dog-grooming-supplies": ["grooming"],
  "dog/health-wellness": ["dog-dog-health-wellness"],
  "dog/dog-dog-health-wellness": ["health-wellness"],
  "dog/beds-bedding": ["dog-beds"],
  "dog/dog-beds": ["beds-bedding"],
  "dog/bowls-feeding": ["dog-bowls-feeding"],
  "dog/dog-bowls-feeding": ["bowls-feeding"],
  "dog/cleanup-potty": ["dog-cleanup"],
  "dog/dog-cleanup": ["cleanup-potty"],
  "dog/collars-leashes-harnesses": ["collars-harnesses-leashes"],
  "dog/collars-harnesses-leashes": ["collars-leashes-harnesses"],
  "dog/travel-crates": ["crates-containment"],
  "dog/crates-containment": ["travel-crates"],
  "dog/training-behavior": ["dog-training-behavior-supplies"],
  "dog/dog-training-behavior-supplies": ["training-behavior"],
  "dog/flea-tick": ["dog-flea-tick-solutions-for-dogs"],
  "dog/dog-flea-tick-solutions-for-dogs": ["flea-tick"],
  // ---- cat ----
  "cat/food": ["cat-cat-food"],
  "cat/cat-cat-food": ["food"],
  "cat/toys": ["cat-cat-toys"],
  "cat/cat-cat-toys": ["toys"],
  "cat/grooming": ["cat-grooming-bathing"],
  "cat/cat-grooming-bathing": ["grooming"],
  "cat/health-wellness": ["cat-cat-health-wellness"],
  "cat/cat-cat-health-wellness": ["health-wellness"],
  "cat/beds-bedding": ["cat-beds"],
  "cat/cat-beds": ["beds-bedding"],
  "cat/bowls-feeding": ["bowls-feeders"],
  "cat/bowls-feeders": ["bowls-feeding"],
  "cat/litter": ["cat-litter"],
  "cat/cat-litter": ["litter"],
  "cat/cleanup-potty": ["cat-cleaners-waste-disposal"],
  "cat/cat-cleaners-waste-disposal": ["cleanup-potty"],
  "cat/collars-leashes-harnesses": ["cat-collars-leashes-harnesses"],
  "cat/cat-collars-leashes-harnesses": ["collars-leashes-harnesses"],
  "cat/furniture-scratchers": ["cat-cat-furniture-scratchers"],
  "cat/cat-cat-furniture-scratchers": ["furniture-scratchers"],
  "cat/training-behavior": ["cat-training-behavior"],
  "cat/cat-training-behavior": ["training-behavior"],
  "cat/flea-tick": ["flea-tick-solutions-for-cats"],
  "cat/flea-tick-solutions-for-cats": ["flea-tick"],
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
  // Animal-scoped aliases first ("flea-tick-solutions" means different live
  // nodes under cat vs dog), then the global legacy map, then the raw slug.
  const canonicalGroup =
    ANIMAL_GROUP_ALIASES[`${canonicalAnimal}/${rawGroupSlug}`] ||
    GROUP_ALIASES[rawGroupSlug] ||
    rawGroupSlug
  const group = animal.groups.find((g) => g.slug === canonicalGroup)

  // Twin departments: feed + curated seeds of the same concept — their
  // scopes UNION so the aisle shows every product, whichever twin was hit.
  const twinIds = (DEPT_TWINS[`${animal.slug}/${canonicalGroup}`] ?? [])
    .map((t) => animal.groups.find((g) => g.slug === t)?.id)
    .filter((x): x is string => !!x)

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
      nodeIds: subtreeIds([group.id, ...twinIds], childrenOf),
      deepestHasChildren: group.subcategories.length > 0,
      canonicalPath: aliasedGroup ? `/${["shop", animal.slug, group.slug].join("/")}` : null,
      notFound: false,
    }
  }

  const rawSubSlug = segments[2]
  let sub = group.subcategories.find((s) => s.slug === rawSubSlug) ?? null

  if (!sub) {
    // Not a direct depth-3 child — the slug may be a deeper node (depth-4+)
    // or a supplier-tree variant. BFS the group's subtree (and its twins')
    // for the first published node with this slug so EVERY live slug
    // resolves to a page.
    const seen = new Set<string>([group.id, ...twinIds])
    const stack = [...(nodes.childrenMap.get(group.id) ?? []), ...twinIds.flatMap((t) => nodes.childrenMap.get(t) ?? [])]
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
          heroImageUrl: rec.heroImageUrl,
        }
        break
      }
      for (const c of nodes.childrenMap.get(cur) ?? []) stack.push(c)
    }
  }

  if (!sub) {
    return {
      animal,
      group,
      sub: null,
      nodeIds: subtreeIds([group.id, ...twinIds], childrenOf),
      deepestHasChildren: true,
      canonicalPath: null,
      notFound: true,
    }
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

/**
 * Department product scope — the department's whole subtree UNION its twin
 * departments' subtrees (feed + curated seeds of the same concept carry
 * products in both; a single-node scope silently hides half the aisle).
 * DepartmentPage / SubcategoryPage build their grids from this.
 */
export async function deptScopeNodeIds(
  animalSlug: string,
  deptSlug: string,
  deptId: string,
): Promise<string[]> {
  const [nodes, tree] = await Promise.all([getNodeIndex(), getTaxonomyTree()])
  const animal = tree.find((a) => a.slug === animalSlug)
  const twinIds = (DEPT_TWINS[`${animalSlug}/${deptSlug}`] ?? [])
    .map((t) => animal?.groups.find((g) => g.slug === t)?.id)
    .filter((x): x is string => !!x)
  const out = new Set<string>([deptId, ...twinIds])
  const stack = [deptId, ...twinIds]
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
  byId: Map<string, { id: string; slug: string; name: string; display_name: string | null; parentId: string | null; heroImageUrl: string | null }>
  childrenMap: Map<string, string[]>
}
let nodeIndexCache: NodeIndex | null = null
let nodeIndexAt = 0

async function getNodeIndex(): Promise<NodeIndex> {
  if (nodeIndexCache && Date.now() - nodeIndexAt < TREE_TTL_MS) return nodeIndexCache
  const rows = await pgQuery<{ id: string; parent_id: string | null; name: string; display_name: string | null; slug: string; hero_image_url: string | null }>(
    `SELECT id, parent_id, name, display_name, slug, hero_image_url FROM taxonomy_nodes WHERE status = 'published'`,
  )
  const byId = new Map<string, { id: string; slug: string; name: string; display_name: string | null; parentId: string | null; heroImageUrl: string | null }>()
  const childrenMap = new Map<string, string[]>()
  for (const r of rows) {
    byId.set(r.id, { id: r.id, slug: r.slug, name: r.display_name || r.name, display_name: r.display_name, parentId: r.parent_id, heroImageUrl: r.hero_image_url })
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
  "best-selling": `is_best_seller DESC NULLS LAST, review_n DESC NULLS LAST, created_at DESC`,
  "newest": `created_at DESC`,
  "price-asc": `price ASC NULLS LAST`,
  "price-desc": `price DESC NULLS LAST`,
  "top-rated": `review_avg DESC NULLS LAST, review_n DESC NULLS LAST`,
}

// The grid resolves from a ranked subquery: products are scoped (taxonomy
// subtree), filtered (price/rating/facets/q), then DEDUPED to one card per
// variant group (variant_group_key — same physical item shipped as multiple
// color/size/price listings). The canonical card is the best-selling /
// best-reviewed / cheapest listing; its siblings surface as PDP "other
// options" swatches instead of duplicate grid cards.
const PLP_ROWS_SQL = `
  WITH RECURSIVE sub AS (
    SELECT id FROM taxonomy_nodes WHERE id = ANY($1::uuid[])
    UNION ALL
    SELECT n.id FROM taxonomy_nodes n JOIN sub s ON n.parent_id = s.id
  ),
  scope AS (
    SELECT pn.product_id FROM product_nodes pn JOIN sub ON sub.id = pn.node_id
    UNION
    SELECT p.id FROM products p JOIN sub ON sub.id = p.category_id WHERE p.status = 'published'
  ),
  filtered AS (
    SELECT p.id, p.slug, COALESCE(p.title, p.name) AS name, p.brand,
           p.is_sale, p.is_new, p.is_best_seller, p.created_at,
           v.price, v.compare_at, v.in_stock,
           m.url AS image,
           review.n AS review_n, review.avg AS review_avg,
           COALESCE(p.variant_group_key, p.id::text) AS gkey
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
     WHERE p.status = 'published'
  ),
  ranked AS (
    SELECT *, row_number() OVER (
      PARTITION BY gkey
      ORDER BY is_best_seller DESC NULLS LAST, review_n DESC NULLS LAST,
               price ASC NULLS LAST, created_at DESC
    ) AS rn
      FROM filtered
  )`

const SCOPE_COUNT_SQL = `
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
  SELECT count(DISTINCT COALESCE(p.variant_group_key, p.id::text))::int AS n
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

/**
 * Column aliases for buildWhere. The same WHERE text is reused against two
 * shapes — the raw products join (default aliases) and the deduped `ranked`
 * CTE (bare columns). Column identifiers here are code constants, never
 * user input.
 */
const WHERE_COLS_DEFAULT = {
  price: "v.price",
  inStock: "v.in_stock",
  ratingAvg: "review.avg",
  title: "p.title",
  name: "p.name",
  brand: "p.brand",
  id: "p.id",
}
const WHERE_COLS_RANKED = {
  price: "price",
  inStock: "in_stock",
  ratingAvg: "review_avg",
  title: "title",
  name: "name",
  brand: "brand",
  id: "id",
}

type WhereCols = typeof WHERE_COLS_DEFAULT

function buildWhere(
  filters: { minPrice?: number; maxPrice?: number; priceBucket?: string | null; rating?: number | null; availability?: string[]; q?: string | null; brands?: string[]; facets?: Record<string, string[]> },
  params: unknown[],
  cols: WhereCols = WHERE_COLS_DEFAULT,
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
      if (b[0] != null) clauses.push(`${cols.price} >= $${params.push(b[0])}`)
      if (b[1] != null) clauses.push(`${cols.price} < $${params.push(b[1])}`)
    }
  }
  if (filters.minPrice != null) {
    const c = cents(filters.minPrice)
    if (c != null) clauses.push(`${cols.price} >= $${params.push(c)}`)
  }
  if (filters.maxPrice != null) {
    const c = cents(filters.maxPrice)
    if (c != null) clauses.push(`${cols.price} <= $${params.push(c)}`)
  }
  if (filters.rating != null && Number.isFinite(Number(filters.rating))) {
    clauses.push(`${cols.ratingAvg} >= $${params.push(Number(filters.rating))}`)
  }
  if (filters.availability && filters.availability.length > 0 && filters.availability.length < 2) {
    clauses.push(filters.availability[0] === "in-stock" ? `${cols.inStock} = true` : `${cols.inStock} = false`)
  }
  if (filters.q && filters.q.trim().length >= 2) {
    const tokens = filters.q.trim().toLowerCase().split(/\s+/).slice(0, 6)
    for (const t of tokens) {
      clauses.push(`(LOWER(COALESCE(${cols.title}, ${cols.name})) LIKE $${params.push("%" + t + "%")} OR LOWER(COALESCE(${cols.brand}, '')) LIKE $${params.push("%" + t + "%")})`)
    }
  }
  if (filters.brands && filters.brands.length > 0) {
    const list = filters.brands.map((b) => b.toLowerCase())
    clauses.push(`LOWER(COALESCE(${cols.brand}, '')) = ANY($${params.push(list)}::text[])`)
  }
  // ---- Attribute facets (Size, Flavor, Material, …) ----
  // Values arrive as attribute_value slugs (from the owner's node_filter
  // values). A product matches an attribute when ANY selected value matches:
  //   1. canonical — product_attribute_values (exact, as attribute data lands)
  //   2. variant_title / product name text — the feed populates variant_title
  //      today (11.3k rows), so "size=large" matches "…Large" listings. The
  //      slug is matched as a flexible pattern ("extra-large" → "extra%large").
  //   3. size/color ALSO match product_variants.option_size/option_color.
  // Different facets AND together; values within one facet OR.
  if (filters.facets) {
    for (const [key, values] of Object.entries(filters.facets)) {
      if (!Array.isArray(values) || values.length === 0) continue
      const clean = values.map((v) => String(v).toLowerCase().slice(0, 80)).filter(Boolean)
      if (clean.length === 0) continue
      const pIdx = params.push(clean)
      const pavClause = `EXISTS (
        SELECT 1 FROM product_attribute_values pav
        JOIN attribute_values av ON av.id = pav.attribute_value_id
        JOIN attributes fa ON fa.id = pav.attribute_id
       WHERE pav.product_id = ${cols.id} AND fa.slug = $${params.push(key)} AND av.slug = ANY($${pIdx}::text[]))`
      const perValue: string[] = [pavClause]
      // Text fallback — one pattern per selected value (code-side, safe).
      for (const v of clean) {
        if (v.replace(/[^a-z0-9]/g, "").length < 3) continue
        const like = `%${v.replace(/-/g, "%")}%`
        const lIdx = params.push(like)
        perValue.push(
          `EXISTS (SELECT 1 FROM product_variants vvt WHERE vvt.product_id = ${cols.id} AND vvt.variant_title ILIKE $${lIdx})`,
          `(${cols.name} ILIKE $${lIdx})`,
        )
      }
      if (key === "size" || key === "color") {
        // Identifier is from the fixed pair above — never user input.
        const colName = key === "size" ? "option_size" : "option_color"
        const norm = clean.map((v) => v.replace(/[^a-z0-9]/g, ""))
        const nIdx = params.push(norm)
        perValue.push(`EXISTS (
        SELECT 1 FROM product_variants vv
       WHERE vv.product_id = ${cols.id}
         AND vv.${colName} IS NOT NULL
         AND lower(regexp_replace(vv.${colName}, '[^a-z0-9]', '', 'g')) = ANY($${nIdx}::text[]))`)
      }
      clauses.push(`(${perValue.join(" OR ")})`)
    }
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
  filters?: { minPrice?: number; maxPrice?: number; priceBucket?: string | null; rating?: number | null; availability?: string[]; q?: string | null; brands?: string[]; facets?: Record<string, string[]> }
}): Promise<TaxQueryResult> {
  const perPage = Math.max(1, Math.min(48, opts.perPage ?? 12))
  const page = Math.max(1, opts.page ?? 1)
  const sort = SORT_SQL[opts.sort || "best-selling"] ? (opts.sort || "best-selling") : "best-selling"

  // Grid cache — identical (scope, sort, page, filter) requests within the
  // TTL reuse the same result. Key includes every filter dimension.
  const cacheKey = `tax:grid:${[...opts.nodeIds].sort().join(",")}|${sort}|${page}|${perPage}|${JSON.stringify(opts.filters ?? {})}`
  return cached(cacheKey, GRID_TTL_MS, async () => {
    const params: unknown[] = [opts.nodeIds]
  const orderBy = SORT_SQL[sort]
  const offset = (page - 1) * perPage

    const [rows, countRows] = await Promise.all([
      pgQuery<Record<string, unknown>>(
        PLP_ROWS_SQL +
        ` SELECT id, slug, name, brand, is_sale, is_new, is_best_seller, created_at,
               price, compare_at, in_stock, image, review_n, review_avg
          FROM ranked
         WHERE rn = 1` +
        buildWhere(opts.filters ?? {}, params, WHERE_COLS_RANKED) +
        ` ORDER BY ${orderBy} LIMIT ${perPage} OFFSET ${offset}`,
        params,
      ),
      pgQuery<{ n: number }>(SCOPE_COUNT_SQL + buildWhere(opts.filters ?? {}, params), params),
    ])

    const total = Number(countRows[0]?.n) || 0
    const pages = Math.max(1, Math.ceil(total / perPage))
    return {
      items: rows.map(mapProduct),
      total,
      page: Math.min(page, pages),
      pages,
    }
  })
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
  // Facet counts scope to the FULL node set — cache keyed on the sorted ids.
  const key = `tax:facets:${[...nodeIds].sort().join(",")}`
  return cached(key, FACET_TTL_MS, async () => {
  const rows = await pgQuery<{
    brand: string | null; price: number | null; in_stock: boolean | null;
    review_n: number; review_avg: number | null;
  }>(
    PLP_ROWS_SQL + `
     SELECT brand, price, in_stock, review_n, review_avg FROM ranked WHERE rn = 1`,
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
  })
}

// ----------------------- Node facet sections (owner translation layer) ------
//
// The owner built the attribute→frontend translation IN THE DATABASE:
//   • node_filters     — WHICH attribute facets apply to WHICH node
//                        (+ per-filter UI contract: is_searchable,
//                         is_expanded_default, ui_toggle, sort_order)
//   • node_filter_values — the canonical filter OPTIONS per node filter
//   • attributes / attribute_values — the canonical attribute + value names
//
// This is the source of truth for the PLP sidebar. Do NOT substitute a
// generic computed facet rail for it — that was the mistake this function
// exists to undo. Brand / Price / Customer Rating are excluded here because
// the PLP renders those as live-computed sections (real product-backed
// counts); every other attribute renders straight from these rows.

export type NodeFacetSection = {
  /** URL facet key — attribute slug (e.g. "material", "food-form"). */
  key: string
  /** Customer-facing section label (e.g. "Material", "Food Form"). */
  label: string
  options: { value: string; label: string }[]
  /** Render the search-within-facet input (owner flag from node_filters). */
  searchable: boolean
  /** Collapse options past defaultVisible behind a "Show all" toggle. */
  collapsible: boolean
  defaultVisible: number
}

const GENERIC_ATTR_SLUGS = new Set(["brand", "price", "customer-rating"])

export async function getNodeFacetSections(rootId: string): Promise<NodeFacetSection[]> {
  if (!rootId) return []
  // The owner's node_filters view is edited rarely — 5 min TTL per root.
  return cached(`tax:nodesections:${rootId}`, FACET_TTL_MS, async () => {

  // The owner builds the attribute→frontend translation IN THE DATABASE:
  //   • node_filters        — WHICH attribute applies WHERE (+ UI contract)
  //   • node_filter_values  — the canonical OPTIONS per node filter
  //   • v_node_filter_spec  — the read model: for EVERY node it resolves the
  //     EFFECTIVE filter definition (effective_filter_node(): the node's own
  //     filters, else the nearest ancestor that has any — animal roots carry
  //     the store-wide sets, e.g. Dog: Size / Breed Size / Flavor / …).
  //
  // This view IS the owner's facet update mechanism — the previous code
  // re-implemented inheritance by hand and got it wrong (it stopped at
  // depth ≥ 2, so the animal-root facet sets never rendered and feed-tree
  // pages like /shop/dog/dog-treats/* showed no attribute facets at all).
  // Brand / Price / Customer Rating stay live-computed (real product-backed
  // counts); every other attribute renders straight from these rows.
  const rows = await pgQuery<{
    query_param: string
    filter: string
    sort_order: number
    is_searchable: boolean | null
    is_expanded_default: boolean | null
    allowed_values: { value: string; slug: string }[] | null
  }>(
    `SELECT query_param, filter, sort_order, is_searchable, is_expanded_default, allowed_values
       FROM v_node_filter_spec
      WHERE node_id = $1::uuid
      ORDER BY sort_order`,
    [rootId],
  )

  const sections: NodeFacetSection[] = [] // (cached per rootId)
  for (const r of rows) {
    // Generic facets are computed live from the product set — skip the
    // scaffold rows here so they never render twice.
    if (GENERIC_ATTR_SLUGS.has(r.query_param)) continue
    const options = (r.allowed_values ?? [])
      .filter((v) => v.slug && v.value)
      .map((v) => ({ value: v.slug, label: v.value }))
    if (options.length === 0) continue
    sections.push({
      key: r.query_param,
      label: r.filter,
      options,
      searchable: r.is_searchable ?? false,
      collapsible: options.length > 6,
      defaultVisible: (r.is_expanded_default ?? false) ? options.length : 6,
    })
  }
  return sections
  })
}

// ----------------------------- Nav conversion ------------------------------

/**
 * Reverse alias lookup: which STATIC nav key (`<animal>/<dept>` as used by
 * the static SHOP_NAV_TAXONOMY) routes to this live department slug?
 *
 * The client islands render the owner's static tree but link LIVE slugs —
 * this join is what lets /api/shop/nav annotate every department with its
 * static key so a static panel and its live links meet without the client
 * duplicating the alias maps.
 */
let _staticDeptSlugs: Map<string, Set<string>> | null = null
function getStaticDeptSlugs(): Map<string, Set<string>> {
  if (_staticDeptSlugs) return _staticDeptSlugs
  const map = new Map<string, Set<string>>()
  for (const a of SHOP_NAV_TAXONOMY) {
    map.set(a.slug, new Set(a.departments.map((d) => d.slug)))
  }
  _staticDeptSlugs = map
  return map
}

export function staticDeptKeyForLive(animalSlug: string, liveDeptSlug: string): string {
  const staticSlugs = getStaticDeptSlugs().get(animalSlug)
  const has = (s: string | undefined): boolean => !!s && !!staticSlugs?.has(s)

  // 1) The live slug is itself a static slug for this animal (dog/toys,
  //    cat/food, fish/aquatics, reptile/reptile, …).
  if (has(liveDeptSlug)) return liveDeptSlug
  // 2) It's an alias TARGET → the alias source is the static key
  //    (dog-treats ← dog/treats-chews; travel-crates ← crates-containment).
  for (const [k, v] of Object.entries(ANIMAL_GROUP_ALIASES)) {
    if (v === liveDeptSlug && k.startsWith(animalSlug + "/")) return k.split("/")[1]
  }
  for (const [k, v] of Object.entries(GROUP_ALIASES)) {
    if (v === liveDeptSlug && has(k)) return k
  }
  // 3) Twin pairs — the surviving static side of the pair.
  for (const t of DEPT_TWINS[`${animalSlug}/${liveDeptSlug}`] ?? []) {
    if (has(t)) return t
  }
  for (const [k, vs] of Object.entries(DEPT_TWINS)) {
    if (k.startsWith(animalSlug + "/") && vs.includes(liveDeptSlug)) {
      const kSlug = k.split("/")[1]
      if (has(kSlug)) return kSlug
    }
  }
  return liveDeptSlug
}

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

/** Mini recommendation card — the shared rail card contract. */
export type MiniRec = {
  id: string
  slug: string
  name: string
  brand: string | null
  image: string | null
  priceCents: number | null
  isBestseller: boolean
  isOnSale: boolean
  isNew: boolean
}

/** One swatch in a Chewy-style option picker ("Flavor: …", "Size: …"). */
export type PdpOption = {
  productId: string
  slug: string
  label: string
  priceCents: number | null
  image: string | null
  inStock: boolean
  isCurrent: boolean
}

export type PdpReview = {
  id: string
  author: string
  rating: number
  title: string | null
  body: string | null
  createdAt: string | null
  verified: boolean
}

export type PdpQa = { question: string; answer: string }

export type PdpArticle = { title: string; href: string; blurb: string | null }

export type PdpBreadcrumb = { name: string; path: string }

/**
 * Everything the dense PDP renders, in ONE resolved object:
 * identity + copy (description / ingredients / directions / warranty /
 * specifications), pricing, variant pickers, purchase programs (autoship /
 * one-time / pickup / delivery), reviews, Q&A, associated articles and the
 * four recommendation rails. Built in ≤7 indexed queries and cached 60s so a
 * burst of product views costs the pool one query per slug per minute.
 */
export type PdpData = {
  /** Feed catalog products: raw uuid. Legacy enterprise products: their id. */
  id: string
  /** True when this came from the live feed catalog (products table). */
  source: "feed" | "legacy"
  slug: string
  name: string
  brand: string | null
  brandId: string | null
  shortDescription: string | null
  description: string | null
  ingredients: string | null
  directions: string | null
  warranty: string | null
  specifications: string | null
  priceCents: number | null
  compareAtPriceCents: number | null
  isOnSale: boolean
  isNew: boolean
  isBestseller: boolean
  inStock: boolean
  ratingAvg: number | null
  ratingCount: number
  reviews: PdpReview[]
  media: { url: string; alt: string | null }[]
  breadcrumb: PdpBreadcrumb[]
  /** "Dog" | "Cat" | … — powers pet-scoped rails and article matching. */
  petKind: string | null
  /** The product's own variant rows (size/color picks within one listing). */
  ownVariants: PdpOption[]
  /** Same-item sibling listings (variant_group_key group) — the other cards. */
  siblingOptions: PdpOption[]
  /** Chewy-style "Frequently bought together" (2 companions, same category). */
  frequentlyBoughtTogether: MiniRec[]
  /** "Customers also bought" — same category, 6. */
  alsoBought: MiniRec[]
  /** "More from this brand" — 6. */
  alsoViewed: MiniRec[]
  /** Best sellers scoped to the product's animal (Best sellers for your pet). */
  bestSellersForPet: MiniRec[]
  /** Storewide trending picks (Trending products). */
  trending: MiniRec[]
  /** Associated grooming/care articles (guides). */
  articles: PdpArticle[]
  /** Q&A composed from the product's own published copy. */
  qa: PdpQa[]
  /** Autoship program (site-wide policy, consistent with the PLP banners). */
  autoship: { firstOrderPct: number; firstOrderCapCents: number; ongoingPct: number }
}

const AUTOSHIP = { firstOrderPct: 35, firstOrderCapCents: 2000, ongoingPct: 5 }

// ----------------------------- PDP cache -----------------------------------

const PDP_TTL_MS = 60_000
const pdpCache = new Map<string, { at: number; data: PdpData | null }>()

// ----------------------------- QA composer ---------------------------------

/**
 * Q&A pairs derived from the product's OWN published copy — never invented
 * (answers quote/paraphrase specifications, directions, warnings). Products
 * without copy get the store-operations pair only.
 */
function composeQa(p: {
  name: string
  brand: string | null
  specifications: string | null
  directions: string | null
  warnings: string | null
  shortDescription: string | null
  inStock: boolean
}): PdpQa[] {
  const qa: PdpQa[] = []
  const specs = (p.specifications ?? "").split("·").map((s) => s.trim()).filter(Boolean)
  if (specs.length > 0) {
    qa.push({
      question: `What are the key details of this product?`,
      answer: specs.slice(0, 3).join(" · "),
    })
  }
  if (p.directions) {
    qa.push({
      question: `How do I use the ${p.brand ? p.brand + " " : ""}${p.name}?`,
      answer: p.directions.split(/(?<=\.)\s+/).slice(0, 2).join(" ").slice(0, 320),
    })
  }
  if (p.warnings) {
    qa.push({ question: `Is there anything I should know before ordering?`, answer: p.warnings.slice(0, 300) })
  }
  qa.push({
    question: `Can I pick this up at the Memphis shop instead of shipping?`,
    answer: `Yes — order online and choose in-store pickup at 699 Waring Rd, Memphis, TN. We'll text you when it's ready (usually within 2 hours during store hours).`,
  })
  if (!p.inStock) {
    qa.push({
      question: `When will this be back in stock?`,
      answer: `This item is currently on backorder with our supplier. Autoship customers get priority when stock arrives — sign up and we'll ship it as soon as it lands.`,
    })
  }
  return qa.slice(0, 4)
}

// ----------------------------- Feed PDP ------------------------------------

const RAIL_SELECT = `
  SELECT p2.id::text AS id, p2.slug, COALESCE(p2.title, p2.name) AS name,
         p2.brand, p2.is_best_seller, p2.is_sale, p2.is_new,
         (SELECT url FROM product_media mm WHERE mm.product_id = p2.id AND mm.media_type = 'image' ORDER BY mm.sort_order ASC LIMIT 1) AS image,
         (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p2.id AND v.status = 'active' AND v.price IS NOT NULL) AS price
    FROM products p2`

function toMini(r: Record<string, unknown>): MiniRec {
  const price = r.price != null ? Number(r.price) : NaN
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    brand: (r.brand as string) || null,
    image: (r.image as string) || null,
    priceCents: Number.isFinite(price) && price > 0 ? Math.round(price * 100) : null,
    isBestseller: r.is_best_seller === true,
    isOnSale: r.is_sale === true,
    isNew: r.is_new === true,
  }
}

export async function getTaxPdpData(slug: string): Promise<PdpData | null> {
  const key = slug.toLowerCase()
  const hit = pdpCache.get(key)
  if (hit && Date.now() - hit.at < PDP_TTL_MS) return hit.data

  const data = await buildTaxPdpData(slug)
  pdpCache.set(key, { at: Date.now(), data })
  if (pdpCache.size > 400) {
    // Bound the cache — drop the oldest third.
    const keys = [...pdpCache.keys()].slice(0, Math.floor(pdpCache.size / 3))
    for (const k of keys) pdpCache.delete(k)
  }
  return data
}

async function buildTaxPdpData(slug: string): Promise<PdpData | null> {
  // 1 — the product row.
  const rows = await pgQuery<Record<string, unknown>>(
    `SELECT p.id, p.slug, COALESCE(p.title, p.name) AS name,
            p.short_description, p.details, p.specifications, p.directions, p.warnings,
            p.brand, p.brand_id, p.is_new, p.is_sale, p.is_best_seller,
            p.category_id, p.variant_group_key, p.created_at
       FROM products p
      WHERE p.slug = $1 AND p.status = 'published'
      LIMIT 1`,
    [slug],
  )
  const p = rows[0]
  if (!p) return null

  const groupKey = (p.variant_group_key as string | null) ?? null
  const uuid = String(p.id)

  // 2 — everything else. Each query is indexed and independent; the pool
  // serializes at most 5 at a time (session-pooler budget).
  const [variantRows, mediaRows, siblingRows, catRows, reviewAgg, reviewRows, railRows] =
    await Promise.all([
      pgQuery<{ id: string; name_suffix: string | null; variant_title: string | null; option_size: string | null; option_color: string | null; price: unknown; compare_at_price: unknown; in_stock: boolean | null }>(
        `SELECT id, name_suffix, variant_title, option_size, option_color, price, compare_at_price, in_stock
           FROM product_variants
          WHERE product_id = $1 AND status = 'active'
          ORDER BY price ASC NULLS LAST LIMIT 24`,
        [uuid],
      ),
      pgQuery<{ url: string; alt_text: string | null }>(
        `SELECT url, alt_text FROM product_media
          WHERE product_id = $1 AND media_type = 'image' ORDER BY sort_order ASC LIMIT 8`,
        [uuid],
      ),
      // Same-item siblings via variant_group_key; without a key fall back to
      // exact name+brand (the backfilled key is the norm — 10.6k/10.7k rows).
      groupKey
        ? pgQuery<Record<string, unknown>>(
            RAIL_SELECT + `
           WHERE p2.status = 'published' AND p2.id <> $1::uuid AND p2.variant_group_key = $2
           ORDER BY (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = p2.id AND v.status='active') ASC NULLS LAST
           LIMIT 11`,
            [uuid, groupKey],
          )
        : Promise.resolve([] as Record<string, unknown>[]),
      // Breadcrumb chain: the product's node + every ancestor, one CTE.
      p.category_id
        ? pgQuery<{ id: string; name: string; display_name: string | null; slug: string; depth: number }>(
            `WITH RECURSIVE up AS (
               SELECT id, parent_id, name, display_name, slug, depth
                 FROM taxonomy_nodes WHERE id = $1::uuid
               UNION ALL
               SELECT tn.id, tn.parent_id, tn.name, tn.display_name, tn.slug, tn.depth
                 FROM taxonomy_nodes tn JOIN up ON tn.id = up.parent_id
             )
             SELECT id, name, display_name, slug, depth FROM up WHERE depth >= 1 ORDER BY depth`,
            [p.category_id],
          )
        : Promise.resolve([]),
      pgQuery<{ n: number; avg: number | null }>(
        `SELECT count(*)::int AS n, avg(rating) AS avg FROM product_reviews
          WHERE "productId" = $1 AND visible = true`,
        [uuid],
      ),
      pgQuery<{ id: string; author: string; rating: number; title: string | null; body: string | null; created_at: string | null; verified: boolean | null }>(
        `SELECT id, author, rating, title, body, "createdAt"::text AS created_at, verified
           FROM product_reviews
          WHERE "productId" = $1 AND visible = true
          ORDER BY "createdAt" DESC NULLS LAST LIMIT 6`,
        [uuid],
      ),
      Promise.all([
        // Frequently bought together — same category, different product (3).
        p.category_id
          ? pgQuery<Record<string, unknown>>(
              RAIL_SELECT + `
             WHERE p2.status = 'published' AND p2.id <> $1::uuid AND p2.category_id = $2::uuid
             ORDER BY p2.is_best_seller DESC NULLS LAST, p2.created_at DESC LIMIT 3`,
              [uuid, p.category_id],
            )
          : Promise.resolve([] as Record<string, unknown>[]),
        // Customers also bought — same category, 6.
        p.category_id
          ? pgQuery<Record<string, unknown>>(
              RAIL_SELECT + `
             WHERE p2.status = 'published' AND p2.id <> $1::uuid AND p2.category_id = $2::uuid
             ORDER BY p2.is_best_seller DESC NULLS LAST, p2.created_at DESC LIMIT 6`,
              [uuid, p.category_id],
            )
          : Promise.resolve([] as Record<string, unknown>[]),
        // More from this brand — 6.
        p.brand_id
          ? pgQuery<Record<string, unknown>>(
              RAIL_SELECT + `
             WHERE p2.status = 'published' AND p2.id <> $1::uuid AND p2.brand_id = $2::uuid
             ORDER BY p2.is_best_seller DESC NULLS LAST, p2.created_at DESC LIMIT 6`,
              [uuid, p.brand_id],
            )
          : Promise.resolve([] as Record<string, unknown>[]),
        // Best sellers for your pet — needs the animal scope, resolved below.
        Promise.resolve(null as null),
      ]),
    ])

  // Animal scope for "Best sellers for your pet": walk up from category_id.
  let petKind: string | null = null
  let animalNodeSlug: string | null = null
  for (const c of catRows) {
    if (c.depth === 1) {
      petKind = (c.display_name || c.name) || null
      animalNodeSlug = c.slug
    }
  }
  let bestSellersForPet: MiniRec[] = []
  if (animalNodeSlug) {
    const bsRows = await pgQuery<Record<string, unknown>>(
      `WITH RECURSIVE sub AS (
         SELECT id FROM taxonomy_nodes WHERE slug = $1 AND depth = 1
         UNION ALL
         SELECT n.id FROM taxonomy_nodes n JOIN sub s ON n.parent_id = s.id
       ),
       scope AS (
         SELECT pn.product_id FROM product_nodes pn JOIN sub ON sub.id = pn.node_id
         UNION
         SELECT pp.id FROM products pp JOIN sub ON sub.id = pp.category_id WHERE pp.status = 'published'
       )
       ${RAIL_SELECT}
       JOIN scope ON scope.product_id = p2.id
      WHERE p2.status = 'published' AND p2.is_best_seller = true AND p2.id <> $2::uuid
      ORDER BY p2.created_at DESC LIMIT 6`,
      [animalNodeSlug, uuid],
    )
    bestSellersForPet = bsRows.map(toMini)
  }

  // Trending — newest with media storewide (deterministic proxy for the
  // trending module until the analytics rollup lands).
  const trendingRows = await pgQuery<Record<string, unknown>>(
    RAIL_SELECT + `
     WHERE p2.status = 'published' AND p2.id <> $1::uuid
       AND EXISTS (SELECT 1 FROM product_media mm WHERE mm.product_id = p2.id AND mm.media_type = 'image')
     ORDER BY p2.is_new DESC NULLS LAST, p2.is_featured DESC NULLS LAST, p2.created_at DESC
     LIMIT 6`,
    [uuid],
  )

  // ---- Pricing ----
  const prices = variantRows.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0)
  const priceCents = prices.length ? Math.round(Math.min(...prices) * 100) : null
  const compares = variantRows
    .map((v) => (v.compare_at_price != null ? Number(v.compare_at_price) : null))
    .filter((n): n is number => n != null && Number.isFinite(n) && Math.round(n * 100) > (priceCents ?? 0))
  const compareAtPriceCents = compares.length ? Math.round(Math.min(...compares) * 100) : null
  const isOnSale = compareAtPriceCents != null && priceCents != null && compareAtPriceCents > priceCents

  // ---- Breadcrumb path assembly: depth-1/2 slugs join as the canonical
  // /shop/<animal>/<dept> route; the leaf name closes the trail. ----
  const breadcrumb: PdpBreadcrumb[] = []
  const byDepth = new Map<number, { name: string; slug: string }>()
  for (const c of catRows) byDepth.set(c.depth, { name: (c.display_name || c.name) ?? "", slug: c.slug })
  const a = byDepth.get(1)
  const d = byDepth.get(2)
  breadcrumb.push({ name: "Shop", path: "/shop" })
  if (a) breadcrumb.push({ name: a.name, path: `/shop/${a.slug}` })
  if (d && a) breadcrumb.push({ name: d.name, path: `/shop/${a.slug}/${d.slug}` })

  // ---- Options ----
  const inStockByPrice = variantRows.some((v) => v.in_stock !== false)
  const labelFor = (r: { name_suffix: string | null; variant_title: string | null; option_size: string | null; option_color: string | null; price: unknown }) =>
    (r.variant_title || r.name_suffix || [r.option_color, r.option_size].filter(Boolean).join(" · ") || "").trim() ||
    (r.price != null ? `$${Number(r.price).toFixed(2)}` : "Option")
  const ownVariants: PdpOption[] = variantRows.slice(0, 12).map((v) => ({
    productId: uuid,
    slug,
    label: labelFor(v),
    priceCents: Number.isFinite(Number(v.price)) && Number(v.price) > 0 ? Math.round(Number(v.price) * 100) : null,
    image: null,
    inStock: v.in_stock !== false,
    isCurrent: false,
  }))
  const siblingOptions: PdpOption[] = siblingRows.slice(0, 11).map((r) => {
    const rec = toMini(r)
    return {
      productId: rec.id,
      slug: rec.slug,
      label: rec.name,
      priceCents: rec.priceCents,
      image: rec.image,
      inStock: true,
      isCurrent: false,
    }
  })

  const [fbt, alsoBoughtRows, alsoViewedRows] = railRows as unknown as [
    Record<string, unknown>[],
    Record<string, unknown>[],
    Record<string, unknown>[],
  ]

  const data: PdpData = {
    id: uuid,
    source: "feed",
    slug: String(p.slug),
    name: String(p.name ?? ""),
    brand: (p.brand as string) || null,
    brandId: (p.brand_id as string) || null,
    shortDescription: (p.short_description as string) || null,
    description: (p.details as string) || null,
    ingredients: null,
    directions: (p.directions as string) || null,
    warranty: null,
    specifications: (p.specifications as string) || null,
    priceCents,
    compareAtPriceCents: isOnSale ? compareAtPriceCents : null,
    isOnSale,
    isNew: p.is_new === true,
    isBestseller: p.is_best_seller === true,
    inStock: inStockByPrice,
    ratingAvg: reviewAgg[0]?.avg != null ? Math.round(Number(reviewAgg[0].avg) * 10) / 10 : null,
    ratingCount: Number(reviewAgg[0]?.n) || 0,
    reviews: reviewRows.map((r) => ({
      id: String(r.id),
      author: String(r.author ?? "Pet parent"),
      rating: Number(r.rating) || 0,
      title: r.title ?? null,
      body: r.body ?? null,
      createdAt: r.created_at ?? null,
      verified: r.verified !== false,
    })),
    media: mediaRows.map((m) => ({ url: m.url, alt: m.alt_text })),
    breadcrumb,
    petKind,
    ownVariants,
    siblingOptions,
    frequentlyBoughtTogether: fbt.map(toMini).filter((m) => m.priceCents != null),
    alsoBought: alsoBoughtRows.map(toMini),
    alsoViewed: alsoViewedRows.map(toMini),
    bestSellersForPet,
    trending: trendingRows.map(toMini),
    articles: [],
    qa: composeQa({
      name: String(p.name ?? ""),
      brand: (p.brand as string) || null,
      specifications: (p.specifications as string) || null,
      directions: (p.directions as string) || null,
      warnings: (p.warnings as string) || null,
      shortDescription: (p.short_description as string) || null,
      inStock: inStockByPrice,
    }),
    autoship: AUTOSHIP,
  }
  return data
}
