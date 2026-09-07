import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { TopUtilityBar } from "@/components/site/site-chrome"
import { HomeCtaBand } from "@/components/site/home-bands"
import { HomeHeroCopy, HomeHeroSubtitle, HomeTestimonial, type Testimonial } from "@/components/site/islands/home-islands"
import { FeaturedServicesGrid, type FeaturedService } from "@/components/site/islands/featured-services-grid"
import { getResource, getSettings } from "@/lib/site-data"

export const metadata = {
  title: "Luxury Dog Grooming & Spa | All About Pawz",
  description: "All About Pawz delivers spa-level dog grooming — breed-specific haircuts, baths, and nail care in a calm, luxury salon.",
}

// ISR: the home hero copy, featured services, and testimonial are
// server-rendered from the database and revalidated on the same cadence as
// every other data-driven surface. The rest of the page is pure code.
export const revalidate = 300

export default async function HomePage() {
  const [settings, serviceRows, testimonialRows] = await Promise.all([
    getSettings(),
    getResource("services"),
    getResource("testimonials"),
  ])
  const services: FeaturedService[] = serviceRows
    .filter((s: any) => s.visible)
    .slice(0, 4)
  const testimonials: Testimonial[] = testimonialRows.filter((t: any) => t.visible)

  return (
    <>
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
          <HomeHeroCopy settings={settings} />
          <div className="mt-6"><Divider /></div>
          <HomeHeroSubtitle settings={settings} />
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/book/appointment" className="btn-gold">BOOK APPOINTMENT</Link>
            <Link href="/book/consultation" className="btn-ghost">SCHEDULE CONSULT</Link>
          </div>
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Home/home-hero-boutique.jpeg" alt="Groomed apricot poodle in the warmly lit All About Pawz luxury grooming boutique" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
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
          <FeaturedServicesGrid services={services} />
        </div>
      </section>

      {/* PAWZITIVE DIFFERENCE — original constraint: text left, image right
          FILLING the full column height (object-cover, absolute inset) — no
          white space around the image. */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-14 lg:px-12">
          <p className="eyebrow">MORE THAN GROOMING</p>
          <h2 className="mt-3 font-display text-[30px] leading-[1.15] text-ink">It&apos;s the Pawzitive Difference.</h2>
          <p className="mt-4 max-w-[400px] text-[12.5px] leading-[1.8] text-ink-soft">
            We treat every pup like our own and every parent like family. That&apos;s why our clients stay with us and refer their friends.
          </p>
          <HomeTestimonial testimonials={testimonials} />
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Home/home-3rd-banner.png" alt="All About Pawz dog grooming salon interior with reception desk and boutique pet products" width={1018} height={269} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* CTA BAND — shared component (identical markup, also reused as the
          shop pages' closing band) */}
      <HomeCtaBand />

    </>
  )
}
