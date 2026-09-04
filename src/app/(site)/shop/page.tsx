import Link from "next/link"
import { Award, Lightbulb, Heart } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { ShopClient } from "@/components/site/islands/shop-client"
import { getSiteContent } from "@/lib/site-data"

const BADGES = [
  { Icon: Award, title: "Premium Quality", body: ["Only the best for", "your best friend."] },
  { Icon: Lightbulb, title: "Expert Guidance", body: ["We help you choose", "what's right."] },
  { Icon: Heart, title: "Loved by Pups", body: ["Tried, tested, and", "tail-wag approved."] },
]

export default async function ShopPage() {
  const { products } = await getSiteContent()
  // getSiteContent already filters visible; categories derived from visible set
  const cats = Array.from(new Set(products.map((p: any) => p.category || "General"))).sort()
  return (
    <>
      <PageHeader n="06" label="SHOP" />
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 py-14 lg:grid-cols-[1fr_0.8fr] lg:px-12">
        <div>
          <h1 className="font-display text-[38px] leading-[1.1] text-ink">Bring the<br />Pawfection<br />Home.</h1>
          <p className="mt-6 max-w-[300px] text-[12.5px] leading-[1.85] text-ink-soft">Curated products we love and trust for your pup.</p>
          <Link href="/consultation" className="btn-gold mt-7">SCHEDULE A FREE CONSULTATION</Link>
          <p className="mt-6 max-w-[300px] text-[12.5px] leading-[1.85] text-ink-soft">Let&apos;s find the perfect products for your pup.</p>
        </div>
        { }
        <img src="/assets/product-shampoo.jpg" alt="Pawz signature shampoo on a folded towel" width={900} height={1024} className="h-[340px] w-full object-cover" />
      </section>
      <section className="marble bg-cream px-8 pb-14 lg:px-12">
        <h2 className="border-t border-gold/25 pt-8 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">SHOP OUR FAVORITES</h2>
        <ShopClient products={products} categories={cats} />
      </section>
      <section className="grid grid-cols-1 gap-6 bg-ink px-8 py-10 lg:grid-cols-3 lg:px-12">
        {BADGES.map(({ Icon, title, body }, i) => (
          <div key={title} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            <Icon className="mx-auto h-6 w-6 text-gold" strokeWidth={1.2} />
            <h3 className="mt-3 text-[11px] font-bold tracking-[0.1em] text-gold">{title}</h3>
            <p className="mt-2 text-[11.5px] leading-[1.7] text-on-dark-muted">{body.map((l) => <span key={l} className="block">{l}</span>)}</p>
          </div>
        ))}
      </section>
    </>
  )
}
