import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarDays, Scissors, ShoppingBag, BookOpen, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { BUSINESS, breadcrumbSchema, faqSchema } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import { findGroomingGuide, getAllGroomingSlugs, GROOMING_GUIDES } from "@/lib/guides-data"
import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// /guides/grooming/[slug] — SSR guide page template for breed grooming
// guides, first-timer series, coat-type guides, and general grooming
// guides. 58 pages total.
//
// Per owner spec:
//   • Q1 (b): AI-assisted drafting, unique copy per guide, stored in CMS
//   • Q5 (a): Data-driven templates — one template renders all 58 pages
//   • §11a: Each page must have unique copy (150-300+ words) to be
//     indexable. Content is generated in Wave 3 via LLM — the template
//     is built now with content slots ready.
//
// Page structure (per national-chain SEO standard):
//   1. H1 + intro paragraph (100-150 words, unique per guide)
//   2. Content sections (2-4 sections, 50-100 words each)
//   3. FAQ block (3-5 Q&A pairs with FAQPage schema)
//   4. Related Products cross-sell ("Shop These Grooming Supplies")
//   5. Related Articles cross-sell ("Related Grooming Guides")
//   6. Booking CTA ("Book a Groom at All About Pawz Memphis")
//   7. Breadcrumb + Article JSON-LD schemas
//
// Every image carries alt text including "All About Pawz Memphis" for
// Google Images capture. Self-canonical (www + /guides/grooming/[slug]).
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllGroomingSlugs()
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const guide = findGroomingGuide(slug)
  if (!guide) return { title: "Guide Not Found | All About Pawz" }

  const title = `${guide.title} | All About Pawz Memphis`
  const description = `Expert ${guide.title.toLowerCase()} from All About Pawz, Memphis's locally owned pet grooming salon. Breed-specific tips, coat care, and booking for ${guide.animal === "dog" ? "dogs" : "cats"} in Shelby County, TN.`

  return {
    title,
    description,
    alternates: { canonical: `/guides/grooming/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/guides/grooming/${slug}`,
      type: "article",
      images: [{
        url: "/assets/grooming-guide-og.jpg",
        width: 1200,
        height: 630,
        alt: `${guide.title} — All About Pawz Memphis, TN`,
      }],
    },
  }
}

// Load AI-generated guide content from /src/content/guides/[slug].json
// Returns null if the content hasn't been generated yet (Wave 3).
function loadGuideContent(slug: string): {
  intro?: string
  sections?: { heading: string; body: string }[]
  faqs?: { q: string; a: string }[]
} | null {
  try {
    const contentPath = path.join(process.cwd(), "src", "content", "guides", `${slug}.json`)
    if (!fs.existsSync(contentPath)) return null
    const raw = fs.readFileSync(contentPath, "utf8")
    const parsed = JSON.parse(raw)
    // Handle z-ai CLI wrapper or direct JSON
    const content = parsed?.choices?.[0]?.message?.content || raw
    if (typeof content === "string") {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) return JSON.parse(jsonMatch[0])
    }
    return typeof content === "object" ? content : null
  } catch {
    return null
  }
}

