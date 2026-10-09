import Link from "next/link"
import { ShopHeroBento, type BentoTile } from "@/components/site/shop/hero-bento"
import { SalonFavoritesScroller } from "@/components/site/islands/salon-favorites-scroller"
import { getSalonFavorites } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// HomeShopBento — the homepage's shop surface, per the owner's directive:
//   1. ONE Bento card grid that shops ALL the pet types (dog, cat, fish,
//      bird, reptile, small animal) — same Chewy-style bento the /shop
//      landing uses, so the storefront reads as one system.
//   2. Directly beneath it, the "AA Picks · Salon Favorites" scroller —
//      the owner-curated curation (products.is_salon_favorite in Supabase)
//      standing in as the trust signal INSTEAD of a reviews wall: every
//      pick is one the salon team actually uses, and every card is
//      shoppable.
// Server component; the favorites query is TTL-cached (5 min, SWR) so the
// homepage render only ever pays it once.
// ---------------------------------------------------------------------------

const PET_TYPE_TILES: BentoTile[] = [
  {
    name: "Dog",
    href: "/shop/dog",
    image: "/Shop/heroes/beagle.jpeg",
    imageAlt: "Beagle studio portrait — shop dog supplies at All About Pawz Memphis",
    note: "Food, treats, gear, and grooming for every breed.",
  },
  {
    name: "Cat",
    href: "/shop/cat",
    image: "/Shop/departments/cat-furniture-scratchers.jpeg",
    imageAlt: "Cat tree and scratchers — shop cat supplies at All About Pawz Memphis",
    note: "Litter, towers, toys, and everything feline.",
  },
  {
    name: "Fish & Aquatics",
    href: "/shop/fish",
    image: "/Shop/categories/fish.jpg",
    imageAlt: "Aquarium fish — shop fish and aquarium supplies",
  },
  {
    name: "Grooming & Spa",
    href: "/services",
    imageAlt: "Book a grooming appointment at All About Pawz",
    note: "Bath from $45 · Bath & haircut from $75.",
    accent: true,
  },
  {
    name: "Bird",
    href: "/shop/bird",
    image: "/Shop/categories/bird.jpg",
    imageAlt: "Companion bird — shop bird supplies",
  },
  {
    name: "Reptile",
    href: "/shop/reptile",
    image: "/Shop/categories/reptile.jpg",
    imageAlt: "Reptile habitat — shop reptile supplies",
  },
  {
    name: "Small Animal",
    href: "/shop/small-pet",
    image: "/Shop/categories/small-animal.jpg",
    imageAlt: "Small animal — shop hamster, rabbit, and ferret supplies",
    note: "Hamsters, rabbits, ferrets, and more.",
  },
]

export async function HomeShopBento() {
  const favorites = await getSalonFavorites(12)

  return (
    <section aria-labelledby="home-shop-heading" className="border-t border-neutral-200 bg-white">
      {/* 1. Shop-all-pet-types bento */}
      <div className="pt-8">
        <ShopHeroBento
          eyebrow="THE PAWZ SHOP"
          headingTag="h2"
          title="Shop every kind of pet"
          description="One local shop for the whole crew — dogs, cats, fish, birds, reptiles, and small animals. Curated in Memphis, backed by our salon."
          tiles={PET_TYPE_TILES}
        />
      </div>

      {/* 2. AA Picks · Salon Favorites — the trust signal (instead of reviews) */}
      <div className="border-t border-neutral-200 px-6 py-10 lg:px-12">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">AA PICKS · SALON FAVORITES</p>
            <h2
              id="home-shop-heading"
              className="mt-2 font-display text-[26px] leading-[1.15] text-ink lg:text-[32px]"
            >
              Hand-picked by our groomers.
            </h2>
            <p className="mt-3 max-w-[560px] text-[13px] leading-[1.7] text-ink-soft">
              No pay-to-play review walls here — these are the products our salon team
              keeps on the shelf and uses on the table every week. If it made the
              AA&nbsp;Picks curation, we stand behind it.
            </p>
          </div>
          <Link
            href="/shop/collections/salon-favorites"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md bg-[#002B5C] px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#0A3D7C] sm:self-auto"
          >
            Shop all picks →
          </Link>
        </div>
        <SalonFavoritesScroller products={favorites} />
      </div>
    </section>
  )
}
