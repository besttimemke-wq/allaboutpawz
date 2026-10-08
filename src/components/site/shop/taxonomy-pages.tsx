import Link from "next/link"
import { ChevronRight, ArrowRight } from "lucide-react"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath, type ShopNavAnimal, type ShopNavDepartment } from "@/lib/shop-nav"
import { BUSINESS } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/business"
import { Plp } from "./plp"
import { CategoryCarousel } from "./category-carousel"
import { findSeoCopy } from "@/lib/shop/seo-copy"

// ---------------------------------------------------------------------------
// Taxonomy page templates — Petco-style. NO narrative. NO sidebar on
// landing/department pages. The customer lands and immediately sees:
//   1. A single breadcrumb (Home / Shop / {animal} / {department})
//   2. The H1 (just the department name)
//   3. A promo banner — split-color (image LEFT, colored bg RIGHT with the
//      deal headline + code + Shop Now CTA). This is "what's on sale".
//   4. A horizontal carousel of category cards (image + title + ONE
//      sentence). This is "how to get there" — the user picks a leaf
//      category to drill into.
//
// ONLY the SubcategoryPage (the leaf — /shop/cat/food/dry-food) renders the
// Plp with the filter sidebar + product grid. That's where filtering makes
// sense: the customer is actually browsing products.
//
// The SEO copy (h1, metaDescription, relatedSearches, relatedGuides) lives
// in metadata + a hidden <details> block at the bottom for crawlers. It
// NEVER renders as a visible wall of text.
// ---------------------------------------------------------------------------


// --- Shared category-card horizontal carousel (scrollable sideways with
// chevron arrows on the edges — Petco-style, NOT a vertical grid that
// looks like the sitemap). Each card: image (full-bleed) + title + ONE
// sentence. ---
//
// Per-department card descriptions — ONE sentence explaining what this
// category IS (the explanatory narrative lives ON the card, not as a hero
// wall of text above it). Pulled/condensed from the SEO copy blocks in
// src/lib/shop/seo-copy.ts. The card description tells the shopper "this
// is the cat food department — dry, wet, raw for every life stage" so they
// know what's behind the click without a wall of text on the landing page.
const DEPARTMENT_DESCRIPTION: Record<string, string> = {
  // ---- cat ----
  "cat/beds-bedding": "Bolster, cave, heated, and orthopedic beds for the 16 hours a day a cat sleeps.",
  "cat/bowls-feeders": "Whisker-friendly shallow bowls, elevated stands, and running water fountains.",
  "cat/carriers-containment": "Soft carriers, hard crates, and strollers for vet trips and travel.",
  "cat/cleaners-waste-disposal": "Enzyme cleaners, disposal systems, and potty supplies for clean floors.",
  "cat/clothing-accessories": "Collars, harnesses, bandanas, and seasonal costumes for the well-dressed cat.",
  "cat/food": "Dry kibble, wet pate, raw, and freeze-dried formulas for every life stage.",
  "cat/furniture-scratchers": "Cat trees, scratching posts, window perches, and condos for vertical territory.",
  "cat/grooming-bathing": "Feline-safe shampoos, brushes, nail tools, and waterless grooming wipes.",
  "cat/health-wellness": "Calming aids, dental care, supplements, and flea prevention for indoor cats.",
  "cat/litter-litter-boxes-accessories": "Clumping, crystal, natural, and lightweight litter plus every box style.",
  "cat/steps-ramps": "Steps and ramps so senior or small cats can reach the couch, bed, or window.",
  "cat/toys": "Wands, mice, catnip toys, and electronic chasers for hunters and zoomies.",
  "cat/training-behavior": "Clickers, scratching posts, and deterrents to channel natural behaviors.",
  "cat/treats": "Crunchy, soft, freeze-dried, and lickable treats for training or just because.",
  "cat/flea-tick": "Topical drops, collars, chews, and yard sprays to keep fleas and ticks off cats.",
  // ---- dog ----
  "dog/beds-bedding": "Bolster, orthopedic, cooling, and crate mats sized from teacup to giant breeds.",
  "dog/bowls-feeding": "Stainless, ceramic, slow-feeders, and auto feeders for every dining style.",
  "dog/crates-containment": "Crates, kennels, gates, and pens for safe containment at home and on the road.",
  "dog/cleaning-potty-supplies": "Potty pads, poop bags, diapers, and enzyme cleaners for accidents and pickup.",
  "dog/apparel-accessories": "Coats, sweaters, booties, and bandanas for cold, heat, and dress-up.",
  "dog/collars-harnesses-leashes": "Collars, no-pull harnesses, leashes, and ID tags for every walk.",
  "dog/food": "Dry, wet, raw, freeze-dried, and air-dried food for every breed size and life stage.",
  "dog/grooming-bathing": "Coat-safe shampoos, slicker brushes, nail tools, and deshedding gear.",
  "dog/health-wellness": "Calming aids, dental care, joint supplements, and dewormers for healthy dogs.",
  "dog/outdoor-travel-gear": "Cooling mats, paw balm, travel bowls, and life jackets for Memphis summers.",
  "dog/toys": "Chew, fetch, puzzle, and plush toys built for chewers, fetchers, and pullers.",
  "dog/training-behavior-supplies": "Treat pouches, clickers, and long lines for training that sticks.",
  "dog/treats-chews": "Biscuits, jerky, bully sticks, and dental chews for training and quiet evenings.",
  "dog/flea-tick": "Topicals, collars, chews, and yard sprays to keep fleas and ticks off dogs.",
}

