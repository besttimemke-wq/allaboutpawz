import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Plp } from "@/components/site/shop/plp"
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
// /shop — the shop landing page. Petco-style: a single breadcrumb + H1 +
// one-sentence intro, then IMMEDIATELY the PLP (sidebar + product grid).
// No big narrative block. No "Browse by Department" pills (the sidebar
// already has them). No placeholder boxes. The SEO copy stays in the
// metadata + a small footer block for crawlers, NOT as a hero wall of text.
// ---------------------------------------------------------------------------

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const seo = findSeoCopy("/shop")

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

      {/* Single breadcrumb + H1 + one-sentence intro. NO narrative wall. */}
      <section className="border-b border-neutral-200 px-6 py-6 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">Shop</span>
          </nav>
          <h1 className="mt-3 font-display text-[28px] leading-[1.15] text-ink lg:text-[32px]">
            {seo?.h1 || "Shop Dog & Cat Supplies in Memphis, TN"}
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
            Locally owned pet supply shop and grooming salon at {BUSINESS.address.street}.
            Food, treats, beds, toys, litter, collars, grooming, and wellness — hand-picked by our groomers.
          </p>
        </div>
      </section>

      {/* The PLP — sidebar (categories + filters) + sort toolbar + product grid */}
      <section className="px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={sp} path="/shop" />
        </div>
      </section>

      {/* Grooming cross-sell — one line, no box */}
      <section className="border-t border-neutral-200 bg-neutral-50 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[13px] text-ink-soft">
            <span className="font-bold text-ink">Shop supplies, then book the groom.</span>{" "}
            Bath Only from $45 · Bath &amp; Haircut from $75.
          </p>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded-md bg-gold-deep px-4 py-2.5 text-[12px] font-bold tracking-[0.12em] text-cream uppercase transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>

      {/* SEO block — hidden visually, machine-readable for crawlers.
          The SEO copy + related searches/guides live here as semantic HTML
          so search engines see them, but customers don't get a wall of text. */}
      {seo && (seo.copyParagraphs.length > 1 || seo.relatedSearches.length > 0 || seo.relatedGuides.length > 0) && (
        <details className="hidden">
          <summary>SEO copy + related searches</summary>
          {seo.copyParagraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {seo.relatedSearches.length > 0 && (
            <ul>
              {seo.relatedSearches.map((s, i) => (
                <li key={i}><Link href={`/shop?q=${encodeURIComponent(s)}`}>{s}</Link></li>
              ))}
            </ul>
          )}
          {seo.relatedGuides.length > 0 && (
            <ul>
              {seo.relatedGuides.map((g, i) => {
                const slug = g.split("/").pop() || g
                return (
                  <li key={i}><Link href={`/guides/grooming/${slug}`}>{slug.replace(/-/g, " ")}</Link></li>
                )
              })}
            </ul>
          )}
        </details>
      )}
    </article>
  )
}
