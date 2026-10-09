import Link from "next/link"
import { SalonFavoritesScroller } from "@/components/site/islands/salon-favorites-scroller"
import { getSalonFavorites } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// HomeAaPicks — the homepage's "AA Picks · Salon Favorites" trust band.
//
// Owner ruling: this band sits ABOVE THE FOOTER as the homepage's LAST
// section (not mid-page), and the banner runs FULL-BLEED — edge to edge,
// no side gutters — with every slide the SAME fixed size.
// ---------------------------------------------------------------------------

export async function HomeAaPicks() {
  // Never 500 the homepage over a pooler blip — if the curation can't be
  // fetched, this band renders nothing and the rest of the page stands.
  const favorites = await getSalonFavorites(12).catch(() => [])
  if (favorites.length === 0) return null

  return (
    <section aria-labelledby="home-aa-picks-heading" className="marble bg-cream">
      {/* Band header — homepage language, inside the standard container */}
      <div className="mx-auto max-w-7xl px-8 pb-8 pt-12 lg:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-[560px]">
            <p className="eyebrow">AA PICKS · SALON FAVORITES</p>
            <h2 id="home-aa-picks-heading" className="mt-2 font-display text-[26px] leading-[1.15] text-ink lg:text-[28px]">
              Hand-picked by our groomers.
            </h2>
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
      </div>

      {/* Full-bleed rotating banner — edge to edge, no side gutters */}
      <div className="pb-14">
        <SalonFavoritesScroller products={favorites} />
      </div>
    </section>
  )
}
