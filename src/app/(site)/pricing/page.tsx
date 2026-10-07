import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { AddonsGrid } from "@/components/site/islands/pricing-islands"
import { ServiceMenuSections } from "@/components/site/islands/service-menu"
import { BathClubSection } from "@/components/site/islands/bath-club-section"
import { SITE_URL } from "@/lib/site-url"

export const metadata = {
  title: "Grooming Services & Pricing | All About Pawz",
  description: "Transparent pricing by dog size — Bath Only and Bath & Haircut services, premium treatments, add-ons, and the PAWfection Bath Club membership. Book your pup's experience today.",
  alternates: { canonical: `${SITE_URL}/pricing` },
}

// CSR architecture: static shell (hero, band headers, brand copy); the Pawz
// Service Menu (Select Service + Premium Treatments), the add-ons catalog,
// and the Bath Club tiers all fetch after paint — every price renders from
// the tenant catalog, never from this file.

export default function PricingPage() {
  return (
    <>
      <PageHeader n="05" label="PRICING" />
      {/* HERO — site standard: text left, image right filling its column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Simple.<br />Transparent.<br />Worth Every Penny.</h1>
          <p className="mt-6 max-w-[320px] text-[12.5px] leading-[1.85] text-ink-soft">Honest pricing by dog size — no surprises, just exceptional care. Choose the experience that fits your pup.</p>
          <HeroCtas bookLabel="BOOK A GROOM" />
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Pricing/pricinghero-v2.jpeg" alt="Fluffy tan maltipoo wearing a blue beach bandana sitting in the All About Pawz grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* SELECT SERVICE + PREMIUM TREATMENTS — the Pawz Service Menu island.
          Service cards (standard + Bath Club member ladders), the all-services
          inclusions band, and the size-tiered treatment surcharge table all
          render from /api/booking/menu (the tenant catalog). */}
      <ServiceMenuSections />

      {/* ADD-ONS — little extras on black, directly after the treatments.
          Same band structure as the homepage services band. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">ENHANCE ANY VISIT</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Little Extras.<br />Big Joy.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              Small finishing touches that make a big difference. Add any of these when you book — your groomer takes care of the rest.
            </p>
            <Link href="/book/appointment" className="btn-gold mt-6">BOOK A GROOM</Link>
          </div>
          <div>
            <AddonsGrid />
            {/* Groomer's tip — walk-in nail trims (owner schedule, verbatim). */}
            <div className="mt-10 border-t border-gold/15 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Groomer&apos;s Tip</p>
              <p className="mt-1.5 text-[12px] italic leading-[1.75] text-on-dark-muted">
                Nails clicking on the floor? Walk into any salon for nail trim services without an appointment!
                <span className="mt-1 block">*Subject to salon availability*</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PAWFECTION BATH CLUB — the subscription menu. Tiers, includes,
          terms, prepay + multi-pet rules all read from the tenant catalog
          (subscription_plans). Service-menu member pricing (above) and these
          tiers resolve from the same catalog. */}
      <BathClubSection />
    </>
  )
}
