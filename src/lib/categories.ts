import "server-only"
import { cache } from "react"
import { repo, type Row } from "./repo"

// ---------------------------------------------------------------------------
// Pet product category taxonomy + filter framework.
//
// Tables (supabase/migrations/0004):
//   pet_product_categories     — 3-level tree (root > department > leaf)
//   pet_product_filters        — filter definitions (global + category scoped)
//   pet_product_filter_values  — selectable values per filter
//   pet_category_filters       — which filters appear on which categories
//
// products."categoryId" -> pet_product_categories.id (leaf assignment).
// ---------------------------------------------------------------------------

export type CategoryNode = {
  id: number
  name: string
  slug: string
  parentId: number | null
  productCount: number
  children: CategoryNode[]
}

export type FilterValue = {
  id: number
  name: string
  slug: string
  /** Reference facet count rendered verbatim; null = no count label. */
  count?: number | null
  /** Reference presentation state — renders checked on first paint. */
  checked?: boolean
  /** Reference swatch hex (swatches sections). */
  colorHex?: string
}

export type CategoryFilter = {
  id: number
  name: string
  slug: string
  filterType: "select" | "range" | "boolean" | "swatches"
  isGlobal: boolean
  isMultiselect: boolean
  displayOrder: number
  values: FilterValue[]
}

// ---- flat rows -> tree ----

function buildTree(rows: Row[], counts: Map<number, number>): CategoryNode[] {
  const byId = new Map<number, CategoryNode>()
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      slug: r.slug,
      parentId: r.parent_id ?? null,
      productCount: counts.get(r.id) || 0,
      children: [],
    })
  }
  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    if (node.parentId == null) roots.push(node)
    else byId.get(node.parentId)?.children.push(node)
  }
  return roots
}

// Roll leaf product counts up so every ancestor reflects its subtree total.
function rollup(node: CategoryNode): number {
  const total = node.productCount + node.children.reduce((sum, c) => sum + rollup(c), 0)
  node.productCount = total
  return total
}

export type CategoryTree = {
  ready: boolean
  categories: CategoryNode[]
  /** Every category flattened in id order (with children empty — tree lives in `categories`). */
  flat: CategoryNode[]
}

// Request-memoized: every server component on a page (layout, category page,
// shop landing) shares ONE tree computation per render pass.
export const getCategoryTree = cache(async (): Promise<CategoryTree> => {
  const [rows, products] = await Promise.all([
    repo.list("pet_product_categories"),
    repo.list("products"),
  ])
  if (!rows.length) return { ready: false, categories: [], flat: [] }

  // Count VISIBLE products per leaf categoryId.
  const counts = new Map<number, number>()
  for (const p of products) {
    if (!p.visible || p.categoryId == null) continue
    counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1)
  }

  const roots = buildTree(rows, counts)
  for (const r of roots) rollup(r)

  const flat = rows.map((r) => ({
    id: r.id, name: r.name, slug: r.slug, parentId: r.parent_id ?? null,
    productCount: 0, children: [],
  }))
  // Re-apply rolled-up counts to flat rows for cheap lookups.
  const rolled = new Map<number, number>()
  const walk = (n: CategoryNode) => { rolled.set(n.id, n.productCount); n.children.forEach(walk) }
  roots.forEach(walk)
  for (const f of flat) f.productCount = rolled.get(f.id) || 0

  return { ready: true, categories: roots, flat }
})

// ---- node lookup ----

export function findNode(nodes: CategoryNode[], predicate: (n: CategoryNode) => boolean): CategoryNode | null {
  for (const n of nodes) {
    if (predicate(n)) return n
    const hit = findNode(n.children, predicate)
    if (hit) return hit
  }
  return null
}

export function collectSubtreeIds(node: CategoryNode): number[] {
  return [node.id, ...node.children.flatMap(collectSubtreeIds)]
}

// ---- filters for a category ----

export async function getFiltersForCategory(categoryId: number | null): Promise<CategoryFilter[]> {
  const [mappings, filters, values] = await Promise.all([
    repo.list("pet_category_filters"),
    repo.list("pet_product_filters"),
    repo.list("pet_product_filter_values"),
  ])
  const filterById = new Map<number, Row>(filters.map((f) => [f.id, f]))
  const active = mappings.filter((m) => m.category_id === categoryId)
  const out: CategoryFilter[] = []
  for (const m of active.sort((a: Row, b: Row) => (a.display_order ?? 0) - (b.display_order ?? 0))) {
    const f = filterById.get(m.filter_id)
    if (!f || f.is_active === false) continue
    out.push({
      id: f.id,
      name: f.name,
      slug: f.slug,
      filterType: f.filter_type as CategoryFilter["filterType"],
      isGlobal: !!f.is_global,
      isMultiselect: !!f.is_multiselect,
      displayOrder: m.display_order ?? 0,
      values: values
        .filter((v) => v.filter_id === f.id && v.is_active !== false)
        .sort((a: Row, b: Row) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((v) => ({ id: v.id, name: v.name, slug: v.slug })),
    })
  }
  return out
}
