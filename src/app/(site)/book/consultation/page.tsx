import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"
import { WizardLoader } from "@/components/site/islands/wizard-loader"

export const metadata = {
  title: "Request a Consultation | All About Pawz",
  description: "Request a free consultation — tell us about your pup and we'll reach out to plan the first groom together.",
}

export default function ConsultationWizardPage() {
  // CSR architecture: static shell; wizard reference data loads client-side.

  return (
    <>
      <PageHeader n="09" label="BOOK" />

      {/* THE CONSULTATION WIZARD — its own page, its own flow. Not the
          booking flow: no deposit, no service selection — tell us about the
          pup, pick a preferred date, and we reach out to plan the visit. */}
      <section className="marble bg-cream px-8 py-14 lg:px-12">
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:text-gold-deep"
        >
          ← BACK TO BOOKING OPTIONS
        </Link>
        <h1 className="mt-5 font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
          Start the<br />Conversation.
        </h1>
        <p className="mt-6 max-w-[420px] text-[12.5px] leading-[1.85] text-ink-soft">
          Free — no deposit, no pressure. Tell us about your pup and pick a preferred day; we&apos;ll reach out personally to plan the first groom.
        </p>
        <div className="mt-10">
          <WizardLoader flow="consultation" />
        </div>
      </section>
    </>
  )
}
