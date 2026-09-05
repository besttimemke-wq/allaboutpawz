import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { ProcessSteps } from "@/components/site/islands/process-steps"

export const metadata = {
  title: "Our Grooming Process | All About Pawz",
  description: "Five simple steps from booking to pick-up — see how All About Pawz makes every groom calm, gentle, and stress-free for your pup.",
}

const PILLARS = [
  { title: "CALM ENVIRONMENT", body: "A quiet, unhurried salon\nbuilt for low stress" },
  { title: "EXPERT GROOMERS", body: "Trained, gentle hands\nand breed knowledge" },
  { title: "PREMIUM PRODUCTS", body: "Pet-safe, spa-quality\nbaths and finishes" },
  { title: "CAGE-FREE CARE", body: "Open, supervised suites\n— never kennels" },
]

export default function ProcessPage() {
  return (
    <>
      <PageHeader n="04" label="OUR PROCESS" />
      {/* HERO — site standard: centered text left, image right filling the column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">A Seamless<br />Experience<br />From Start<br />to Finish.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">We make every visit simple, stress-free, and enjoyable.</p>
          <HeroCtas bookLabel="BOOK YOUR VISIT" />
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

      {/* SECOND SECTION — comfort & safety band: exact copy of the homepage
          services band structure. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">OUR PROMISE</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Pup.<br />Every Step.<br />Every Detail.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              From the moment your pup walks in to the moment they strut out, their comfort and safety come first.
            </p>
            <Link href="/book" className="btn-gold mt-6">BOOK YOUR VISIT</Link>
          </div>
          <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {PILLARS.map(({ title, body }, i) => (
              <div key={title} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-[12px] font-bold tracking-[0.08em] text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-[11.5px] font-bold tracking-[0.15em] text-gold">{title}</h3>
                <p className="mt-3 whitespace-pre-line text-[12px] leading-[1.7] text-on-dark-muted">{body}</p>
              </div>
            ))}
          </div>
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
