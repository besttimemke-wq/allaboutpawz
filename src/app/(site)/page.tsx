import Link from "next/link"
import { Play, CalendarDays, Heart, Star, CheckCircle2, Mail, Scissors } from "lucide-react"
import { PawBadge, PawGlyph, Divider } from "@/components/site/brand"
import { getIcon } from "@/lib/icons"
import { getSiteContent } from "@/lib/site-data"
import { NewsletterForm } from "@/components/site/islands/newsletter-form"

const STEPS = [
  { Icon: CalendarDays, title: "BOOK ONLINE", body: ["Choose your", "service & time."] },
  { Icon: Heart, title: "WE PAMPER", body: ["Your pup enjoys a", "luxury experience."] },
  { Icon: PawGlyph, title: "HAPPY & FRESH", body: ["They leave looking", "and feeling their best."] },
  { Icon: CheckCircle2, title: "SEE YOU AGAIN", body: ["We look forward to", "your next visit!"] },
]

export default async function HomePage() {
  const data = await getSiteContent()
  const s = data.settings
  const services = data.services.slice(0, 4)
  const testimonial = data.testimonials[0]

  return (
    <>
      {/* HERO */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.92fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-14 lg:py-20">
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
            <Link href="/book" className="btn-gold">BOOK APPOINTMENT</Link>
            <Link href="/about" className="btn-ghost">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-deep">
                <Play className="h-2.5 w-2.5 fill-cream text-cream" />
              </span>
              WATCH OUR STORY
            </Link>
          </div>
        </div>
        <div className="relative min-h-[380px]">
          { }
          <img src="/assets/hero-dog.jpg" alt="Goldendoodle wearing a bow tie on a marble counter in a luxury grooming salon" width={1280} height={1024} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute right-6 top-6 lg:right-10 lg:top-8"><PawBadge size={116} /></div>
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

      {/* PAWZITIVE DIFFERENCE */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-14 lg:px-12">
          <p className="eyebrow">MORE THAN GROOMING</p>
          <h2 className="mt-3 font-display text-[30px] leading-[1.15] text-ink">It&apos;s the Pawzitive Difference.</h2>
          <p className="mt-4 max-w-[400px] text-[12.5px] leading-[1.8] text-ink-soft">
            We treat every pup like our own and every parent like family. That&apos;s why our clients stay with us and refer their friends.
          </p>
          <div className="mt-5 flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-gold-deep text-gold-deep" />)}
          </div>
          {testimonial && (
            <>
              <p className="mt-4 max-w-[400px] text-[12.5px] italic leading-[1.8] text-ink-soft">&ldquo;{testimonial.quote}&rdquo;</p>
              <p className="mt-2 text-[12px] text-ink-soft">– {testimonial.author}</p>
            </>
          )}
        </div>
        <div className="relative min-h-[300px]">
          { }
          <img src="/assets/salon-interior.jpg" alt="Interior of the All About Pawz luxury grooming salon" width={1280} height={900} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute right-8 top-6"><PawBadge size={78} /></div>
          <div className="absolute bottom-[26%] left-1/2 -translate-x-1/2 font-display text-[20px] tracking-[0.16em] text-gold-light drop-shadow-lg">ALL ABOUT PAWZ</div>
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
          { }
          <img src="/assets/dog-golden.jpg" alt="Happy golden retriever" width={900} height={1024} className="h-[150px] w-[150px] object-contain" />
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

      {/* FOOTER STRIP */}
      <footer className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 bg-ink px-8 py-4">
        <p className="text-[10.5px] text-on-dark-muted">{s.footerNote || "© 2024 All About Pawz LLC. All rights reserved."}</p>
        <a href="#" className="text-[10.5px] text-gold hover:underline">Privacy Policy</a>
        <span className="text-on-dark-muted/40">|</span>
        <a href="#" className="text-[10.5px] text-gold hover:underline">Terms of Service</a>
        <span className="text-on-dark-muted/40">|</span>
        <a href="#" className="text-[10.5px] text-gold hover:underline">Investor Information</a>
      </footer>
    </>
  )
}
