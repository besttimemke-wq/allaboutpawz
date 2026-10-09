import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight, BedDouble, Bone, BookOpen, Car, ClipboardList, Clock,
  Droplets, HeartPulse, MapPin, Puzzle, Scissors, ShieldCheck, Shirt,
  Star, Tag,
} from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { breadcrumbSchema } from "@/lib/business"
import {
  PRODUCT_CATEGORIES, GUIDES_DIRECTORY, getAllSlugs, getAllSearchItems,
  getGuideDataBySlug, educationPath,
} from "@/lib/education/taxonomy-data"
import type { LucideIcon } from "lucide-react"

// ---------------------------------------------------------------------------
// /pet-education — the Pet Education Center hub. 100% static data (the ported
// SEO guide library), zero DB, zero fetch. The footer already links here.
//
// Palette per owner design law: navy #002B5C headings, gold accents
// (cream/gold/ink tokens), NO brown, NO indigo, NO blue utility colors.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Pet Education Center | All About Pawz Memphis",
  description:
    "The Mid-South's veterinary-reviewed pet care library — grooming, nutrition, health & wellness, and buying guides from All About Pawz, Memphis's locally owned grooming salon & supply shop.",
  alternates: { canonical: "/pet-education" },
  openGraph: {
    title: "Pet Education Center | All About Pawz Memphis",
    description:
      "Grooming, nutrition, health, and buying guides — veterinary-reviewed by the All About Pawz care team in Memphis, TN.",
    url: "/pet-education",
    type: "website",
  },
}

// Category icon mapping (product taxonomy → Lucide glyph).
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "feeding-and-watering": Droplets,
  "grooming-at-home": Scissors,
  "grooming-essentials": Scissors,
  "beds-and-furniture": BedDouble,
  treats: Bone,
  "apparel-and-accessories": Shirt,
  "chew-toys": Puzzle,
  "collars-harnesses-and-leashes": Tag,
  "travel-and-outdoor": Car,
  wellness: HeartPulse,
}

// Stable, high-value editor's picks — each slug resolves through
// getGuideDataBySlug (guides directory + product category profiles).
const EDITORS_PICKS = [
  "grooming-at-home",
  "grooming-essentials",
  "shampoos-and-conditioners",
  "dental-care",
  "feeding-and-watering",
  "hip-and-joint-care",
]

