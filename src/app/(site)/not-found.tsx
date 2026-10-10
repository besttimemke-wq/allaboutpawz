import Link from "next/link"
import { PageHeader } from "@/components/site/site-chrome"

export default function NotFound() {
  return (
    <>
      <PageHeader n="404" label="PAGE NOT FOUND" />
      <section className="marble bg-cream px-8 py-20 lg:px-12 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">ALL ABOUT PAWZ</p>
          <h1 className="mt-3 font-display text-[46px] leading-[1.08] text-ink lg:text-[60px]">This page might have moved.</h1>
          <p className="mt-6 max-w-xl text-[15px] leading-[1.85] text-ink-soft">
            The page you requested is unavailable or no longer has a public address. You can return to the site, shop available supplies, or contact us for help finding what you need.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/" className="btn-gold">GO HOME</Link>
            <Link href="/shop" className="btn-ghost">SHOP</Link>
            <Link href="/contact" className="btn-ghost">CONTACT US</Link>
          </div>
        </div>
      </section>
    </>
  )
}
