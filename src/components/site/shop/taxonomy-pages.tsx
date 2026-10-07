import Link from "next/link"
import { ShoppingBag, ArrowRight, ChevronRight, Star } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath, type ShopNavAnimal, type ShopNavDepartment } from "@/lib/shop-nav"
import { BUSINESS } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/business"
import { Plp } from "./plp"
import { findSeoCopy } from "@/lib/shop/seo-copy"

// ---------------------------------------------------------------------------
// Taxonomy page templates — the NEW shop page types per the Shop SEO Page
// Architecture spec. Each page is a TRUE product-listing page (PLP) with:
//   • Breadcrumb + H1 + intro copy (real SEO copy from /lib/shop/seo-copy.ts)
//   • Plp component (sidebar rail with categories + filters + product grid)
//   • Related searches block (per spec §7)
//   • Related guides block (per spec §7)
//   • Grooming cross-sell band (per spec §9)
//   • BreadcrumbList + ItemList JSON-LD schemas
//   • Self-canonical (www + path)
// ---------------------------------------------------------------------------

// --- Animal Landing Page (/shop/dog, /shop/cat) ---
export async function AnimalLandingPage({ animal, searchParams }: { animal: ShopNavAnimal; searchParams?: Record<string, string | string[] | undefined> }) {
  const path = `/shop/${animal.slug}`
  const seo = findSeoCopy(path)
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: path },
  ])

  // ItemList schema — department tiles
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: animal.name,
    itemListElement: animal.departments.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: d.name,
      url: `${SITE_URL}${departmentPath(animal.slug, d.slug)}`,
    })),
  }

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Hero — H1 + intro */}
      <section className="border-b border-gold/15 px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <span className="text-ink">{animal.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-[36px] leading-[1.15] text-ink lg:text-[48px]">
            {seo?.h1 || `${animal.name} in Memphis, TN`}
          </h1>
          <div className="mt-4 max-w-3xl text-base leading-[1.85] text-ink-soft space-y-3">
            {(seo?.copyParagraphs || [animal.tagline]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Department tiles grid */}
      <section className="px-6 py-12 lg:px-12 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-xl font-bold text-ink">Browse by Department</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {animal.departments.map(dept => (
              <Link
                key={dept.slug}
                href={departmentPath(animal.slug, dept.slug)}
                className="group rounded-lg border border-gold/20 p-5 transition-colors hover:border-gold-deep hover:bg-cream/30"
              >
                <h3 className="text-base font-bold text-ink group-hover:text-black">{dept.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {dept.subcategories.length > 0
                    ? `${dept.subcategories.length} categories`
                    : "Browse all"}
                </p>
                <ArrowRight className="mt-3 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Real PLP — sidebar (categories + filters) + product grid */}
      <section className="border-t border-gold/15 px-6 pb-14 pt-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} />
        </div>
      </section>

      {/* Related searches + Related guides (per spec §7) */}
      {seo && (seo.relatedSearches.length > 0 || seo.relatedGuides.length > 0) && (
        <section className="border-t border-gold/15 bg-cream/30 px-6 py-10 lg:px-12">
          <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-2">
            {seo.relatedSearches.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">Related Searches</h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedSearches.map((s, i) => (
                    <li key={i}>
                      <Link
                        href={`/shop?q=${encodeURIComponent(s)}`}
                        className="text-sm text-ink hover:text-gold-deep hover:underline"
                      >
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {seo.relatedGuides.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">Related Guides</h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedGuides.map((g, i) => {
                    const slug = g.split("/").pop() || g
                    return (
                      <li key={i}>
                        <Link
                          href={`/guides/grooming/${slug}`}
                          className="text-sm text-ink hover:text-gold-deep hover:underline"
                        >
                          {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Grooming cross-sell band */}
      <section className="border-t border-gold/15 bg-cream/20 px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-ink">Full-Service Grooming in Memphis</h2>
            <p className="mt-1 text-sm text-ink-soft">
              All About Pawz offers breed-specific grooming at our Memphis salon. Book online or call {BUSINESS.phoneDisplay}.
            </p>
          </div>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded bg-gold-deep px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>
    </article>
  )
}

// --- Department Page (/shop/dog/food, /shop/cat/beds-bedding) ---
export async function DepartmentPage({
  animal,
  dept,
  searchParams,
}: {
  animal: ShopNavAnimal
  dept: ShopNavDepartment
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const path = departmentPath(animal.slug, dept.slug)
  const seo = findSeoCopy(path)
  const animalName = animal.name.replace(" Supplies", "")
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: `/shop/${animal.slug}` },
    { name: dept.name, url: path },
  ])

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: dept.name,
    itemListElement: dept.subcategories.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `${SITE_URL}${subcategoryPath(animal.slug, dept.slug, s.slug)}`,
    })),
  }

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Breadcrumb + H1 + intro */}
      <section className="border-b border-gold/15 px-6 py-10 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <Link href={`/shop/${animal.slug}`} className="hover:text-black">{animal.name}</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <span className="text-ink">{dept.name}</span>
          </nav>
          <h1 className="mt-4 font-display text-[32px] leading-[1.15] text-ink lg:text-[42px]">
            {seo?.h1 || `${dept.name} for ${animalName}s in Memphis, TN`}
          </h1>
          <div className="mt-3 max-w-3xl text-base leading-[1.7] text-ink-soft space-y-3">
            {(seo?.copyParagraphs || [
              `Shop ${dept.name.toLowerCase()} at All About Pawz Memphis — locally owned pet supply shop and grooming salon. Browse categories below or visit us at ${BUSINESS.address.street}.`,
            ]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Subcategory tiles */}
      {dept.subcategories.length > 0 && (
        <section className="px-6 py-10 lg:px-12 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-lg font-bold text-ink">Categories</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {dept.subcategories.map(sub => (
                <Link
                  key={sub.slug}
                  href={subcategoryPath(animal.slug, dept.slug, sub.slug)}
                  className="group rounded-lg border border-gold/20 p-4 transition-colors hover:border-gold-deep hover:bg-cream/30"
                >
                  <h3 className="text-base font-semibold text-ink group-hover:text-black">{sub.name}</h3>
                  <ArrowRight className="mt-2 h-4 w-4 text-black opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Real PLP — sidebar + product grid */}
      <section className="border-t border-gold/15 px-6 pb-14 pt-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} />
        </div>
      </section>

      {/* Related searches + Related guides (per spec §7) */}
      {seo && (seo.relatedSearches.length > 0 || seo.relatedGuides.length > 0) && (
        <section className="border-t border-gold/15 bg-cream/30 px-6 py-10 lg:px-12">
          <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-2">
            {seo.relatedSearches.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">Related Searches</h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedSearches.map((s, i) => (
                    <li key={i}>
                      <Link
                        href={`/shop?q=${encodeURIComponent(s)}`}
                        className="text-sm text-ink hover:text-gold-deep hover:underline"
                      >
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {seo.relatedGuides.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">Related Guides</h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedGuides.map((g, i) => {
                    const slug = g.split("/").pop() || g
                    return (
                      <li key={i}>
                        <Link
                          href={`/guides/grooming/${slug}`}
                          className="text-sm text-ink hover:text-gold-deep hover:underline"
                        >
                          {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Grooming cross-sell band */}
      <section className="border-t border-gold/15 bg-cream/20 px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-ink">Or Let Our Memphis Groomers Handle It</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Shop supplies or book a professional groom — All About Pawz does both.
            </p>
          </div>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded bg-gold-deep px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>
    </article>
  )
}

// --- Subcategory Page (/shop/dog/food/dry-food, /shop/cat/beds-bedding/bolster-cat-beds) ---
export async function SubcategoryPage({
  animal,
  dept,
  subSlug,
  subName,
  searchParams,
}: {
  animal: ShopNavAnimal
  dept: ShopNavDepartment
  subSlug: string
  subName: string
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const path = subcategoryPath(animal.slug, dept.slug, subSlug)
  const seo = findSeoCopy(path)
  const animalName = animal.name.replace(" Supplies", "")
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: `/shop/${animal.slug}` },
    { name: dept.name, url: departmentPath(animal.slug, dept.slug) },
    { name: subName, url: path },
  ])

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      {/* Breadcrumb + H1 + intro */}
      <section className="border-b border-gold/15 px-6 py-10 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <Link href={`/shop/${animal.slug}`} className="hover:text-black">{animal.name}</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <Link href={departmentPath(animal.slug, dept.slug)} className="hover:text-black">{dept.name}</Link>
            <ChevronRight className="h-3.5 w-3.5 text-black/40" aria-hidden="true" />
            <span className="text-ink">{subName}</span>
          </nav>
          <h1 className="mt-4 font-display text-[28px] leading-[1.15] text-ink lg:text-[36px]">
            {seo?.h1 || `${subName} in Memphis, TN`}
          </h1>
          <div className="mt-3 max-w-3xl text-base leading-[1.7] text-ink-soft space-y-3">
            {(seo?.copyParagraphs || [
              `Shop ${subName.toLowerCase()} at All About Pawz Memphis — locally owned pet supply shop and grooming salon. Visit us at ${BUSINESS.address.street} or call ${BUSINESS.phoneDisplay}.`,
            ]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Real PLP — sidebar + product grid */}
      <section className="px-6 pb-14 pt-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} />
        </div>
      </section>

      {/* Related searches + Related guides (per spec §7) */}
      {seo && (seo.relatedSearches.length > 0 || seo.relatedGuides.length > 0) && (
        <section className="border-t border-gold/15 bg-cream/30 px-6 py-10 lg:px-12">
          <div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-2">
            {seo.relatedSearches.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">Related Searches</h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedSearches.map((s, i) => (
                    <li key={i}>
                      <Link
                        href={`/shop?q=${encodeURIComponent(s)}`}
                        className="text-sm text-ink hover:text-gold-deep hover:underline"
                      >
                        {s}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {seo.relatedGuides.length > 0 && (
              <div>
                <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-ink-soft">Related Guides</h2>
                <ul className="mt-3 space-y-1.5">
                  {seo.relatedGuides.map((g, i) => {
                    const slug = g.split("/").pop() || g
                    return (
                      <li key={i}>
                        <Link
                          href={`/guides/grooming/${slug}`}
                          className="text-sm text-ink hover:text-gold-deep hover:underline"
                        >
                          {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Grooming cross-sell band */}
      <section className="border-t border-gold/15 bg-cream/20 px-6 py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-ink">Full-Service Grooming in Memphis</h2>
            <p className="mt-1 text-sm text-ink-soft">
              All About Pawz does both — shop supplies or book a professional groom. Bath Only from $45, Bath &amp; Haircut from $75.
            </p>
          </div>
          <Link
            href="/book/appointment"
            className="inline-flex items-center gap-2 rounded bg-gold-deep px-5 py-3 text-sm font-bold text-cream transition-colors hover:bg-gold"
          >
            Book a Groom →
          </Link>
        </div>
      </section>
    </article>
  )
}

// Helper — resolve a taxonomy path to the right template
export function resolveTaxonomyPage(segments: string[]): {
  type: "animal" | "department" | "subcategory"
  animal?: ShopNavAnimal
  dept?: ShopNavDepartment
  subSlug?: string
} | null {
  if (segments.length === 0) return null

  const animalSlug = segments[0]
  const animal = SHOP_NAV_TAXONOMY.find(a => a.slug === animalSlug)
  if (!animal) return null

  if (segments.length === 1) {
    return { type: "animal", animal }
  }

  const deptSlug = segments[1]
  const dept = animal.departments.find(d => d.slug === deptSlug)
  if (!dept) return null

  if (segments.length === 2) {
    return { type: "department", animal, dept }
  }

  // Subcategory or deeper
  return { type: "subcategory", animal, dept, subSlug: segments[2] }
}
