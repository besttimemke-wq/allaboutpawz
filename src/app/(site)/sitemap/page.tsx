import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { flattenNav, getNavTree, getMerchCollections } from "@/lib/shop/catalog"
import { getResource } from "@/lib/site-data"
import { SITE_URL } from "@/lib/site-url"

export const metadata = {
  title: "Sitemap | All About Pawz",
  description:
    "Every page of All About Pawz in one place — the salon, grooming services, pricing, booking, the boutique, and every policy.",
  // Utility page: kept out of search results (thin content by nature) while
  // its links still pass discovery signal. Crawlers get the machine version
  // at /sitemap.xml (declared in robots.txt).
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/sitemap` },
}

type PolicyRow = { id: string; title: string }

/** The known policy pages — used as the fail-safe fallback when the data
 *  layer is unavailable, and mirrored by the dynamic rows when it is. */
const POLICY_FALLBACK: [string, string][] = [
  ["Privacy Policy", "/policies/privacy-policy"],
  ["Terms of Service", "/policies/terms-of-service"],
  ["Cancellations", "/policies/cancellations"],
  ["Late Arrivals", "/policies/late-arrivals"],
  ["Vaccinations", "/policies/vaccinations"],
  ["Matted Coats", "/policies/matted-coats"],
  ["Refunds & Returns", "/policies/refunds-returns"],
  ["Shipping & Delivery", "/policies/shipping-delivery"],
]

const SALON_LINKS: [string, string][] = [
  ["Home", "/"],
  ["About Us", "/about"],
  ["Services", "/services"],
  ["Our Process", "/process"],
  ["Pricing", "/pricing"],
  ["Gallery", "/gallery"],
  ["Contact", "/contact"],
  ["FAQ & Policies", "/faq"],
]

const BOOKING_LINKS: [string, string][] = [
  ["Book a Visit", "/book"],
  ["Appointment Booking", "/book/appointment"],
  ["Free Consultation", "/book/consultation"],
]

function LinkColumn({ heading, links }: { heading: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="text-[10px] font-bold tracking-[0.22em] text-gold-deep">{heading}</h2>
      <ul className="mt-4 divide-y divide-gold/15">
        {links.map(([label, to]) => (
          <li key={to}>
            <Link
              href={to}
              className="block py-2.5 text-[12.5px] leading-snug text-ink-soft transition-colors hover:text-gold-deep"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function SitemapPage() {
  // Shop categories — the SAME resolver the shop pages and the XML sitemap
  // use (species landings + departments; leaves stay on /shop where the full
  // catalog lives). Fail-safe: the static sections always render.
  let shopLinks: [string, string][] = [["Shop All", "/shop"]]
  try {
    const tree = await getNavTree()
    for (const node of flattenNav(tree)) {
      if (node.level <= 1) shopLinks.push([node.displayName, node.path])
    }
    for (const m of await getMerchCollections()) {
      shopLinks.push([m.displayName, m.path])
    }
  } catch {
    // Data layer unavailable — Shop All stands in for the boutique.
  }

  // Policies — same rows + slugify the policy page resolves with. Fail-safe
  // fallback keeps the eight known policy pages listed.
  let policyLinks = POLICY_FALLBACK
  try {
    const rows = (await getResource<PolicyRow>("policies")) || []
    const seen = new Set<string>()
    const resolved: [string, string][] = []
    for (const p of rows) {
      const slug = p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      resolved.push([p.title, `/policies/${slug}`])
    }
    if (resolved.length > 0) policyLinks = resolved
  } catch {
    // Policies unavailable — the known fallback list stands.
  }

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
            catalog, and every policy we publish. Search engines read the machine version at{" "}
            <Link
              href="/sitemap.xml"
              className="font-bold text-gold-deep underline decoration-gold/50 underline-offset-2 hover:text-gold"
            >
              /sitemap.xml
            </Link>
            .
          </p>

          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            <LinkColumn heading="THE SALON" links={SALON_LINKS} />
            <LinkColumn heading="BOOKING" links={BOOKING_LINKS} />
            <LinkColumn heading="BOUTIQUE" links={shopLinks.slice(0, 14)} />
            <LinkColumn heading="POLICIES" links={policyLinks} />
          </div>
        </div>
      </section>
    </>
  )
}
