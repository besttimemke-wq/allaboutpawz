import { Leaf, Award, Sparkles, ShieldCheck } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { getSiteContent } from "@/lib/site-data"

const STEPS = [
  { n: "01", title: "BOOK YOUR APPOINTMENT", body: "Choose a time that works for you." },
  { n: "02", title: "WARM WELCOME", body: "We greet your pup and discuss their needs and preferences." },
  { n: "03", title: "SPA EXPERIENCE", body: "Our groomers work their magic with gentle, expert care." },
  { n: "04", title: "FINISHING TOUCHES", body: "Style, fragrance, and those perfect little details." },
  { n: "05", title: "PICK UP & REBOOK", body: "Happy pup, happier you. We'll help you schedule their next visit." },
]
const PILLARS = [
  { Icon: Leaf, title: "Calm Environment" },
  { Icon: Award, title: "Expert Groomers" },
  { Icon: Sparkles, title: "Premium Products" },
  { Icon: ShieldCheck, title: "Cage-Free Care" },
]

export default async function ProcessPage() {
  await getSiteContent()
  return (
    <>
      <PageHeader n="04" label="OUR PROCESS" />
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 py-14 lg:grid-cols-[1fr_0.85fr] lg:px-12">
        <div>
          <h1 className="font-display text-[38px] leading-[1.1] text-ink">A Seamless<br />Experience<br />From Start<br />to Finish.</h1>
          <p className="mt-6 max-w-[300px] text-[12.5px] leading-[1.85] text-ink-soft">We make every visit simple, stress-free, and enjoyable.</p>
          <ol className="relative mt-9 space-y-7">
            <span className="absolute bottom-3 left-[15px] top-3 w-px bg-gold/30" />
            {STEPS.map((s) => (
              <li key={s.n} className="relative flex gap-5">
                <span className="relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border border-gold-deep bg-cream text-[10px] font-bold text-gold-deep">{s.n}</span>
                <div className="pt-1">
                  <h2 className="text-[11px] font-bold tracking-[0.14em] text-ink">{s.title}</h2>
                  <p className="mt-1.5 max-w-[330px] text-[12px] leading-[1.7] text-ink-soft">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        { }
        <img src="/assets/dog-schnauzer.jpg" alt="Well groomed miniature schnauzer sitting" width={900} height={1024} className="h-full max-h-[520px] w-full object-contain" />
      </section>
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
    </>
  )
}
