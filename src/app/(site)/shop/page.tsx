import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, ArrowRight, Search } from "lucide-react"
import { SITE_URL } from "@/lib/site-url"
import { findSeoCopy } from "@/lib/shop/seo-copy"
import { BUSINESS } from "@/lib/business"
import { SHOP_NAV_TAXONOMY, departmentPath } from "@/lib/shop-nav"

export const metadata: Metadata = {
  title: "Dog & Cat Supplies, grooming & shopping in Memphis, TN | All About Pawz",
  description:
    "Shop dog and cat supplies, book grooming, and find Memphis deals at All About Pawz — Memphis' full-service grooming and shopping destination.",
  alternates: { canonical: `${SITE_URL}/shop` },
}

// ---------------------------------------------------------------------------
// /shop — the shop landing. Petco-style: H1 + promo banner + horizontal
// animal cards (Cat, Dog). NO sidebar (it appears on the leaf subcategory
// pages). NO narrative. The customer picks an animal to drill in.
// ---------------------------------------------------------------------------

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShopPage({ searchParams }: PageProps) {
  await searchParams // searchParams read for stability; not used in landing
  const seo = findSeoCopy("/shop")

  // Build the two animal cards (Cat, Dog) — the only navigation on /shop.
  const animalCards = SHOP_NAV_TAXONOMY.map((animal) => ({
    name: animal.name,
    description: animal.tagline,
    href: `/shop/${animal.slug}`,
    deptCount: animal.departments.length,
    firstDeptHref: animal.departments[0]
      ? departmentPath(animal.slug, animal.departments[0].slug)
      : `/shop/${animal.slug}`,
  }))

  return (
    <article className="bg-white">
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

      {/* Breadcrumb + H1 + 1-sentence intro. NO narrative wall. */}
      <section className="border-b border-neutral-200 px-6 py-6 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">Shop</span>
          </nav>
          <h1 className="mt-3 font-display text-[28px] leading-[1.15] text-ink lg:text-[36px]">
            {seo?.h1 || "Shop Dog & Cat Supplies in Memphis, TN"}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
            Locally owned pet supply shop and grooming salon at {BUSINESS.address.street}.
            Pick an animal to start.
          </p>
        </div>
      </section>

      {/* Animal cards — Cat, Dog. The only navigation on /shop. */}
      <section className="px-6 py-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-[20px] font-bold text-ink lg:text-[24px]">Shop by Animal</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {animalCards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group overflow-hidden rounded-lg border border-neutral-200 bg-white transition-all hover:border-[#002B5C] hover:shadow-md"
              >
                <div className="aspect-[16/9] overflow-hidden bg-neutral-100">
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                    <Search className="h-10 w-10 text-neutral-400" strokeWidth={1.5} aria-hidden="true" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-5">
                  <div>
                    <h3 className="text-[18px] font-bold text-ink group-hover:text-[#002B5C]">{c.name}</h3>
                    <p className="mt-1 text-[13px] text-ink-soft">{c.description}</p>
                    <p className="mt-1 text-[11px] text-ink-soft/70">{c.deptCount} departments</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-ink-soft transition-colors group-hover:text-[#002B5C]" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Grooming cross-sell — single line, no box */}
      <section className="border-t border-neutral-200 bg-neutral-50 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[13px] text-ink-soft">
            <span className="font-bold text-ink">Shop supplies, then book the groom.</span>{" "}
            Bath Only from $45 · Bath &amp; Haircut from $75.
          </p>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded-md bg-[#002B5C] px-4 py-2.5 text-[12px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-[#002B5C]"
          >
            Book a Groom →
          </Link>
        </div>
      </section>

      {/* SEO block — hidden for crawlers */}
      {seo && seo.copyParagraphs.length > 0 && (
        <details className="hidden">
          <summary>SEO copy + related searches</summary>
          {seo.copyParagraphs.map((p, i) => <p key={i}>{p}</p>)}
          {seo.relatedSearches.length > 0 && (
            <ul>{seo.relatedSearches.map((s, i) => <li key={i}><Link href={`/shop?q=${encodeURIComponent(s)}`}>{s}</Link></li>)}</ul>
          )}
          {seo.relatedGuides.length > 0 && (
            <ul>{seo.relatedGuides.map((g, i) => {
              const slug = g.split("/").pop() || g
              return <li key={i}><Link href={`/guides/grooming/${slug}`}>{slug.replace(/-/g, " ")}</Link></li>
            })}</ul>
          )}
        </details>
      )}
    </article>
  )
}
