import { Sparkles, Dog, ShieldCheck, Heart } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { getSiteContent } from "@/lib/site-data"

export const metadata = {
  title: "About Us | All About Pawz Dog Grooming",
  description: "Meet Bree and the All About Pawz team — exceptional dog grooming built on thoughtful care, comfort, and family-level service.",
}

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
          <img src="/About/abouthero-schnauzer.png" alt="Black schnauzer dog standing proudly in the All About Pawz dog grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
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
      {/* Third section — global canvas color, columns swapped: image LEFT
          with the founder's message overlaid, mission/promise text RIGHT. */}
      <section className="marble grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative min-h-[300px]">
          <img src="/About/about-owner.png" alt="Bree, founder of All About Pawz dog grooming, with a small dog at her grooming table in the salon" width={1376} height={768} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/45 to-transparent px-8 pb-7 pt-16 lg:px-10">
            <p className="script text-[24px] text-gold-light">A message from our founder</p>
            <p className="mt-2 max-w-[440px] text-[12.5px] leading-[1.8] text-on-dark">
              At All About Pawz, we provide exceptional grooming in a safe, loving environment. Every pup is treated like our own, and every pet parent is welcomed like family.
            </p>
            <p className="script mt-2 text-[22px] text-on-dark">&mdash; Bree</p>
          </div>
        </div>
        <div className="flex flex-col justify-center px-8 py-12 lg:px-12">
          <PawGlyph className="h-6 w-6 text-gold-deep" />
          <h2 className="mt-4 font-display text-[22px] text-ink">Our Mission</h2>
          <p className="mt-3 max-w-[320px] text-[12.5px] leading-[1.85] text-ink-soft">To elevate the grooming experience through thoughtful care, exceptional service, and a calm, luxurious environment.</p>
          <h2 className="mt-9 font-display text-[22px] text-ink">Our Promise</h2>
          <p className="mt-3 max-w-[320px] text-[12.5px] leading-[1.85] text-ink-soft">Every detail is designed around your dog&apos;s comfort, from gentle handling to personalized attention and a welcoming experience for the whole family.</p>
        </div>
      </section>
    </>
  )
}
