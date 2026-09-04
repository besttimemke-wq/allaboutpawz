import { Sparkles, Dog, ShieldCheck, Heart } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { getSiteContent } from "@/lib/site-data"

export default async function AboutPage() {
  await getSiteContent()
  const VALUES = [
    { Icon: Sparkles, title: "Luxury Experience", body: ["Spa-level care in", "a calming", "environment"] },
    { Icon: Dog, title: "All Breeds Welcome", body: ["From tiny pups", "to giant breeds"] },
    { Icon: ShieldCheck, title: "Safety & Comfort", body: ["Clean, cage-free", "care with gentle", "handling"] },
    { Icon: Heart, title: "Happy Pups", body: ["Tail wags", "guaranteed", "every time"] },
  ]
  return (
    <>
      <PageHeader n="02" label="ABOUT US" />
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 py-14 lg:grid-cols-[1fr_0.72fr] lg:px-12">
        <div>
          <h1 className="font-display text-[38px] leading-[1.1] text-ink">Our Story.<br />Our Promise.</h1>
          <p className="script mt-3 text-[26px]">Built on love. Driven by purpose.</p>
          <p className="mt-7 max-w-[430px] text-[12.5px] leading-[1.85] text-ink-soft">
            All About Pawz was created with a simple belief: dogs deserve the same level of care, respect, and luxury we expect for ourselves.
          </p>
          <p className="mt-4 max-w-[430px] text-[12.5px] leading-[1.85] text-ink-soft">
            We are more than a grooming salon — we&apos;re a place where dogs feel safe, look their best, and leave happy.
          </p>
        </div>
        { }
        <img src="/assets/dog-shihtzu.jpg" alt="Freshly groomed shih tzu wearing a bow tie" width={768} height={1024} className="h-[330px] w-full object-cover" />
      </section>
      <section className="marble grid grid-cols-2 gap-y-8 border-y border-gold/25 bg-cream px-8 py-10 lg:grid-cols-4 lg:px-12">
        {VALUES.map(({ Icon, title, body }, i) => (
          <div key={title} className={`px-5 ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            <Icon className="h-6 w-6 text-gold-deep" strokeWidth={1.2} />
            <h3 className="mt-3 text-[11.5px] font-bold tracking-[0.06em] text-ink">{title}</h3>
            <p className="mt-2 text-[11.5px] leading-[1.7] text-ink-soft">{body.map((l) => <span key={l} className="block">{l}</span>)}</p>
          </div>
        ))}
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-ink px-8 py-12 lg:px-12">
          <PawGlyph className="h-6 w-6 text-gold" />
          <h2 className="mt-4 font-display text-[22px] text-gold">Our Mission</h2>
          <p className="mt-3 max-w-[320px] text-[12.5px] leading-[1.85] text-on-dark-muted">To provide exceptional grooming in a safe, loving, and luxurious environment.</p>
          <h2 className="mt-9 font-display text-[22px] text-gold">Our Promise</h2>
          <p className="mt-3 max-w-[320px] text-[12.5px] leading-[1.85] text-on-dark-muted">We treat every pup like our own and every parent like family.</p>
        </div>
        { }
        <img src="/assets/salon-interior.jpg" alt="All About Pawz salon reception" width={1280} height={900} className="h-full min-h-[300px] w-full object-cover" />
      </section>
    </>
  )
}
