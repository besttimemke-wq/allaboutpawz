import Link from "next/link"
import { BentoGrid, type BentoTile } from "@/components/site/shop/hero-bento"
import { SalonFavoritesScroller } from "@/components/site/islands/salon-favorites-scroller"
import { getSalonFavorites } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// HomeShopBento — the homepage's shop surface, per the owner's directive:
//   1. ONE Bento card grid that shops ALL the pet types (dog, cat, fish,
//      bird, reptile, small animal) — the same bento tiles as /shop.
//   2. Beneath it, the "AA Picks · Salon Favorites" scroller — the
//      owner-curated curation (products.is_salon_favorite) as the trust
//      signal INSTEAD of a reviews wall: light pick cards, no add-to-cart.
//
// Owner ruling: a section added to the HOMEPAGE must match the HOMEPAGE's
// design — so both bands live in the front page's marble/cream language
// (eyebrow + display serif heading + gold/navy accents), NOT the shop
// page's open-header styling. Nothing that was on the homepage was removed;
// this section is purely additive between the Services band and the
// Pawzitive Difference band.
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
    <section aria-labelledby="home-shop-heading" className="marble bg-cream">
      {/* 1. Shop-all-pet-types bento — homepage band language */}
      <div className="mx-auto max-w-7xl px-8 pb-10 pt-12 lg:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[560px]">
            <p className="eyebrow">THE PAWZ SHOP</p>
            <h2 className="mt-2 font-display text-[30px] leading-[1.15] text-ink">
              Shop every kind of pet.
            </h2>
            <p className="mt-3 text-[12.5px] leading-[1.75] text-ink-soft">
              One local shop for the whole crew — dogs, cats, fish, birds, reptiles,
              and small animals. Curated in Memphis, backed by our salon.
            </p>
          </div>
          <Link href="/shop" className="btn-ghost shrink-0 self-start sm:self-auto">
            VISIT THE SHOP
          </Link>
        </div>
        <div className="mt-7">
          <BentoGrid tiles={PET_TYPE_TILES} />
        </div>
      </div>

      {/* 2. AA Picks · Salon Favorites — trust signal (instead of reviews) */}
      <div className="border-t border-gold/25">
        <div className="mx-auto max-w-7xl px-8 py-11 lg:px-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-[560px]">
              <p className="eyebrow">AA PICKS · SALON FAVORITES</p>
              <h3 className="mt-2 font-display text-[26px] leading-[1.15] text-ink lg:text-[28px]">
                Hand-picked by our groomers.
              </h3>
              <p className="mt-3 text-[12.5px] leading-[1.75] text-ink-soft">
                No pay-to-play review walls — these are the products our salon team
                keeps on the shelf and uses on the table every week. If it made the
                AA&nbsp;Picks curation, we stand behind it.
              </p>
            </div>
            <Link href="/shop/collections/salon-favorites" className="btn-gold shrink-0 self-start sm:self-auto">
              SHOP ALL PICKS
            </Link>
          </div>
          <SalonFavoritesScroller products={favorites} />
        </div>
      </div>
    </section>
  )
}
