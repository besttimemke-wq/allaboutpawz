import Link from "next/link"
import { ChevronRight, ArrowRight, PawPrint } from "lucide-react"
import { departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { BUSINESS } from "@/lib/business"
import { SITE_URL } from "@/lib/site-url"
import { breadcrumbSchema } from "@/lib/business"
import { deptScopeNodeIds, dedupeAisleGroups, canonicalDeptSlug, type TaxAnimal, type TaxGroup, type TaxSub } from "@/lib/shop/taxonomy-db"
import { Plp } from "./plp"
import { ShopHeroBento, type BentoTile } from "./hero-bento"
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
  // ---- supplier-tree twin slugs (feed nodes CANONICAL for their aisle —
  // e.g. /shop/dog/dog-beds is the master route for beds-bedding). Mirror
  // the canonical descriptions so twin pages never show the fallback line.
  "dog/dog-beds": "Bolster, orthopedic, cooling, and crate mats sized from teacup to giant breeds.",
  "dog/dog-bowls-feeding": "Stainless, ceramic, slow-feeders, and auto feeders for every dining style.",
  "dog/dog-cleanup": "Potty pads, poop bags, diapers, and enzyme cleaners for accidents and pickup.",
  "dog/dog-dog-food": "Dry, wet, raw, freeze-dried, and air-dried food for every breed size and life stage.",
  "dog/dog-dog-health-wellness": "Calming aids, dental care, joint supplements, and dewormers for healthy dogs.",
  "dog/dog-dog-toys": "Chew, fetch, puzzle, and plush toys built for chewers, fetchers, and pullers.",
  "dog/dog-flea-tick-solutions-for-dogs": "Topicals, collars, chews, and yard sprays to keep fleas and ticks off dogs.",
  "dog/dog-grooming-supplies": "Coat-safe shampoos, slicker brushes, nail tools, and deshedding gear.",
  "dog/dog-treats": "Biscuits, jerky, bully sticks, and dental chews for training and quiet evenings.",
  "dog/collars-harnesses-leashes": "Collars, no-pull harnesses, leashes, and ID tags for every walk.",
  "dog/crates-containment": "Crates, kennels, gates, and pens for safe containment at home and on the road.",
  "cat/cat-beds": "Bolster, cave, heated, and orthopedic beds for the 16 hours a day a cat sleeps.",
  "cat/bowls-feeders": "Whisker-friendly shallow bowls, elevated stands, and running water fountains.",
  "cat/carriers-travel": "Soft carriers, hard crates, and strollers for vet trips and travel.",
  "cat/cat-cat-food": "Dry kibble, wet pate, raw, and freeze-dried formulas for every life stage.",
  "cat/cat-cat-furniture-scratchers": "Cat trees, scratching posts, window perches, and condos for vertical territory.",
  "cat/cat-cat-health-wellness": "Calming aids, dental care, supplements, and flea prevention for indoor cats.",
  "cat/cat-cat-toys": "Wands, mice, catnip toys, and electronic chasers for hunters and zoomies.",
  "cat/cat-cat-treats": "Crunchy, soft, freeze-dried, and lickable treats for training or just because.",
  "cat/cat-cleaners-waste-disposal": "Enzyme cleaners, litter systems, and potty supplies for clean floors.",
  "cat/cat-grooming-bathing": "Feline-safe shampoos, brushes, nail tools, and waterless grooming wipes.",
  "cat/cat-litter": "Clumping, crystal, natural, and lightweight litter plus every box style.",
  "cat/flea-tick-solutions-for-cats": "Topical drops, collars, chews, and yard sprays to keep fleas and ticks off cats.",
}

function descriptionFor(deptPath: string): string {
  return DEPARTMENT_DESCRIPTION[deptPath] || "Shop the collection at All About Pawz Memphis."
}

