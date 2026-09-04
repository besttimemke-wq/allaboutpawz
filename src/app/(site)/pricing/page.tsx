import Link from "next/link"
import { Sparkles } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { getIcon } from "@/lib/icons"
import { getSiteContent } from "@/lib/site-data"

const SIZES = ["SMALL", "MEDIUM", "LARGE", "X-LARGE"]
const PRICE_KEYS = ["smallPrice", "mediumPrice", "largePrice", "xlargePrice"] as const

export default async function PricingPage() {
  const { packages, addons } = await getSiteContent()
  return (
    <>
      <PageHeader n="05" label="PRICING" />
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 py-14 lg:grid-cols-[1fr_0.8fr] lg:px-12">
        <div>
          <h1 className="font-display text-[38px] leading-[1.1] text-ink">Simple.<br />Transparent.<br />Worth Every Penny.</h1>
          <p className="mt-6 max-w-[320px] text-[12.5px] leading-[1.85] text-ink-soft">Pricing is based on size, coat condition, breed, and service package.</p>
        </div>
        { }
        <img src="/assets/dog-bichon.jpg" alt="White bichon frise wearing a black bow tie" width={900} height={1024} className="h-[300px] w-full object-contain" />
      </section>
      <section className="marble bg-cream px-8 pb-14 lg:px-12">
        <div className="border border-gold/30">
          <h2 className="border-b border-gold/30 bg-cream-deep py-3 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">GROOMING PACKAGES</h2>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-gold/25">
                <th className="w-[34%] px-5 py-3 text-left"></th>
                {SIZES.map((sz) => <th key={sz} className="px-3 py-3 text-center text-[9.5px] font-bold tracking-[0.16em] text-gold-deep">{sz}</th>)}
              </tr>
            </thead>
            <tbody>
              {packages.map((p: any) => (
                <tr key={p.id} className="border-b border-gold/15 last:border-0">
                  <td className="px-5 py-3.5 text-left text-ink">{p.name}</td>
                  {PRICE_KEYS.map((k) => <td key={k} className="px-3 py-3.5 text-center text-ink-soft">{p[k]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 border border-gold/30">
          <h2 className="border-b border-gold/30 bg-cream-deep py-3 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">POPULAR ADD-ONS</h2>
          <div className="grid grid-cols-2 divide-gold/20 py-6 lg:grid-cols-5 lg:divide-x">
            {addons.map(({ id, title, price, icon }: any) => {
              const Icon = getIcon(icon, Sparkles)
              return (
                <div key={id} className="px-4 py-3 text-center">
                  <Icon className="mx-auto h-6 w-6 text-gold-deep" strokeWidth={1.2} />
                  <h3 className="mt-3 text-[11px] text-ink">{title}</h3>
                  <p className="mt-1 text-[11.5px] font-bold text-gold-deep">{price}</p>
                </div>
              )
            })}
          </div>
        </div>
        <p className="mt-8 text-center text-[11.5px] leading-[1.7] text-ink-soft">Prices are starting points. Final pricing may vary based on coat condition, temperament, and length of service.</p>
        <div className="mt-6 text-center">
          <Link href="/book" className="btn-gold">VIEW FULL PRICING GUIDE</Link>
        </div>
      </section>
    </>
  )
}
