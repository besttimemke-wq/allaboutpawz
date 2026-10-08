import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, ArrowRight, Minus, PawPrint, Plus } from "lucide-react"
import { SITE_URL } from "@/lib/site-url"
import { findSeoCopy } from "@/lib/shop/seo-copy"
import { BUSINESS } from "@/lib/business"
import { SHOP_ANIMALS, SHOP_NAV_TAXONOMY, departmentPath } from "@/lib/shop-nav"
import { ShopPromoBanner } from "@/components/site/shop/shop-promo-banner"

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

  const animalCards = SHOP_ANIMALS.map((animal) => {
    const taxonomy = SHOP_NAV_TAXONOMY.find((entry) => entry.slug === animal.slug)
    return {
      ...animal,
      description: taxonomy?.tagline || "Browse the full collection.",
      departments: taxonomy?.departments || [],
      image: animal.slug === "cat"
        ? "/Shop/departments/cat-food.jpeg"
        : animal.slug === "dog"
          ? "/Shop/departments/dog-food.jpeg"
          : null,
    }
  })

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

      <section className="px-6 py-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-[20px] font-bold text-[#002B5C] lg:text-[24px]">Shop by Animal</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {animalCards.map((c) => (
              <details key={c.href} className="group border border-neutral-200 bg-white open:border-[#F2C500]">
                <summary className="list-none cursor-pointer">
                  <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100">
                    {c.image ? (
                      <img src={c.image} alt={c.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#002B5C]/45">
                        <PawPrint className="h-10 w-10" strokeWidth={1.3} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition-colors group-hover:bg-[#FFF9D9]">
                    <div>
                      <h3 className="text-[13px] font-bold text-[#002B5C]">{c.name}</h3>
                      <p className="mt-1 text-[11px] text-neutral-600">{c.description}</p>
                    </div>
                    <Plus className="h-4 w-4 shrink-0 text-[#002B5C] group-open:hidden" aria-hidden="true" />
                    <Minus className="hidden h-4 w-4 shrink-0 text-[#002B5C] group-open:block" aria-hidden="true" />
                  </div>
                </summary>
                <div className="border-t border-neutral-200 px-4 py-3">
                  {c.departments.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                      {c.departments.map((department) => (
                        <li key={department.slug}>
                          <Link href={departmentPath(c.slug, department.slug)} className="text-[11px] text-neutral-700 transition-colors hover:text-[#806500] hover:underline">
                            {department.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-neutral-600">Browse available {c.name.toLowerCase()} categories.</p>
                  )}
                  <Link href={c.href} className="mt-3 inline-flex min-h-9 items-center gap-2 bg-[#002B5C] px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]">
                    Shop all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ShopPromoBanner image="/Shop/departments/cat-food.jpeg" imageAlt="All About Pawz shop offer" href="/shop" />

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
