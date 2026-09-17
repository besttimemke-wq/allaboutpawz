import { redirect, notFound } from "next/navigation"
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
  getProducts,
  resolveCategory,
  resolveFlatAlias,
  MERCH_META,
  type MerchKey,
} from "@/lib/shop/catalog"
import { SITE_URL } from "@/lib/site-url"

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
  const merch = merchKey(slug[0])
  if (merch) {
    return {
      title: `${MERCH_META[merch].displayName} — All About Pawz Shop`,
      description: MERCH_META[merch].blurb,
      alternates: { canonical: `${SITE_URL}/shop/${merch}` },
    }
  }
  const resolved = await resolveCategory(slug || [])
  if (!resolved) return { title: "Shop — All About Pawz" }
  const title = resolved.chain.map((c) => c.displayName).join(" — ")
  return {
    title: `${title} — All About Pawz Shop`,
    description:
      resolved.node.children.length > 0
        ? `Shop ${resolved.node.displayName} and ${resolved.node.count} curated products at All About Pawz.`
        : `Shop ${resolved.node.displayName} for dogs — groomer-approved quality from All About Pawz.`,
    // Filter/sort query variants consolidate onto the canonical category URL.
    alternates: { canonical: `${SITE_URL}${resolved.node.path}` },
  }
}

function merchKey(seg: string | undefined): MerchKey | null {
  if (seg === "new-arrivals" || seg === "sale") return seg
  return null
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

  // ---- Merchandising collections ----
  const merch = merchKey(segments[0])
  if (merch && segments.length === 1) {
    const meta = MERCH_META[merch]
    const merchTrail = [{ name: meta.displayName, path: `/shop/${merch}` }]
    return (
      <>
        <PageHeader n="06" label={`SHOP / ${meta.displayName.toUpperCase()}`} />
        <Breadcrumbs chain={[]} />
        <section className="marble bg-cream px-8 py-10 lg:px-12">
          <p className="eyebrow">THE PAWZ COLLECTION</p>
          <h1 className="mt-2 font-display text-[34px] leading-[1.1] text-ink lg:text-[40px]">
            {meta.displayName}
          </h1>
          <p className="mt-4 max-w-[460px] text-[12.5px] leading-[1.8] text-ink-soft">{meta.blurb}</p>
        </section>
        <section className="marble border-t border-gold/25 bg-cream px-8 pb-14 pt-8 lg:px-12">
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

  // ---- Category resolution (server, per request) ----
  const resolved = await resolveCategory(segments)

  if (!resolved) {
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

  const { node, chain, parentNode, siblings } = resolved
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
        <Breadcrumbs chain={chain} />
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
        <Breadcrumbs chain={chain} />
        <PrimaryHero node={node} />
        {node.children.length > 0 && (
          <CategoryCards title="SHOP BY CATEGORY" nodes={node.children} variant="rail" />
        )}
        <section className="marble border-t border-gold/25 bg-cream px-8 pb-14 pt-8 lg:px-12">
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
      <Breadcrumbs chain={chain} />
      <section className="marble bg-cream px-8 py-8 lg:px-12">
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
      <section className="marble border-t border-gold/25 bg-cream px-8 pb-14 pt-8 lg:px-12">
        <Plp scope={{ kind: "category", node }} searchParams={sp} />
      </section>
      <TrustStrip />
      {categoryBreadcrumbScript}
    </>
  )
}
