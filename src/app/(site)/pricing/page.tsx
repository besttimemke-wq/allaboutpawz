import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { AddonsGrid, PackageCards, type Addon } from "@/components/site/islands/pricing-islands"
import { getResource } from "@/lib/site-data"

export const metadata = {
  title: "Grooming Packages & Pricing | All About Pawz",
  description: "Transparent pricing by dog size — Bath & Brush, Full Groom, and Deluxe Spa packages plus add-ons. Book your pup's experience today.",
}

// Data-driven surface: SERVER-RENDERED from Supabase (packages + add-ons)
// and revalidated on the standard cadence. The hero and add-on band chrome
// stay in code. (PACKAGE_META lives in the pricing content components.)
export const revalidate = 300

export default async function PricingPage() {
  const [packages, addonRows] = await Promise.all([
    getResource("packages"),
    getResource("addons"),
  ])
  const addons: Addon[] = addonRows

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

      {/* ADD-ONS — little extras on black, directly after the hero. Same
          band structure as the homepage services band. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">ENHANCE ANY VISIT</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Little Extras.<br />Big Joy.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              Small finishing touches that make a big difference. Add any of these when you book — your groomer takes care of the rest.
            </p>
            <Link href="/book" className="btn-gold mt-6">BOOK A GROOM</Link>
          </div>
          <AddonsGrid addons={addons} />
        </div>
      </section>

      {/* PACKAGES — each service is a clearly defined product card: image,
          name, concise description, transparent size-based pricing, and a
          clear call to action. Premium, spacious, easy to scan. */}
      <section className="marble bg-cream px-8 py-14 lg:px-12 lg:py-20">
        <div className="max-w-[280px]">
          <p className="eyebrow">PACKAGES &amp; PRICING</p>
          <h2 className="mt-3 font-display text-[38px] leading-[1.1] text-ink lg:text-[48px]">Choose Their<br />Experience.</h2>
        </div>

        <PackageCards packages={packages} />

        <p className="mt-16 text-center text-[11px] italic leading-[1.7] text-ink-soft lg:mt-20">Prices are starting points. Final pricing may vary based on coat condition, temperament, and length of service.</p>
      </section>
    </>
  )
}
