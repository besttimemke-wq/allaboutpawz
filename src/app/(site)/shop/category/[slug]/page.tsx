import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { ArrowLeft, PawPrint } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { TrustServiceBand } from "@/components/site/trust-band"
import { ShopClosingBands } from "@/components/site/home-bands"
import { SHOP_NAV_CATEGORIES } from "@/lib/shop-nav"
import { resolveCategoryArt } from "@/lib/category-art"
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
//   breadcrumb → hero (editorial copy + category art, from CODE) → trust &
//   service band → catalog (SIDEBAR + products grid)
//
// Category art (hero images + copy) is imported from the remote project and
// lives in CODE — never the database (src/lib/category-art.ts). Only shop,
// gallery, pricing, and services data are database-driven.
//
// The DEPARTMENTS nav lives in the header MEGA MENU (every shop route), so
// the SIDEBAR stays clean:
//   FILTERS + CLEAR ALL
//   SUBCATEGORIES — only THIS route's subcategory group (department pages:
//                 wrapper label + leaves; sub pages: the parent's group with
//                 the current one active). Never the whole taxonomy tree.
//   PRICE RANGE — slider + $ min/max inputs.
//   FACETS (on demand) — rating + the mapped filter sections, surfaced below
//                 price when the FILTERS icon in the toolbar is clicked.
//
// The sidebar is sticky while the page expands — no scroll containers.
// Subcategory routes live in the SIDEBAR (not above the products).
//
// Product cards render from live categoryId assignment (the admin publish
// pipe: set a product's Category page in the CMS → its card appears on that
// category page and every ancestor page within the revalidate window).
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

// Keep the breadcrumb current-crumb on one line for the longest names.
const crumbName = (name: string) => {
  const full = name.toUpperCase()
  return full.length > 34 ? `${full.slice(0, 33).trimEnd()}…` : full
}

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

  // ---- the sidebar nav for this exact route (subcategories only — the
  // departments live in the header mega menu) ----
  const department = chain.length > 0 ? chain[0] : null
  const isDepartmentPage = department != null && department.id === node.id
  const isLeaf = node.children.length === 0

  let expandedGroups: BrowserNavGroup[] | null = null
  let subSection: BrowserNav["subSection"] = null
  if (isDepartmentPage) {
    // Department page: its own subcategory group — wrapper labels + leaves
    // (or direct leaves).
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

  const nav: BrowserNav = { expandedGroups, subSection }

  const countLine =
    products.length === 0
      ? "No products yet — new arrivals coming soon."
      : products.length === 1
        ? "1 product"
        : `${products.length} products`

  // Category art from CODE — the node's own, else the nearest ancestor's
  // (department art covers every subcategory page).
  const art = resolveCategoryArt(chain.map((n) => n.slug))
  const heroDescription = art?.description || countLine

  // Hero CTA label — the flattened department name when this node IS a
  // department ("SHOP GROOMING"), else the node's own name.
  const shopCtaName =
    SHOP_NAV_CATEGORIES.find((c) => c.slug === node.slug)?.name || node.name

  return (
    <>
      {/* ONE header bar — breadcrumb + departments mega menu + bag. Never a
          second breadcrumb row beneath it (that was the double header). */}
      <PageHeader
        n="06"
        crumbs={[
          { name: "SHOP", href: "/shop" },
          ...chain.slice(0, -1).map((c) => ({
            name: crumbName(c.name),
            href: `/shop/category/${c.slug}`,
          })),
          { name: crumbName(node.name), href: null },
        ]}
      />

      {/* HERO — the remote category header pattern: editorial copy left,
          category art right (in CODE, from the remote project's imagery). */}
      <section className="marble border-b border-gold/25 bg-cream py-10 lg:py-12">
        <div className="grid grid-cols-1 items-center gap-10 px-8 lg:grid-cols-12 lg:px-12">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="eyebrow">{art?.eyebrow || "SHOP BY CATEGORY"}</p>
            <h1 className="mt-3 font-display text-[32px] leading-[1.12] text-ink lg:text-[40px]">
              {node.name}
            </h1>
            <p className="mt-4 max-w-xl text-[12.5px] leading-[1.85] text-ink-soft">
              {heroDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {/* Primary hero CTA — scroll to this category's collection. */}
              <Link href="#collection" className="btn-gold">
                SHOP {shopCtaName.toUpperCase()}
              </Link>
              <Link href="/shop" className="btn-ghost">
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} /> BROWSE ALL
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:col-span-5 lg:justify-end">
            <div className="relative aspect-[16/10] w-full max-w-[440px] overflow-hidden border border-gold/25 bg-cream-deep shadow-xs">
              {art?.img ? (
                <img
                  src={art.img}
                  alt={art.alt || node.name}
                  width={600}
                  height={340}
                  className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <PawPrint className="h-10 w-10 text-gold/30" strokeWidth={1.2} aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trust & service band — the remote project's 4-section band,
          directly beneath every hero */}
      <TrustServiceBand />

      {/* Collection — sticky filter sidebar + products grid. The page expands;
          subcategory routes live in the sidebar, never above the products. */}
      <section id="collection" className="marble scroll-mt-24 bg-cream px-8 pb-14 lg:px-12">
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

      {/* Closing bands — the home page's band treatments, directly above
          the shop footer. */}
      <ShopClosingBands />
    </>
  )
}
