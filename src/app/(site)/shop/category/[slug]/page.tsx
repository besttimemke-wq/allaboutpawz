import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import {
  CategoryBrowser,
  type BrowserProduct,
  type BrowserRating,
  type BrowserFilter,
  type BrowserNav,
  type BrowserNavItem,
  type BrowserNavGroup,
} from "@/components/site/islands/category-browser"
import {
  getCategoryTree,
  findNode,
  collectSubtreeIds,
  getFiltersForCategory,
  type CategoryFilter,
  type CategoryNode,
} from "@/lib/categories"
import { getSiteContent } from "@/lib/site-data"
import { repo } from "@/lib/repo"

// ---------------------------------------------------------------------------
// Category page — /shop/category/[slug]
//
// The layout is the design library's category-page family:
//   breadcrumb → header → hero → catalog (SIDEBAR + products grid)
//
// SIDEBAR (the design repo's specific sidebar):
//   FILTERS + CLEAR ALL
//   CATEGORIES  — the departments as links with counts. The current route's
//                 department is active; on department pages it expands inline
//                 to present THIS route's subcategories only (wrapper label +
//                 leaves). Never the whole taxonomy tree, never a scrollbar.
//   SUBCATEGORY SECTION (non-department pages) — the parent's name + the
//                 subcategory links relevant to this route, current one active.
//   PRICE / RATING / AVAILABILITY / mapped filter accordions.
//
// The sidebar is sticky while the page expands — no scroll containers.
// Subcategory routes live in the SIDEBAR (not above the products).
//
// All category routes (departments, wrappers, leaves) are pre-rendered via
// generateStaticParams — real pages with real metadata for search engines.
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

async function loadCategory(slug: string) {
  const tree = await getCategoryTree()
  if (!tree.ready) return null
  return findNode(tree.categories, (n) => n.slug === slug)
}

// Every category node is a real pre-rendered route (the 10 department pages
// and all their subcategory routes). Unknown/new slugs still render on demand.
export async function generateStaticParams() {
  try {
    const tree = await getCategoryTree()
    if (!tree.ready) return []
    return tree.flat.map((n) => ({ slug: n.slug }))
  } catch {
    return []
  }
}

// Keep the pre-rendered pages honest with a CMS that changes.
export const revalidate = 300

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const node = await loadCategory(slug)
  if (!node) return { title: "Category — All About Pawz Shop" }
  return {
    title: `${node.name} — All About Pawz Shop`,
    description: `Shop the ${node.name} collection — curated by the groomers at All About Pawz.`,
  }
}

// Visible chain root → … → node. The generic umbrella root ("Pet Supplies",
// which carries no products and no children of its own) is skipped when it
// is merely the node itself, so departments read like departments.
function buildChain(node: CategoryNode, flat: CategoryNode[]): CategoryNode[] {
  const byId = new Map(flat.map((f) => [f.id, f]))
  const chain: CategoryNode[] = []
  let cursor: CategoryNode | null | undefined = byId.get(node.id)
  while (cursor) {
    const parentId: number | null = cursor.parentId
    chain.unshift(cursor)
    cursor = parentId != null ? byId.get(parentId) : null
  }
  return chain.filter((n) => !(n.id !== node.id && n.slug === "pet-supplies"))
}

// Mapped filters for this node, inherited from the nearest ancestor that has
// mappings (the department root in practice) when the node itself has none.
async function resolveFilters(node: CategoryNode, flat: CategoryNode[]): Promise<CategoryFilter[]> {
  const own = await getFiltersForCategory(node.id)
  if (own.length) return own
  const byId = new Map(flat.map((f) => [f.id, f]))
  let parentId = node.parentId
  while (parentId != null) {
    const parent = byId.get(parentId)
    if (!parent) break
    const inherited = await getFiltersForCategory(parent.id)
    if (inherited.length) return inherited
    parentId = parent.parentId
  }
  return []
}

// ---- sidebar navigation (the design repo's sidebar pattern) ----
// Departments as links; ONLY this route's subcategory group is presented.
//   department page  → the active department expands inline (wrapper label +
//                      its leaves — repo's ExactCategoryPageView pattern)
//   wrapper page     → separate section: its own name + its leaf children
//   leaf page        → separate section: parent's name + sibling leaves,
//                      current leaf active (repo's subcategory sidebar)
const navItem = (n: CategoryNode): BrowserNavItem => ({
  id: n.id,
  name: n.name,
  slug: n.slug,
  count: n.productCount,
})

const groupsOf = (nodes: CategoryNode[]): BrowserNavGroup[] => {
  const groups: BrowserNavGroup[] = []
  const directLeaves = nodes.filter((n) => n.children.length === 0).map(navItem)
  if (directLeaves.length > 0) groups.push({ label: null, items: directLeaves })
  for (const w of nodes.filter((n) => n.children.length > 0)) {
    groups.push({ label: w.name, items: w.children.map(navItem) })
  }
  return groups
}

