import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { SITE_URL } from "@/lib/site-url"
import { findSeoCopy } from "@/lib/shop/seo-copy"
import { BUSINESS } from "@/lib/business"
import { ShopPromoBanner } from "@/components/site/shop/shop-promo-banner"
import { ShopHeroBento, type BentoTile } from "@/components/site/shop/hero-bento"

export const metadata: Metadata = {
  title: "Dog & Cat Supplies, grooming & shopping in Memphis, TN | All About Pawz",
  description:
    "Shop dog and cat supplies, book grooming, and find Memphis deals at All About Pawz — Memphis' full-service grooming and shopping destination.",
  alternates: { canonical: `${SITE_URL}/shop` },
}

// ---------------------------------------------------------------------------
// /shop — the shop landing. Clean header + animal bento (Chewy-style): ONE
// navigation surface where every tile routes to its animal (or a collection),
// then the promo banner. No expandable accordion cards, no duplicated
// category surfaces.
// ---------------------------------------------------------------------------

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// Animal tile imagery — real photography where we have it (Wikimedia animal
// portraits / studio shots), generated portraits otherwise.
const ANIMAL_TILE_IMAGE: Record<string, string> = {
  dog: "/Shop/heroes/beagle.jpeg",
  cat: "/Shop/departments/cat-furniture-scratchers.jpeg",
  fish: "/Shop/categories/fish.jpg",
  bird: "/Shop/categories/bird.jpg",
  reptile: "/Shop/categories/reptile.jpg",
  "small-pet": "/Shop/categories/small-animal.jpg",
}

export default async function ShopPage({ searchParams }: PageProps) {
  await searchParams // searchParams read for stability; not used in landing
  const seo = findSeoCopy("/shop")

  const tiles: BentoTile[] = [
    {
      name: "Dog Supplies",
      href: "/shop/dog",
      image: ANIMAL_TILE_IMAGE.dog,
      imageAlt: "Beagle studio portrait — shop dog supplies at All About Pawz Memphis",
      note: "Food, treats, gear, and grooming for every breed.",
    },
    {
      name: "Cat Supplies",
      href: "/shop/cat",
      image: ANIMAL_TILE_IMAGE.cat,
      imageAlt: "Cat tree and scratchers — shop cat supplies at All About Pawz Memphis",
      note: "Litter, towers, toys, and everything feline.",
    },
    {
      name: "Fish & Aquatics",
      href: "/shop/fish",
      image: ANIMAL_TILE_IMAGE.fish,
      imageAlt: "Aquarium fish — shop fish supplies at All About Pawz Memphis",
    },
    {
      name: "New Arrivals",
      href: "/shop/new-arrivals",
      imageAlt: "Shop new arrivals at All About Pawz Memphis",
      note: "Fresh stock, just landed.",
      accent: true,
    },
    {
      name: "Bird Supplies",
      href: "/shop/bird",
      image: ANIMAL_TILE_IMAGE.bird,
      imageAlt: "Companion bird — shop bird supplies at All About Pawz Memphis",
    },
    {
      name: "Reptile Supplies",
      href: "/shop/reptile",
      image: ANIMAL_TILE_IMAGE.reptile,
      imageAlt: "Reptile habitat — shop reptile supplies at All About Pawz Memphis",
    },
    {
      name: "Small Animal Supplies",
      href: "/shop/small-pet",
      image: ANIMAL_TILE_IMAGE["small-pet"],
      imageAlt: "Small animal — shop small pet supplies at All About Pawz Memphis",
      note: "Hamsters, rabbits, ferrets, and more.",
    },
  ]

  return (
    <article className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
            ],
          }),
        }}
      />

      {/* Breadcrumb — the hero header itself lives inside ShopHeroBento */}
      <section className="border-b border-neutral-200 px-6 py-3 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <nav className="flex items-center gap-2 text-[12px] text-ink-soft" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-black">Home</Link>
            <ChevronRight className="h-3 w-3 text-black/40" aria-hidden="true" />
            <span className="text-ink">Shop</span>
          </nav>
        </div>
      </section>

      {/* Hero bento — the SINGLE navigation surface: every animal routes from
          here, New Arrivals plugs the freshest stock. */}
      <ShopHeroBento
        eyebrow="ALL ABOUT PAWZ · MEMPHIS"
        title={seo?.h1 || "Shop Dog & Cat Supplies in Memphis, TN"}
        description={`Locally owned pet supply shop and grooming salon at ${BUSINESS.address.street}. Pick your animal to start.`}
        tiles={tiles}
      />

      <ShopPromoBanner image="/Shop/departments/cat-food.jpeg" imageAlt="All About Pawz shop offer" href="/shop" />

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