export default async function GroomingGuidePage({ params }: Params) {
  const { slug } = await params
  const guide = findGroomingGuide(slug)
  if (!guide) notFound()

  const content = loadGuideContent(slug)
  const intro = content?.intro || `${guide.title} — expert guidance from All About Pawz, Memphis's locally owned pet grooming salon and supply shop. Our groomers handle every breed with breed-specific skill and Tennessee-local care.`
  const sections = content?.sections || []
  const faqs = content?.faqs || []

  // Related guides — 4 siblings from the same category
  const relatedGuides = GROOMING_GUIDES
    .filter(g => g.slug !== slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4)

  // JSON-LD schemas
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: `${guide.title} from All About Pawz Memphis, TN`,
    author: { "@type": "Organization", name: "All About Pawz" },
    publisher: { "@type": "Organization", name: "All About Pawz", logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/footer-logo.png` } },
    url: `${SITE_URL}/guides/grooming/${slug}`,
    image: `${SITE_URL}/assets/grooming-guide-og.jpg`,
    datePublished: "2026-10-07",
    dateModified: new Date().toISOString().slice(0, 10),
  }
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Grooming Guides", url: "/guides/grooming" },
    { name: guide.title, url: `/guides/grooming/${slug}` },
  ])
  const faqBlob = faqs.length > 0 ? faqSchema(faqs) : null

  return (
    <>
      <PageHeader n="05" label="GROOMING GUIDES" />

      {/* JSON-LD schemas — server-rendered */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqBlob && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqBlob) }} />}

      <article className="bg-white">
        {/* Full-bleed article container */}
        <div className="mx-auto max-w-4xl px-6 py-16 lg:px-12 lg:py-20">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <span className="text-black/40">/</span>
            <Link href="/guides/grooming" className="hover:text-black">Grooming Guides</Link>
            <span className="text-black/40">/</span>
            <span className="text-ink">{guide.title}</span>
          </nav>

          {/* H1 + intro */}
          <h1 className="mt-6 font-display text-[36px] leading-[1.15] text-ink lg:text-[48px]">
            {guide.title}
          </h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 text-base leading-[1.85] text-ink-soft">{intro}</p>

          {/* Content sections (populated in Wave 3 by LLM) */}
          {sections.length > 0 && (
            <div className="mt-10 space-y-8">
              {sections.map((section, i) => (
                <section key={i}>
                  <h2 className="text-xl font-bold text-ink">{section.heading}</h2>
                  <p className="mt-3 text-base leading-[1.85] text-ink-soft">{section.body}</p>
                </section>
              ))}
            </div>
          )}

          {/* Wave 3 content placeholder — shown when no content yet */}
          {sections.length === 0 && (
            <div className="mt-10 rounded border border-gold/20 bg-cream/30 p-6 text-center">
              <p className="text-sm text-ink-soft">
                This guide is being written. Our Memphis groomers are preparing breed-specific
                content for {guide.title.toLowerCase()}. Check back soon or{" "}
                <Link href="/book/appointment" className="font-bold text-black underline">book a groom</Link>
                {" "}to speak with our groomers directly.
              </p>
            </div>
          )}

          {/* FAQ section */}
          {faqs.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-ink">Frequently Asked Questions</h2>
              <div className="mt-4 divide-y divide-gold/15">
                {faqs.map((faq, i) => (
                  <div key={i} className="py-4">
                    <h3 className="text-base font-bold text-ink">{faq.q}</h3>
                    <p className="mt-2 text-base leading-relaxed text-ink-soft">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related Products cross-sell — "Shop These Grooming Supplies" */}
          <div className="mt-12 border-t border-gold/15 pt-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
              <ShoppingBag className="h-5 w-5 text-black" />
              Shop These Grooming Supplies
            </h2>
            <p className="mt-2 text-base text-ink-soft">
              Everything you need for {guide.animal === "dog" ? "your dog's" : "your cat's"} grooming routine —
              available at our Memphis salon or online.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/shop/dog/grooming-supplies" className="rounded border border-gold-deep/40 px-4 py-2.5 text-sm font-semibold text-ink hover:border-gold-deep hover:bg-cream-deep">
                Dog Grooming Supplies →
              </Link>
              <Link href="/shop/cat/grooming-bathing" className="rounded border border-gold-deep/40 px-4 py-2.5 text-sm font-semibold text-ink hover:border-gold-deep hover:bg-cream-deep">
                Cat Grooming & Bathing →
              </Link>
            </div>
          </div>

          {/* Related Articles cross-sell */}
          <div className="mt-12 border-t border-gold/15 pt-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
              <BookOpen className="h-5 w-5 text-black" />
              Related Grooming Guides
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedGuides.map(rg => (
                <Link
                  key={rg.slug}
                  href={`/guides/grooming/${rg.slug}`}
                  className="group flex items-center justify-between rounded border border-gold/20 p-4 transition-colors hover:border-gold-deep hover:bg-cream/30"
                >
                  <span className="text-sm font-semibold text-ink group-hover:text-black">{rg.title}</span>
                  <ArrowRight className="h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>

          {/* Booking CTA — "Book a Groom at All About Pawz Memphis" */}
          <div className="mt-12 rounded-lg border border-gold-deep/30 bg-cream/20 p-8 text-center">
            <h2 className="text-xl font-bold text-ink">Book a Groom at All About Pawz</h2>
            <p className="mt-2 text-base text-ink-soft">
              Our Memphis groomers are breed-specific experts. {BUSINESS.address.street}, {BUSINESS.address.city}, TN.
              Call <a href={`tel:${BUSINESS.phone}`} className="font-bold text-black underline">{BUSINESS.phoneDisplay}</a> or book online.
            </p>
            <Link
              href="/book/appointment"
              className="mt-4 inline-flex items-center gap-2 rounded bg-gold-deep px-6 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
            >
              <CalendarDays className="h-4 w-4" />
              Book Appointment
            </Link>
          </div>
        </div>
      </article>
    </>
  )
}
