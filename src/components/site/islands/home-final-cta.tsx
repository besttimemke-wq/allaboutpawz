import { getOnSaleProducts } from "@/lib/shop/on-sale"
import type { SalonFavorite } from "@/lib/shop/salon-favorites"
import type { ProductCardData } from "@/components/site/shop/product-card"
import { NewCustomerSignup, SaleRail } from "@/components/site/islands/home-final-cta-client"

// ---------------------------------------------------------------------------
// HomeFinalCta — the homepage's FINAL call to action, per the owner's
// directive: on-sale items scrolling + 10% off for new customers, styled like
// the national-chain reference (navy full-bleed offer banner over a dense
// product rail with Page X of Y chrome).
//
// The banner's email capture reuses the newsletter endpoint — joining the
// list IS the 10%-off-for-new-customers mechanic.
// ---------------------------------------------------------------------------

function toCardData(p: SalonFavorite): ProductCardData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.priceCents != null ? `$${(p.priceCents / 100).toFixed(2)}` : "",
    image: p.image,
    alt: p.brand ? `${p.brand} — ${p.name}` : p.name,
    isOnSale: p.isOnSale,
    isNew: p.isNew,
    isBestseller: p.isBestseller,
    compareAtPriceCents: p.compareAtPriceCents,
    priceCents: p.priceCents,
    rating: p.ratingAvg != null ? { avg: p.ratingAvg, count: p.ratingCount } : undefined,
  }
}

export async function HomeFinalCta() {
  // Never 500 the homepage over a pooler blip — an empty rail hides the
  // scroller and the 10% banner still stands on its own.
  const items = await getOnSaleProducts(14).catch(() => [])
  const cards = items.map(toCardData)

  return (
    <section aria-labelledby="home-sale-heading">
      {/* 10% OFF — full-bleed navy offer banner with the salon cavapoo */}
      <div className="relative overflow-hidden bg-[#002B5C]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-8 px-6 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-12 lg:py-12">
          <div className="max-w-[640px]">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#F2C500]">
              New customers
            </p>
            <h2 id="home-sale-heading" className="mt-2 font-display text-[30px] font-bold leading-[1.12] text-white lg:text-[40px]">
              10% off your first order.
            </h2>
            <p className="mt-3 text-[13px] leading-[1.75] text-white/75">
              Join the pack for 10% off — plus early access to markdowns, salon
              picks, and the weekly sale rail below.
            </p>
            <NewCustomerSignup />
            <p className="mt-3 text-[11px] leading-relaxed text-white/50">
              New customers only · One offer per household · Applies at checkout
            </p>
          </div>
          <img
            src="/Home/home_footer.png"
            alt="Fluffy cavapoo wearing a bandana after a groom at All About Pawz"
            width={287}
            height={492}
            loading="lazy"
            decoding="async"
            className="hidden h-[240px] w-auto self-end object-contain lg:block"
          />
        </div>
      </div>

      {/* ON SALE NOW — dense scrolling rail of marked-down items */}
      <div className="marble bg-cream py-12">
        <SaleRail
          products={cards}
          eyebrow="On sale now"
          title="Marked down this week."
          cta={{ label: "Shop all deals", href: "/shop" }}
        />
      </div>
    </section>
  )
}
