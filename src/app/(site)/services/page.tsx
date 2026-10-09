import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { FeaturedServicesGrid } from "@/components/site/islands/featured-services-grid"
import { ServicesAccordion } from "@/components/site/islands/services-accordion"
import { SITE_URL } from "@/lib/site-url"
import { getGuideDataBySlug } from "@/lib/education/taxonomy-data"

// Owner directive: surface a few of the imported SEO guides inside the
// services page. Server-rendered from the static education library — no
// fetch, no CSR delay, renders with the page.
const FEATURED_EDUCATION = [
  "grooming-at-home",
  "grooming-essentials",
  "shampoos-and-conditioners",
  "dental-care",
] as const

export const metadata = {
  title: "Dog Grooming Services | All About Pawz",
  description: "Grooming packages, baths, spa treatments, and nail & paw care — gentle dog grooming tailored to your pup. Book a package today.",
  alternates: { canonical: `${SITE_URL}/services` },
}

export default function ServicesPage() {
  // CSR architecture: static shell; the featured band and the accordion
  // fetch their content client-side after paint.

  return (
    <>
      <PageHeader n="03" label="SERVICES" />
      {/* HERO — site standard: centered text left, image right filling the column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Care That Goes<br />Beyond the Groom.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">Premium grooming services tailored to your dog&apos;s breed, coat, and lifestyle.</p>
          <HeroCtas />
        </div>
        <div className="relative min-h-[300px]">
          <img src="/services/serviceshero.png" alt="White poodle sitting in the All About Pawz dog grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* SECOND SECTION — homepage services band with the new headline. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">OUR SERVICES</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Gentle Care.<br />Beautiful Results.<br />Happy Pups.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              From breed-specific haircuts to relaxing spa baths, we offer a full range of grooming services tailored to your dog&apos;s unique needs.
            </p>
            <Link href="/book" className="btn-gold mt-6">BOOK APPOINTMENT</Link>
          </div>
          <FeaturedServicesGrid />
        </div>
      </section>

      {/* SERVICES ACCORDION — every service category with its pricing INSIDE
          (packages by size + à-la-carte items). All content is managed in the
          admin: Services (categories/images) + Service Items (items/prices). */}
      <section className="marble bg-cream px-8 py-10 lg:px-12">
        <ServicesAccordion />
        <p className="mt-4 text-center text-[11px] italic leading-[1.7] text-ink-soft">Prices are starting points. Final pricing may vary based on coat condition, temperament, and length of service.</p>
      </section>

      {/* PET EDUCATION CENTER — owner-directed: a few of the imported SEO
          guides live here, bridging services → education → shop. */}
      <section className="border-t border-neutral-200 bg-white px-8 py-12 lg:px-12">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              PET EDUCATION CENTER
            </p>
            <h2 className="mt-2 font-display text-[28px] leading-[1.15] text-ink lg:text-[34px]">
              Expert Care Advice, Written by Our Groomers.
            </h2>
            <p className="mt-3 max-w-[520px] text-[12.5px] leading-[1.8] text-ink-soft">
              Veterinary-reviewed guides on coat care, nutrition, and wellness —
              the same standards our salon practices every day.
            </p>
          </div>
          <Link
            href="/pet-education"
            className="inline-flex shrink-0 items-center gap-2 rounded border border-gold-deep/40 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
          >
            Visit the Education Center
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURED_EDUCATION.map((slug) => {
            const guide = getGuideDataBySlug(slug)
            return (
              <Link
                key={slug}
                href={`/pet-education/${slug}`}
                className="group flex flex-col rounded border border-neutral-200 bg-white p-5 transition-colors hover:border-gold-deep hover:bg-cream/30"
              >
                <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">{guide.pillar}</p>
                <h3 className="mt-2 text-[15px] font-bold leading-snug text-ink group-hover:text-black">{guide.heroTitle}</h3>
                <p className="mt-2 line-clamp-3 text-[12px] leading-[1.7] text-ink-soft">{guide.heroSubheadline}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink">
                  Read the guide
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
