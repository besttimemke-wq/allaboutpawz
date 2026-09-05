import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { FeaturedServicesGrid } from "@/components/site/islands/featured-services-grid"
import { ServicesAccordion } from "@/components/site/islands/services-accordion"

export const metadata = {
  title: "Dog Grooming Services | All About Pawz",
  description: "Grooming packages, baths, spa treatments, and nail & paw care — gentle dog grooming tailored to your pup. Book a package today.",
}

export default function ServicesPage() {
  // CSR architecture: static shell; the featured band and the accordion
  // fetch their content client-side after paint.

  return (
    <>
      <PageHeader n="03" label="SERVICES" />
      {/* HERO — site standard: centered text left, image right filling the column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Care That Goes<br />Beyond the Groom.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">Premium grooming services tailored to your dog&apos;s breed, coat, and lifestyle.</p>
          <HeroCtas />
        </div>
        <div className="relative min-h-[300px]">
          <img src="/services/serviceshero.png" alt="White poodle sitting in the All About Pawz dog grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* SECOND SECTION — homepage services band with the new headline. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">OUR SERVICES</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Gentle Care.<br />Beautiful Results.<br />Happy Pups.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              From breed-specific haircuts to relaxing spa baths, we offer a full range of grooming services tailored to your dog&apos;s unique needs.
            </p>
            <Link href="/book" className="btn-gold mt-6">BOOK APPOINTMENT</Link>
          </div>
          <FeaturedServicesGrid />
        </div>
      </section>

      {/* SERVICES ACCORDION — every service category with its pricing INSIDE
          (packages by size + à-la-carte items). All content is managed in the
          admin: Services (categories/images) + Service Items (items/prices). */}
      <section className="marble bg-cream px-8 py-10 lg:px-12">
        <ServicesAccordion />
        <p className="mt-4 text-center text-[11px] italic leading-[1.7] text-ink-soft">Prices are starting points. Final pricing may vary based on coat condition, temperament, and length of service.</p>
      </section>
    </>
  )
}
