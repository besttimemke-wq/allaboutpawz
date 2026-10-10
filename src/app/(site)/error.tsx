"use client"

import Link from "next/link"

// Graceful failure boundary for every public page: a transient data error
// shows a retry card inside the site chrome instead of a bare 500.
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="marble bg-cream px-8 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">ALL ABOUT PAWZ</p>
        <h1 className="mt-3 font-display text-[40px] leading-[1.1] text-ink lg:text-[52px]">Something went wrong on our end.</h1>
        <p className="mt-6 max-w-xl text-[15px] leading-[1.85] text-ink-soft">
          This page couldn&apos;t load right now. Please try again in a moment, or head back to browse the shop.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn-gold">TRY AGAIN</button>
          <Link href="/shop" className="btn-ghost">SHOP</Link>
          <Link href="/" className="btn-ghost">GO HOME</Link>
        </div>
      </div>
    </section>
  )
}
