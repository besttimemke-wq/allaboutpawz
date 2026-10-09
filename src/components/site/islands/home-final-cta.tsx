import { NewCustomerSignup } from "@/components/site/islands/home-final-cta-client"

// ---------------------------------------------------------------------------
// HomeFinalCta — the homepage's "10% off for new customers" offer banner, the
// owner's final call to action above the footer.
//
// SCOPE (owner ruling after the cccb46e correction): the BANNER ONLY. The
// "Marked down this week" product-card rail was the part that was banned —
// no product cards on the homepage, and no other section gets removed or
// added without an explicit instruction.
// ---------------------------------------------------------------------------

export function HomeFinalCta() {
  return (
    <section aria-labelledby="home-sale-heading">
      {/* 10% OFF — full-bleed offer banner with the salon cavapoo */}
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
              picks, and offers.
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
    </section>
  )
}
