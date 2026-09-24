"use client"

import { useCms, useCmsSettings, visibleOnly } from "./use-cms"

// ---------------------------------------------------------------------------
// Home page data islands (CSR). The hero renders instantly with the built-in
// fallback copy, then swaps in the admin-published copy when it arrives.
// ---------------------------------------------------------------------------

export function HomeHeroCopy() {
  const { settings: s } = useCmsSettings()
  return (
    <>
      <h1 className="mt-4 whitespace-pre-line font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
        {s.heroTitle || "Luxury Grooming.\nExceptional Care."}
      </h1>
      <p className="script mt-3 text-[34px]">{s.tagline || "From Pawz to PAWfection"}</p>
    </>
  )
}

export function HomeHeroSubtitle() {
  const { settings: s } = useCmsSettings()
  return (
    <p className="mt-6 max-w-[380px] text-[13px] leading-[1.75] text-ink-soft">
      {s.heroSubtitle || "We deliver a spa-level grooming experience where every detail is designed for your pup's comfort, style, and happiness."}
    </p>
  )
}

type Testimonial = { id: string; quote: string; author: string; visible?: boolean }

export function HomeTestimonial() {
  const { data, loading } = useCms<Testimonial>("testimonials")
  const testimonial = visibleOnly(data)[0]

  // While loading (or with no testimonials published) the section simply
  // stays as the static marketing copy — no skeleton flash in the hero flow.
  if (loading || !testimonial) return null

  return (
    <>
      <p className="script mt-5 text-[24px]">A few words from our family</p>
      <p className="mt-3 max-w-[400px] text-[12.5px] italic leading-[1.8] text-ink-soft">&ldquo;{testimonial.quote}&rdquo;</p>
      <p className="mt-2 text-[12px] text-ink-soft">– {testimonial.author}</p>
    </>
  )
}
