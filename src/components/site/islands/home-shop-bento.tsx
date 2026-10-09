import Link from "next/link"
import { ArrowRight, Gift, Sparkle } from "lucide-react"
import { BentoGrid, type BentoTile } from "@/components/site/shop/hero-bento"
import { NewCustomerSignup } from "@/components/site/islands/home-final-cta-client"

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
//  - LAYOUT v2 (owner directive): Bento cards LEFT, the 10%-off new-customer
//    offer as the BOTTOM RAIL of the bento (absorbing the old standalone
//    HomeFinalCta banner — which also fixed the cavapoo photo appearing
//    twice on the page), and TWO CTA boxes on the RIGHT side.
//  - the section headline is CENTERED — it used to hang left with no
//    symmetry against the rest of the page (owner complaint).
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
      <div className="mx-auto max-w-[1600px] px-6 py-14 lg:px-12">
        {/* Centered headline — symmetry with the rest of the page (owner
            complaint: the shop headline hung left with no symmetry). */}
        <div className="mx-auto max-w-[640px] text-center">
          <p className="eyebrow">THE PAWZ SHOP</p>
          <h2 id="home-shop-heading" className="mt-2 font-display text-[30px] leading-[1.15] text-ink">
            Shop every kind of pet.
          </h2>
          <p className="mt-3 text-[12.5px] leading-[1.75] text-ink-soft">
            One local shop for the whole crew — dogs, cats, fish, birds, reptiles,
            and small animals. Curated in Memphis, backed by our salon.
          </p>
          <div className="mt-5 flex justify-center">
            <Link href="/shop" className="btn-ghost">
              VISIT THE SHOP
            </Link>
          </div>
        </div>

        {/* Bento cards LEFT · two CTA boxes RIGHT (owner directive) */}
        <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <BentoGrid
              tiles={PET_TYPE_TILES}
              eager
              autoRows="auto-rows-[124px] sm:auto-rows-[156px] lg:auto-rows-[196px]"
            />
          </div>

          <aside className="flex flex-col gap-5" aria-label="Shop and salon quick actions">
            {/* CTA box 1 — book the salon */}
            <Link
              href="/book/appointment"
              className="group flex flex-1 flex-col justify-between bg-ink p-6 text-on-dark transition-colors hover:bg-black"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F2C500]">The Salon</p>
                <h3 className="mt-2 font-display text-[24px] leading-[1.15]">Book your pup&apos;s spa day.</h3>
                <p className="mt-3 text-[12px] leading-[1.7] text-on-dark-muted">
                  Bath from $45 · Bath &amp; haircut from $75. Same-week appointments.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-[#F2C500]">
                BOOK APPOINTMENT
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>

            {/* CTA box 2 — gift cards */}
            <Link
              href="/gift-cards"
              className="group flex flex-1 flex-col justify-between border border-gold-deep/50 bg-white/70 p-6 transition-colors hover:border-gold-deep hover:bg-white"
            >
              <div>
                <Gift className="h-6 w-6 text-ink" strokeWidth={1.4} aria-hidden="true" />
                <h3 className="mt-3 font-display text-[24px] leading-[1.15] text-ink">Pawz gift cards.</h3>
                <p className="mt-3 text-[12px] leading-[1.7] text-ink-soft">
                  The gift every pet parent loves — good for grooms and shop picks.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-ink">
                GET A GIFT CARD
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          </aside>
        </div>

        {/* 10% OFF — the new-customer offer, now the BOTTOM RAIL of the bento
            (owner directive). Banner-only; the cavapoo photo stays in the CTA
            band so the dog is on the page exactly once. */}
        <div className="relative mt-6 overflow-hidden bg-[#002B5C]">
          <div className="flex flex-col gap-6 px-6 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:py-9">
            <div className="max-w-[560px]">
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#F2C500]">
                <Sparkle className="h-3.5 w-3.5" aria-hidden="true" />
                New customers
              </p>
              <h3 className="mt-1.5 font-display text-[26px] font-bold leading-[1.12] text-white lg:text-[30px]">
                10% off your first order.
              </h3>
              <p className="mt-2 text-[12.5px] leading-[1.7] text-white/75">
                Join the pack for 10% off — plus early access to markdowns, salon
                picks, and offers. New customers only · One per household · Applies at checkout.
              </p>
            </div>
            <NewCustomerSignup />
          </div>
        </div>
      </div>
    </section>
  )
}
