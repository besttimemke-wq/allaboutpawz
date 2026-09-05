import Link from "next/link"
import { CalendarDays, Heart, CheckCircle2, Mail, Scissors } from "lucide-react"
import { PawGlyph, Divider } from "@/components/site/brand"
import { TopUtilityBar } from "@/components/site/site-chrome"
import { getIcon } from "@/lib/icons"
import { getSiteContent } from "@/lib/site-data"
import { NewsletterForm } from "@/components/site/islands/newsletter-form"

const STEPS = [
  { Icon: CalendarDays, title: "BOOK ONLINE", body: ["Choose your", "service & time."] },
  { Icon: Heart, title: "WE PAMPER", body: ["Your pup enjoys a", "luxury experience."] },
  { Icon: PawGlyph, title: "HAPPY & FRESH", body: ["They leave looking", "and feeling their best."] },
  { Icon: CheckCircle2, title: "SEE YOU AGAIN", body: ["We look forward to", "your next visit!"] },
]

export const metadata = {
  title: "Luxury Dog Grooming & Spa | All About Pawz",
  description: "All About Pawz delivers spa-level dog grooming — breed-specific haircuts, baths, and nail care in a calm, luxury salon.",
}

export default async function HomePage() {
  const data = await getSiteContent()
  const s = data.settings
  const services = data.services.slice(0, 4)
  const testimonial = data.testimonials[0]

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
          <h1 className="mt-4 whitespace-pre-line font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
            {s.heroTitle || "Luxury Grooming.\nExceptional Care."}
          </h1>
          <p className="script mt-3 text-[34px]">{s.tagline || "From Pawz to PAWfection"}</p>
          <div className="mt-6"><Divider /></div>
          <p className="mt-6 max-w-[380px] text-[13px] leading-[1.75] text-ink-soft">
            {s.heroSubtitle || "We deliver a spa-level grooming experience where every detail is designed for your pup's comfort, style, and happiness."}
          </p>
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
          <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {services.map(({ id, icon, title, description }, i) => {
              const Icon = getIcon(icon, Scissors)
              return (
                <div key={id} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
                  <Icon className="mx-auto h-10 w-10 text-gold" strokeWidth={1.2} />
                  <h3 className="mt-4 text-[11.5px] font-bold tracking-[0.15em] text-gold">{title}</h3>
                  <p className="mt-3 whitespace-pre-line text-[12px] leading-[1.7] text-on-dark-muted">{description}</p>
                </div>
              )
            })}
          </div>
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
          {testimonial && (
            <>
              <p className="script mt-5 text-[24px]">A few words from our family</p>
              <p className="mt-3 max-w-[400px] text-[12.5px] italic leading-[1.8] text-ink-soft">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-2 text-[12px] text-ink-soft">– {testimonial.author}</p>
            </>
          )}
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Home/home-3rd-banner.png" alt="All About Pawz dog grooming salon interior with reception desk and boutique pet products" width={1018} height={269} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* CTA BAND */}
      <section className="marble grid grid-cols-1 gap-8 bg-cream px-8 py-12 lg:grid-cols-[1.5fr_0.95fr_0.8fr] lg:px-12">
        <div>
          <p className="eyebrow">READY TO EXPERIENCE</p>
          <h2 className="mt-3 font-display text-[27px] leading-[1.2] text-ink">The All About Pawz Difference?</h2>
          <p className="mt-2 text-[12.5px] text-ink-soft">We can&apos;t wait to pamper your pup.</p>
          <div className="mt-7 flex flex-wrap items-start gap-x-4 gap-y-6">
            {STEPS.map(({ Icon, title, body }, i) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex gap-3">
                  <Icon className="mt-0.5 h-6 w-6 shrink-0 text-gold-deep" strokeWidth={1.2} />
                  <div>
                    <h3 className="text-[10px] font-bold tracking-[0.14em] text-ink">{title}</h3>
                    <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-soft">
                      {body.map((l) => <span key={l} className="block">{l}</span>)}
                    </p>
                  </div>
                </div>
                {i < STEPS.length - 1 && <span className="mt-2 hidden text-gold-deep xl:block">→</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 lg:border-l lg:border-gold/25 lg:pl-8">
          <img src="/Home/home_footer.png" alt="Fluffy cavapoo dog wearing a bandana after a professional groom at All About Pawz" width={287} height={492} className="h-[170px] w-[150px] shrink-0 object-contain" />
          <div>
            <p className="script text-[27px] leading-[1.15]">Your pup<br />deserves this.</p>
            <Link href="/book" className="btn-dark mt-4">BOOK APPOINTMENT</Link>
          </div>
        </div>
        <div className="lg:border-l lg:border-gold/25 lg:pl-8">
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" strokeWidth={1.2} />
            <div>
              <h3 className="text-[10px] font-bold tracking-[0.14em] text-ink">STAY IN THE LOOP</h3>
              <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-soft">Exclusive tips, special offers,<br />and paw-some updates.</p>
            </div>
          </div>
          <NewsletterForm />
        </div>
      </section>

    </>
  )
}
