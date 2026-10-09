import Link from "next/link"
import { ProductCard } from "@/components/site/shop/product-card"
import { TrustStrip } from "@/components/site/shop/shared"
import { getSalonFavorites, getSalonFavoritesCount } from "@/lib/shop/salon-favorites"
import { SITE_URL } from "@/lib/site-url"

// ---------------------------------------------------------------------------
// AA Picks · Salon Favorites — the collection page behind the homepage rail's
// "SHOP ALL PICKS". The owner curates the curation in Supabase
// (products.is_salon_favorite); this page reads the same flag through
// src/lib/shop/salon-favorites.ts, deduped per variant group like every PLP.
// ---------------------------------------------------------------------------

export async function SalonFavoritesCollection() {
  const [favorites, total] = await Promise.all([getSalonFavorites(48), getSalonFavoritesCount()])

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE_URL}/shop` },
      {
        "@type": "ListItem",
        position: 3,
        name: "AA Picks — Salon Favorites",
        item: `${SITE_URL}/shop/collections/salon-favorites`,
      },
    ],
  }

  const cards = favorites.map((f) => ({
    id: f.id,
    name: f.name,
    slug: f.slug,
    price: f.priceCents != null ? `$${(f.priceCents / 100).toFixed(2)}` : "—",
    image: f.image,
    alt: f.brand ? `${f.brand} — ${f.name}` : f.name,
    badge: f.isBestseller ? "SALON PICK" : null,
    category: f.brand,
    isOnSale: f.isOnSale,
    isNew: f.isNew,
    isBestseller: f.isBestseller,
    compareAtPriceCents: f.compareAtPriceCents,
    priceCents: f.priceCents,
    rating: { avg: f.ratingAvg ?? 0, count: f.ratingCount },
  }))

  return (
    <>
      <section className="border-b border-neutral-200 bg-white px-8 py-10 lg:px-12">
        <p className="eyebrow">THE PAWZ COLLECTION</p>
        <h1 className="mt-2 font-display text-[34px] leading-[1.1] text-ink lg:text-[40px]">
          AA Picks — Salon Favorites
        </h1>
        <p className="mt-4 max-w-[520px] text-[12.5px] leading-[1.8] text-ink-soft">
          The curation our groomers stand behind: every product here is one the
          salon team keeps on the shelf and uses on the table. Hand-picked in
          Memphis — {total} {total === 1 ? "pick" : "picks"} and counting.
        </p>
      </section>

      <section className="border-t border-neutral-200 bg-white px-8 pb-14 pt-8 lg:px-12">
        {cards.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {cards.map((p, i) => (
              <ProductCard key={p.id} product={p as never} priority={i < 4} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-[14px] text-ink-soft">
              The curation is being refreshed — check back shortly.
            </p>
            <Link href="/shop" className="btn-gold mt-6">BROWSE THE SHOP</Link>
          </div>
        )}
      </section>
      <TrustStrip />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </>
  )
}
