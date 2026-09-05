import Link from "next/link"
import { Leaf, Award, Sparkles, ShieldCheck } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { ProcessSteps } from "@/components/site/islands/process-steps"

export const metadata = {
  title: "Our Grooming Process | All About Pawz",
  description: "Five simple steps from booking to pick-up — see how All About Pawz makes every groom calm, gentle, and stress-free for your pup.",
}

const PILLARS = [
  { Icon: Leaf, title: "Calm Environment" },
  { Icon: Award, title: "Expert Groomers" },
  { Icon: Sparkles, title: "Premium Products" },
  { Icon: ShieldCheck, title: "Cage-Free Care" },
]

export default function ProcessPage() {
  return (
    <>
      <PageHeader n="04" label="OUR PROCESS" />
      {/* HERO — site standard: centered text left, image right filling the column. */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">A Seamless<br />Experience<br />From Start<br />to Finish.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">We make every visit simple, stress-free, and enjoyable.</p>
          <Link href="/book" className="btn-gold mt-7 self-start">BOOK YOUR VISIT</Link>
        </div>
        <div className="relative min-h-[300px]">
          <img
            src="/Our%20Process/processhero-v2.png"
            alt="Happy dalmatian smiling on the floor of the All About Pawz dog grooming salon with the shop sign behind the bar"
            width={1448}
            height={1086}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>

      {/* SECOND SECTION — comfort & safety pillars band. */}
      <section className="bg-ink px-8 py-10 lg:px-12">
        <div className="flex items-center gap-3">
          <PawGlyph className="h-6 w-6 text-gold" />
          <p className="text-[12.5px] leading-[1.6] text-on-dark-muted">Your pup&apos;s comfort and safety<br />are our top priorities.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-y-6 lg:grid-cols-4">
          {PILLARS.map(({ Icon, title }, i) => (
            <div key={title} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
              <Icon className="mx-auto h-6 w-6 text-gold" strokeWidth={1.2} />
              <h3 className="mt-3 text-[10.5px] font-bold tracking-[0.1em] text-on-dark-muted">{title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* THIRD SECTION — the five steps, interactive: tap a number and its card
          slides in from the left, aligned with that number. Cards stack as
          you tap through 01–05. */}
      <section className="marble bg-cream px-8 py-12 lg:px-12 lg:py-16">
        <div className="max-w-[860px]">
          <p className="eyebrow">THE PAWZ PROCESS</p>
          <h2 className="mt-3 font-display text-[38px] leading-[1.1] text-ink lg:text-[48px]">Five Steps.<br />One Happy Pup.</h2>
          <p className="mt-5 max-w-[360px] text-[12.5px] leading-[1.75] text-ink-soft">
            Tap any number for a closer look — each step has a story, and we take every one of them seriously.
          </p>
        </div>
        <div className="mt-10">
          <ProcessSteps />
        </div>
      </section>
    </>
  )
}
