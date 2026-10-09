import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import {
  ArrowRight, Award, BookOpen, CalendarDays, Check, Clock, Heart, MapPin,
  Medal, Scissors, ShieldCheck, ShoppingBag, Sparkles, Star, Wrench,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { BUSINESS, breadcrumbSchema, faqSchema } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import {
  GUIDES_DIRECTORY, getAllSlugs, getGuideDataBySlug, educationPath,
} from "@/lib/education/taxonomy-data"
import type { TakeawayItem, WhyFeatureItem } from "@/lib/education/types"

// ---------------------------------------------------------------------------
// /pet-education/[slug] — the guide template for the entire ported SEO
// library (185 static pages: guide-directory items + product category
// guides). 100% static data, zero DB, zero fetch, pre-rendered at build.
//
// Design language mirrors /guides/grooming/[slug]: cream/gold/ink palette,
// navy #002B5C display headings, gold accents. NO brown, NO indigo, NO blue
// utility colors.
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

const ALL_EDUCATION_SLUGS = new Set(getAllSlugs())

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  if (!ALL_EDUCATION_SLUGS.has(slug)) {
    return { title: "Guide Not Found | All About Pawz" }
  }
  const data = getGuideDataBySlug(slug)
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: { canonical: data.canonicalUrl },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: data.canonicalUrl,
      type: "article",
      images: [{
        url: `${SITE_URL}${data.heroImageUrl}`,
        alt: data.heroImageAlt,
      }],
    },
  }
}

// ---------------------------------------------------------------------------
// Icon maps — data icon names → Lucide components (gold/ink/navy only).
// ---------------------------------------------------------------------------

const TAKEAWAY_ICONS: Record<TakeawayItem["icon"], LucideIcon> = {
  scissors: Scissors,
  shield: ShieldCheck,
  heart: Heart,
  sparkles: Sparkles,
  check: Check,
  award: Award,
  clock: Clock,
  "map-pin": MapPin,
}

const WHY_ICONS: Record<WhyFeatureItem["icon"], LucideIcon> = {
  trust: ShieldCheck,
  tools: Wrench,
  services: Sparkles,
  heart: Heart,
  medal: Medal,
}

/** Text-only shop CTA per pillar — real shop routes only, no fake product URLs. */
function shopCtaFor(pillar: string): { href: string; label: string } {
  const p = pillar.toLowerCase()
  if (p.includes("groom")) {
    return { href: "/shop/dog/grooming-supplies", label: "Shop dog grooming supplies" }
  }
  if (p.includes("nutrition") || p.includes("treat")) {
    return { href: "/shop/dog/dog-treats", label: "Shop dog treats" }
  }
  return { href: "/shop/dog", label: "Shop all dog supplies" }
}

/** Callout palette — gold (pro-tip), ink (warning), navy (vet-note). */
function calloutClasses(type: "pro-tip" | "warning" | "vet-note"): string {
  switch (type) {
    case "pro-tip": return "border-gold-deep bg-cream/50"
    case "warning": return "border-ink bg-cream-deep/50"
    case "vet-note": return "border-[#002B5C] bg-[#002B5C]/5"
  }
}