// Per-department image lookup — generated with z-ai image CLI, lives at
// /public/Shop/departments/{animal}-{department-slug}.jpeg. KEYED BY LIVE
// taxonomy slugs `${animal}/${group}` per taxonomy_nodes.
const DEPARTMENT_IMAGE: Record<string, string> = {
  // ---- Supplier-tree group slugs (dog-*/cat-* feed nodes) map to their
  // canonical department image so NO card ever renders an empty placeholder.
  "dog/dog-dog-toys": "/Shop/departments/dog-toys.jpeg",
  "dog/dog-dog-food": "/Shop/departments/dog-food.jpeg",
  "dog/dog-dog-treats-chews": "/Shop/departments/dog-treats-chews.jpeg",
  "dog/dog-dog-bowls-feeding-supplies": "/Shop/departments/dog-bowls-feeding.jpeg",
  "dog/dog-dog-collars-leashes-harnesses": "/Shop/departments/dog-collars-harnesses-leashes.jpeg",
  "dog/dog-dog-crates-gates-housing-accessories": "/Shop/departments/dog-crates-containment.jpeg",
  "dog/dog-dog-health-wellness": "/Shop/departments/dog-health-wellness.jpeg",
  "dog/dog-flea-tick-solutions-for-dogs": "/Shop/departments/dog-flea-tick.jpeg",
  "dog/dog-grooming-supplies": "/Shop/departments/dog-grooming-bathing.jpeg",
  "dog/dog-cleaning-potty-supplies": "/Shop/departments/dog-cleaning-potty-supplies.jpeg",
  "dog/beds-bedding": "/Shop/departments/dog-beds-bedding.jpeg",
  "dog/dog-beds": "/Shop/departments/dog-beds-bedding.jpeg",
  "dog/dog-treats": "/Shop/departments/dog-treats-chews.jpeg",
  "cat/cat-beds": "/Shop/departments/cat-beds-bedding.jpeg",
  "cat/bowls-feeders": "/Shop/departments/cat-bowls-feeders.jpeg",
  "cat/carriers-travel": "/Shop/departments/cat-carriers-containment.jpeg",
  "dog/training-behavior-supplies": "/Shop/departments/dog-training-behavior.png",
  "cat/cat-cat-toys": "/Shop/departments/cat-toys.jpeg",
  "cat/cat-cat-food": "/Shop/departments/cat-food.jpeg",
  "cat/cat-cat-treats": "/Shop/departments/cat-treats.jpeg",
  "cat/cat-cat-bowls-feeders": "/Shop/departments/cat-bowls-feeders.jpeg",
  "cat/cat-cat-beds-bedding": "/Shop/departments/cat-beds-bedding.jpeg",
  "cat/cat-cat-furniture-scratchers": "/Shop/departments/cat-furniture-scratchers.jpeg",
  "cat/cat-cat-health-wellness": "/Shop/departments/cat-health-wellness-extra.jpeg",
  "cat/cat-cat-litter-litter-boxes-accessories": "/Shop/departments/cat-litter.jpeg",
  "cat/cat-collars-leashes-harnesses": "/Shop/departments/cat-collars-leashes-harnesses.png",
  "cat/cat-training-behavior": "/Shop/departments/cat-training-behavior.jpeg",
  "cat/flea-tick-solutions-for-cats": "/Shop/departments/cat-flea-tick.jpeg",
  "cat/cat-grooming-bathing": "/Shop/departments/cat-grooming-bathing.jpeg",
  "cat/cat-cleaners-waste-disposal": "/Shop/departments/cat-cleaners-waste-disposal.jpeg",
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
  "cat/collars-leashes-harnesses": "/Shop/departments/cat-collars-leashes-harnesses.png",
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
  // small-animal (stock library — scripts/fetch-category-stock.mjs)
  "small-animal-small-animal-accessories",
  "small-animal-small-animal-bedding",
  "small-animal-small-animal-dishes-waterers",
  "small-animal-small-animal-feeders-waterers",
  "small-animal-small-animal-food",
  "small-animal-small-animal-food-ferret",
  "small-animal-small-animal-food-hamster",
  "small-animal-small-animal-food-hamster-gerbil",
  "small-animal-small-animal-food-rabbit",
  "small-animal-small-animal-grooming",
  "small-animal-small-animal-habitats",
  "small-animal-small-animal-litter",
  "small-animal-small-animal-supplements",
  "small-animal-small-animal-toys",
  "small-animal-small-animal-treats",
  "small-animal-small-animal-treats-ferret",
  // reptile (stock library — scripts/fetch-category-stock.mjs)
  "reptile-reptile-bedding-substrates",
  "reptile-reptile-cleaning",
  "reptile-reptile-decor",
  "reptile-reptile-dishes",
  "reptile-reptile-filter-pumps",
  "reptile-reptile-food",
  "reptile-reptile-habitat-accessory",
  "reptile-reptile-habitats",
  "reptile-reptile-heaters-gauges",
  "reptile-reptile-light-fixtures-bulbs",
  "reptile-reptile-liners",
  "reptile-reptile-supplements",
  "reptile-reptile-treats",
])

// Animal-level portraits for the non-cat/dog animals.
const ANIMAL_IMAGE: Record<string, string> = {
  fish: "/Shop/categories/fish.jpg",
  bird: "/Shop/categories/bird.jpg",
  reptile: "/Shop/categories/reptile.jpg",
  "small-animal": "/Shop/categories/small-animal.jpg",
}

