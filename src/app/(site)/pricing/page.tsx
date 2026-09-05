import Link from "next/link"
import { Sparkles } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { getIcon } from "@/lib/icons"
import { getSiteContent } from "@/lib/site-data"

export const metadata = {
  title: "Grooming Packages & Pricing | All About Pawz",
  description: "Transparent pricing by dog size — Bath & Brush, Full Groom, and Deluxe Spa packages plus add-ons. Book your pup's experience today.",
}

const SIZES: [string, string][] = [
  ["SMALL", "smallPrice"],
  ["MEDIUM", "mediumPrice"],
  ["LARGE", "largePrice"],
  ["X-LARGE", "xlargePrice"],
]

// Product details per package — everything shown inside the cards.
const PACKAGE_META: Record<string, { image: string; alt: string; blurb: string; badge?: string }> = {
  "Bath & Brush": {
    image: "/services/bath_and_spa_.jpeg",
    alt: "Small dog enjoying a warm bath in the All About Pawz grooming sink",
    blurb: "The essentials, done beautifully. A warm premium bath, blow-dry, full brush-out, and a tidy finish — the perfect refresh between grooms.",
  },
  "Full Groom": {
    image: "/services/grooming_services.jpeg",
    alt: "Professional grooming station where All About Pawz full grooms are performed",
    blurb: "Everything in the Bath & Brush plus a full breed-specific haircut, styled to your preferences and finished to show quality.",
    badge: "MOST POPULAR",
  },
  "Deluxe Spa": {
    image: "/services/serviceshero2.jpeg",
    alt: "Groomed dog wearing a bandana after the All About Pawz deluxe spa experience",
    blurb: "Our signature experience. The Full Groom plus a de-shedding treatment, teeth brushing, paw balm, and a signature fragrance finish.",
  },
}

export default async function PricingPage() {
  const { packages, addons } = await getSiteContent()

  // Seed data carries duplicate rows per package name — show each product once.
  const seen = new Set<string>()
  const uniquePackages = packages.filter((p: any) => {
    if (seen.has(p.name)) return false
    seen.add(p.name)
    return true
  })

  return (
    <>
      <PageHeader n="05" label="PRICING" />
      {/* HERO — site standard: text left, image right filling its column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Simple.<br />Transparent.<br />Worth Every Penny.</h1>
          <p className="mt-6 max-w-[320px] text-[12.5px] leading-[1.85] text-ink-soft">Honest pricing by dog size — no surprises, just exceptional care. Choose the experience that fits your pup.</p>
          <HeroCtas bookLabel="BOOK A GROOM" />
        </div>
        <div className="relative min-h-[300px]">
          <img src="/Pricing/pricinghero-v2.jpeg" alt="Fluffy tan maltipoo wearing a blue beach bandana sitting in the All About Pawz grooming salon" width={1448} height={1086} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </section>

      {/* ADD-ONS — little extras on black, directly after the hero. Same
          band structure as the homepage services band. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">ENHANCE ANY VISIT</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Little Extras.<br />Big Joy.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              Small finishing touches that make a big difference. Add any of these when you book — your groomer takes care of the rest.
            </p>
            <Link href="/book" className="btn-gold mt-6">BOOK A GROOM</Link>
          </div>
          <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-5">
            {addons.map(({ id, title, price, icon }: any, i: number) => {
              const Icon = getIcon(icon, Sparkles)
              const t = String(title || "").toUpperCase()
              // The toothbrush & comb marks — gold, from the brand icon set.
              const customIcon =
                t === "TEETH BRUSHING" ? "/assets/icon-toothbrush-gold.png"
                : t === "DE-SHEDDING" ? "/assets/icon-comb-gold.png"
                : null
              return (
                <div key={id} className={`px-2 text-center sm:px-4 ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
                  {customIcon ? (
                    <img src={customIcon} alt="" width={120} height={120} className="mx-auto h-10 w-10 object-contain" />
                  ) : (
                    <Icon className="mx-auto h-10 w-10 text-gold" strokeWidth={1.2} />
                  )}
                  <h3 className="mt-4 text-[11px] font-bold tracking-[0.14em] text-gold">{title.toUpperCase()}</h3>
                  <p className="mt-2 text-[13px] font-bold text-on-dark">{price}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* PACKAGES — each service is a clearly defined product card: image,
          name, concise description, transparent size-based pricing, and a
          clear call to action. Premium, spacious, easy to scan. */}
      <section className="marble bg-cream px-8 py-14 lg:px-12 lg:py-20">
        <div className="max-w-[280px]">
          <p className="eyebrow">PACKAGES &amp; PRICING</p>
          <h2 className="mt-3 font-display text-[38px] leading-[1.1] text-ink lg:text-[48px]">Choose Their<br />Experience.</h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {uniquePackages.map((p: any, i: number) => {
            const meta = PACKAGE_META[p.name] ?? {
              image: "/services/grooming_services.jpeg",
              alt: `${p.name} grooming package at All About Pawz`,
              blurb: p.description || "A premium grooming experience tailored to your pup.",
            }
            return (
              <article key={p.id} className="flex flex-col border border-gold/30 bg-card">
                {/* Product image + optional badge */}
                <div className="relative aspect-[4/3]">
                  <img src={meta.image} alt={meta.alt} width={2752} height={1536} className="absolute inset-0 h-full w-full object-cover" />
                  {meta.badge && (
                    <span className="absolute left-5 top-5 bg-ink px-3.5 py-2 text-[9px] font-bold tracking-[0.18em] text-gold">{meta.badge}</span>
                  )}
                </div>

                {/* Product body */}
                <div className="flex flex-1 flex-col p-7 lg:p-8">
                  <p className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">GROOMING PACKAGE</p>
                  <h3 className="mt-2.5 font-display text-[26px] leading-[1.12] text-ink">{p.name}</h3>
                  <p className="mt-3.5 text-[12px] leading-[1.75] text-ink-soft">{meta.blurb}</p>

                  {/* Divider + transparent size pricing */}
                  <div className="mt-7 border-t border-gold/25 pt-6">
                    <div className="grid grid-cols-4 gap-2">
                      {SIZES.map(([label, key]) => (
                        <div key={key} className="text-center">
                          <p className="text-[8.5px] font-bold tracking-[0.14em] text-ink-soft/70">{label}</p>
                          <p className="mt-1.5 text-[14px] font-bold text-ink">{p[key]}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Call to action */}
                  <div className="mt-7 pt-0">
                    <Link href="/book" className="btn-gold w-full">BOOK THIS PACKAGE</Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="mt-16 text-center text-[11px] italic leading-[1.7] text-ink-soft lg:mt-20">Prices are starting points. Final pricing may vary based on coat condition, temperament, and length of service.</p>
      </section>
    </>
  )
}
