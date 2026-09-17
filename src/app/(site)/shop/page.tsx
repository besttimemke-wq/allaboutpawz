import Link from "next/link"
import { ArrowDown, Sparkle } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { Plp } from "@/components/site/shop/plp"
import { CheckoutIsland } from "@/components/site/shop/checkout-island"
import { TrustStrip } from "@/components/site/shop/shared"
import { SITE_URL } from "@/lib/site-url"

// ---------------------------------------------------------------------------
// /shop — the shop-all product listing page. Server-rendered on request:
// the URL's filter/sort state is resolved on the server, the product query
// runs server-side, and the browser receives complete HTML. The sidebar
// (category NAVIGATION + checkbox FILTERS) and the toolbar controls are
// client islands embedded in the server page; the checkout wizard mounts
// only when a checkout is in flight (?checkout=…).
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Shop the Pawz Boutique | All About Pawz",
  description:
    "Groomer-curated dog shampoos, conditioners, colognes, tools, and accessories — hand-selected by All About Pawz groomers for coat health, comfort, and style.",
  // Filter/sort query variants consolidate onto the canonical listing URL.
  alternates: { canonical: `${SITE_URL}/shop` },
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShopPage({ searchParams }: PageProps) {
  const sp = await searchParams

  return (
    <>
      <PageHeader n="06" label="SHOP" />

      {/* Hero — brand band above the listing */}
      <section className="marble grid grid-cols-1 items-stretch gap-10 bg-cream px-8 pt-6 pb-10 lg:min-h-[420px] lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:pt-8">
        <div className="flex flex-col justify-center pb-6">
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="h-3.5 w-3.5" strokeWidth={1.5} /> THE PAWZ COLLECTION
          </p>
          <h1 className="mt-3 font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
            Bring the<br />Pawfection<br />Home.
          </h1>
          <p className="mt-6 max-w-[340px] text-[12.5px] leading-[1.85] text-ink-soft">
            Curated grooming products, tools, and accessories — hand-selected by our groomers for
            coat health, comfort, and style.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#collection" className="btn-gold">
              SHOP THE COLLECTION <ArrowDown className="ml-1 inline h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link href="/book" className="btn-ghost">BOOK A GROOM</Link>
          </div>
        </div>
        <div className="relative flex items-end justify-center pb-2">
          { }
          <img
            src="/Shop/shop.png"
            alt="Pawz Signature Shampoo bottle"
            width={199}
            height={486}
            className="max-h-[440px] w-auto max-w-full self-end object-contain"
          />
          <span className="absolute left-0 top-0 bg-ink px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-gold">
            GROOMER FAVORITE
          </span>
        </div>
      </section>

      {/* The listing: sidebar + grid, all resolved server-side */}
      <section id="collection" className="marble scroll-mt-24 bg-cream px-8 pb-14 pt-10 lg:px-12">
        <CheckoutIsland />
        <Plp scope={{ kind: "all" }} searchParams={sp} />
      </section>

      <TrustStrip />
    </>
  )
}
