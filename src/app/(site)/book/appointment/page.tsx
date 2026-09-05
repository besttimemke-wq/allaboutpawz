import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { WizardLoader } from "@/components/site/islands/wizard-loader"

export const metadata = {
  title: "Book an Appointment | All About Pawz",
  description: "Reserve your pup's grooming visit — nine quick steps, about two minutes, secured with a $25 deposit.",
}

export default function AppointmentWizardPage() {
  // CSR architecture: static shell; the wizard's reference data (breeds,
  // services, groomers, lookups) loads client-side — the form itself is pure
  // client-side state, exactly as before.

  return (
    <>
      <PageHeader n="09" label="BOOK" />

      {/* THE APPOINTMENT WIZARD — its own page. The book page presents the
          options; this page is the booking flow itself, text on the canvas. */}
      <section className="marble bg-cream px-8 py-14 lg:px-12">
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:text-gold-deep"
        >
          ← BACK TO BOOKING OPTIONS
        </Link>
        <h1 className="mt-5 font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
          Reserve Your<br />Visit.
        </h1>
        <p className="mt-6 max-w-[420px] text-[12.5px] leading-[1.85] text-ink-soft">
          Nine quick steps, about two minutes. Your progress saves as you go — step away and pick up right where you left off.
        </p>
        <div className="mt-10">
          <WizardLoader flow="appointment" />
        </div>
      </section>
    </>
  )
}