function descriptionFor(deptPath: string): string {
  return DEPARTMENT_DESCRIPTION[deptPath] || "Shop the collection at All About Pawz Memphis."
}

// Per-department image lookup — generated with z-ai image CLI, lives at
// /public/Shop/departments/{animal}-{department-slug}.jpeg. Keyed by the
// full dept path segment "{animal}/{dept}" so it works for both the
// animal landing pages (which list departments) and the department pages
// (which list subcategories — the subcategory cards inherit their parent
// department's image as a sensible fallback).
const DEPARTMENT_IMAGE: Record<string, string> = {
  // cat departments
  "cat/beds-bedding": "/Shop/departments/cat-beds-bedding.jpeg",
  "cat/bowls-feeders": "/Shop/departments/cat-bowls-feeders.jpeg",
  "cat/food": "/Shop/departments/cat-food.jpeg",
  "cat/furniture-scratchers": "/Shop/departments/cat-furniture-scratchers.jpeg",
  "cat/grooming-bathing": "/Shop/departments/cat-grooming-bathing.jpeg",
  "cat/litter-litter-boxes-accessories": "/Shop/departments/cat-litter.jpeg",
  "cat/toys": "/Shop/departments/cat-toys.jpeg",
  "cat/treats": "/Shop/departments/cat-treats.jpeg",
  // dog departments
  "dog/beds-bedding": "/Shop/departments/dog-beds-bedding.jpeg",
  "dog/bowls-feeding": "/Shop/departments/dog-bowls-feeding.jpeg",
  "dog/food": "/Shop/departments/dog-food.jpeg",
  "dog/grooming-bathing": "/Shop/departments/dog-grooming-bathing.jpeg",
  "dog/toys": "/Shop/departments/dog-toys.jpeg",
  "dog/treats-chews": "/Shop/departments/dog-treats-chews.jpeg",
  "dog/collars-harnesses-leashes": "/Shop/departments/dog-collars-harnesses-leashes.jpeg",
  "dog/health-wellness": "/Shop/departments/dog-health-wellness.jpeg",
}

// Fallback breed portraits for departments WITHOUT a generated image.
// Applied per-card index when DEPARTMENT_IMAGE has no entry for the
// card's dept path. (Cat carriers, cat cleaners, cat clothing, cat health,
// cat steps, cat training, flea & tick — and the dog equivalents.)
const FALLBACK_IMAGES = [
  "/Shop/heroes/beagle.jpeg",
  "/Shop/heroes/cocker-spaniel.jpeg",
  "/Shop/heroes/pomeranian.jpeg",
  "/Shop/heroes/husky.jpeg",
  "/Shop/heroes/french-bulldog.jpeg",
  "/Shop/heroes/german-shepherd.jpeg",
  "/Shop/heroes/shih-tzu.jpeg",
  "/Shop/heroes/poodle.jpeg",
  "/Shop/heroes/border-collie.jpeg",
]

function imageForCard(deptPath: string | undefined, fallbackIndex: number): string {
  if (deptPath && DEPARTMENT_IMAGE[deptPath]) return DEPARTMENT_IMAGE[deptPath]
  return FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length]
}

