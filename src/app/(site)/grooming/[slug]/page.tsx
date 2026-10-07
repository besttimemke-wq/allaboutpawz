import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, MapPin, Phone, Clock } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { BUSINESS, CITY_LANDINGS, SHELBY_HUB, localBusinessSchema, faqSchema, breadcrumbSchema } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// /grooming/[slug] — the 5 city location pages + Shelby County hub.
// SSR (server-rendered) so Google sees full HTML on first crawl — no
// client-side rendering for SEO pages. Each page carries:
//   • Unique local copy (intro paragraph — locally grounded, not templated)
//   • AI-generated FAQ content (genuinely unique per city — no duplicate
//     paragraphs, per §11a)
//   • LocalBusiness JSON-LD schema with areaServed set to the city
//   • FAQPage JSON-LD schema for rich-result eligibility
//   • BreadcrumbList schema
//   • Self-canonical (www + /grooming/[slug])
//   • Internal linking to other cities + booking + services
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

// Generate static params for the 6 pages (5 cities + Shelby County hub)
export function generateStaticParams() {
  return [
    ...CITY_LANDINGS.map(c => ({ slug: c.slug })),
    { slug: SHELBY_HUB.slug },
  ]
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const city = CITY_LANDINGS.find(c => c.slug === slug)
  const isHub = slug === SHELBY_HUB.slug

  if (!city && !isHub) return { title: "Location Not Found | All About Pawz" }

  const title = isHub ? SHELBY_HUB.titleLong : city!.titleLong
  const description = isHub ? SHELBY_HUB.metaDescription : city!.metaDescription

  return {
    title,
    description,
    alternates: { canonical: `/grooming/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/grooming/${slug}`,
      type: "website",
    },
  }
}

// Load AI-generated FAQ content for the city from /src/content/[slug]-faqs.json
function loadCityFaqs(slug: string): { q: string; a: string }[] {
  try {
    const faqPath = path.join(process.cwd(), "src", "content", `${slug}-faqs.json`)
    if (!fs.existsSync(faqPath)) return []
    const raw = fs.readFileSync(faqPath, "utf8")
    const parsed = JSON.parse(raw)
    // The z-ai CLI wraps the response in a chat completion envelope
    const content = parsed?.choices?.[0]?.message?.content || raw
    // Extract the JSON from the markdown code block if present
    const jsonMatch = typeof content === "string"
      ? content.match(/\{[\s\S]*\}/)
      : null
    const faqData = jsonMatch ? JSON.parse(jsonMatch[0]) : (typeof content === "object" ? content : null)
    return faqData?.faqs || []
  } catch {
    return []
  }
}

export default async function GroomingLocationPage({ params }: Params) {
  const { slug } = await params
  const city = CITY_LANDINGS.find(c => c.slug === slug)
  const isHub = slug === SHELBY_HUB.slug

  if (!city && !isHub) notFound()

  const cityName = isHub ? "Shelby County" : city!.city
  const titleShort = isHub ? SHELBY_HUB.titleShort : city!.titleShort
  const intro = isHub ? SHELBY_HUB.intro : city!.intro

  // Load AI-generated FAQs (fall back to the city data if LLM content
  // isn't available yet)
  const aiFaqs = loadCityFaqs(slug)
  const faqs = aiFaqs.length > 0 ? aiFaqs : (city?.localFaqs || [])

  // Sibling cities for internal linking
  const siblingCities = isHub ? CITY_LANDINGS : [...CITY_LANDINGS.filter(c => c.slug !== slug), { slug: SHELBY_HUB.slug, titleShort: SHELBY_HUB.titleShort } as const]

  // JSON-LD schemas
  const businessSchema = localBusinessSchema(isHub ? undefined : cityName)
  const faqSchemaBlob = faqs.length > 0 ? faqSchema(faqs) : null
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Grooming", url: "/grooming" },
    { name: titleShort, url: `/grooming/${slug}` },
  ])

  return (
    <>
      <PageHeader n="05" label="DOG GROOMING" />

      {/* JSON-LD schemas — server-rendered so Google reads them on first
          crawl. LocalBusiness with areaServed, FAQPage, BreadcrumbList. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema) }}
      />
      {faqSchemaBlob && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaBlob) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-white px-8 py-16 lg:px-12 lg:py-20">
        <div className="mx-auto max-w-4xl">
          {/* H1 + intro paragraph */}
          <h1 className="font-display text-[42px] leading-[1.1] text-ink lg:text-[54px]">
            {titleShort}
          </h1>
          <div className="mt-4">
            <Divider />
          </div>
          <p className="mt-6 text-[14px] leading-[1.85] text-ink-soft">
            {intro}
          </p>

          {/* NAP + booking CTA */}
          <div className="mt-8 flex flex-wrap items-center gap-6 border-y border-gold/20 py-6">
            <div className="flex items-center gap-2 text-[12px] text-ink-soft">
              <MapPin className="h-4 w-4 text-black" />
              {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
            </div>
            <a href={`tel:${BUSINESS.phone}`} className="flex items-center gap-2 text-[12px] font-bold text-ink-soft hover:text-black">
              <Phone className="h-4 w-4 text-black" />
              {BUSINESS.phoneDisplay}
            </a>
            <Link
              href="/book/appointment"
              className="flex items-center gap-2 border border-gold-deep/70 bg-cream-deep px-5 py-2.5 text-[10px] font-bold tracking-[0.14em] text-ink hover:bg-gold-deep hover:text-cream"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              BOOK APPOINTMENT
            </Link>
          </div>

          {/* FAQ block — AI-generated unique content per city.
              Renders as expandable accordion for FAQ rich results. */}
          {faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-[10px] font-bold tracking-[0.22em] text-black">FAQ — DOG GROOMING IN {cityName.toUpperCase()}</h2>
              <div className="mt-6 divide-y divide-gold/15">
                {faqs.map((faq, i) => (
                  <div key={i} className="py-5">
                    <h3 className="text-[14px] font-bold text-ink">{faq.q}</h3>
                    <p className="mt-2 text-[13px] leading-[1.7] text-ink-soft">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services overview — cross-links to /services + /pricing */}
          <div className="mt-12 border-t border-gold/15 pt-8">
            <h2 className="text-[10px] font-bold tracking-[0.22em] text-black">OUR GROOMING SERVICES</h2>
            <p className="mt-3 text-[13px] leading-[1.7] text-ink-soft">
              We offer breed-specific haircuts, spa baths, nail services, de-shedding treatments,
              and full cat grooming at our Memphis salon. See our{" "}
              <Link href="/services" className="font-bold text-black underline hover:text-black">full service menu</Link>
              {" "}and{" "}
              <Link href="/pricing" className="font-bold text-black underline hover:text-black">pricing</Link>.
            </p>
          </div>

          {/* Sibling city links — internal linking so no location page is
              orphaned. Per spec §8: "A page with no inbound internal link
              is a rendering defect." */}
          <div className="mt-12 border-t border-gold/15 pt-8">
            <h2 className="text-[10px] font-bold tracking-[0.22em] text-black">LOCATIONS SERVED</h2>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {siblingCities.map(c => (
                <Link
                  key={c.slug}
                  href={`/grooming/${c.slug}`}
                  className="text-[11px] font-semibold tracking-[0.08em] text-ink-soft hover:text-black"
                >
                  {c.titleShort}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
