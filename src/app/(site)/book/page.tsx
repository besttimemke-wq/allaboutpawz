import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { BookingWizardV2, type WizardLookups } from "@/components/site/islands/booking-wizard-v2"
import { BookingEntryCard } from "@/components/site/islands/booking-entry-cards"
import { getResource } from "@/lib/site-data"

type Breed = { id: string; name: string; sizeCategory?: string; coatType?: string; akcGroup?: string }
type PricingPackage = { id: string; name: string; smallPrice?: string; mediumPrice?: string; largePrice?: string; xlargePrice?: string; description?: string | null }
type Groomer = { id: string; name: string; role: string; bio?: string; active?: boolean }

// The nine wizard steps — mirrors the actual stepper in BookingWizardV2
// (Name, Contact, Dog, Coat, Grooming, Schedule, Groomer, Notes, Review).
const BOOKING_STEPS = [
  { n: "01", title: "YOUR NAME", body: "Tell us who's bringing the pup in." },
  { n: "02", title: "CONTACT", body: "Phone, email, and address for confirmations." },
  { n: "03", title: "YOUR DOG", body: "Name, breed, and weight so we prep right." },
  { n: "04", title: "COAT", body: "Texture, length, and condition details." },
  { n: "05", title: "GROOMING", body: "Pick your service and style preferences." },
  { n: "06", title: "SCHEDULE", body: "Choose the date and time that suits you." },
  { n: "07", title: "GROOMER", body: "Request your favorite or let us match you." },
  { n: "08", title: "NOTES", body: "Sensitivities, quirks, anything we should know." },
  { n: "09", title: "REVIEW", body: "Check the summary and confirm your request." },
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
}

export default async function BookPage() {
  // Fetch breeds + services (pricing packages) + groomers + all lookup tables in parallel.
  const [
    breeds, packages, staff,
    coatTypes, coatTextures, coatLengths, coatConditions, sheddingLevels,
    haircutStyles, clipLengths,
    bodyStyles, legStyles, faceStyles, headStyles, earStyles, tailStyles, feetStyles,
    sanitaryOptions, nailServices, pawPadServices, earServices, teethServices, desheddingServices, coatTechniques,
  ] = await Promise.all([
    getResource<Breed>("dog_breeds"),
    getResource<PricingPackage>("packages"),
    getResource<Groomer>("staff"),
    getResource("coat_types"),
    getResource("coat_textures"),
    getResource("coat_lengths"),
    getResource("coat_conditions"),
    getResource("shedding_levels"),
    getResource("haircut_styles"),
    getResource("clip_lengths"),
    getResource("body_styles"),
    getResource("leg_styles"),
    getResource("face_styles"),
    getResource("head_styles"),
    getResource("ear_styles"),
    getResource("tail_styles"),
    getResource("feet_styles"),
    getResource("sanitary_options"),
    getResource("nail_services"),
    getResource("paw_pad_services"),
    getResource("ear_services"),
    getResource("teeth_services"),
    getResource("deshedding_services"),
    getResource("coat_techniques"),
  ])

  // Map pricing packages → service cards (price uses mediumPrice as a single representative price).
  const bookableServices = (packages || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: p.mediumPrice || p.smallPrice || "—",
    durationMinutes: 120,
    description: p.description || undefined,
  }))

  const activeGroomers = (staff || []).filter((g) => g.active !== false && g.name)

  const lookups: WizardLookups = {
    coatTypes: norm(coatTypes),
    coatTextures: norm(coatTextures),
    coatLengths: norm(coatLengths),
    coatConditions: norm(coatConditions),
    sheddingLevels: norm(sheddingLevels),
    haircutStyles: norm(haircutStyles),
    clipLengths: norm(clipLengths),
    bodyStyles: norm(bodyStyles),
    legStyles: norm(legStyles),
    faceStyles: norm(faceStyles),
    headStyles: norm(headStyles),
    earStyles: norm(earStyles),
    tailStyles: norm(tailStyles),
    feetStyles: norm(feetStyles),
    sanitaryOptions: norm(sanitaryOptions),
    nailServices: norm(nailServices),
    pawPadServices: norm(pawPadServices),
    earServices: norm(earServices),
    teethServices: norm(teethServices),
    desheddingServices: norm(desheddingServices),
    coatTechniques: norm(coatTechniques),
  }

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

      {/* BLACK BAND — how booking works: the nine wizard steps as separated,
          numbered cards. Same band structure as the homepage services band. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">HOW BOOKING WORKS</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Step.<br />Every Detail.<br />Every Pup.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              Nine simple steps, about two minutes. Your progress saves as you go, so you can step away and pick up right where you left off.
            </p>
            <a href="#book" className="btn-gold mt-6 inline-flex">START BOOKING</a>
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

      {/* BOOK ENTRY — black dog left, the appointment card right. Photo
          fills its column top to bottom (site standard), bottom edge meeting
          the wizard section's rail. */}
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
            <a href="#consult" className="btn-gold mt-6 inline-flex">REQUEST A CONSULTATION</a>
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

      {/* CONSULT ENTRY — brown dog left, the consultation card right. Photo
          fills its column, tucked between the consult band and the booking
          flow below. */}
      <section id="consult" className="grid scroll-mt-24 grid-cols-1 lg:grid-cols-[1.25fr_1fr]">
        <div className="relative min-h-[300px]">
          <img
            src="/Book/bookdog-brown.jpeg"
            alt="Golden doodle in a bow tie sitting beneath the All About Pawz sign"
            width={606}
            height={455}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
        <div className="marble flex flex-col justify-center bg-cream px-8 py-14 lg:px-12">
          <BookingEntryCard type="consultation" />
        </div>
      </section>

      {/* THE BOOKING FLOW — last section before the footer, text only on the
          canvas (no box). Hidden behind the gate: plain text above the
          footer ("What would you like to do?" + Contact us) and the entry
          cards above are the only ways in — the wizard appears once a flow
          is chosen. */}
      <section id="book" className="marble scroll-mt-24 bg-cream px-8 py-14 lg:px-12">
        <BookingWizardV2
          breeds={breeds || []}
          services={bookableServices}
          groomers={activeGroomers}
          lookups={lookups}
        />
      </section>
    </>
  )
}

// Normalize a Supabase/Prisma row → {id, name, ...rest}. Some lookup tables
// use `label` instead of `name`; fall back gracefully.
function norm(rows: any[] | null | undefined): { id: string; name: string; [k: string]: any }[] {
  if (!rows) return []
  return rows
    .filter((r) => r && (r.id || r.uuid) && (r.name || r.label || r.title))
    .map((r) => ({
      id: r.id || r.uuid,
      name: r.name || r.label || r.title,
      ...r,
    }))
}
