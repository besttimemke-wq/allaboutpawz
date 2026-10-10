import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { buildSitemapSections } from "@/lib/shop/sitemap-source"
import { SITE_URL } from "@/lib/site-url"

export const metadata = {
  title: "Sitemap | All About Pawz",
  description: "Every page of All About Pawz — the full shop catalog, grooming services, booking, locations, guides, learning academy, collections, and policies.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/sitemap` },
}

// Built on request, not at `next build`: buildSitemapSections() hits the
// database (same data as /sitemap.xml), which must not block static generation.
export const dynamic = "force-dynamic"

type PageLink = { label: string; href: string }

const toLinks = (entries: { label: string; path: string }[]): PageLink[] =>
  entries.map((e) => ({ label: e.label, href: e.path || "/" }))

// Department block for shop taxonomy sections
function DepartmentBlock({ dept, animalSlug }: { dept: { slug: string; name: string; subcategories: { slug: string; name: string }[] }; animalSlug: string }) {
  return (
    <div className="mb-8">
      <Link href={departmentPath(animalSlug, dept.slug)} className="text-base font-bold text-ink hover:text-black">{dept.name}</Link>
      {dept.subcategories.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {dept.subcategories.map(sub => (
            <li key={sub.slug}><Link href={subcategoryPath(animalSlug, dept.slug, sub.slug)} className="text-sm leading-relaxed text-ink-soft hover:text-black">{sub.name}</Link></li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Compact column used in the top 4-up grid
function ColumnSection({ heading, links }: { heading: string; links: PageLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-[0.18em] text-black">{heading}</h2>
      <ul className="mt-3 space-y-2">
        {links.map(l => (
          <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-black">{l.label}</Link></li>
        ))}
      </ul>
    </div>
  )
}

// 3-column grid section for long lists
function CollectionSection({ heading, links }: { heading: string; links: PageLink[] }) {
  if (links.length === 0) return null
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-ink">{heading}</h2>
      <div className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="block py-1 text-sm text-ink-soft hover:text-black">{l.label}</Link>
        ))}
      </div>
    </section>
  )
}

export default async function SitemapPage() {
  const sections = await buildSitemapSections()

  // The taxonomy tree is rendered hierarchically from SHOP_NAV_TAXONOMY — the
  // same source that feeds the taxonomy entries in the XML sitemap — so
  // exclude those paths from the flat "more shop pages" list.
  const taxonomyPaths = new Set<string>()
  for (const animal of SHOP_NAV_TAXONOMY) {
    taxonomyPaths.add(`/shop/${animal.slug}`)
    for (const dept of animal.departments) {
      taxonomyPaths.add(departmentPath(animal.slug, dept.slug))
      for (const sub of dept.subcategories) taxonomyPaths.add(subcategoryPath(animal.slug, dept.slug, sub.slug))
    }
  }

  const collectionEntries = sections.boutique.filter(e => e.pageType === "collection")
  const moreShopEntries = sections.boutique.filter(e => e.pageType !== "collection" && !taxonomyPaths.has(e.path))

  return (
    <>
      <PageHeader n="12" label="SITEMAP" />
      <section className="bg-white px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[54px]">Every Page, One Place.</h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-[460px] text-base leading-[1.85] text-ink-soft">
            The complete map of All About Pawz — the full shop catalog, grooming services, booking, locations, guides, learning academy, collections, seller program, and every policy.
            Search engines read the machine version at <Link href="/sitemap.xml" className="font-bold text-black underline hover:text-black">/sitemap.xml</Link>.
          </p>

          {/* Core site links */}
          <div className="mt-12 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            <ColumnSection heading="SALON" links={toLinks(sections.salon)} />
            <ColumnSection heading="BOOKING" links={toLinks(sections.booking)} />
            <ColumnSection heading="SERVING" links={toLinks(sections.serving)} />
            <ColumnSection heading="POLICIES & LEGAL" links={toLinks(sections.policies)} />
          </div>

          {/* Shop taxonomy — Cat Supplies + Dog Supplies (3-column grid) */}
          {SHOP_NAV_TAXONOMY.map(animal => (
            <section key={animal.slug} className="mt-12">
              <Link href={`/shop/${animal.slug}`} className="font-display text-2xl font-bold text-ink hover:text-black">{animal.name}</Link>
              <div className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {animal.departments.map(dept => <DepartmentBlock key={dept.slug} dept={dept} animalSlug={animal.slug} />)}
              </div>
            </section>
          ))}

          <div className="mt-12">
            <CollectionSection heading="More Shop Pages" links={toLinks(moreShopEntries)} />
            <CollectionSection heading="Collections — Special Occasions" links={toLinks(collectionEntries)} />
            <CollectionSection heading="Pawzsly U Pet Care Guides" links={toLinks(sections.guides)} />
            <CollectionSection heading="Learning Academy" links={toLinks(sections.learn)} />
            <CollectionSection heading="Seller Program" links={toLinks(sections.seller)} />
          </div>
        </div>
      </section>
    </>
  )
}
