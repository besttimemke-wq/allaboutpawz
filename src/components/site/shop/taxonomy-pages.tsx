import Link from "next/link"
import { ChevronRight, ArrowRight, PawPrint, Plus } from "lucide-react"
import { departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { BUSINESS } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/business"
import { subtreeNodeIds, type TaxAnimal, type TaxGroup, type TaxSub } from "@/lib/shop/taxonomy-db"
import { Plp } from "./plp"
import { CategoryCarousel } from "./category-carousel"
import { ShopPromoBanner } from "./shop-promo-banner"
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
// wall of text above it). KEYED BY LIVE taxonomy slugs:
// `${animal}/${group}` per taxonomy_nodes.
const DEPARTMENT_DESCRIPTION: Record<string, string> = {
  // ---- cat (live slugs) ----
  "cat/beds-bedding": "Bolster, cave, heated, and orthopedic beds for the 16 hours a day a cat sleeps.",
  "cat/bowls-feeding": "Whisker-friendly shallow bowls, elevated stands, and running water fountains.",
  "cat/carriers-containment": "Soft carriers, hard crates, and strollers for vet trips and travel.",
  "cat/cleanup-potty": "Enzyme cleaners, litter systems, and potty supplies for clean floors.",
  "cat/clothing-accessories": "Collars, harnesses, bandanas, and seasonal costumes for the well-dressed cat.",
  "cat/food": "Dry kibble, wet pate, raw, and freeze-dried formulas for every life stage.",
  "cat/furniture-scratchers": "Cat trees, scratching posts, window perches, and condos for vertical territory.",
  "cat/grooming": "Feline-safe shampoos, brushes, nail tools, and waterless grooming wipes.",
  "cat/health-wellness": "Calming aids, dental care, supplements, and flea prevention for indoor cats.",
  "cat/litter": "Clumping, crystal, natural, and lightweight litter plus every box style.",
  "cat/steps-ramps": "Steps and ramps so senior or small cats can reach the couch, bed, or window.",
  "cat/toys": "Wands, mice, catnip toys, and electronic chasers for hunters and zoomies.",
  "cat/training-behavior": "Clickers, scratching posts, and deterrents to channel natural behaviors.",
  "cat/treats": "Crunchy, soft, freeze-dried, and lickable treats for training or just because.",
  "cat/flea-tick": "Topical drops, collars, chews, and yard sprays to keep fleas and ticks off cats.",
  // ---- dog (live slugs) ----
  "dog/beds-bedding": "Bolster, orthopedic, cooling, and crate mats sized from teacup to giant breeds.",
  "dog/bowls-feeding": "Stainless, ceramic, slow-feeders, and auto feeders for every dining style.",
  "dog/travel-crates": "Crates, kennels, gates, and pens for safe containment at home and on the road.",
  "dog/cleanup-potty": "Potty pads, poop bags, diapers, and enzyme cleaners for accidents and pickup.",
  "dog/clothes-accessories": "Coats, sweaters, booties, and bandanas for cold, heat, and dress-up.",
  "dog/collars-leashes-harnesses": "Collars, no-pull harnesses, leashes, and ID tags for every walk.",
  "dog/food": "Dry, wet, raw, freeze-dried, and air-dried food for every breed size and life stage.",
  "dog/grooming": "Coat-safe shampoos, slicker brushes, nail tools, and deshedding gear.",
  "dog/health-wellness": "Calming aids, dental care, joint supplements, and dewormers for healthy dogs.",
  "dog/outdoor-travel-gear": "Cooling mats, paw balm, travel bowls, and life jackets for Memphis summers.",
  "dog/toys": "Chew, fetch, puzzle, and plush toys built for chewers, fetchers, and pullers.",
  "dog/training-behavior": "Treat pouches, clickers, and long lines for training that sticks.",
  "dog/treats": "Biscuits, jerky, bully sticks, and dental chews for training and quiet evenings.",
  "dog/flea-tick": "Topicals, collars, chews, and yard sprays to keep fleas and ticks off dogs.",
  // ---- fish & aquatics (live slugs) ----
  "fish/aquatics": "Everything for the tank: filtration, lighting, water care, decor, and food.",
  // ---- bird (live slugs) ----
  "bird/bird": "Cages, perches, toys, and species-appropriate food for companion birds.",
  // ---- reptile (live slugs) ----
  "reptile/reptile": "Habitats, heating, lighting, substrates, and feeders for herps of every kind.",
  // ---- small animal (live slugs) ----
  "small-animal/small-animal": "Habitats, bedding, hay, and chew toys for hamsters, rabbits, ferrets, and more.",
}

function descriptionFor(deptPath: string): string {
  return DEPARTMENT_DESCRIPTION[deptPath] || "Shop the collection at All About Pawz Memphis."
}

// Per-department image lookup — generated with z-ai image CLI, lives at
// /public/Shop/departments/{animal}-{department-slug}.jpeg. KEYED BY LIVE
// taxonomy slugs `${animal}/${group}` per taxonomy_nodes.
const DEPARTMENT_IMAGE: Record<string, string> = {
  // cat departments
  "cat/beds-bedding": "/Shop/departments/cat-beds-bedding.jpeg",
  "cat/bowls-feeding": "/Shop/departments/cat-bowls-feeders.jpeg",
  "cat/carriers-containment": "/Shop/departments/cat-carriers-containment.jpeg",
  "cat/cleanup-potty": "/Shop/departments/cat-cleaners-waste-disposal.jpeg",
  "cat/clothing-accessories": "/Shop/departments/cat-clothing-accessories.jpeg",
  "cat/food": "/Shop/departments/cat-food.jpeg",
  "cat/flea-tick": "/Shop/departments/cat-flea-tick.jpeg",
  "cat/furniture-scratchers": "/Shop/departments/cat-furniture-scratchers.jpeg",
  "cat/grooming": "/Shop/departments/cat-grooming-bathing.jpeg",
  "cat/health-wellness": "/Shop/departments/cat-health-wellness-extra.jpeg",
  "cat/litter": "/Shop/departments/cat-litter.jpeg",
  "cat/steps-ramps": "/Shop/departments/cat-steps-ramps.jpeg",
  "cat/toys": "/Shop/departments/cat-toys.jpeg",
  "cat/training-behavior": "/Shop/departments/cat-training-behavior.jpeg",
  "cat/treats": "/Shop/departments/cat-treats.jpeg",
  // dog departments
  "dog/clothes-accessories": "/Shop/departments/dog-apparel-accessories.jpeg",
  "dog/beds-bedding": "/Shop/departments/dog-beds-bedding.jpeg",
  "dog/bowls-feeding": "/Shop/departments/dog-bowls-feeding.jpeg",
  "dog/cleanup-potty": "/Shop/departments/dog-cleaning-potty-supplies.jpeg",
  "dog/collars-leashes-harnesses": "/Shop/departments/dog-collars-harnesses-leashes.jpeg",
  "dog/travel-crates": "/Shop/departments/dog-crates-containment.jpeg",
  "dog/flea-tick": "/Shop/departments/dog-flea-tick.jpeg",
  "dog/food": "/Shop/departments/dog-food.jpeg",
  "dog/grooming": "/Shop/departments/dog-grooming-bathing.jpeg",
  "dog/health-wellness": "/Shop/departments/dog-health-wellness.jpeg",
  "dog/outdoor-travel-gear": "/Shop/departments/dog-outdoor-travel-gear.jpeg",
  "dog/toys": "/Shop/departments/dog-toys.jpeg",
  "dog/treats": "/Shop/departments/dog-treats-chews.jpeg",
}

// Real per-subcategory photography (imported from Wikimedia Commons via
// scripts/import-shop-images.mjs). Files follow the LIVE taxonomy naming
// convention `${animal}-${group}-${sub}.jpg` — e.g. fish/aquatics/food →
// fish-aquatics-food.jpg. Only files that actually exist are listed.
const CATEGORY_IMAGES = new Set([
  "fish-aquatics-accessories",
  "fish-aquatics-aquarium-cleaning",
  "fish-aquatics-aquariums",
  "fish-aquatics-decor",
  "fish-aquatics-filters-pumps",
  "fish-aquatics-food",
  "fish-aquatics-heaters-gauges",
  "fish-aquatics-light-fixtures-bulbs",
  "fish-aquatics-supplements",
  "fish-aquatics-water-care",
  "bird-bird-cage",
  "bird-bird-cage-accessory",
  "bird-bird-food",
  "bird-bird-mineral-block",
  "bird-bird-perches",
  "bird-bird-supplements",
  "bird-bird-toys",
])

// Animal-level portraits for the non-cat/dog animals.
const ANIMAL_IMAGE: Record<string, string> = {
  fish: "/Shop/categories/fish.jpg",
  bird: "/Shop/categories/bird.jpg",
  reptile: "/Shop/categories/reptile.jpg",
  "small-animal": "/Shop/categories/small-pet.jpg",
}

// Fallback breed portraits for departments WITHOUT a generated image.
// Applied per-card index when DEPARTMENT_IMAGE has no entry for the
// card's dept path.
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

/**
 * Image resolution chain for a card, keyed by LIVE taxonomy slugs:
 *   1. per-subcategory photo    /Shop/categories/{a}-{g}-{s}.jpg
 *   2. per-department portrait  /Shop/departments/{a}-{g}.jpeg
 *   3. animal-level portrait    /Shop/categories/{animal}.jpg
 *   4. breed fallback (dog/cat only)
 */
function taxImage(
  animalSlug: string,
  groupSlug: string,
  subSlug?: string,
  fallbackIndex = 0,
): string | undefined {
  if (subSlug && CATEGORY_IMAGES.has(`${animalSlug}-${groupSlug}-${subSlug}`)) {
    return `/Shop/categories/${animalSlug}-${groupSlug}-${subSlug}.jpg`
  }
  if (DEPARTMENT_IMAGE[`${animalSlug}/${groupSlug}`]) {
    return DEPARTMENT_IMAGE[`${animalSlug}/${groupSlug}`]
  }
  if (ANIMAL_IMAGE[animalSlug]) return ANIMAL_IMAGE[animalSlug]
  if (animalSlug === "dog" || animalSlug === "cat") {
    return FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length]
  }
  return undefined
}

function TaxonomyHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  quickLinks,
}: {
  eyebrow: string
  title: string
  description: string
  image?: string
  imageAlt: string
  quickLinks: { name: string; href: string; image?: string; imageAlt: string }[]
}) {
  return (
    <section className="px-6 pb-7 pt-5 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid overflow-hidden border border-[#002B5C]/15 bg-white lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col justify-center px-6 py-7 sm:px-9 lg:py-9">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#002B5C]/70">{eyebrow}</p>
            <h1 className="mt-2 font-display text-[34px] font-bold leading-tight text-[#002B5C] sm:text-[44px]">{title}</h1>
            <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-neutral-700">{description}</p>
            <Link href="#shop-category-carousel" className="mt-5 inline-flex min-h-12 w-fit items-center gap-2 bg-[#002B5C] px-5 text-[14px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]">
              Browse categories <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className={`relative flex min-h-[220px] items-center justify-center overflow-hidden sm:min-h-[280px] ${image ? "bg-neutral-100" : "bg-[#002B5C]"}`}>
            {image ? (
              <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <PawPrint className="h-14 w-14 text-white/45" strokeWidth={1.1} aria-hidden="true" />
            )}
          </div>
        </div>
        {quickLinks.length > 0 && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickLinks.slice(0, 3).map((item) => (
              <Link key={item.href} href={item.href} className="group grid grid-cols-[96px_1fr_auto] items-center gap-3 border border-neutral-200 bg-white p-2 transition-colors hover:border-[#F2C500]">
                {item.image ? (
                  <img src={item.image} alt={item.imageAlt} className="aspect-[4/3] h-full w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-[#002B5C] text-white/45">
                    <PawPrint className="h-6 w-6" strokeWidth={1.2} aria-hidden="true" />
                  </div>
                )}
                <span className="text-[15px] font-semibold leading-snug text-[#002B5C] underline-offset-4 decoration-[#F2C500] decoration-2 group-hover:underline">{item.name}</span>
                <Plus className="mr-1 h-4 w-4 text-[#002B5C] transition-transform group-hover:rotate-90" aria-hidden="true" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// --- Animal Landing Page (/shop/dog, /shop/cat, /shop/fish, ...) ---
// H1 + promo banner + horizontal department card carousel. NO sidebar.
// NO narrative. The customer picks a department to drill in.
export async function AnimalLandingPage({
  animal,
  searchParams,
}: {
  animal: TaxAnimal
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const path = `/shop/${animal.slug}`
  const seo = findSeoCopy(path)
  const tagline = `Everything for ${animal.name.replace(/ supplies$/i, "").toLowerCase()} — hand-picked by our Memphis team.`
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: path },
  ])

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: animal.name,
    itemListElement: animal.groups.map((d, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: d.name,
      url: `${SITE_URL}${departmentPath(animal.slug, d.slug)}`,
    })),
  }

  const departmentCards = animal.groups.map((d, i) => ({
    name: d.name,
    description: descriptionFor(`${animal.slug}/${d.slug}`),
    href: departmentPath(animal.slug, d.slug),
    image: taxImage(animal.slug, d.slug, undefined, i),
    imageAlt: `${d.name} — All About Pawz Memphis`,
  }))
  const heroImage = taxImage(animal.slug, animal.groups[0]?.slug ?? "", undefined, 0)

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <section className="border-b border-neutral-200 px-6 py-3 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <Link href="/shop" className="hover:text-black">Shop</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">{animal.name}</span>
          </nav>
        </div>
      </section>

      <TaxonomyHero
        eyebrow="SHOP BY ANIMAL"
        title={seo?.h1 || animal.name}
        description={tagline}
        image={heroImage}
        imageAlt={`${animal.name} collection at All About Pawz`}
        quickLinks={departmentCards.slice(0, 3)}
      />
      <ShopPromoBanner
        image={heroImage}
        imageAlt={`${animal.name} shop offer`}
        href={path}
      />

      <CategoryCarousel id="shop-category-carousel" title={`Shop ${animal.name.replace(" Supplies", "")} by Department`} cards={departmentCards} />

      {/* The PLP — sidebar (categories + filters) + product grid.
          EVERY shop page has BOTH: the carousel above for browse-by-image,
          AND the sidebar+grid here for actual shopping. The sidebar's
          Categories section shows ONLY this animal's departments (the
          Plp filters by current path). The grid resolves from the LIVE
          Supabase catalog scoped to this animal's whole taxonomy subtree. */}
      <section className="border-t border-neutral-200 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp
            scope={{ kind: "taxonomy", title: animal.name, path, nodeIds: [animal.id] }}
            searchParams={searchParams || {}}
          />
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

      <section className="border-b border-neutral-200 px-6 py-3 lg:px-12">
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
        </div>
      </section>

      <TaxonomyHero
        eyebrow={animal.name}
        title={seo?.h1 || dept.name}
        description={descriptionFor(`${animal.slug}/${dept.slug}`)}
        image={parentImage}
        imageAlt={`${dept.name} at All About Pawz`}
        quickLinks={subcategoryCards.slice(0, 3)}
      />
      <ShopPromoBanner image={parentImage} imageAlt={`${dept.name} shop offer`} href={path} />

      {subcategoryCards.length > 0 && (
        <CategoryCarousel
          id="shop-category-carousel"
          title="Shop by Category"
          cards={subcategoryCards}
        />
      )}

      {/* The PLP — sidebar (categories + filters) + product grid.
          EVERY shop page has BOTH: the carousel above for browse-by-image,
          AND the sidebar+grid here for actual shopping. */}
      <section className="border-t border-neutral-200 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} categoryFilter={dept.subcategories.map(s => s.name)} />
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
  const parentImage = imageForCard(`${animal.slug}/${dept.slug}`, 0)
  const siblingCards = dept.subcategories.map((sub) => ({
    name: sub.name,
    description: descriptionFor(`${animal.slug}/${dept.slug}`),
    href: subcategoryPath(animal.slug, dept.slug, sub.slug),
    image: parentImage,
    imageAlt: `${sub.name} at All About Pawz`,
  }))
  const quickLinks = siblingCards.filter((card) => card.href !== path)

  return (
    <article className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <section className="border-b border-neutral-200 px-6 py-3 lg:px-12">
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
        </div>
      </section>

      <TaxonomyHero
        eyebrow={dept.name}
        title={seo?.h1 || subName}
        description={`Shop ${subName.toLowerCase()} at All About Pawz Memphis, selected for quality and everyday use.`}
        image={parentImage}
        imageAlt={`${subName} at All About Pawz`}
        quickLinks={quickLinks.length > 0 ? quickLinks : [{ name: `All ${dept.name}`, href: departmentPath(animal.slug, dept.slug), image: parentImage, imageAlt: dept.name }]}
      />
      <ShopPromoBanner image={parentImage} imageAlt={`${subName} shop offer`} href={path} />
      {siblingCards.length > 0 && (
        <CategoryCarousel id="shop-category-carousel" title={`More in ${dept.name}`} cards={siblingCards} />
      )}

      <section className="px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp scope={{ kind: "all" }} searchParams={searchParams || {}} path={path} categoryFilter={dept.subcategories.length > 0 ? dept.subcategories.map(s => s.name) : [dept.name]} />
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
