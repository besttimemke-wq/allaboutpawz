import type { Metadata } from "next"
import { PageHeader } from "@/components/site/site-chrome"
import { Divider } from "@/components/site/brand"
import { SITE_URL } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "Gift Cards | All About Pawz — Memphis, TN",
  description: "All About Pawz gift cards — the perfect gift for pet lovers in Memphis and Shelby County. Available in any amount, redeemable for grooming and retail.",
  alternates: { canonical: `${SITE_URL}/gift-cards` },
}

export default function GiftCardsPage() {
  const amounts = [25, 50, 75, 100, 150, 250]
  return (
    <>
      <PageHeader n="06" label="GIFT CARDS" />
      <section className="bg-white px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[54px]">All About Pawz Gift Cards</h1>
          <div className="mt-4"><Divider /></div>
          <p className="mt-6 max-w-[520px] text-base leading-[1.85] text-ink-soft">
            The perfect gift for the pet lover in your life. Redeemable for grooming services,
            retail products, and everything in between at our Memphis salon. Available in any amount.
          </p>

          {/* Amount selection */}
          <div className="mt-10">
            <h2 className="text-lg font-bold text-ink">Choose an Amount</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {amounts.map(amt => (
                <div key={amt} className="cursor-pointer rounded-lg border-2 border-gold/30 p-6 text-center transition hover:border-gold-deep hover:bg-cream/20">
                  <p className="text-2xl font-bold text-ink">${amt}</p>
                </div>
              ))}
              <div className="cursor-pointer rounded-lg border-2 border-gold/30 p-6 text-center transition hover:border-gold-deep hover:bg-cream/20">
                <p className="text-sm font-bold text-ink-soft">Custom<br/>Amount</p>
              </div>
            </div>
          </div>

          {/* Purchase CTA */}
          <div className="mt-10 rounded-lg bg-cream/20 border border-gold/20 p-8 text-center">
            <h2 className="text-lg font-bold text-ink">Ready to Purchase?</h2>
            <p className="mt-2 text-sm text-ink-soft">Gift cards are delivered by email and can be redeemed online or in-store at 699 Waring Rd, Memphis, TN 38122.</p>
            <a href="/book/appointment" className="mt-4 inline-flex items-center gap-2 rounded bg-gold-deep px-6 py-3 text-sm font-bold text-cream hover:bg-gold">Purchase Gift Card</a>
          </div>

          {/* How it works */}
          <div className="mt-12">
            <h2 className="text-lg font-bold text-ink">How It Works</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <h3 className="font-bold text-ink">1. Choose an Amount</h3>
                <p className="mt-2 text-sm text-ink-soft">Select from preset amounts or enter a custom value.</p>
              </div>
              <div>
                <h3 className="font-bold text-ink">2. We Email It</h3>
                <p className="mt-2 text-sm text-ink-soft">The gift card is delivered to the recipient's email instantly.</p>
              </div>
              <div>
                <h3 className="font-bold text-ink">3. They Redeem</h3>
                <p className="mt-2 text-sm text-ink-soft">Use it online for grooming, retail, or in-store at our Memphis salon.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
