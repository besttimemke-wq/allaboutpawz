import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { breadcrumbSchema } from "@/lib/business"
import { GUIDES_DIRECTORY, educationPath } from "@/lib/education/taxonomy-data"

// ---------------------------------------------------------------------------
// /pet-education/articles — the complete article index. Every guide in
// GUIDES_DIRECTORY, grouped pillar → subcategory → item, linked through
// educationPath(). 100% static data, zero DB, zero fetch.
//
// Long subcategory lists (up to 30 breed guides) scroll inside their own
// max-h box so the page stays navigable instead of becoming an endless wall.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Pet Care Articles by Topic | All About Pawz Memphis",
  description:
    "Browse every pet care article from All About Pawz — grooming, nutrition, health & wellness, buying guides, and Mid-South local guides, all veterinary-reviewed in Memphis, TN.",
  alternates: { canonical: "/pet-education/articles" },
  openGraph: {
    title: "Pet Care Articles by Topic | All About Pawz Memphis",
    description:
      "Every grooming, nutrition, health, buying, and local pet care article from the All About Pawz education library.",
    url: "/pet-education/articles",
    type: "website",
  },
}

/** Pillars anchor slugs for in-page jump links. */
function pillarAnchor(pillar: string): string {
  switch (pillar) {
    case "Grooming": return "pillar-grooming"
    case "Nutrition": return "pillar-nutrition"
    case "Health & Wellness": return "pillar-health"
    case "Buying Guides": return "pillar-buying-guides"
    case "Local Mid-South": return "pillar-local"
    default: return `pillar-${pillar.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  }
}

export default function PetEducationArticlesPage() {
  const totalArticles = GUIDES_DIRECTORY.reduce(
    (n, p) => n + p.subcategories.reduce((m, s) => m + s.items.length, 0), 0)

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Pet Education Center", url: "/pet-education" },
    { name: "Articles by Pets", url: "/pet-education/articles" },
  ])

  return (
    <>
      <PageHeader n="05" label="PET EDUCATION CENTER · ARTICLES" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Intro */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 lg:px-12 lg:pt-20">
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <span className="text-black/40">/</span>
            <Link href="/pet-education" className="hover:text-black">Pet Education Center</Link>
            <span className="text-black/40">/</span>
            <span className="text-ink">Articles by Pets</span>
          </nav>

          <h1 className="mt-6 font-display text-[34px] leading-[1.15] text-[#002B5C] lg:text-[44px]">
            Articles by Pets
          </h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-3xl text-base leading-[1.85] text-ink-soft">
            The complete All About Pawz article library — {totalArticles} veterinary-reviewed
            guides across {GUIDES_DIRECTORY.length} care pillars. Start with a pillar below,
            or jump straight to the breed, diet, or care question you need answered today.
          </p>

          {/* Pillar jump links */}
          <div className="mt-8 flex flex-wrap gap-2">
            {GUIDES_DIRECTORY.map((pillar) => (
              <a
                key={pillar.pillar}
                href={`#${pillarAnchor(pillar.pillar)}`}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-gold/30 bg-cream/40 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#002B5C] transition-colors hover:border-gold-deep hover:bg-cream-deep"
              >
                {pillar.pillar}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Pillars */}
      {GUIDES_DIRECTORY.map((pillar, pillarIndex) => (
        <section
          key={pillar.pillar}
          id={pillarAnchor(pillar.pillar)}
          className={`scroll-mt-24 border-t border-gold/20 ${pillarIndex % 2 === 0 ? "bg-white" : "bg-cream/30"}`}
        >
          <div className="mx-auto max-w-6xl px-6 py-12 lg:px-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-[26px] text-[#002B5C] lg:text-[32px]">{pillar.pillar}</h2>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">
                {pillar.subcategories.reduce((n, s) => n + s.items.length, 0)} articles
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pillar.subcategories.map((sub) => (
                <div
                  key={sub.name}
                  className="rounded-lg border border-gold/25 bg-white p-4"
                >
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#002B5C]">
                    {sub.name}
                  </h3>
                  {/* Long lists scroll — max-h with overflow-y-auto, quiet scrollbar */}
                  <ul
                    className={`mt-3 space-y-1 pr-1 shop-nav-scroll ${
                      sub.items.length > 10 ? "max-h-80 overflow-y-auto" : ""
                    }`}
                  >
                    {sub.items.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={educationPath(item.slug)}
                          className="group flex min-h-[36px] items-center gap-2 rounded px-2 py-1.5 text-[13.5px] leading-snug text-ink-soft transition-colors hover:bg-cream/60 hover:text-black"
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-gold-deep" aria-hidden="true" />
                          <span className="group-hover:underline">{item.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Cross-link back to hub + care sheets */}
      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center lg:px-12">
          <h2 className="font-display text-[22px] text-[#002B5C]">Keep exploring the Education Center</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pet-education"
              className="inline-flex min-h-[44px] items-center gap-2 rounded border border-gold-deep/40 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              Pet Education Center home
            </Link>
            <Link
              href="/pet-education/care-sheets"
              className="inline-flex min-h-[44px] items-center gap-2 rounded border border-gold-deep/40 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              Printable care sheets
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
