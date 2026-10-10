import Link from "next/link"
import Image from "next/image"
import { ArrowRight, BookOpen, PawPrint } from "lucide-react"
import type { GuidePageData } from "@/lib/pawzsly-u/types"

function routeFor(path: string): string {
  return `/pawzsly-u/memphis${path.startsWith("/") ? path : `/${path}`}`
}

export function PawzslyULanding({
  categories,
}: {
  categories: { name: string; slug: string; children?: { name: string; slug: string }[] }[]
}) {
  const petGuides = [
    { number: "01", name: "Dogs", description: "Breed grooming, everyday care, nutrition, and supplies.", href: "/dog-breeds", linkText: "Choose a breed", accent: "border-t-orange-600" },
    { number: "02", name: "Fish & Aquatics", description: "Aquariums, water care, filtration, food, and habitat gear.", href: "/fish-and-aquatics", linkText: "Browse aquatics", accent: "border-t-cyan-700" },
    { number: "03", name: "Birds", description: "Cages, perches, food, enrichment, and daily care.", href: "/bird", linkText: "Browse bird guides", accent: "border-t-amber-600" },
    { number: "04", name: "Reptiles", description: "Habitats, lighting, heating, substrates, and supplies.", href: "/reptile", linkText: "Browse reptile guides", accent: "border-t-emerald-700" },
    { number: "05", name: "Small Animals", description: "Guides to food, bedding, habitats, litter, and enrichment.", href: "/small-animal", linkText: "Browse small animal guides", accent: "border-t-orange-700" },
  ]
  const featuredArticles = [
    { eyebrow: "DOG GROOMING", title: "Doodle coat care and grooming", description: "Brushing, mat prevention, bath timing, and salon cut basics.", href: "/doodle-grooming" },
    { eyebrow: "FIRST GROOM", title: "Preparing a puppy for its first groom", description: "A calm, step-by-step introduction to the grooming routine.", href: "/puppys-first-groom" },
    { eyebrow: "CAT GROOMING", title: "A gentle guide to a kitten’s first groom", description: "Build comfort with handling, tools, and a first appointment.", href: "/kittens-first-groom" },
  ]

  return (
    <article className="flex min-h-screen flex-col bg-white text-stone-900">
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8">
        <section className="my-5 grid overflow-hidden bg-[#f1f2ed] md:grid-cols-[1.08fr_0.92fr] lg:my-8">
          <div className="flex flex-col items-start justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
            <p className="mb-4 text-xs font-bold uppercase text-orange-800">Pawzsly U · Memphis pet care library</p>
            <h1 className="max-w-2xl text-3xl font-black leading-tight text-stone-950 sm:text-4xl lg:text-5xl">
              Pet care guides, organized by animal.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-700 sm:text-base">
              Start with the pet you care for. Explore practical articles, care topics, and supply guides without digging through an unrelated list.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="#pet-guides" className="inline-flex min-h-11 items-center gap-2 bg-stone-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-800">
                Find your pet&apos;s guides <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#all-categories" className="inline-flex min-h-11 items-center gap-2 border border-stone-400 px-5 text-sm font-bold text-stone-900 transition-colors hover:bg-white">
                <BookOpen className="h-4 w-4" /> All articles
              </Link>
            </div>
          </div>
          <div className="relative min-h-56 sm:min-h-72 md:min-h-full">
            <Image src="/pawzsly-u/images/hero_grooming_dog_1791411047518.jpg" alt="A freshly groomed dog in a salon" fill priority sizes="(max-width: 768px) 100vw, 46vw" className="object-cover" />
          </div>
        </section>

        <section id="pet-guides" className="scroll-mt-24 py-7 sm:py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <p className="text-xs font-bold uppercase text-stone-500">Browse by pet</p>
              <h2 className="mt-1 text-2xl font-black text-stone-950 sm:text-3xl">Where should we start?</h2>
            </div>
            <PawPrint className="mb-1 h-6 w-6 text-orange-700" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {petGuides.map((pet) => (
              <article key={pet.number} className={`flex min-h-48 flex-col border border-stone-200 border-t-[3px] ${pet.accent} p-4`}>
                <p className="text-[10px] font-bold tabular-nums text-stone-500">{pet.number} / 05</p>
                <h3 className="mt-3 text-lg font-extrabold text-stone-950">{pet.name}</h3>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-stone-600">{pet.description}</p>
                <Link href={routeFor(pet.href)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-stone-900 hover:text-orange-800">
                  {pet.linkText} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="all-categories" className="border-t border-stone-200 py-8 sm:py-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-4">
            <div>
              <p className="text-xs font-bold uppercase text-stone-500">Complete directory</p>
              <h2 className="mt-1 text-2xl font-black text-stone-950 sm:text-3xl">Every category, in one place.</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.slug} href={routeFor(`/${category.slug}`)} className="group border border-stone-200 p-4 transition-colors hover:border-orange-600">
                <h3 className="text-sm font-bold text-stone-950 group-hover:text-orange-800">{category.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{category.children?.length || 0} categories</p>
                <span className="mt-4 inline-block text-xs font-bold text-stone-900 group-hover:text-orange-800">Browse category →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-8 border-t border-stone-200 py-8 sm:py-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-xs font-bold uppercase text-stone-500">From the library</p>
            <h2 className="mt-1 text-2xl font-black text-stone-950">Useful reads to get you started</h2>
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-3">
            {featuredArticles.map((article) => (
              <Link key={article.href} href={routeFor(article.href)} className="group border-t border-stone-300 py-4">
                <p className="text-[10px] font-bold text-orange-800">{article.eyebrow}</p>
                <h3 className="mt-2 text-sm font-bold leading-snug text-stone-950 group-hover:text-orange-800">{article.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-stone-600">{article.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </article>
  )
}

export function PawzslyUArticle({ data }: { data: GuidePageData }) {
  return (
    <article className="bg-white text-stone-900">
      <section className="border-b border-stone-200 bg-[#f1f2ed] px-6 py-10 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-4xl">
          <nav className="text-[12px] text-stone-600" aria-label="Breadcrumb">
            <Link href="/pawzsly-u/memphis" className="hover:text-stone-950">Pawzsly U</Link>
            <span className="px-2">/</span>
            <span>{data.pillar}</span>
          </nav>
          <p className="mt-8 text-xs font-bold uppercase tracking-wider text-orange-800">{data.pillar} · {data.readTime}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-stone-950 lg:text-6xl">{data.heroTitle}</h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-stone-700">{data.heroSubheadline}</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600">{data.heroCtaSubtext}</p>
          <p className="mt-4 text-xs text-stone-600">{data.heroFootnote}</p>
          <Link href="/book/appointment" className="mt-7 inline-flex min-h-11 items-center bg-stone-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-800">{data.heroCtaText || "BOOK A VISIT"}</Link>
        </div>
      </section>

      <section className="border-b border-stone-200 px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{data.incentivesHeadline}</p>
          <h2 className="mt-2 text-3xl font-black text-stone-950">{data.incentivesSubhead}</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
          {data.takeawayCards.map((card) => (
            <div key={card.title} className="border border-stone-300 bg-[#faf9f6] p-5">
              <p className="text-sm font-bold text-stone-950">{card.title}</p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-stone-700">
                {card.items.map((item) => <li key={item.highlight}><strong>{item.highlight}:</strong> {item.text}</li>)}
              </ul>
            </div>
          ))}
          </div>
          <Link href="/book/appointment" className="mt-6 inline-flex text-sm font-bold text-stone-900 underline decoration-orange-600 decoration-2 underline-offset-4 hover:text-orange-800">{data.incentivesLinkText}</Link>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[260px_1fr] lg:px-12 lg:py-16">
        <aside className="h-fit border border-stone-300 bg-[#fbfbfa] p-6 lg:sticky lg:top-6">
          <p className="border-b border-stone-300 pb-3 text-xs font-bold uppercase tracking-wider text-stone-500">Guide outline &amp; sections</p>
          <nav className="mt-4 space-y-3">
            {data.tableOfContents.map((item) => (
              <a key={item.id} href={`#${item.id}`} className="block border border-transparent px-3 py-2 text-xs leading-snug text-stone-700 transition-colors hover:border-stone-200 hover:bg-stone-100 hover:text-stone-950">{item.label}</a>
            ))}
          </nav>
          <div className="mt-6 border-t border-stone-300 pt-5 text-xs leading-relaxed text-stone-600">
            <p><strong>Author:</strong> {data.author.name}</p>
            <p className="mt-2">{data.author.role}</p>
            <p className="mt-2">{data.lastUpdated} · {data.readTime}</p>
          </div>
        </aside>

        <div className="min-w-0 max-w-3xl">
          <div className="border border-stone-300 border-l-4 border-l-stone-950 bg-[#f8f7f4] p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{data.archetype === "product_category" ? "Category overview" : "Clinical & salon overview"}</p>
            <p className="mt-3 text-base leading-relaxed text-stone-900">{data.introSummary}</p>
          </div>
          <div className="mt-10 space-y-10">
            {data.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-8 border-t border-stone-300 pt-6 first:border-t-0 first:pt-0">
                <h2 className="text-3xl font-extrabold leading-tight text-stone-950">{section.title}</h2>
                <p className="mt-4 text-base leading-relaxed text-stone-700">{section.content}</p>
                {section.tips && (
                  <div className="mt-6 border border-stone-300 bg-white p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Selection tips</p>
                    <ul className="mt-4 space-y-3 text-sm leading-relaxed text-stone-700">
                      {section.tips.map((tip) => <li key={tip} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-stone-900" />{tip}</li>)}
                    </ul>
                  </div>
                )}
                {section.callout && <div className="mt-6 border-2 border-orange-500 bg-white p-6 text-sm leading-relaxed text-stone-800"><p className="font-bold uppercase tracking-wider text-orange-600">{section.callout.title}</p><p className="mt-2">{section.callout.text}</p></div>}
                {section.tableData && (
                  <div className="mt-6 overflow-x-auto border border-stone-300">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="bg-stone-100 text-stone-950">
                        <tr>{section.tableData.headers.map((header) => <th key={header} className="border-b border-stone-300 px-4 py-3 font-bold">{header}</th>)}</tr>
                      </thead>
                      <tbody className="text-stone-700">
                        {section.tableData.rows.map((row, index) => <tr key={`${section.id}-${index}`} className="border-b border-stone-200 last:border-b-0">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="px-4 py-3 align-top leading-relaxed">{cell}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>

          {data.faqs.length > 0 && (
            <section className="mt-12 border-t border-stone-300 pt-8">
              <h2 className="text-3xl font-black text-stone-950">Frequently asked questions</h2>
              <div className="mt-5 divide-y divide-stone-200">
                {data.faqs.map((faq) => (
                  <details key={faq.question} className="py-4">
                    <summary className="cursor-pointer text-[15px] font-semibold text-stone-950">{faq.question}</summary>
                    <p className="mt-3 text-[14px] leading-relaxed text-stone-700">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {data.relatedArticles && data.relatedArticles.length > 0 && (
            <section className="mt-12 border-t border-stone-300 pt-8">
              <h2 className="text-3xl font-black text-stone-950">Related Pawzsly U guides</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.relatedArticles.slice(0, 8).map((article) => (
                  <Link key={article.path} href={routeFor(article.path)} className="border border-stone-300 bg-white p-4 text-[14px] font-semibold text-stone-900 transition-colors hover:border-orange-600 hover:text-orange-800">
                    {article.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.whyFeatures.length > 0 && (
            <section className="mt-12 border-t border-stone-300 pt-8">
              <h2 className="text-3xl font-black text-stone-950">{data.whyHeadline}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.whyFeatures.map((feature) => <div key={feature.title} className="border border-stone-300 p-5"><h3 className="font-bold text-stone-950">{feature.title}</h3><p className="mt-2 text-sm leading-relaxed text-stone-700">{feature.description}</p></div>)}
              </div>
              <Link href="/book/appointment" className="mt-6 inline-flex min-h-11 items-center bg-stone-950 px-5 text-sm font-bold text-white transition-colors hover:bg-orange-800">{data.whyCtaText}</Link>
            </section>
          )}

          {data.testimonials.length > 0 && (
            <section className="mt-12 border-t border-stone-300 pt-8">
              <h2 className="text-3xl font-black text-stone-950">Stories from pet families</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.testimonials.map((testimonial) => <figure key={`${testimonial.authorName}-${testimonial.quote}`} className="border border-stone-300 bg-[#faf9f6] p-5"><blockquote className="text-sm leading-relaxed text-stone-800">“{testimonial.quote}”</blockquote><figcaption className="mt-4 text-xs text-stone-600"><strong className="text-stone-950">{testimonial.authorName}</strong> · {testimonial.authorRole}{testimonial.petType ? ` · ${testimonial.petType}` : ""}</figcaption><p className="mt-3 text-xs font-bold text-orange-800">{testimonial.storyLinkText}</p></figure>)}
              </div>
            </section>
          )}

          {data.relatedProducts.length > 0 && (
            <section className="mt-12 border-t border-stone-300 pt-8">
              <h2 className="text-3xl font-black text-stone-950">Related supplies</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.relatedProducts.map((product) => <div key={product.id} className="border border-stone-300 p-5"><p className="text-xs font-bold uppercase tracking-wider text-orange-800">{product.category}</p><h3 className="mt-2 font-bold text-stone-950">{product.name}</h3><p className="mt-2 text-sm text-stone-700">{product.description}</p><p className="mt-4 text-sm font-bold text-stone-950">{product.price}</p></div>)}
              </div>
            </section>
          )}

          {data.localServiceAreas.length > 0 && (
            <section className="mt-12 border-t border-stone-300 pt-8">
              <h2 className="text-3xl font-black text-stone-950">{data.serviceCity ? `Serving ${data.serviceCity} and nearby communities` : "Local service areas"}</h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-700">{data.localServiceAreas.join(", ")}</p>
            </section>
          )}
        </div>
      </div>
    </article>
  )
}
