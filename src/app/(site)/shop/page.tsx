import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Plp } from "@/components/site/shop/plp"
import { SHOP_NAV_TAXONOMY, departmentPath } from "@/lib/shop-nav"
import { SITE_URL } from "@/lib/site-url"
import { findSeoCopy } from "@/lib/shop/seo-copy"
import { BUSINESS } from "@/lib/business"

export const metadata: Metadata = {
  title: "Dog & Cat Supplies, Grooming & Shopping in Memphis, TN | All About Pawz",
  description:
    "Shop dog and cat supplies, book grooming, and find Memphis deals at All About Pawz — Memphis' full-service grooming and shopping destination.",
  alternates: { canonical: `${SITE_URL}/shop` },
}

// ---------------------------------------------------------------------------
// /shop — the shop landing page.
//
// Per the Shop SEO Page Architecture spec, this is a TRUE PLP (product
// listing page): sidebar rail (categories + filters) + product grid + sort
// toolbar, with the SEO copy block from /lib/shop/seo-copy.ts above the
// grid, the related searches + related guides blocks below, and the
// grooming cross-sell band at the bottom.
//
// NO MORE "throwing cards up" — this IS the e-commerce shop page.
// ---------------------------------------------------------------------------

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const seo = findSeoCopy("/shop")

  return (
    <article className="bg-white">
      {/* LocalBusiness JSON-LD is in the root layout; BreadcrumbList here. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
            ],
          }),
        }}
      />

      {/* Hero — H1 + intro */}
      <section className="border-b border-gold/15 px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <span className="text-ink">Shop</span>
          </nav>
          <h1 className="mt-4 font-display text-[36px] leading-[1.15] text-ink lg:text-[48px]">
            {seo?.h1 || "Shop Dog & Cat Supplies in Memphis, TN"}
          </h1>
          <div className="mt-4 max-w-3xl text-base leading-[1.85] text-ink-soft space-y-3">
            {(seo?.copyParagraphs || [
              "Welcome to the All About Pawz shop — the one Memphis address where grooming and shopping live under the same roof.",
            ]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Pet type quick-nav (the species + Sale + Gift Cards rail) */}
          <div className="mt-6 flex flex-wrap gap-2">
            {SHOP_NAV_TAXONOMY.map((animal) => (
              <Link
                key={animal.slug}
                href={`/shop/${animal.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-cream px-4 py-2 text-xs font-bold tracking-[0.12em] text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
              >
                {animal.name}
              </Link>
            ))}
            <Link
              href="/shop/sale"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-cream px-4 py-2 text-xs font-bold tracking-[0.12em] text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              Sale
            </Link>
            <Link
              href="/gift-cards"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-cream px-4 py-2 text-xs font-bold tracking-[0.12em] text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              Gift Cards
            </Link>
            <Link
              href="/shop/brands"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-cream px-4 py-2 text-xs font-bold tracking-[0.12em] text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              Brands
            </Link>
          </div>
        </div>
      </section>

      {/* Real PLP — sidebar rail (categories + filters) + sort toolbar + product grid */}
      <section className="px-6 pb-14 pt-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={sp} path="/shop" />
        </div>
      </section>

      {/* Department quick-links — small tiles, NOT full-page cards */}
      <section className="border-t border-gold/15 bg-cream/30 px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-xs font-bold tracking-[0.14em] text-ink-soft uppercase">
            Browse by Department
          </p>
          <div className="flex flex-wrap gap-2">
            {SHOP_NAV_TAXONOMY.flatMap((a) =>
              a.departments.slice(0, 5).map((d) => ({
                label: d.name,
                href: departmentPath(a.slug, d.slug),
              })),
            ).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded border border-gold/30 bg-white px-3 py-1.5 text-xs text-ink hover:border-gold-deep hover:bg-cream"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Related searches + Related guides (per spec §7) */}
      {seo && (seo.relatedSearches.length > 0 || seo.relatedGuides.length > 0) && (
        <section className="border-t border-gold/15 px-6 py-10 lg:px-12">
          <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-2">
            {seo.relatedSearches.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">
                  Related Searches
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedSearches.map((s, i) => (
                    <li key={i}>
                      <Link
                        href={`/shop?q=${encodeURIComponent(s)}`}
                        className="text-sm text-ink hover:text-gold-deep hover:underline"
                      >
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {seo.relatedGuides.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">
                  Related Guides
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedGuides.map((g, i) => {
                    const slug = g.split("/").pop() || g
                    return (
                      <li key={i}>
                        <Link
                          href={`/guides/grooming/${slug}`}
                          className="text-sm text-ink hover:text-gold-deep hover:underline"
                        >
                          {slug
                            .replace(/-/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Grooming cross-sell band */}
      <section className="border-t border-gold/15 bg-cream/20 px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-ink">Shop Supplies, Then Book the Groom</h2>
            <p className="mt-1 text-sm text-ink-soft">
              All About Pawz is a full-service grooming salon AND a pet supply shop — all under one
              roof at {BUSINESS.address.street}. Bath Only from $45, Bath &amp; Haircut from $75.
            </p>
          </div>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded bg-gold-deep px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>
    </article>
  )
}
