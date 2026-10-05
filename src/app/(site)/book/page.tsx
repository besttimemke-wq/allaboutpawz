import Link from "next/link"
import { PawPrint, Sparkle, ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { BookingEntryCard } from "@/components/site/islands/booking-entry-cards"
import { SITE_URL } from "@/lib/site-url"
// The nine appointment-wizard steps — what happens on the flow page.
// EMAIL FIRST: identity is captured before anything else, so an abandoned
// booking is never anonymous — the salon knows who to welcome back.
const BOOKING_STEPS = [
  { n: "01", title: "YOUR EMAIL", body: "Who you are — progress saves and confirmations find you." },
  { n: "02", title: "YOUR DETAILS", body: "Phone and address, prefilled if we know you." },
  { n: "03", title: "YOUR DOG", body: "Name, breed, and weight — or reuse a pup on file." },
  { n: "04", title: "COAT", body: "Texture, length, and condition details." },
  { n: "05", title: "GROOMING", body: "Pick your service and style preferences." },
  { n: "06", title: "SCHEDULE", body: "Choose the date and time that suits you." },
  { n: "07", title: "GROOMER", body: "Request your favorite or let us match you." },
  { n: "08", title: "NOTES", body: "Sensitivities, quirks, anything we should know." },
  { n: "09", title: "REVIEW & DEPOSIT", body: "Check the summary and secure your visit." },
]

// Consultation flow — how a free consult works before the first groom.
const CONSULT_STEPS = [
  { n: "01", title: "TELL US ABOUT YOUR PUP", body: "Breed, coat, and anything sensitive or new." },
  { n: "02", title: "WE REACH OUT", body: "A real conversation about goals and style." },
  { n: "03", title: "MEET & GREET", body: "Your pup visits the salon — no scissors in sight." },
  { n: "04", title: "THEIR CUSTOM PLAN", body: "The right package, the right price, zero guesswork." },
]

export const metadata = {
  title: "Book an Appointment | All About Pawz",
  description: "Book a grooming appointment or request a free consultation in one simple flow — nine quick steps and we take care of the rest.",
  alternates: { canonical: `${SITE_URL}/book` },
}

export default function BookPage() {
  return (
    <>
      <PageHeader n="09" label="BOOK" />

      {/* HERO — site standard: centered text left, photo right filling the column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Your Pup<br />Deserves This.</h1>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">
            Book an appointment or request a free consultation — all in one simple flow. Nine quick steps and we&apos;ll take care of the rest.
          </p>
          <HeroCtas bookLabel="BOOK AN APPOINTMENT" consultLabel="SCHEDULE A CONSULTATION" />
        </div>
        <div className="relative min-h-[300px]">
          <img
            src="/Book/bookhero-v2.jpeg"
            alt="Gray poodle wearing a pumpkin bandana sitting in the All About Pawz grooming salon beneath the shop sign"
            width={1376}
            height={768}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>

      {/* RETURNING BAND — the two portal doors, one per identity: salon
          customers and LEASHED Academy students. Email-first booking means
          guests never NEED an account to book — this band is the fast lane
          for people who already have one. */}
      <section className="border-y border-gold/25 bg-cream-deep px-8 py-10 lg:px-12">
        <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_2fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow">ALREADY KNOW US?</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-ink">Welcome back.</h2>
            <p className="mt-3 max-w-[300px] text-[12px] leading-[1.75] text-ink-soft">
              Sign in once and your details, pups, and history autofill — bookings take half the time.
              New here? You never need an account to book; just start below.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/access-customer?redirect=/book/appointment"
              className="group flex items-center gap-4 border border-gold/30 bg-cream px-5 py-5 transition hover:border-gold-deep"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream-deep">
                <PawPrint size={22} weight="fill" className="text-gold-deep" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold tracking-[0.14em] text-ink">RETURNING CUSTOMER</span>
                <span className="mt-1 block text-[11px] leading-snug text-ink-soft">Salon portal — pets, appointments &amp; billing</span>
              </span>
              <ArrowRight size={15} weight="bold" className="shrink-0 text-gold-deep transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/learn/sign-in"
              className="group flex items-center gap-4 border border-gold/30 bg-cream px-5 py-5 transition hover:border-gold-deep"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream-deep">
                <Sparkle size={22} weight="fill" className="text-gold-deep" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-bold tracking-[0.14em] text-ink">RETURNING STUDENT</span>
                <span className="mt-1 block text-[11px] leading-snug text-ink-soft">LEASHED Vocational Academy — courses &amp; progress</span>
              </span>
              <ArrowRight size={15} weight="bold" className="shrink-0 text-gold-deep transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* BLACK BAND — how booking works: the nine wizard steps as separated,
          numbered cards. Same band structure as the homepage services band. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">HOW BOOKING WORKS</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Step.<br />Every Detail.<br />Every Pup.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              Nine simple steps, about two minutes — your email first, the deposit last. Your progress saves as you go, so you can step away and pick up right where you left off.
            </p>
            <Link href="/book/appointment" className="btn-gold mt-6 inline-flex">START BOOKING</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BOOKING_STEPS.map((s) => (
              <div key={s.n} className="border border-gold/25 px-5 py-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 text-[10.5px] font-bold tracking-[0.08em] text-gold">{s.n}</span>
                <h3 className="mt-3 text-[11px] font-bold tracking-[0.15em] text-gold">{s.title}</h3>
                <p className="mt-2 text-[11.5px] leading-[1.65] text-on-dark-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOOK ENTRY — black dog left, the appointment card right. The card
          links to the appointment flow page (/book/appointment). Photo
          fills its column top to bottom (site standard), bottom edge meeting
          the next section's rail. */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative min-h-[300px]">
          <img
            src="/Book/bookdog-black.jpeg"
            alt="Black poodle resting on its plush cushion in the All About Pawz salon"
            width={1365}
            height={1024}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="marble flex flex-col justify-center bg-cream px-8 py-14 lg:px-12">
          <BookingEntryCard type="appointment" />
        </div>
      </section>

      {/* CONSULT BAND — how the free consultation works, in separated cards. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">FREE CONSULTATIONS</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Pup.<br />Every Question.<br />Every Answer.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              New to grooming, a tricky coat, or just want to talk it through first? Request a free consultation with the card below — no deposit, no pressure.
            </p>
            <Link href="/book/consultation" className="btn-gold mt-6 inline-flex">REQUEST A CONSULTATION</Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONSULT_STEPS.map((s) => (
              <div key={s.n} className="border border-gold/25 px-5 py-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/40 text-[10.5px] font-bold tracking-[0.08em] text-gold">{s.n}</span>
                <h3 className="mt-3 text-[11px] font-bold tracking-[0.15em] text-gold">{s.title}</h3>
                <p className="mt-2 text-[11.5px] leading-[1.65] text-on-dark-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONSULT ENTRY — consultation card LEFT, brown dog RIGHT (swapped per
          owner request: dog on the right, schedule consult on the left). The
          card links to the consultation flow page (/book/consultation) — its
          own flow, not the booking flow. Photo fills its column, tucked
          between the consult band and the footer. */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-14 lg:px-12">
          <BookingEntryCard type="consultation" />
        </div>
        <div className="relative min-h-[300px]">
          <img
            src="/Book/bookdog-brown.jpeg"
            alt="Golden doodle in a bow tie sitting beneath the All About Pawz sign"
            width={606}
            height={455}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>
    </>
  )
}
