import Link from "next/link"
import { PawGlyph, Divider } from "@/components/site/brand"
import { TopUtilityBar } from "@/components/site/site-chrome"
import { LandingAppointmentModal } from "@/components/site/islands/landing-appointment-modal"
import { HomeHeroCopy, HomeHeroSubtitle, HomeTestimonial } from "@/components/site/islands/home-islands"
import { FeaturedServicesGrid } from "@/components/site/islands/featured-services-grid"
import { HomeShopBento } from "@/components/site/islands/home-shop-bento"
import { HomeAaPicks } from "@/components/site/islands/home-aa-picks"
import { HomeFinalCta } from "@/components/site/islands/home-final-cta"
import { SITE_URL } from "@/lib/site-url"

export const metadata = {
  title: "Luxury Dog Grooming & Spa | All About Pawz",
  description: "All About Pawz delivers spa-level dog grooming — breed-specific haircuts, baths, and nail care in a calm, luxury salon.",
  alternates: { canonical: `${SITE_URL}/` },
}

export default function HomePage() {
  // CSR architecture: this page is a static shell — hero copy, services band,
  // and the testimonial are client islands that fetch after paint.

  return (
    <>
      {/* Landing appointment modal — the owner's ruling: a signed-in customer
          with an upcoming visit gets the large confirm / pre check / cancel /
          reschedule modal at the very top. Renders nothing for anonymous
          visitors (the island 401-checks itself). */}
      <LandingAppointmentModal />

      {/* Top utility strip — keeps the bag visible at the top on desktop
          (mobile uses the sticky mobile bar). Home renders its own hero, so
          it has no PageHeader. */}
      <TopUtilityBar />

      {/* HERO — site standard, symmetric with the 3rd section: identical
          grid split [1fr_1.25fr], identical gutters, centered text, image
          filling the full column. The image columns line up exactly; the
          photo's bottom edge meets the black services band (scissors). */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <p className="eyebrow">LUXURY GROOMING</p>
          <HomeHeroCopy />
          <div className="mt-6"><Divider /></div>
          <HomeHeroSubtitle />
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/book/appointment" className="btn-gold">BOOK APPOINTMENT</Link>
            <Link href="/book/consultation" className="btn-ghost">SCHEDULE CONSULT</Link>
          </div>
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Home/home-hero-poodle.png" alt="White poodle standing in the All About Pawz luxury dog grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* SERVICES BAND */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">OUR SERVICES</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Pup.<br />Every Breed.<br />Every Detail.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              From breed-specific haircuts to relaxing spa baths, we offer a full range of grooming services tailored to your dog&apos;s unique needs.
            </p>
            <Link href="/services" className="btn-gold mt-6">VIEW ALL SERVICES</Link>
          </div>
          <FeaturedServicesGrid />
        </div>
      </section>

      {/* PAWZITIVE DIFFERENCE — RESTORED to its original slot right after
          the services band (the owner's ruling: it must NOT sit below the
          shop grid). Original constraint: text left, image right FILLING the
          full column height (object-cover, absolute inset). */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-14 lg:px-12">
          <p className="eyebrow">MORE THAN GROOMING</p>
          <h2 className="mt-3 font-display text-[30px] leading-[1.15] text-ink">It&apos;s the Pawzitive Difference.</h2>
          <p className="mt-4 max-w-[400px] text-[12.5px] leading-[1.8] text-ink-soft">
            We treat every pup like our own and every parent like family. That&apos;s why our clients stay with us and refer their friends.
          </p>
          <HomeTestimonial />
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Home/home-3rd-banner.png" alt="All About Pawz dog grooming salon interior with reception desk and boutique pet products" width={1018} height={269} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* SHOP VISUALS — the page's THIRD section (owner's structure): the
          full-bleed pet-type bento, then the dense AA Picks rail. */}
      <HomeShopBento />
      <HomeAaPicks />

      {/* FINAL CTA — on-sale items scrolling + 10% off for new customers
          (the owner's directive, styled like the reference rails). */}
      <HomeFinalCta />

    </>
  )
}
