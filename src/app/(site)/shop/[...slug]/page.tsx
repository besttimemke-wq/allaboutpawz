import { redirect, notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { PageHeader } from "@/components/site/site-chrome"

import { Plp } from "@/components/site/shop/plp"
import {
  Breadcrumbs,
  ParentHero,
  PrimaryHero,
  CategoryCards,
  SiblingTabs,
  ProductRail,
  TrustStrip,
} from "@/components/site/shop/shared"
import {
  AnimalLandingPage,
  DepartmentPage,
  SubcategoryPage,
} from "@/components/site/shop/taxonomy-pages"
import {
  getProducts,
  resolveCategory,
  resolveFlatAlias,
  MERCH_META,
  type MerchKey,
} from "@/lib/shop/catalog"
import { resolveTaxPath } from "@/lib/shop/taxonomy-db"
import { SalonFavoritesCollection } from "@/components/site/shop/salon-favorites-collection"
import { departmentPath, subcategoryPath, SHOP_NAV_TAXONOMY, type ShopNavAnimal } from "@/lib/shop-nav"
import { SITE_URL } from "@/lib/site-url"
import { findSeoCopy } from "@/lib/shop/seo-copy"

// ---------------------------------------------------------------------------
// /shop/[...slug] — the server-rendered category system (three templates):
//
//   /shop/dog                            → Template 1: parent landing
//   /shop/dog/grooming                   → Template 2: primary category PLP
//   /shop/dog/grooming/shampoos-…        → Template 3: focused subcategory PLP
//   /shop/new-arrivals, /shop/sale       → merchandising collections
//
// Every request is resolved on the server from the SQL taxonomy — category,
// subcategories, applicable filters, product query — then rendered. Filter
// URLs (?priceBucket=25-50&rating=4…) hit the same server-rendered page with
// the query resolved from the URL. Nothing is pre-generated per combination.
// Flat aliases (/shop/grooming) 301 to the canonical nested path, and legacy
// product URLs (/shop/<product-slug>) 301 to /products/<slug>.
// ---------------------------------------------------------------------------

type PageProps = {
  params: Promise<{ slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  // ---- LIVE taxonomy resolution (Supabase taxonomy_nodes — every animal,
  // department and subcategory in the feed tree) ----
  const resolved = await resolveTaxPath(slug || [])
  if (resolved) {
    if (resolved.notFound) return { title: "Shop — All About Pawz" }
    if (!resolved.group) {
      const a = resolved.animal
      const path = `/shop/${a.slug}`
      const seo = findSeoCopy(path)
      return {
        title: seo?.title || `${a.name} in Memphis, TN | All About Pawz`,
        description: seo?.metaDescription || `Shop ${a.name.toLowerCase()} at All About Pawz Memphis — locally owned pet supply shop and grooming salon.`,
        alternates: { canonical: `${SITE_URL}${path}` },
      }
    }
    if (!resolved.sub) {
      const animalName = resolved.animal.name.replace(" Supplies", "")
      const path = departmentPath(resolved.animal.slug, resolved.group.slug)
      const seo = findSeoCopy(path)
      return {
        title: seo?.title || `${resolved.group.name} for ${animalName}s in Memphis, TN | All About Pawz`,
        description: seo?.metaDescription || `Shop ${resolved.group.name.toLowerCase()} at All About Pawz Memphis — locally owned pet supply shop. Browse categories and visit us at 699 Waring Rd.`,
        alternates: { canonical: `${SITE_URL}${path}` },
      }
    }
    const path = subcategoryPath(resolved.animal.slug, resolved.group.slug, resolved.sub.slug)
    const seo = findSeoCopy(path)
    return {
      title: seo?.title || `${resolved.sub.name} | All About Pawz – Memphis`,
      description: seo?.metaDescription || `Shop ${resolved.sub.name.toLowerCase()} at All About Pawz Memphis — locally owned pet supply shop and grooming salon.`,
      alternates: { canonical: `${SITE_URL}${path}` },
    }
  }

  // ---- Merchandising collections (legacy) ----
  const merch = merchKey(slug[0])
  if (merch) {
    return {
      title: `${MERCH_META[merch].displayName} — All About Pawz Shop`,
      description: MERCH_META[merch].blurb,
      alternates: { canonical: `${SITE_URL}/shop/${merch}` },
    }
  }
  // AA Picks · Salon Favorites — the owner-curated trust collection.
  if (slug[0] === "collections" && slug[1] === "salon-favorites") {
    return {
      title: "AA Picks — Salon Favorites | All About Pawz",
      description:
        "The products our groomers keep on the shelf and use on the table — hand-picked in Memphis. Shop the AA Picks salon-favorites curation.",
      alternates: { canonical: `${SITE_URL}/shop/collections/salon-favorites` },
    }
  }
  const resolvedLegacy = await resolveCategory(slug || [])
  if (!resolvedLegacy) return { title: "Shop — All About Pawz" }
  const title = resolvedLegacy.chain.map((c) => c.displayName).join(" — ")
  return {
    title: `${title} — All About Pawz Shop`,
    description:
      resolvedLegacy.node.children.length > 0
        ? `Shop ${resolvedLegacy.node.displayName} and ${resolvedLegacy.node.count} curated products at All About Pawz.`
        : `Shop ${resolvedLegacy.node.displayName} for dogs — groomer-approved quality from All About Pawz.`,
    // Filter/sort query variants consolidate onto the canonical category URL.
    alternates: { canonical: `${SITE_URL}${resolvedLegacy.node.path}` },
  }
}

function merchKey(seg: string | undefined): MerchKey | null {
  if (seg === "new-arrivals" || seg === "sale") return seg
  return null
}

function staticShopFallback(segments: string[]) {
  const animalSlug = segments[0] === "small-animal" ? "small-pet" : segments[0]
  const animal = SHOP_NAV_TAXONOMY.find((candidate) => candidate.slug === animalSlug)
  if (!animal || segments.length > 3) return null
  if (segments.length === 1) return { kind: "animal" as const, animal }

  const dept = animal.departments.find((candidate) => candidate.slug === segments[1])
  if (!dept) return null
  if (segments.length === 2) return { kind: "department" as const, animal, dept }

  const findSubcategory = (nodes: typeof dept.subcategories): { slug: string; name: string } | null => {
    for (const node of nodes) {
      if (node.slug === segments[2]) return node
      const nested = node.children ? findSubcategory(node.children) : null
      if (nested) return nested
    }
    return null
  }
  const sub = findSubcategory(dept.subcategories)
  return sub ? { kind: "subcategory" as const, animal, dept, sub } : null
}

// BreadcrumbList structured data — Home → Shop → the trail the visible
// breadcrumb shows for this category (or merchandising collection).
function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
      ...trail.map((c, i) => ({
        "@type": "ListItem",
        position: i + 3,
        name: c.name,
        item: `${SITE_URL}${c.path}`,
      })),
    ],
  }
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const segments = (await params).slug || []
  const sp = await searchParams

  if (segments.length === 0) notFound()

  // ---- LIVE taxonomy resolution (Supabase taxonomy_nodes) ----
  // Every animal landing, department and subcategory in the feed tree —
  // fish/bird/reptile/small-animal (the 12/9/13/16 spec subcategories),
  // dog/cat departments and supplier-tree groups — resolves here. Legacy
  // slugs 301 to their canonical path; unknown segments under a known
  // animal 404.
  const resolved = await resolveTaxPath(segments)
  if (resolved) {
    if (resolved.notFound) notFound()
    if (resolved.canonicalPath) permanentRedirect(resolved.canonicalPath)
    // Adapt the LIVE taxonomy animal (TaxAnimal — Supabase taxonomy_nodes with
    // `groups`) to the nav-tree shape (ShopNavAnimal — `departments` +
    // `tagline`) the three templates render from. Without this the animal /
    // department / subcategory pages crash on animal.departments.map().
    const navAnimal: ShopNavAnimal = {
      slug: resolved.animal.slug,
      name: resolved.animal.name,
      tagline: `Shop ${resolved.animal.name} at All About Pawz Memphis`,
      departments: resolved.animal.groups.map((g) => ({
        slug: g.slug,
        name: g.name,
        subcategories: g.subcategories,
      })),
    }
    if (!resolved.group) {
      return <AnimalLandingPage animal={navAnimal} nodeId={resolved.animal.id} scopeNodeIds={resolved.nodeIds} searchParams={sp} />
    }
    if (!resolved.sub) {
      return <DepartmentPage animal={navAnimal} dept={resolved.group} scopeNodeIds={resolved.nodeIds} rootId={resolved.group.id} searchParams={sp} />
    }
    return <SubcategoryPage animal={navAnimal} dept={resolved.group} subSlug={resolved.sub.slug} subName={resolved.sub.name} scopeNodeIds={resolved.nodeIds} rootId={resolved.sub.id} searchParams={sp} />
  }

  const staticFallback = staticShopFallback(segments)
  if (staticFallback?.kind === "animal") {
    return <AnimalLandingPage animal={staticFallback.animal} searchParams={sp} />
  }
  if (staticFallback?.kind === "department") {
    return <DepartmentPage animal={staticFallback.animal} dept={staticFallback.dept} searchParams={sp} />
  }
  if (staticFallback?.kind === "subcategory") {
    return <SubcategoryPage animal={staticFallback.animal} dept={staticFallback.dept} subSlug={staticFallback.sub.slug} subName={staticFallback.sub.name} searchParams={sp} />
  }

  // ---- Merchandising collections (legacy) ----
  const merch = merchKey(segments[0])
  if (merch && segments.length === 1) {
    const meta = MERCH_META[merch]
    const merchTrail = [{ name: meta.displayName, path: `/shop/${merch}` }]
    return (
      <>
        <PageHeader n="06" label={`SHOP / ${meta.displayName.toUpperCase()}`} />
        
        <section className="bg-white px-8 py-10 lg:px-12">
          <p className="eyebrow">THE PAWZ COLLECTION</p>
          <h1 className="mt-2 font-display text-[34px] leading-[1.1] text-ink lg:text-[40px]">
            {meta.displayName}
          </h1>
          <p className="mt-4 max-w-[460px] text-[12.5px] leading-[1.8] text-ink-soft">{meta.blurb}</p>
        </section>
        <section className="border-t border-neutral-200 bg-white px-8 pb-14 pt-8 lg:px-12">
          <Plp scope={{ kind: "merch", merch, title: meta.displayName, blurb: meta.blurb }} searchParams={sp} />
        </section>
        <TrustStrip />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(merchTrail)) }}
        />
      </>
    )
  }

  // ---- AA Picks · Salon Favorites collection (owner-curated trust surface) ----
  if (segments[0] === "collections") {
    // The original picks slug follows the products to the canonical page.
    if (segments[1] === "all-about-pawz-picks") {
      permanentRedirect("/shop/collections/salon-favorites")
    }
    if (segments[1] === "salon-favorites" && segments.length === 2) {
      const favTrail = [{ name: "AA Picks — Salon Favorites", path: "/shop/collections/salon-favorites" }]
      return (
        <>
          <PageHeader n="06" label="SHOP / AA PICKS — SALON FAVORITES" />
          <SalonFavoritesCollection />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(favTrail)) }}
          />
        </>
      )
    }
  }

  // ---- Category resolution (server, per request) — legacy mini-catalog ----
  const resolvedLegacy = await resolveCategory(segments)

  if (!resolvedLegacy) {
    // Flat single-segment alias (/shop/grooming) → canonical nested path.
    if (segments.length === 1) {
      const alias = await resolveFlatAlias(segments[0])
      if (alias) redirect(alias)
      // Legacy product URL (/shop/pawz-signature-shampoo) → /products/<slug>.
      const products = await getProducts()
      if (products.some((p) => p.slug === segments[0])) {
        redirect(`/products/${segments[0]}`)
      }
    }
    notFound()
  }

  const { node, chain, parentNode, siblings } = resolvedLegacy
  const categoryTrail = chain.map((c) => ({ name: c.displayName, path: c.path }))
  const categoryBreadcrumbScript = (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(categoryTrail)) }}
    />
  )

  // ================= Template 1: parent landing =================
  if (node.level === 0) {
    const products = await getProducts()
    const bestSellers = products.filter((p) => p.isBestseller).slice(0, 4)
    const newArrivals = products.filter((p) => p.isNew).slice(0, 4)
    return (
      <>
        <PageHeader n="06" label={`SHOP / ${node.displayName.toUpperCase()}`} />
        
        <ParentHero node={node} />
        <CategoryCards title="SHOP BY CATEGORY" nodes={node.children} />
        <ProductRail
          title="BEST SELLERS"
          products={bestSellers}
          viewAllHref={`${node.path}?sort=best-selling`}
        />
        <ProductRail title="NEW ARRIVALS" products={newArrivals} viewAllHref="/shop/new-arrivals" />
        <TrustStrip />
        {categoryBreadcrumbScript}
      </>
    )
  }

  // ================= Template 2: primary category PLP =================
  if (node.level === 1) {
    return (
      <>
        <PageHeader n="06" label={`SHOP / ${node.displayName.toUpperCase()}`} />
        
        <PrimaryHero node={node} />
        {node.children.length > 0 && (
          <CategoryCards title="SHOP BY CATEGORY" nodes={node.children} variant="rail" />
        )}
        <section className="border-t border-neutral-200 bg-white px-8 pb-14 pt-8 lg:px-12">
          <Plp scope={{ kind: "category", node }} searchParams={sp} />
        </section>
        <TrustStrip />
        {categoryBreadcrumbScript}
      </>
    )
  }

  // ================= Template 3: focused subcategory PLP =================
  return (
    <>
      <PageHeader n="06" label={`SHOP / ${node.displayName.toUpperCase()}`} />
      {/* The department bar on EVERY /shop route — leaf pages too: a shopper
          deep in Shampoos & Conditioners keeps the whole taxonomy one hover
          away, and the bar carries the active department highlight. */}
      
      <section className="bg-white px-8 py-8 lg:px-12">
        <p className="eyebrow">{chain.length > 1 ? chain[chain.length - 2].displayName.toUpperCase() : "SHOP"}</p>
        <h1 className="mt-2 font-display text-[28px] leading-[1.1] text-ink lg:text-[32px]">
          {node.displayName}
        </h1>
        {node.count > 0 && (
          <p className="mt-3 text-[12px] text-ink-soft">
            {node.count} {node.count === 1 ? "product" : "products"} — focused picks, easy to refine.
          </p>
        )}
        <div className="mt-5">
          <SiblingTabs
            nodes={siblings.filter((s) => s.key !== node.key)}
            currentPath={node.path}
            parentPath={parentNode?.path || "/shop"}
            parentLabel={parentNode?.displayName || "Products"}
          />
        </div>
      </section>
      <section className="border-t border-neutral-200 bg-white px-8 pb-14 pt-8 lg:px-12">
        <Plp scope={{ kind: "category", node }} searchParams={sp} />
      </section>
      <TrustStrip />
      {categoryBreadcrumbScript}
    </>
  )
}
