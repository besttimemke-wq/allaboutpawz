import Link from "next/link"
import { Award, Lightbulb, Heart, Truck, Lock, Store, Sparkle, ArrowDown, Scissors } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { ShopLoader } from "@/components/site/islands/shop-loader"

const ASSURANCES = [
  { Icon: Truck, title: "Free Standard Shipping", body: "On every order — 5–7 business days." },
  { Icon: Lock, title: "Secure Checkout", body: "Payments processed by Stripe." },
  { Icon: Award, title: "Groomer Approved", body: "The same tools we use in-salon." },
]

const BADGES = [
  { Icon: Award, title: "Premium Quality", body: ["Only the best for", "your best friend."] },
  { Icon: Lightbulb, title: "Expert Guidance", body: ["We help you choose", "what's right."] },
  { Icon: Heart, title: "Loved by Pups", body: ["Tried, tested, and", "tail-wag approved."] },
]

export default function ShopPage() {
  // CSR architecture: static shell (hero, assurances, badges, cross-sell);
  // the catalog, category tree, and review rollups fetch client-side.

  return (
    <>
      <PageHeader n="06" label="SHOP" />

      {/* Hero — raised to the top, natural height; the bottle stands at the
          base of its column, directly against the canvas (no container). */}
      <section className="marble grid grid-cols-1 items-stretch gap-10 bg-cream px-8 pt-6 lg:min-h-[520px] lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:pt-8">
        <div className="flex flex-col justify-center pb-10">
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="h-3.5 w-3.5" strokeWidth={1.5} /> THE PAWZ COLLECTION
          </p>
          <h1 className="mt-3 font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
            Bring the<br />Pawfection<br />Home.
          </h1>
          <p className="mt-6 max-w-[340px] text-[12.5px] leading-[1.85] text-ink-soft">
            Curated grooming products, tools, and accessories — hand-selected by our groomers for coat health, comfort, and style.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#collection" className="btn-gold">
              SHOP THE COLLECTION <ArrowDown className="ml-1 inline h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link href="/book" className="btn-ghost">BOOK A GROOM</Link>
          </div>
        </div>
        <div className="relative flex items-end justify-center pb-2">
          <img
            src="/Shop/shop.png"
            alt="Pawz Signature Shampoo bottle"
            width={199}
            height={486}
            className="max-h-[460px] w-auto max-w-full self-end object-contain"
          />
          <span className="absolute left-0 top-0 bg-ink px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-gold">
            GROOMER FAVORITE
          </span>
        </div>
      </section>

      {/* Assurance strip */}
      <section className="border-y border-gold/25 bg-cream-deep px-8 py-6 lg:px-12">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {ASSURANCES.map(({ Icon, title, body }, i) => (
            <div key={title} className={`flex items-start gap-3 ${i > 0 ? "sm:border-l sm:border-gold/25 sm:pl-6" : ""}`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" strokeWidth={1.4} />
              <div>
                <p className="text-[11px] font-bold tracking-[0.08em] text-ink">{title.toUpperCase()}</p>
                <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-soft">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collection */}
      <section id="collection" className="marble scroll-mt-24 bg-cream px-8 pb-14 pt-12 lg:px-12">
        <h2 className="border-t border-gold/25 pt-8 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">
          SHOP OUR FAVORITES
        </h2>
        <ShopLoader />
      </section>

      {/* Trust badges */}
      <section className="grid grid-cols-1 gap-6 bg-ink px-8 py-10 lg:grid-cols-3 lg:px-12">
        {BADGES.map(({ Icon, title, body }, i) => (
          <div key={title} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            <Icon className="mx-auto h-6 w-6 text-gold" strokeWidth={1.2} />
            <h3 className="mt-3 text-[11px] font-bold tracking-[0.1em] text-gold">{title}</h3>
            <p className="mt-2 text-[11.5px] leading-[1.7] text-on-dark-muted">{body.map((l) => <span key={l} className="block">{l}</span>)}</p>
          </div>
        ))}
      </section>

      {/* Cross-sell */}
      <section className="marble grid grid-cols-1 items-center gap-8 bg-cream-deep px-8 py-12 lg:grid-cols-[1fr_auto] lg:px-12">
        <div className="flex items-start gap-4">
          <Scissors className="mt-1 h-8 w-8 shrink-0 text-gold-deep" strokeWidth={1.2} />
          <div>
            <h2 className="font-display text-[24px] leading-tight text-ink">Pair your products with a pawfection groom.</h2>
            <p className="mt-2 max-w-md text-[12px] leading-[1.75] text-ink-soft">
              Our full-service grooming packages use these very products. Book a session and let our groomers work their magic.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/book" className="btn-gold">BOOK AN APPOINTMENT</Link>
          <Link href="/contact" className="btn-ghost"><Store className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.5} /> VISIT THE SALON</Link>
        </div>
      </section>
    </>
  )
}
