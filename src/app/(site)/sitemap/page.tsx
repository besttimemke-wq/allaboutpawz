import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { SHOP_NAV_TAXONOMY, type ShopNavAnimal, type ShopNavDepartment, departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { SITE_URL } from "@/lib/site-url"
import { CITY_LANDINGS, SHELBY_HUB } from "@/lib/business"

export const metadata = {
  title: "Sitemap | All About Pawz",
  description: "Every page of All About Pawz — the full shop catalog, grooming services, booking, locations served, and policies.",
  robots: { index: false, follow: true },
  alternates: { canonical: `${SITE_URL}/sitemap` },
}

// Department block — bold parent name + nested subcategory links beneath.
// This is the visual unit that fills the 3-column grid.
function DepartmentBlock({ dept, animalSlug }: { dept: ShopNavDepartment; animalSlug: string }) {
  return (
    <div className="mb-8">
      <Link
        href={departmentPath(animalSlug, dept.slug)}
        className="text-base font-bold text-ink hover:text-gold-deep"
      >
        {dept.name}
      </Link>
      {dept.subcategories.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {dept.subcategories.map(sub => (
            <li key={sub.slug}>
              <Link
                href={subcategoryPath(animalSlug, dept.slug, sub.slug)}
                className="text-sm leading-relaxed text-ink-soft hover:text-gold-deep"
              >
                {sub.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Animal section — the 3-column grid of department blocks for one animal.
function AnimalSection({ animal }: { animal: ShopNavAnimal }) {
  return (
    <section className="mb-16">
      <Link
        href={`/shop/${animal.slug}`}
        className="font-display text-2xl font-bold text-ink hover:text-gold-deep"
      >
        {animal.name}
      </Link>
      <div className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {animal.departments.map(dept => (
          <DepartmentBlock key={dept.slug} dept={dept} animalSlug={animal.slug} />
        ))}
      </div>
    </section>
  )
}

export default function SitemapPage() {
  // Core site links — flat list, not department blocks
  const salonLinks: { label: string; href: string }[] = [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Our Process", href: "/process" },
    { label: "Pricing", href: "/pricing" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
    { label: "FAQ & Policies", href: "/faq" },
  ]
  const bookingLinks: { label: string; href: string }[] = [
    { label: "Booking Overview", href: "/book" },
    { label: "Book Appointment", href: "/book/appointment" },
    { label: "Free Consultation", href: "/book/consultation" },
  ]
  const locationLinks = [
    ...CITY_LANDINGS.map(c => ({ label: c.titleShort, href: `/grooming/${c.slug}` })),
    { label: SHELBY_HUB.titleShort, href: `/grooming/${SHELBY_HUB.slug}` },
  ]
  const policyLinks: { label: string; href: string }[] = [
    { label: "Cancellations", href: "/policies/cancellations" },
    { label: "Late Arrivals", href: "/policies/late-arrivals" },
    { label: "Matted Coats", href: "/policies/matted-coats" },
    { label: "Privacy Policy", href: "/policies/privacy-policy" },
    { label: "Refunds & Returns", href: "/policies/refunds-returns" },
    { label: "Shipping & Delivery", href: "/policies/shipping-delivery" },
    { label: "Terms of Service", href: "/policies/terms-of-service" },
    { label: "Vaccinations", href: "/policies/vaccinations" },
  ]

  return (
    <>
      <PageHeader n="12" label="SITEMAP" />
      <section className="bg-white px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[54px]">
            Every Page, One Place.
          </h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-[460px] text-base leading-[1.85] text-ink-soft">
            The complete map of All About Pawz — the full shop catalog, grooming services,
            booking, locations served, and every policy. Search engines read the machine version at{" "}
            <Link href="/sitemap.xml" className="font-bold text-gold-deep underline hover:text-gold">/sitemap.xml</Link>.
          </p>

          {/* Core site links — Salon + Booking + Serving + Policies in a 4-column grid */}
          <div className="mt-12 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4">
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-gold-deep">SALON</h2>
              <ul className="mt-3 space-y-2">
                {salonLinks.map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-gold-deep">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-gold-deep">BOOKING</h2>
              <ul className="mt-3 space-y-2">
                {bookingLinks.map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-gold-deep">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-gold-deep">SERVING</h2>
              <ul className="mt-3 space-y-2">
                {locationLinks.map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-gold-deep">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.18em] text-gold-deep">POLICIES</h2>
              <ul className="mt-3 space-y-2">
                {policyLinks.map(l => (
                  <li key={l.href}><Link href={l.href} className="text-sm text-ink-soft hover:text-gold-deep">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Shop taxonomy — 3-column grid of department blocks.
              Each block has a bold department name (link) + nested subcategory links.
              Organized by animal: Cat Supplies section, then Dog Supplies section.
              This matches the reference design — NOT a run-on list. */}
          {SHOP_NAV_TAXONOMY.map(animal => (
            <AnimalSection key={animal.slug} animal={animal} />
          ))}
        </div>
      </section>
    </>
  )
}
