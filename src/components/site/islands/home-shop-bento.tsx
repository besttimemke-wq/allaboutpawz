import Link from "next/link"
import { BentoGrid, type BentoTile } from "@/components/site/shop/hero-bento"

// ---------------------------------------------------------------------------
// HomeShopBento — the homepage's shop surface, per the owner's directive:
// ONE Bento card grid that shops ALL the pet types (dog, cat, fish, bird,
// reptile, small animal) — the same bento tiles as /shop, in the homepage's
// marble/cream band language (eyebrow + display serif heading).
//
// Owner rulings applied: every tile has a real photo (no solid-navy tile),
// NO blue tint over the photos (neutral black scrim only), and every animal
// must be visible in its tile (no extreme close-up crops).
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
    image: "/images/grooming_woman_pet.jpg",
    imageAlt: "Professional groomer trimming a dog at the All About Pawz salon",
    note: "Bath from $45 · Bath & haircut from $75.",
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
    image: "/Shop/categories/reptile-salon.jpg",
    imageAlt: "Reptile in a habitat — shop reptile supplies",
  },
  {
    name: "Small Animal",
    href: "/shop/small-pet",
    image: "/Shop/categories/small-animal-hero.jpg",
    imageAlt: "Guinea pig in the grass — shop small animal supplies",
    note: "Hamsters, rabbits, ferrets, and more.",
  },
]

export function HomeShopBento() {
  return (
    <section aria-labelledby="home-shop-heading" className="marble bg-cream">
      {/* Shop-all-pet-types bento — homepage band language */}
      <div className="mx-auto max-w-7xl px-8 py-12 lg:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[560px]">
            <p className="eyebrow">THE PAWZ SHOP</p>
            <h2 id="home-shop-heading" className="mt-2 font-display text-[30px] leading-[1.15] text-ink">
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
    </section>
  )
}
