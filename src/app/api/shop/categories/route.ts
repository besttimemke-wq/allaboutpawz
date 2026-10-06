import { NextResponse } from "next/server"
import { getCategoryTree, type CategoryNode } from "@/lib/categories"
import { getNavTree, flattenNav } from "@/lib/shop/catalog"

// GET /api/shop/categories
// Public read-only category tree (with visible-product counts rolled up per
// node) + the canonical customer-facing route for every node. Used by the
// storefront department bar (ShopNavBar), the shop landing rail, and the
// admin product editor / categories page. No secrets — only category names,
// slugs, paths, and counts.
export async function GET() {
  const [tree, navTree] = await Promise.all([getCategoryTree(), getNavTree()])

  // Canonical route per RAW category id — the deepest presentation node that
  // owns the raw id wins (a leaf's id maps to the leaf's /shop/dog/grooming/
  // combs path; a department's id maps to /shop/dog/grooming). Consumers link
  // these directly instead of riding legacy /shop/category/<slug> redirects,
  // and the department bar's active state matches the real URL.
  const flatNav = flattenNav(navTree)
  const ownerByRawId = new Map<number, { path: string; level: number }>()
  for (const n of flatNav) {
    for (const id of n.rawIds) {
      const prev = ownerByRawId.get(id)
      if (!prev || n.level > prev.level) ownerByRawId.set(id, { path: n.path, level: n.level })
    }
  }

  const annotate = (node: CategoryNode): CategoryNode => {
    node.navPath = ownerByRawId.get(node.id)?.path ?? null
    node.children.forEach(annotate)
    return node
  }
  tree.categories.forEach(annotate)
  tree.flat.forEach((f) => {
    f.navPath = ownerByRawId.get(f.id)?.path ?? null
  })

  return NextResponse.json({
    ready: tree.ready,
    categories: tree.categories,
    flat: tree.flat,
  })
}