// Department-level card images for the species whose single department
// previously fell through to the animal portrait (the "same photo on every
// slot" bug). Stock library — scripts/fetch-category-stock.mjs.
const DEPARTMENT_IMAGE_EXTRA: Record<string, string> = {
  "small-animal/small-animal": "/Shop/categories/small-animal-small-animal.jpg",
  "reptile/reptile": "/Shop/categories/reptile-reptile.jpg",
}

// Wide 16:9 crops for the full-bleed slots (TaxonomyHero image well is ~2:1,
// ShopPromoBanner is 16:9 on mobile) — a 4:3 card crop blown into those slots
// is what made the old hero look soft and over-cropped. Fish/bird crops are
// derived locally from the imported Wikimedia files (scripts/recrop-heroes.mjs);
// small-animal/reptile come from the stock pipeline at 1600x900.
const DEPARTMENT_HERO_IMAGE: Record<string, string> = {
  "fish/aquatics": "/Shop/categories/fish-aquatics-hero.jpg",
  "bird/bird": "/Shop/categories/bird-bird-hero.jpg",
  "small-animal/small-animal": "/Shop/categories/small-animal-small-animal-hero.jpg",
  "reptile/reptile": "/Shop/categories/reptile-reptile-hero.jpg",
}
const ANIMAL_HERO_IMAGE: Record<string, string> = {
  fish: "/Shop/categories/fish-hero.jpg",
  bird: "/Shop/categories/bird-hero.jpg",
  reptile: "/Shop/categories/reptile-hero.jpg",
  "small-animal": "/Shop/categories/small-animal-hero.jpg",
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
 *   2. per-department portrait  /Shop/departments/{a}-{g}.jpeg (+ stock extras)
 *   3. animal-level portrait    /Shop/categories/{animal}.jpg
 *   4. breed fallback (dog/cat only)
 *
 * variant="hero" swaps in the 16:9 wide crops for the full-bleed slots
 * (TaxonomyHero / ShopPromoBanner): {a}-{g}-{s}-hero.jpg → {a}-{g}-hero.jpg
 * → {a}-hero.jpg, falling through to the card chain for dog/cat so their
 * generated department portraits keep working.
 */
function taxImage(
  animalSlug: string,
  rawGroupSlug: string,
  subSlug?: string,
  fallbackIndex = 0,
  variant: "card" | "hero" = "card",
): string | undefined {
  // Resolve static/archived/twin slugs to the LIVE canonical department slug
  // the maps key on (e.g. dog-treats → dog-treats, dog-beds stays dog-beds).
  const groupSlug = canonicalDeptSlug(animalSlug, rawGroupSlug)
  if (variant === "hero") {
    if (subSlug && CATEGORY_IMAGES.has(`${animalSlug}-${groupSlug}-${subSlug}`)) {
      return `/Shop/categories/${animalSlug}-${groupSlug}-${subSlug}-hero.jpg`
    }
    if (DEPARTMENT_HERO_IMAGE[`${animalSlug}/${groupSlug}`]) {
      return DEPARTMENT_HERO_IMAGE[`${animalSlug}/${groupSlug}`]
    }
    if (ANIMAL_HERO_IMAGE[animalSlug]) return ANIMAL_HERO_IMAGE[animalSlug]
    // else fall through — dog/cat heroes stay on the generated portraits
  }
  if (subSlug && CATEGORY_IMAGES.has(`${animalSlug}-${groupSlug}-${subSlug}`)) {
    return `/Shop/categories/${animalSlug}-${groupSlug}-${subSlug}.jpg`
  }
  if (DEPARTMENT_IMAGE[`${animalSlug}/${groupSlug}`]) {
    return DEPARTMENT_IMAGE[`${animalSlug}/${groupSlug}`]
  }
  if (DEPARTMENT_IMAGE_EXTRA[`${animalSlug}/${groupSlug}`]) {
    return DEPARTMENT_IMAGE_EXTRA[`${animalSlug}/${groupSlug}`]
  }
  if (ANIMAL_IMAGE[animalSlug]) return ANIMAL_IMAGE[animalSlug]
  if (animalSlug === "dog" || animalSlug === "cat") {
    return FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length]
  }
  return undefined
}

