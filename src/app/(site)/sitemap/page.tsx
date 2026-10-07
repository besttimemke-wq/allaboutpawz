import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { buildSitemapSections, type SitemapEntry } from "@/lib/shop/sitemap-source"
import { SITE_URL } from "@/lib/site-url"

export const metadata = {
  title: "Sitemap | All About Pawz",
  description:
    "Every page of All About Pawz in one place — the salon, grooming services, pricing, booking, the boutique catalog, locations served, and every policy.",
  // Utility page: kept out of search results (thin content by nature) while
  // its links still pass discovery signal. Crawlers get the machine version
  // at /sitemap.xml (declared in robots.txt).
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/sitemap` },
}

function LinkColumn({ heading, links }: { heading: string; links: { label: string; path: string }[] }) {
  return (
    <div>
      <h2 className="text-[10px] font-bold tracking-[0.22em] text-gold-deep">{heading}</h2>
      <ul className="mt-4 divide-y divide-gold/15">
        {links.map((l) => (
          <li key={l.path}>
            <Link
              href={l.path || "/"}
              className="block py-2.5 text-[12.5px] leading-snug text-ink-soft transition-colors hover:text-gold-deep"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function entriesToLinks(entries: SitemapEntry[]): { label: string; path: string }[] {
  return entries.map((e) => ({ label: e.label, path: e.path || "/" }))
}

export default async function SitemapPage() {
  // SINGLE SOURCE OF TRUTH — this page and /sitemap.xml both read from
  // buildSitemap() in src/lib/shop/sitemap-source.ts. One source, two
  // renderings. They never drift.
  const sections = await buildSitemapSections()

  // The salon section gets the booking links merged in (they're core site
  // pages, not a separate concern for the HTML visitor). Shop links are
  // split into animal landings + departments + categories + products for
  // the BOUTIQUE column so the catalog is discoverable from the map.
  const salonLinks = entriesToLinks(sections.salon)
  const bookingLinks = entriesToLinks(sections.booking)
  const boutiqueLinks = entriesToLinks(sections.boutique)
  const productLinks = entriesToLinks(sections.products)
  const servingLinks = entriesToLinks(sections.serving)
  const policyLinks = entriesToLinks(sections.policies)

  return (
    <>
      <PageHeader n="12" label="SITEMAP" />

      <section className="marble bg-cream px-8 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-[46px] leading-[1.08] text-ink lg:text-[58px]">
            Every Page,
            <br />
            One Place.
          </h1>
          <div className="mt-6">
            <Divider />
          </div>
          <p className="mt-6 max-w-[460px] text-[12.5px] leading-[1.85] text-ink-soft">
            The complete map of the salon — grooming services, pricing, booking, the boutique
            catalog, locations served, and every policy we publish. Search engines read the machine version at{" "}
            <Link
              href="/sitemap.xml"
              className="font-bold text-gold-deep underline decoration-gold/50 underline-offset-2 hover:text-gold"
            >
              /sitemap.xml
            </Link>
            .
          </p>

          {/* 5-column grid on desktop: SALON + BOOKING + BOUTIQUE + SERVING + POLICIES.
              The SERVING column is new — it carries the 5 city landing pages +
              the Shelby County hub, which are money pages for "dog grooming in
              [city]" searches. The BOUTIQUE column is expanded to include
              animal landings + departments + categories (not just "Shop All"). */}
          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            <LinkColumn heading="THE SALON" links={salonLinks} />
            <LinkColumn heading="BOOKING" links={bookingLinks} />
            <LinkColumn heading="BOUTIQUE" links={boutiqueLinks.slice(0, 14)} />
            <LinkColumn heading="SERVING" links={servingLinks} />
            <LinkColumn heading="POLICIES" links={policyLinks} />
          </div>

          {/* Products section — the full catalog. Renders as a wrap of
              compact links so 400+ products don't blow the page height.
              Linked from the same source as /sitemap.xml. */}
          {productLinks.length > 0 && (
            <div className="mt-16">
              <h2 className="text-[10px] font-bold tracking-[0.22em] text-gold-deep">THE CATALOG</h2>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-gold/15 pt-4">
                {productLinks.map((p) => (
                  <Link
                    key={p.path}
                    href={p.path}
                    className="text-[11px] leading-snug text-ink-soft transition-colors hover:text-gold-deep"
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="mt-12 text-[10px] text-ink-soft/60">
            {sections.total} pages in the sitemap. Last regenerated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.
          </p>
        </div>
      </section>
    </>
  )
}