export default function PetEducationHubPage() {
  const allSlugs = getAllSlugs()
  const searchItems = getAllSearchItems()
  const articleCount = GUIDES_DIRECTORY.reduce(
    (n, p) => n + p.subcategories.reduce((m, s) => m + s.items.length, 0), 0)
  const careSheetCount = searchItems.filter(
    (i) => i.group === "Health & Wellness" || i.group === "Feeding & Watering" || i.group === "Wellness"
  ).length
  const picks = EDITORS_PICKS.map((slug) => getGuideDataBySlug(slug))

  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Pet Education Center", url: "/pet-education" },
  ])

  return (
    <>
      <PageHeader n="05" label="PET EDUCATION CENTER" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* ----------------------------------------------------------------- */}
      {/* Hero intro — Mid-South positioning */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-12 pt-14 lg:px-12 lg:pb-16 lg:pt-20">
          <p className="eyebrow">The Mid-South Pet Care Library · Veterinary-Reviewed</p>
          <h1 className="mt-3 max-w-3xl font-display text-[34px] leading-[1.15] text-[#002B5C] lg:text-[48px]">
            Pet Education Center
          </h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-3xl text-base leading-[1.85] text-ink-soft">
            All About Pawz is the Mid-South&rsquo;s seasoned, veterinary-reviewed education
            resource for pet parents. Every guide in this library is written by our certified
            master groomers and nutrition specialists, reviewed by a consulting DVM, and
            grounded in years of hands-on salon work with Memphis and Shelby County pets —
            from Midtown terriers to East Memphis doodles.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <p className="font-display text-[26px] font-bold text-[#002B5C]">{allSlugs.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Guides &amp; care topics</p>
            </div>
            <div>
              <p className="font-display text-[26px] font-bold text-[#002B5C]">{GUIDES_DIRECTORY.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Care pillars</p>
            </div>
            <div>
              <p className="font-display text-[26px] font-bold text-[#002B5C]">100%</p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Veterinary-reviewed</p>
            </div>
            <div className="flex items-center gap-2 text-ink-soft">
              <MapPin className="h-4 w-4 text-[#002B5C]" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Memphis, TN · Shelby County</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Category grid — browse by topic */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-gold/20 bg-cream/30">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-12">
          <h2 className="font-display text-[26px] text-[#002B5C] lg:text-[32px]">Browse by topic</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            {PRODUCT_CATEGORIES.length} supply-side topic families, each opening into its own
            guide with curated product recommendations from our Memphis shop.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PRODUCT_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] ?? BookOpen
              const childCount = cat.children?.length ?? 0
              return (
                <Link
                  key={cat.slug}
                  href={educationPath(cat.slug)}
                  className="group flex min-h-[44px] flex-col rounded-lg border border-gold/25 bg-white p-4 transition-colors hover:border-gold-deep hover:bg-cream/40"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-deep/70">
                    <Icon className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
                  </span>
                  <span className="mt-3 text-[15px] font-bold text-[#002B5C] group-hover:underline">{cat.name}</span>
                  <span className="mt-1 text-xs text-ink-soft">
                    {childCount > 0
                      ? `${childCount} sub-topic guide${childCount === 1 ? "" : "s"}`
                      : "Starter care guide"}
                  </span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
                    Read the guide
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Editor's picks — 6 featured guides */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-12">
          <p className="eyebrow">Handpicked by our groomers</p>
          <h2 className="mt-2 font-display text-[26px] text-[#002B5C] lg:text-[32px]">Editor&rsquo;s picks</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The six guides our Memphis groomers and pet parents reach for most — start here
            and you&rsquo;ll cover ninety percent of everyday pet care.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((guide) => (
              <Link
                key={guide.slug}
                href={educationPath(guide.slug)}
                className="group flex min-h-[44px] flex-col overflow-hidden rounded-lg border border-gold/25 bg-white transition-colors hover:border-gold-deep"
              >
                <span className="relative block aspect-[16/9] w-full overflow-hidden bg-cream-deep/40">
                  <Image
                    src={guide.heroImageUrl}
                    alt={guide.heroImageAlt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </span>
                <span className="flex flex-1 flex-col p-4">
                  <span className="inline-block w-fit rounded bg-cream-deep/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#002B5C]">
                    {guide.kickerBadge}
                  </span>
                  <span className="mt-2.5 text-[16px] font-bold leading-snug text-[#002B5C] group-hover:underline">
                    {guide.heroTitle}
                  </span>
                  <span className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                    {guide.heroSubheadline}
                  </span>
                  <span className="mt-3 flex items-center gap-3 border-t border-gold/15 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {guide.readTime}
                    <span className="ml-auto inline-flex items-center gap-1 text-[#002B5C]">
                      Read guide
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Sub-index links — Articles by pets + Care sheets */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-gold/20 bg-cream/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-14 sm:grid-cols-2 lg:px-12">
          <Link
            href="/pet-education/articles"
            className="group flex min-h-[44px] flex-col rounded-lg border border-gold/25 bg-white p-6 transition-colors hover:border-gold-deep hover:bg-cream/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-deep/70">
              <BookOpen className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
            </span>
            <span className="mt-4 font-display text-[22px] text-[#002B5C]">Articles by pets</span>
            <span className="mt-2 text-sm leading-relaxed text-ink-soft">
              The complete article library — all {articleCount} grooming, nutrition, health,
              buying, and Mid-South local guides, organized pillar by pillar.
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
              Browse all articles
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
          <Link
            href="/pet-education/care-sheets"
            className="group flex min-h-[44px] flex-col rounded-lg border border-gold/25 bg-white p-6 transition-colors hover:border-gold-deep hover:bg-cream/40"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-deep/70">
              <ClipboardList className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
            </span>
            <span className="mt-4 font-display text-[22px] text-[#002B5C]">Pet care sheets</span>
            <span className="mt-2 text-sm leading-relaxed text-ink-soft">
              {careSheetCount} compact, print-friendly checklists distilled from our wellness,
              feeding &amp; watering, and health guides — perfect for the fridge door or the
              pet-sitter binder.
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
              View care sheets
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-gold/25 bg-cream/30 p-6 text-center">
            <span className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 text-gold-deep" fill="currentColor" strokeWidth={0} />
              ))}
            </span>
            <p className="text-sm font-bold text-[#002B5C]">Rated 4.9 out of 5 by 500+ verified Mid-South pet parents</p>
            <p className="flex items-center gap-2 text-xs text-ink-soft">
              <ShieldCheck className="h-4 w-4 text-[#002B5C]" aria-hidden="true" />
              Every guide reviewed by Dr. Michael Vance, DVM — Mid-South Veterinary Consultant
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
