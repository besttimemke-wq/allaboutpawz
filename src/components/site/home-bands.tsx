import Link from "next/link"
import { CalendarDays, Heart, CheckCircle2, Mail } from "lucide-react"
import { PawGlyph } from "./brand"
import { NewsletterForm } from "./islands/newsletter-form"

// ---------------------------------------------------------------------------
// Home band components — extracted verbatim from the home page so the shop
// pages can reuse the EXACT same treatments directly above their footer:
//
//   SalonServicesBand — the home SERVICES-band treatment (ink band:
//   eyebrow-dark + display heading + copy + gold CTA), static content.
//
//   HomeCtaBand — the home CTA band verbatim (marble cream: READY TO
//   EXPERIENCE + the four booking steps + the dog photo + BOOK APPOINTMENT
//   + the newsletter column).
//
//   ShopClosingBands — both bands, in order, for the shop pages' closing
//   stack (the /shop landing already carries its own two closing bands).
// ---------------------------------------------------------------------------

const STEPS = [
  { Icon: CalendarDays, title: "BOOK ONLINE", body: ["Choose your", "service & time."] },
  { Icon: Heart, title: "WE PAMPER", body: ["Your pup enjoys a", "luxury experience."] },
  { Icon: PawGlyph, title: "HAPPY & FRESH", body: ["They leave looking", "and feeling their best."] },
  { Icon: CheckCircle2, title: "SEE YOU AGAIN", body: ["We look forward to", "your next visit!"] },
]

// The home page's ink SERVICES-band treatment — left column only (the home
// version's right column is its live services grid, home-specific).
export function SalonServicesBand() {
  return (
    <section className="bg-ink px-8 py-12 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow-dark">FROM THE SALON</p>
        <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Pup.<br />Every Breed.<br />Every Detail.</h2>
        <p className="mt-4 max-w-[420px] text-[12px] leading-[1.75] text-on-dark-muted">
          The same expertise behind every product in this collection — from breed-specific haircuts to relaxing spa baths, a full range of grooming services tailored to your dog&apos;s unique needs.
        </p>
        <Link href="/services" className="btn-gold mt-6">VIEW ALL SERVICES</Link>
      </div>
    </section>
  )
}

// The home page's CTA band — verbatim (steps + dog photo + newsletter).
export function HomeCtaBand() {
  return (
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
  )
}

// Both closing bands, in order — placed directly above the shop footer.
export function ShopClosingBands() {
  return (
    <>
      <SalonServicesBand />
      <HomeCtaBand />
    </>
  )
}
