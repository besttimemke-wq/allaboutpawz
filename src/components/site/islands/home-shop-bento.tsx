import Link from "next/link"
import { BentoGrid, type BentoTile } from "@/components/site/shop/hero-bento"

// ---------------------------------------------------------------------------
// HomeShopBento — the homepage's shop surface, per the owner's directive:
// ONE Bento card grid that shops ALL the pet types (dog, cat, fish, bird,
// reptile, small animal) — the same bento tiles as /shop, in the homepage's
// marble/cream band language (eyebrow + display serif heading).
//
// Owner rulings applied:
//  - NO blue tint over the photos (neutral black scrim only)
//  - every animal must be visible in its tile (eager-loaded, no lazy pop-in)
//  - the band is FULL-BLEED with a paw-print background so the area left and
//    right of the grid reads as designed texture, not dead space
//  - tiles are larger than the /shop landing (this is the homepage's shop
//    showcase, not a utility nav)
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
    imageAlt: "Bearded dragon on a warm rock — shop reptile supplies",
  },
  {
    name: "Small Animal",
    href: "/shop/small-pet",
    image: "/Shop/categories/small-animal-hero.jpg",
    imageAlt: "Guinea pig wearing a tiny hat in the grass — shop small animal supplies",
    note: "Hamsters, rabbits, ferrets, and more.",
  },
]

// Subtle paw-print pattern — fills the full-bleed band so the sides of the
// grid are textured, not empty cream (owner ruling: no dead space).
const PAW_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='%231a1a1a' fill-opacity='0.05'%3E%3Cellipse cx='52' cy='38' rx='11' ry='9'/%3E%3Cellipse cx='33' cy='20' rx='5' ry='7'/%3E%3Cellipse cx='47' cy='14' rx='5' ry='7'/%3E%3Cellipse cx='61' cy='16' rx='5' ry='7'/%3E%3Cellipse cx='73' cy='26' rx='5' ry='7'/%3E%3Cellipse cx='118' cy='104' rx='11' ry='9'/%3E%3Cellipse cx='99' cy='86' rx='5' ry='7'/%3E%3Cellipse cx='113' cy='80' rx='5' ry='7'/%3E%3Cellipse cx='127' cy='82' rx='5' ry='7'/%3E%3Cellipse cx='139' cy='92' rx='5' ry='7'/%3E%3Cellipse cx='24' cy='112' rx='9' ry='7'/%3E%3Cellipse cx='8' cy='96' rx='4' ry='6'/%3E%3Cellipse cx='21' cy='90' rx='4' ry='6'/%3E%3Cellipse cx='33' cy='94' rx='4' ry='6'/%3E%3C/g%3E%3C/svg%3E\")"

export function HomeShopBento() {
  return (
    <section aria-labelledby="home-shop-heading" className="marble bg-cream" style={{ backgroundImage: PAW_PATTERN }}>
      {/* Shop-all-pet-types bento — full-bleed band, larger tiles */}
      <div className="mx-auto max-w-[1600px] px-6 py-14 lg:px-12">
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
        <div className="mt-8">
          <BentoGrid
            tiles={PET_TYPE_TILES}
            eager
            autoRows="auto-rows-[124px] sm:auto-rows-[156px] lg:auto-rows-[196px]"
          />
        </div>
      </div>
    </section>
  )
}