// Leaf-page hero (SubcategoryPage only) — split title/image, NO quick links.
// Category navigation lives in the sidebar Categories accordion on leaf
// pages; a second card surface here duplicated it (owner dedup directive).
function TaxonomyHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: {
  eyebrow: string
  title: string
  description: string
  image?: string
  imageAlt: string
}) {
  return (
    <section className="px-6 pb-7 pt-5 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid overflow-hidden border border-[#002B5C]/15 bg-white lg:grid-cols-[1fr_1.05fr]">
          <div className="flex flex-col justify-center px-6 py-7 sm:px-9 lg:py-9">
            <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#002B5C]/70">{eyebrow}</p>
            <h1 className="mt-2 font-display text-[34px] font-bold leading-tight text-[#002B5C] sm:text-[44px]">{title}</h1>
            <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-neutral-700">{description}</p>
            <Link href="#shop-grid" className="mt-5 inline-flex min-h-12 w-fit items-center gap-2 bg-[#002B5C] px-5 text-[14px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#F2C500] hover:text-[#002B5C]">
              Shop all <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
  const animalBase = animal.name.replace(/ supplies$/i, "").toLowerCase()
  const animalPlural = animalBase.endsWith("s") || animalBase.includes("&") ? animalBase : `${animalBase}s`
  const tagline = `Everything for ${animalPlural} — hand-picked by our Memphis team.`
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

  // Product-rich aisles lead the bento; feed sort_order breaks ties. Twin
  // departments (supplier node + curated seed of the SAME aisle) collapse to
  // one card — no "Toys" + "Dog Toys" duplicates in the grid.
  const sortedGroups = dedupeAisleGroups(animal).sort(
    (x, y) => y.productCount - x.productCount,
  )
  const departmentCards: BentoTile[] = sortedGroups.map((d) => ({
    name: d.name,
    note: descriptionFor(`${animal.slug}/${d.slug}`),
    href: departmentPath(animal.slug, d.slug),
    image: d.heroImageUrl || taxImage(animal.slug, d.slug),
    imageAlt: `${d.name} — All About Pawz Memphis`,
  }))
  const heroImage = taxImage(animal.slug, sortedGroups[0]?.slug ?? "", undefined, 0, "hero")
  const plpFallbackImage = taxImage(animal.slug, sortedGroups[0]?.slug ?? "", undefined, 0)
  // The FEATURE tile is the page's hero visual — prefer the curated wide
  // department portrait over the pipeline's product packshot (a bag's back
  // panel with a QR code must not be the biggest image on the page).
  if (departmentCards[0]) {
    departmentCards[0] = {
      ...departmentCards[0],
      image: taxImage(animal.slug, sortedGroups[0].slug) || departmentCards[0].image,
    }
  }

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

      {/* Bento hero — the SINGLE department-navigation surface. Was: hero
          with 3 flat "+" cards + a full carousel of the same departments. */}
      <ShopHeroBento
        eyebrow="SHOP BY ANIMAL"
        title={seo?.h1 || animal.name}
        description={tagline}
        tiles={departmentCards}
        cta={{ label: `Shop all ${animal.name}`, href: "#shop-grid" }}
      />
      <ShopPromoBanner
        image={heroImage}
        imageAlt={`${animal.name} shop offer`}
        href={path}
      />

      {/* The PLP — sidebar (categories + filters) + product grid.
          EVERY shop page has BOTH: the bento above for browse-by-image,
          AND the sidebar+grid here for actual shopping. The sidebar's
          Categories section shows ONLY this animal's departments (the
          Plp filters by current path). The grid resolves from the LIVE
          Supabase catalog scoped to this animal's whole taxonomy subtree. */}
      <section id="shop-grid" className="scroll-mt-16 border-t border-neutral-200 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp
            scope={{ kind: "taxonomy", title: animal.name, path, nodeIds: [animal.id], rootId: animal.id }}
            searchParams={searchParams || {}}
            perPage={48}
            fallbackImage={plpFallbackImage}
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

// --- Department Page (/shop/dog/food, /shop/cat/beds-bedding, /shop/fish/aquatics) ---
// H1 + promo banner + horizontal subcategory card carousel. NO sidebar.
// The customer picks a subcategory to drill into the leaf where filters appear.
// Resolves from the LIVE taxonomy (TaxAnimal/TaxGroup) — every group node in
// taxonomy_nodes gets one of these pages, supplier-tree and canonical alike.
export async function DepartmentPage({
  animal,
  dept,
  searchParams,
}: {
  animal: TaxAnimal
  dept: TaxGroup
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

  // Subcategory tiles: the imagery pipeline's product-derived hero first
  // (taxonomy_nodes.hero_image_url — a DISTINCT photo per category), then the
  // static per-subcategory set, then the department portrait. This is what
  // killed the "same photo on every card" bug for dog/cat.
  // Card image for the PLP fallback; the wide 16:9 crop feeds the promo well.
  const parentImage = taxImage(animal.slug, dept.slug, undefined, 0)
  const deptHeroImage = taxImage(animal.slug, dept.slug, undefined, 0, "hero")
  const subcategoryCards = dept.subcategories.map((s, i) => ({
    name: s.name,
    href: subcategoryPath(animal.slug, dept.slug, s.slug),
    image: s.heroImageUrl || taxImage(animal.slug, dept.slug, s.slug, i) || parentImage,
    imageAlt: `${s.name} — All About Pawz Memphis`,
    note:
      s.productCount > 0
        ? `${s.productCount} product${s.productCount === 1 ? "" : "s"}`
        : undefined,
  }))
  // LIVE product scope — the whole subtree of THIS department node UNION
  // its twin departments (feed + curated seeds of the same aisle).
  const nodeIds = await deptScopeNodeIds(animal.slug, dept.slug, dept.id)

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

      {/* Bento hero — the SINGLE subcategory-navigation surface. Was: hero
          with 3 flat "+" cards + a "Shop by Category" carousel duplicating
          the same categories right below (owner dedup directive). */}
      <ShopHeroBento
        eyebrow={animal.name}
        title={seo?.h1 || dept.name}
        description={descriptionFor(`${animal.slug}/${dept.slug}`)}
        tiles={subcategoryCards}
        cta={{ label: `Shop all ${dept.name}`, href: "#shop-grid" }}
      />
      <ShopPromoBanner image={deptHeroImage} imageAlt={`${dept.name} shop offer`} href={path} />

      {/* The PLP — sidebar (categories + filters) + product grid.
          EVERY shop page has BOTH: the bento above for browse-by-image,
          AND the sidebar+grid here for actual shopping. Scoped to the LIVE
          department node (product_nodes + category_id). */}
      <section id="shop-grid" className="scroll-mt-16 border-t border-neutral-200 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp
            scope={{ kind: "taxonomy", title: dept.name, path, nodeIds, rootId: dept.id }}
            searchParams={searchParams || {}}
            perPage={48}
            fallbackImage={parentImage}
          />
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

// --- Subcategory Page (/shop/dog/food/dry-food, /shop/fish/aquatics/water-care) ---
// THIS is the leaf — the customer is browsing actual products. H1 + 1-line
// intro + Plp (sidebar filters + product grid + sort toolbar). Scoped to the
// LIVE taxonomy sub node — the 50 spec subcategories across fish/bird/reptile/
// small-animal all render here, plus every dog/cat sub.
export async function SubcategoryPage({
  animal,
  dept,
  sub,
  searchParams,
}: {
  animal: TaxAnimal
  dept: TaxGroup
  sub: TaxSub
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const subName = sub.name
  const path = subcategoryPath(animal.slug, dept.slug, sub.slug)
  const seo = findSeoCopy(path)
  const breadcrumb = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Shop", url: "/shop" },
    { name: animal.name, url: `/shop/${animal.slug}` },
    { name: dept.name, url: departmentPath(animal.slug, dept.slug) },
    { name: subName, url: path },
  ])
  const parentImage = taxImage(animal.slug, dept.slug, sub.slug, 0) || taxImage(animal.slug, dept.slug, undefined, 0)
  // Wide 16:9 crop for the hero/promo wells; the sub's own photo when one
  // exists (pipeline hero first), otherwise the department's wide crop.
  const subHeroImage = sub.heroImageUrl || taxImage(animal.slug, dept.slug, sub.slug, 0, "hero") || taxImage(animal.slug, dept.slug, undefined, 0, "hero")
  // LIVE product scope — the whole subtree of THIS sub node UNION its
  // department's twins (a sub can live in either seed of the department).
  const nodeIds = await deptScopeNodeIds(animal.slug, dept.slug, sub.id)

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

      {/* Leaf hero — no category cards here: sibling navigation lives in the
          sidebar Categories accordion (single surface, owner dedup directive). */}
      <TaxonomyHero
        eyebrow={dept.name}
        title={seo?.h1 || subName}
        description={`Shop ${subName.toLowerCase()} at All About Pawz Memphis, selected for quality and everyday use.`}
        image={subHeroImage}
        imageAlt={`${subName} at All About Pawz`}
      />
      <ShopPromoBanner image={subHeroImage} imageAlt={`${subName} shop offer`} href={path} />

      <section id="shop-grid" className="scroll-mt-16 px-6 pb-14 pt-6 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <Plp
            scope={{ kind: "taxonomy", title: sub.name, path, nodeIds, rootId: sub.id }}
            searchParams={searchParams || {}}
            perPage={48}
            fallbackImage={parentImage}
          />
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
