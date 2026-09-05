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
      {/* Hero — site standard (same as homepage hero + 3rd section):
          [1fr_1.25fr] split, centered text, image filling the full column. */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[48px] leading-[1.05] text-ink lg:text-[60px]">Our Story.<br />Our Promise.</h1>
          <p className="script mt-2 text-[32px]">Built on love. Driven by purpose.</p>
          <p className="mt-4 max-w-[430px] text-[14px] leading-[1.85] text-ink-soft">
            All About Pawz was created with a simple belief: dogs deserve the same level of care, respect, and luxury we expect for ourselves — a place where they feel safe, look their best, and leave happy.
          </p>
        </div>
        <div className="relative min-h-[300px]">
          <img src="/About/abouthero-new.png" alt="A happy dog being cared for at All About Pawz" width={1672} height={941} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>
      {/* Band under the hero — black (matches the homepage services band) */}
      <section className="bg-ink px-8 py-10 lg:px-12">
        <div className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
          {VALUES.map(({ Icon, title, body }, i) => (
            <div key={title} className={`px-5 ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
              <Icon className="h-6 w-6 text-gold" strokeWidth={1.2} />
              <h3 className="mt-3 text-[11.5px] font-bold tracking-[0.06em] text-gold-light">{title}</h3>
              <p className="mt-2 text-[11.5px] leading-[1.7] text-on-dark-muted">{body.map((l) => <span key={l} className="block">{l}</span>)}</p>
            </div>
          ))}
        </div>
      </section>
      {/* Third section — Our Mission column in brown */}
      <section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="bg-brown px-8 py-12 lg:px-12">
          <PawGlyph className="h-6 w-6 text-gold" />
          <h2 className="mt-4 font-display text-[22px] text-gold">Our Mission</h2>
          <p className="mt-3 max-w-[320px] text-[12.5px] leading-[1.85] text-on-dark-muted">To provide exceptional grooming in a safe, loving, and luxurious environment.</p>
          <h2 className="mt-9 font-display text-[22px] text-gold">Our Promise</h2>
          <p className="mt-3 max-w-[320px] text-[12.5px] leading-[1.85] text-on-dark-muted">We treat every pup like our own and every parent like family.</p>
        </div>
        <img src="/About/ABOUTUS3RDSECTIONjpeg.jpeg" alt="Miniature schnauzer with a polka-dot bandana in warm salon light" width={2752} height={1536} className="h-full min-h-[300px] w-full object-cover" />
      </section>
    </>
  )
}
