import { PageHeader } from "@/components/site/site-chrome"
import { BookingFlow } from "@/components/site/islands/booking-flow"
import { SITE_URL } from "@/lib/site-url"

export const metadata = {
  title: "Book a Grooming Appointment | All About Pawz",
  description:
    "Reserve your pup's grooming visit — five quick steps, about a minute. Tell us about your pet, pick your services, choose a time, and book. Pay in full or hold your slot with a $25 deposit.",
  alternates: { canonical: `${SITE_URL}/book/appointment` },
}

// ============================================================================
// The booking flow page — WHITE, enterprise, no hero, no motto.
// The flow island renders its own stepper, step content, summary cards, and
// action bars; this shell supplies only the page header rail, a plain
// heading, and the narrow reading column. (Petco-style: the page IS the
// form.)
// ============================================================================
export default function AppointmentWizardPage() {
  // CSR architecture: static shell; reference data (breeds, the service
  // menu, tax rate) loads client-side in one /api/booking/menu round trip —
  // the flow itself is pure client-side state that survives refreshes.
  return (
    <>
      <PageHeader n="09" label="BOOK" />

      <section className="bg-white px-4 py-8 sm:px-6 lg:px-12 lg:py-10">
        {/* Wide enough for the TIME step's calendar-left / times-right
            layout — the page's white space is USED, not scrolled through. */}
        <div className="mx-auto max-w-3xl lg:max-w-4xl">
          <h1 className="type-body text-[26px] font-bold leading-tight tracking-[-0.01em] text-ink sm:text-[30px]">
            Grooming Appointment
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
            Five quick steps, about a minute — sign in, tell us about your pup, pick your services,
            choose a time, and book. Pay in full or hold your slot with a $25 deposit.
          </p>

          {/* THE BOOKING FLOW — five steps, one page, sign-in first. */}
          <div className="mt-8">
            <BookingFlow />
          </div>
        </div>
      </section>
    </>
  )
}