// Keep the PageHeader label on one line even for the longest department names.
function headerLabel(name: string) {
  const full = `SHOP — ${name.toUpperCase()}`
  return full.length > 34 ? `${full.slice(0, 33).trimEnd()}…` : full
}

const crumbLinkCls =
  "text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params
  const tree = await getCategoryTree()
  const node = tree.ready ? findNode(tree.categories, (n) => n.slug === slug) : null
  if (!node) notFound()

  const [{ products: allProducts }, reviews] = await Promise.all([
    getSiteContent(),
    repo.list("product_reviews"),
  ])

  // Visible products anywhere in this node's subtree.
  const subtreeIds = new Set(collectSubtreeIds(node))
  const products: BrowserProduct[] = allProducts
    .filter((p: any) => p.categoryId != null && subtreeIds.has(p.categoryId))
    .sort(
      (a: any, b: any) =>
        (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name)),
    )

  // Review rollup per product (same pattern as the bag page: a review shows
  // when it is visible OR explicitly approved).
  const ratings: Record<string, BrowserRating> = {}
  for (const r of reviews as any[]) {
    if (!(r.visible === true || r.status === "approved")) continue
    const cur = ratings[r.productId] || { avg: 0, count: 0 }
    ratings[r.productId] = {
      avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
      count: cur.count + 1,
    }
  }

  const filters = await resolveFilters(node, tree.flat)
  const chain = buildChain(node, tree.flat)

  // ---- the sidebar nav for this exact route ----
  const departments = tree.categories
    .filter((n) => n.slug !== "pet-supplies")
    .map(navItem)
  const department = chain.length > 0 ? chain[0] : null
  const isDepartmentPage = department != null && department.id === node.id
  const isLeaf = node.children.length === 0

  let expandedGroups: BrowserNavGroup[] | null = null
  let subSection: BrowserNav["subSection"] = null
  if (isDepartmentPage) {
    // Department page: the active department expands inline with its own
    // subcategory group — wrapper labels + leaves (or direct leaves).
    expandedGroups = groupsOf(node.children)
  } else if (!isLeaf) {
    // Wrapper page: separate section under its own name with its leaves.
    subSection = { heading: node.name, groups: groupsOf(node.children), currentSlug: null }
  } else {
    // Leaf page: the parent's subcategory group (siblings), current active.
    const parent =
      node.parentId != null ? findNode(tree.categories, (n) => n.id === node.parentId) : null
    subSection = parent
      ? { heading: parent.name, groups: groupsOf(parent.children), currentSlug: node.slug }
      : null
  }

  const nav: BrowserNav = {
    departments,
    activeSlug: department ? department.slug : node.slug,
    expandedGroups,
    subSection,
  }

  const countLine =
    products.length === 0
      ? "No products yet — new arrivals coming soon."
      : products.length === 1
        ? "1 product"
        : `${products.length} products`

  return (
    <>
      {/* Breadcrumb — real chain from the root department down */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2.5 border-b border-gold/25 bg-cream px-8 py-3.5 lg:px-12"
      >
        <span className="text-[10.5px] font-bold tracking-[0.2em] text-gold-deep">06</span>
        <Link href="/shop" className={crumbLinkCls}>
          SHOP
        </Link>
        {chain.slice(0, -1).map((n) => (
          <span key={n.id} className="flex items-center gap-2.5">
            <span className="text-[10px] text-gold/50">/</span>
            <Link href={`/shop/category/${n.slug}`} className={crumbLinkCls}>
              {n.name.toUpperCase()}
            </Link>
          </span>
        ))}
        <span className="text-[10px] text-gold/50">/</span>
        <span className="text-[10.5px] font-bold tracking-[0.2em] text-ink">{node.name}</span>
      </nav>

      <PageHeader n="06" label={headerLabel(node.name)} />

      {/* Hero-lite */}
      <section className="marble bg-cream px-8 pb-12 pt-10 lg:px-12">
        <p className="eyebrow">SHOP BY CATEGORY</p>
        <h1 className="mt-3 font-display text-[32px] leading-[1.12] text-ink lg:text-[38px]">
          {node.name}
        </h1>
        <p className="mt-3 text-[12px] text-ink-soft">{countLine}</p>
        <div className="mt-6">
          <Link href="/shop" className="btn-ghost">
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> BROWSE ALL
          </Link>
        </div>
      </section>

      {/* Collection — sticky filter sidebar + products grid. The page expands;
          subcategory routes live in the sidebar, never above the products. */}
      <section id="collection" className="marble scroll-mt-24 border-t border-gold/25 bg-cream px-8 pb-14 lg:px-12">
        <h2 className="border-t border-gold/25 pt-8 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">
          {node.name.toUpperCase()}
        </h2>
        <CategoryBrowser
          node={{ id: node.id, name: node.name, slug: node.slug }}
          products={products}
          ratings={ratings}
          filters={filters as BrowserFilter[]}
          nav={nav}
        />
      </section>
    </>
  )
}