export default async function EducationGuidePage({ params }: Params) {
  const { slug } = await params
  if (!ALL_EDUCATION_SLUGS.has(slug)) notFound()
  const data = getGuideDataBySlug(slug)

  // Related guides — 4 siblings from the same pillar (deterministic for SSG),
  // falling back to the first directory slugs when the pillar can't be found.
  const pillarEntry = GUIDES_DIRECTORY.find((p) =>
    p.subcategories.some((s) => s.items.some((i) => i.slug === slug)))
  const relatedGuides = pillarEntry
    ? pillarEntry.subcategories.flatMap((s) => s.items).filter((i) => i.slug !== slug).slice(0, 4)
    : Array.from(ALL_EDUCATION_SLUGS).filter((s) => s !== slug).slice(0, 4)
        .map((s) => ({ name: getGuideDataBySlug(s).heroTitle, slug: s }))

  const shopCta = shopCtaFor(data.pillar)

  // JSON-LD — Article, FAQPage (when FAQs exist), BreadcrumbList.
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.heroTitle,
    description: data.metaDescription,
    author: { "@type": "Organization", name: data.author.name },
    publisher: {
      "@type": "Organization",
      name: "All About Pawz",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/footer-logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": data.canonicalUrl },
    image: `${SITE_URL}${data.heroImageUrl}`,
    datePublished: "2026-10-07",
    dateModified: new Date().toISOString().slice(0, 10),
  }
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Pet Education Center", url: "/pet-education" },
    { name: data.heroTitle, url: educationPath(slug) },
  ])
  const faqBlob = data.faqs.length > 0
    ? faqSchema(data.faqs.map((f) => ({ q: f.question, a: f.answer })))
    : null

  return (
    <>
      <PageHeader n="05" label="PET EDUCATION CENTER" />

      {/* JSON-LD schemas — server-rendered */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqBlob && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqBlob) }} />}

      {/* ================================================================ */}
      {/* a+b. Breadcrumb + Hero */}
      {/* ================================================================ */}
      <article className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-10 lg:px-12 lg:pt-14">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <span className="text-black/40">/</span>
            <Link href="/pet-education" className="hover:text-black">Pet Education Center</Link>
            <span className="text-black/40">/</span>
            <span className="text-ink">{data.heroTitle}</span>
          </nav>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
            {/* Left — title, rating, byline */}
            <div>
              <span className="inline-block rounded bg-cream-deep/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#002B5C]">
                {data.kickerBadge}
              </span>
              <h1 className="mt-4 font-display text-[32px] leading-[1.15] text-[#002B5C] lg:text-[44px]">
                {data.heroTitle}
              </h1>
              <p className="mt-4 text-base leading-[1.8] text-ink-soft">{data.heroSubheadline}</p>

              {/* Rating line */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-gold-deep" fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
                <span className="text-sm font-bold text-ink">{data.heroRatingText}</span>
                <span className="text-sm text-ink-soft">({data.heroRatingCount})</span>
              </div>

              {/* Byline row */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-gold/15 pt-5">
                <span className="flex items-center gap-2.5">
                  <Image
                    src={data.author.avatarUrl}
                    alt={`${data.author.name} — ${data.author.role}, All About Pawz Memphis`}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border border-gold/30 object-cover"
                  />
                  <span className="text-xs leading-tight text-ink-soft">
                    <strong className="block text-[13px] text-ink">{data.author.name}</strong>
                    {data.author.role}
                  </span>
                </span>
                {data.veterinaryReviewer && (
                  <span className="flex items-center gap-2 text-xs leading-tight text-ink-soft">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-[#002B5C]" aria-hidden="true" />
                    <span>
                      <strong className="block text-[13px] text-ink">Vet reviewed · {data.veterinaryReviewer.name}</strong>
                      {data.veterinaryReviewer.title}
                    </span>
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {data.readTime}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {data.lastUpdated}
                </span>
              </div>
            </div>

            {/* Right — hero image + booking card */}
            <div>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gold/25 bg-cream-deep/40">
                <Image
                  src={data.heroImageUrl}
                  alt={data.heroImageAlt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-4 rounded-lg border border-gold/25 bg-cream/40 p-5 text-center">
                <Link
                  href="/book/appointment"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded bg-gold-deep px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-gold"
                >
                  {data.heroCtaText}
                </Link>
                <p className="mt-2 text-xs text-ink-soft">{data.heroCtaSubtext}</p>
                <p className="mt-1 text-[10.5px] text-ink-soft/80">{data.heroFootnote}</p>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* ================================================================ */}
      {/* c. Takeaway cards */}
      {/* ================================================================ */}
      <section className="border-t border-gold/20 bg-cream/30">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-12">
          <p className="eyebrow">{data.incentivesKicker}</p>
          <h2 className="mt-2 font-display text-[26px] text-[#002B5C] lg:text-[32px]">
            {data.incentivesHeadline}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">{data.incentivesSubhead}</p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.takeawayCards.slice(0, 3).map((card) => {
              const Icon = TAKEAWAY_ICONS[card.icon] ?? Check
              return (
                <div key={card.title} className="rounded-lg border border-gold/25 bg-white p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream-deep/70">
                    <Icon className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-[16px] font-bold text-[#002B5C]">{card.title}</h3>
                  <ul className="mt-3 space-y-2.5">
                    {card.items.map((item, i) => (
                      <li key={i} className="text-[13.5px] leading-relaxed text-ink-soft">
                        <strong className="font-bold text-ink">{item.highlight}</strong> {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* d. Why All About Pawz + testimonials */}
      {/* ================================================================ */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-5 lg:px-12">
          <div className="lg:col-span-3">
            <h2 className="font-display text-[26px] text-[#002B5C] lg:text-[32px]">{data.whyHeadline}</h2>
            <div className="mt-6 space-y-5">
              {data.whyFeatures.map((feature) => {
                const Icon = WHY_ICONS[feature.icon] ?? ShieldCheck
                return (
                  <div key={feature.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-deep/70">
                      <Icon className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-bold text-ink">{feature.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link
              href="/book/appointment"
              className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded bg-gold-deep px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-gold"
            >
              {data.whyCtaText}
            </Link>
          </div>

          {data.testimonials.length > 0 && (
            <div className="space-y-4 lg:col-span-2">
              {data.testimonials.slice(0, 2).map((t, i) => (
                <figure key={i} className="rounded-lg border border-gold/25 bg-cream/40 p-6">
                  <span className="flex items-center gap-0.5" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5 text-gold-deep" fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                  <blockquote className="mt-3 text-sm leading-relaxed text-ink">{t.quote}</blockquote>
                  <figcaption className="mt-4 flex items-center gap-2.5">
                    <Image
                      src={t.avatarUrl}
                      alt={`${t.authorName} — ${t.authorRole}`}
                      width={36}
                      height={36}
                      className="h-9 w-9 rounded-full border border-gold/30 object-cover"
                    />
                    <span className="text-xs leading-tight text-ink-soft">
                      <strong className="block text-[13px] text-ink">{t.authorName}</strong>
                      {t.authorRole}
                    </span>
                  </figcaption>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-gold-deep">
                    {t.storyLinkText}
                  </p>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================================================================ */}
      {/* e. Article body — TOC + sections */}
      {/* ================================================================ */}
      <section className="border-t border-gold/20 bg-cream/30">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-12">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[250px_1fr] lg:gap-12">
            {/* Table of contents — sticks on desktop */}
            <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Table of contents">
              <nav className="rounded-lg border border-gold/25 bg-white p-5">
                <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">On this page</h2>
                <ul className="mt-3 space-y-1.5">
                  {data.tableOfContents.map((toc) => (
                    <li key={toc.id}>
                      <a
                        href={`#${toc.id}`}
                        className="flex min-h-[32px] items-center text-[13.5px] leading-snug text-ink-soft transition-colors hover:text-[#002B5C] hover:underline"
                      >
                        {toc.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <div className="min-w-0">
              <p className="text-lg leading-[1.85] text-ink">{data.introSummary}</p>

              <div className="mt-10 space-y-12">
                {data.sections.map((section) => (
                  <section key={section.id} id={section.id} className="scroll-mt-24">
                    <h2 className="font-display text-[24px] leading-snug text-[#002B5C] lg:text-[28px]">
                      {section.title}
                    </h2>
                    <p className="mt-4 text-base leading-[1.85] text-ink-soft">{section.content}</p>

                    {section.tips && section.tips.length > 0 && (
                      <ul className="mt-5 space-y-2.5">
                        {section.tips.map((tip, i) => (
                          <li key={i} className="flex gap-3">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-deep/15">
                              <Check className="h-3.5 w-3.5 text-gold-deep" strokeWidth={3} aria-hidden="true" />
                            </span>
                            <span className="text-[14.5px] leading-relaxed text-ink-soft">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.callout && (
                      <aside className={`mt-5 rounded-r-lg border-l-4 p-5 ${calloutClasses(section.callout.type)}`}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                          {section.callout.type === "pro-tip" && "Pro tip"}
                          {section.callout.type === "warning" && "Warning"}
                          {section.callout.type === "vet-note" && "Veterinary note"}
                        </p>
                        <p className="mt-1 text-[14.5px] font-bold text-ink">{section.callout.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{section.callout.text}</p>
                      </aside>
                    )}

                    {section.tableData && (
                      <div className="mt-6 overflow-x-auto rounded-lg border border-gold/25">
                        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                          <thead>
                            <tr className="bg-[#002B5C] text-white">
                              {section.tableData.headers.map((h, i) => (
                                <th key={i} className="p-3 text-[11px] font-bold uppercase tracking-[0.1em]">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.tableData.rows.map((row, r) => (
                              <tr key={r} className={r % 2 === 0 ? "bg-white" : "bg-cream/40"}>
                                {row.map((cell, c) => (
                                  <td key={c} className={`p-3 align-top leading-relaxed ${c === 0 ? "font-bold text-ink" : "text-ink-soft"}`}>
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* f. Recommended products (display cards + text-link shop CTA) */}
      {/* ================================================================ */}
      <section id="recommended-tools" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-12">
          <h2 className="flex items-center gap-2 font-display text-[26px] text-[#002B5C] lg:text-[32px]">
            <ShoppingBag className="h-6 w-6 text-[#002B5C]" aria-hidden="true" />
            Recommended by our groomers
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            The exact categories our Memphis salon stocks for this routine — available in-shop
            at 699 Waring Rd or through our online boutique.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.relatedProducts.map((product) => (
              <div key={product.id} className="flex flex-col rounded-lg border border-gold/25 bg-white p-4">
                <span className="inline-block w-fit rounded bg-cream-deep/70 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#002B5C]">
                  {product.badge || product.category}
                </span>
                <h3 className="mt-2.5 text-[14.5px] font-bold leading-snug text-ink">{product.name}</h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-soft">{product.category}</p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-soft">{product.description}</p>
                <div className="mt-3 flex items-center justify-between border-t border-gold/15 pt-3">
                  <span className="text-[15px] font-bold text-[#002B5C]">{product.price}</span>
                  <span className="flex items-center gap-1 text-xs text-ink-soft">
                    <Star className="h-3.5 w-3.5 text-gold-deep" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    {product.rating.toFixed(1)} · {product.reviewsCount} reviews
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href={shopCta.href}
              className="inline-flex min-h-[44px] items-center gap-2 rounded border border-gold-deep/40 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              {shopCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* g. FAQs */}
      {/* ================================================================ */}
      {data.faqs.length > 0 && (
        <section id="frequently-asked-questions" className="scroll-mt-24 border-t border-gold/15 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-14 lg:px-12">
            <h2 className="font-display text-[26px] text-[#002B5C] lg:text-[32px]">Frequently asked questions</h2>
            <div className="mt-4 divide-y divide-gold/15">
              {data.faqs.map((faq, i) => (
                <div key={i} className="py-5">
                  <h3 className="text-base font-bold text-ink">{faq.question}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* h. Local block — service city + areas */}
      {/* ================================================================ */}
      {(data.serviceCity || data.localServiceAreas.length > 0) && (
        <section className="border-t border-gold/20 bg-cream/30">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 text-sm font-bold text-[#002B5C]">
                <MapPin className="h-5 w-5 text-[#002B5C]" aria-hidden="true" />
                Serving {data.serviceCity || "Memphis, TN"} &amp; the Mid-South
              </span>
              <ul className="flex flex-wrap gap-2">
                {data.localServiceAreas.map((area) => (
                  <li
                    key={area}
                    className="rounded-full border border-gold/30 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* i. Related guides — same pillar */}
      {/* ================================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-12">
          <h2 className="flex items-center gap-2 font-display text-[26px] text-[#002B5C] lg:text-[32px]">
            <BookOpen className="h-6 w-6 text-[#002B5C]" aria-hidden="true" />
            {pillarEntry ? `More from our ${pillarEntry.pillar} pillar` : "Related guides"}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {relatedGuides.map((rg) => (
              <Link
                key={rg.slug}
                href={educationPath(rg.slug)}
                className="group flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-gold/25 p-4 transition-colors hover:border-gold-deep hover:bg-cream/40"
              >
                <span className="text-sm font-semibold leading-snug text-ink group-hover:underline">{rg.name}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-[#002B5C] transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* j. Booking CTA */}
      {/* ================================================================ */}
      <section className="bg-cream/30 pb-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-12">
          <div className="rounded-lg border border-gold-deep/30 bg-white p-8 text-center shadow-sm">
            <h2 className="font-display text-[24px] text-[#002B5C] lg:text-[28px]">
              Book a groom at All About Pawz
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Questions about this guide? Our Memphis groomers answer them every day.
              {" "}{BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region}{" "}
              {BUSINESS.address.postalCode}. Call{" "}
              <a href={`tel:${BUSINESS.phone}`} className="font-bold text-ink underline">
                {BUSINESS.phoneDisplay}
              </a>{" "}
              or book online.
            </p>
            <Link
              href="/book/appointment"
              className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded bg-gold-deep px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-gold"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Book Appointment
            </Link>
            <div className="mt-5"><Divider /></div>
            <p className="mt-3 text-xs text-ink-soft">
              Explore more in the{" "}
              <Link href="/pet-education" className="font-bold text-[#002B5C] underline">
                Pet Education Center
              </Link>{" "}
              — the Mid-South&rsquo;s veterinary-reviewed pet care library.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
