import { Truck, Lock, Award, RotateCcw } from "lucide-react"

// ---------------------------------------------------------------------------
// Trust & Service band — the remote project's 4-section band, imported and
// rendered directly beneath every shop hero (landing, category, product).
// Bands and icons live in CODE (never the database) — only shop, gallery,
// pricing, and services data are database-driven.
// ---------------------------------------------------------------------------

const SERVICE_ITEMS = [
  {
    id: "service-shipping",
    Icon: Truck,
    title: "Free Standard Shipping",
    description: "On every order — 5–7 business days.",
  },
  {
    id: "service-secure-checkout",
    Icon: Lock,
    title: "Secure Checkout",
    description: "Payments processed by Stripe.",
  },
  {
    id: "service-groomer-approved",
    Icon: Award,
    title: "Groomer Approved",
    description: "The same tools we use in-salon.",
  },
  {
    id: "service-return-policy",
    Icon: RotateCcw,
    title: "Return Policy",
    description: "30-day effortless returns on all items.",
  },
] as const

export function TrustServiceBand() {
  return (
    <section
      id="trust-service-band"
      aria-label="Trust and Services"
      className="w-full border-y border-gold/25 bg-cream-deep/50"
      data-purpose="service-band"
    >
      <div className="w-full px-8 py-6 lg:px-12">
        <div className="grid grid-cols-1 divide-y divide-gold/20 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          {SERVICE_ITEMS.map(({ id, Icon, title, description }, idx) => (
            <div
              key={id}
              className={`flex items-center gap-3.5 py-3 sm:py-0 ${
                idx === 0
                  ? "sm:pr-6 lg:pr-8"
                  : idx === SERVICE_ITEMS.length - 1
                    ? "sm:pl-6 lg:pl-8"
                    : "sm:px-6 lg:px-8"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center text-gold-deep">
                <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[11px] font-bold uppercase tracking-wider leading-snug text-ink">
                  {title}
                </h3>
                <p className="mt-0.5 text-[11px] leading-tight text-ink-soft">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