// --- Animal Landing Page (/shop/dog, /shop/cat) ---
// H1 + promo banner + horizontal department card carousel. NO sidebar.
// NO narrative. The customer picks a department to drill in.
export async function AnimalLandingPage({
  animal,
  searchParams,
}: {
  animal: ShopNavAnimal
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const path = `/shop/${animal.slug}`
  const seo = findSeoCopy(path)
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: path },
  ])

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

  const departmentCards = animal.departments.map((d, i) => ({
    name: d.name,
    description: descriptionFor(`${animal.slug}/${d.slug}`),
    href: departmentPath(animal.slug, d.slug),
    image: imageForCard(`${animal.slug}/${d.slug}`, i),
    imageAlt: `${d.name} — All About Pawz Memphis`,
  }))

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Breadcrumb + H1 — single line, no narrative */}
      <section className="border-b border-neutral-200 px-6 py-6 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">{animal.name}</span>
          </nav>
          <h1 className="mt-3 font-display text-[28px] leading-[1.15] text-ink lg:text-[36px]">
            {seo?.h1 || `${animal.name} in Memphis, TN`}
          </h1>
        </div>
      </section>

      {/* Department carousel — "how to get there" */}
      <CategoryCarousel title={`Shop ${animal.name.replace(" Supplies", "")} by Department`} cards={departmentCards} />

      {/* The PLP — sidebar (categories + filters) + product grid.
          EVERY shop page has BOTH: the carousel above for browse-by-image,
          AND the sidebar+grid here for actual shopping. The sidebar's
          Categories section shows ONLY this animal's departments (the
          Plp filters by current path). */}
      <section className="border-t border-neutral-200 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} />
        </div>
      </section>

      {/* Grooming cross-sell — single line, no box */}
      <section className="border-t border-neutral-200 bg-neutral-50 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[13px] text-ink-soft">
            <span className="font-bold text-ink">Full-service grooming in Memphis.</span>{" "}
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

      {/* SEO block — hidden, machine-readable for crawlers only */}
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

// --- Department Page (/shop/dog/food, /shop/cat/beds-bedding) ---
// H1 + promo banner + horizontal subcategory card carousel. NO sidebar.
// The customer picks a subcategory to drill into the leaf where filters appear.
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

  // Subcategory cards inherit their parent department's image AND
  // description as a sensible fallback — there's no per-subcategory image
  // or description yet, but at least the card shows a relevant picture +
  // summary (e.g. "Bolster Cat Beds" shows the cat-beds image + the
  // cat-beds-department description).
  const parentDeptPath = `${animal.slug}/${dept.slug}`
  const parentImage = imageForCard(parentDeptPath, 0)
  const parentDescription = descriptionFor(parentDeptPath)
  const subcategoryCards = dept.subcategories.map((s) => ({
    name: s.name,
    description: parentDescription,
    href: subcategoryPath(animal.slug, dept.slug, s.slug),
    image: parentImage,
    imageAlt: `${s.name} — All About Pawz Memphis`,
  }))

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      {/* Breadcrumb + H1 — single line, no narrative */}
      <section className="border-b border-neutral-200 px-6 py-6 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href={`/shop/${animal.slug}`} className="hover:text-black">{animal.name}</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">{dept.name}</span>
          </nav>
          <h1 className="mt-3 font-display text-[28px] leading-[1.15] text-ink lg:text-[36px]">
            {seo?.h1 || dept.name}
          </h1>
        </div>
      </section>

      {/* Subcategory carousel — "how to get there" */}
      {subcategoryCards.length > 0 && (
        <CategoryCarousel
          title="Shop by Category"
          cards={subcategoryCards}
        />
      )}

      {/* The PLP — sidebar (categories + filters) + product grid.
          EVERY shop page has BOTH: the carousel above for browse-by-image,
          AND the sidebar+grid here for actual shopping. */}
      <section className="border-t border-neutral-200 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} />
        </div>
      </section>

      {/* Grooming cross-sell — single line, no box */}
      <section className="border-t border-neutral-200 bg-neutral-50 px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[13px] text-ink-soft">
            <span className="font-bold text-ink">Or let our Memphis groomers handle it.</span>{" "}
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

// --- Subcategory Page (/shop/dog/food/dry-food, /shop/cat/beds-bedding/bolster-cat-beds) ---
// THIS is the leaf — the customer is browsing actual products. H1 + 1-line
// intro + Plp (sidebar filters + product grid + sort toolbar).
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

      {/* Breadcrumb + H1 + ONE-sentence intro */}
      <section className="border-b border-neutral-200 px-6 py-6 lg:px-12 lg:py-8">
        <div className="mx-auto max-w-7xl">
          <nav className="flex flex-wrap items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href={`/shop/${animal.slug}`} className="hover:text-black">{animal.name}</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href={departmentPath(animal.slug, dept.slug)} className="hover:text-black">{dept.name}</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">{subName}</span>
          </nav>
          <h1 className="mt-3 font-display text-[24px] leading-[1.15] text-ink lg:text-[28px]">
            {seo?.h1 || subName}
          </h1>
          <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-ink-soft">
            Shop {subName.toLowerCase()} at All About Pawz Memphis — locally owned pet supply shop and grooming salon.
          </p>
        </div>
      </section>

      {/* Plp — sidebar filters + sort toolbar + product grid (the leaf) */}
      <section className="px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} />
        </div>
      </section>

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
