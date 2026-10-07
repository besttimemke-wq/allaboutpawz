import type { Metadata } from "next"
import Link from "next/link"
import { Divider } from "@/components/site/brand"
import { SHOP_NAV_TAXONOMY } from "@/lib/shop-nav"
import { SITE_URL } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "Shop | All About Pawz — Memphis, TN",
  description: "Shop dog and cat supplies at All About Pawz Memphis — locally owned pet supply shop and grooming salon. Food, treats, beds, toys, grooming, health, and wellness.",
  alternates: { canonical: `${SITE_URL}/shop` },
}

export default function ShopPage() {
  return (
    <section className="bg-white px-6 py-16 sm:px-12 lg:px-16 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[54px]">
          Shop All About Pawz
        </h1>
        <div className="mt-4"><Divider /></div>
        <p className="mt-6 max-w-[520px] text-base leading-[1.85] text-ink-soft">
          Locally owned pet supply shop and grooming salon in Memphis, TN.
          Shop dog and cat supplies — food, treats, beds, toys, grooming, health, and wellness.
          Available in-store at 699 Waring Rd or online.
        </p>

        {/* Animal landing cards */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {SHOP_NAV_TAXONOMY.map(animal => (
            <Link
              key={animal.slug}
              href={`/shop/${animal.slug}`}
              className="group rounded-lg border border-[#D4C5B9] bg-cream p-8 transition hover:border-[#8B7355] hover:shadow-md"
            >
              <h2 className="font-display text-2xl font-bold text-ink group-hover:text-[#8B7355]">
                {animal.name}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{animal.tagline}</p>
              <p className="mt-3 text-xs font-semibold tracking-[0.1em] text-[#8B7355]">
                {animal.departments.length} departments →
              </p>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/shop/sale" className="rounded border border-[#D4C5B9] px-4 py-2.5 text-sm font-semibold text-ink hover:border-[#8B7355] hover:bg-cream">Sale</Link>
          <Link href="/shop/collections" className="rounded border border-[#D4C5B9] px-4 py-2.5 text-sm font-semibold text-ink hover:border-[#8B7355] hover:bg-cream">Promotions</Link>
          <Link href="/gift-cards" className="rounded border border-[#D4C5B9] px-4 py-2.5 text-sm font-semibold text-ink hover:border-[#8B7355] hover:bg-cream">Gift Cards</Link>
          <Link href="/shop/brands" className="rounded border border-[#D4C5B9] px-4 py-2.5 text-sm font-semibold text-ink hover:border-[#8B7355] hover:bg-cream">Shop by Brand</Link>
        </div>
      </div>
    </section>
  )
}
