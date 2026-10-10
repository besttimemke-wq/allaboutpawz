import Link from "next/link"
import { ArrowRight, Stethoscope, ShoppingBag, ShieldAlert } from "lucide-react"

// ---------------------------------------------------------------------------
// HomePawzsly — the triage-AI section (owner directive: "we need to create a
// section for triage AI Pawzsly and then wire it").
//
// It introduces the floating Pawzsly 🐾 assistant (mounted site-wide from the
// site layout) and routes people to the two outcomes the triage ladder
// produces: urgency guidance + vet booking, and product picks from the shop.
// Static server component — no hydration cost; the live chat itself is the
// PawzslyChat floating widget.
// ---------------------------------------------------------------------------

const PAWZLY_POINTS = [
  {
    Icon: ShieldAlert,
    title: "SYMPTOM TRIAGE",
    body: "Describe what's going on and Pawzsly grades it — emergency, urgent, or keep-an-eye-on-it — using veterinary triage protocols.",
  },
  {
    Icon: Stethoscope,
    title: "BOOK A VET",
    body: "Anything urgent or worse points you straight to booking a consult with the salon instead of guessing.",
  },
  {
    Icon: ShoppingBag,
    title: "SHOP PICKS",
    body: "Everyday needs get matched with products from our shelves — shampoos, calming aids, digestive support, and more.",
  },
]

export function HomePawzsly() {
  return (
    <section aria-labelledby="home-pawzsly-heading" className="border-y border-gold/25 bg-black">
      <div className="mx-auto max-w-[1600px] px-6 py-14 lg:px-12">
        <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[640px]">
            <p className="eyebrow-dark">MEET PAWZLY 🐾</p>
            <h2 id="home-pawzsly-heading" className="mt-2 font-display text-[30px] leading-[1.15] text-on-dark">
              Not sure if it&apos;s an emergency? Ask Pawzsly first.
            </h2>
            <p className="mt-3 text-[12.5px] leading-[1.75] text-on-dark-muted">
              Our AI triage assistant is on every page — tap the paw button, describe any symptom,
              and get an urgency read in seconds. It never diagnoses and always errs on the side of caution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 border border-gold/40 bg-cream px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] text-ink">
              🐾 TAP THE PAW — BOTTOM RIGHT
            </span>
            <Link href="/book" className="btn-gold">
              BOOK A CONSULT
            </Link>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {PAWZLY_POINTS.map(({ Icon, title, body }) => (
            <div key={title} className="border border-white/10 bg-white/[0.04] p-6">
              <Icon className="h-6 w-6 text-[#F2C500]" strokeWidth={1.4} aria-hidden="true" />
              <h3 className="mt-4 text-[10px] font-bold tracking-[0.14em] text-on-dark">{title}</h3>
              <p className="mt-2 text-[12px] leading-[1.7] text-on-dark-muted">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 flex items-center gap-2 text-[11px] text-on-dark-muted">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          Pawzsly provides general guidance only — it is not veterinary diagnosis, and when in doubt it will always tell you to see a vet.
        </p>
      </div>
    </section>
  )
}
