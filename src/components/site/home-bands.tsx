import Link from "next/link"
import { CalendarDays, Heart, CheckCircle2, Mail, Award, Lightbulb } from "lucide-react"
import { PawGlyph } from "./brand"
import { NewsletterForm } from "./islands/newsletter-form"

// ---------------------------------------------------------------------------
// Home band components — extracted verbatim from the home page so the shop
// pages can reuse the EXACT same treatments directly above their footer:
//
//   HomeCtaBand — the home CTA band verbatim (marble cream: READY TO
//   EXPERIENCE + the four booking steps + the dog photo + BOOK APPOINTMENT
//   + the newsletter column).
//
//   ShopTrustBand — the shop landing's black 3-column trust band verbatim
//   (Premium Quality | Expert Guidance | Loved by Pups).
//
//   ShopClosingBands — both bands, in order, for the shop pages' closing
//   stack directly above the footer (the /shop landing already carries its
//   own two closing bands: ShopTrustBand + the cross-sell band).
// ---------------------------------------------------------------------------

const STEPS = [
  { Icon: CalendarDays, title: "BOOK ONLINE", body: ["Choose your", "service & time."] },
  { Icon: Heart, title: "WE PAMPER", body: ["Your pup enjoys a", "luxury experience."] },
  { Icon: PawGlyph, title: "HAPPY & FRESH", body: ["They leave looking", "and feeling their best."] },
  { Icon: CheckCircle2, title: "SEE YOU AGAIN", body: ["We look forward to", "your next visit!"] },
]

// The shop landing's black 3-column trust band — verbatim (Premium Quality |
// Expert Guidance | Loved by Pups). Shared by the /shop landing and the shop
// subpages' closing stack above the footer.
const TRUST = [
  { Icon: Award, title: "Premium Quality", body: ["Only the best for", "your best friend."] },
  { Icon: Lightbulb, title: "Expert Guidance", body: ["We help you choose", "what's right."] },
  { Icon: Heart, title: "Loved by Pups", body: ["Tried, tested, and", "tail-wag approved."] },
]

export function ShopTrustBand() {
  return (
    <section className="grid grid-cols-1 gap-6 bg-ink px-8 py-10 lg:grid-cols-3 lg:px-12">
      {TRUST.map(({ Icon, title, body }, i) => (
        <div key={title} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
          <Icon className="mx-auto h-6 w-6 text-gold" strokeWidth={1.2} />
          <h3 className="mt-3 text-[11px] font-bold tracking-[0.1em] text-gold">{title}</h3>
          <p className="mt-2 text-[11.5px] leading-[1.7] text-on-dark-muted">{body.map((l) => <span key={l} className="block">{l}</span>)}</p>
        </div>
      ))}
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
      <ShopTrustBand />
      <HomeCtaBand />
    </>
  )
}
