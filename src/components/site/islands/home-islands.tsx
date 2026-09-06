// ---------------------------------------------------------------------------
// Home page content blocks — presentational, fed by SERVER-RENDERED data.
// The page (a server component) fetches settings / services / testimonials
// from Supabase and passes them in; these components do no fetching.
// ---------------------------------------------------------------------------

export function HomeHeroCopy({ settings: s }: { settings: Record<string, string> }) {
  return (
    <>
      <h1 className="mt-4 whitespace-pre-line font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
        {s.heroTitle || "Luxury Grooming.\nExceptional Care."}
      </h1>
      <p className="script mt-3 text-[34px]">{s.tagline || "From Pawz to PAWfection"}</p>
    </>
  )
}

export function HomeHeroSubtitle({ settings: s }: { settings: Record<string, string> }) {
  return (
    <p className="mt-6 max-w-[380px] text-[13px] leading-[1.75] text-ink-soft">
      {s.heroSubtitle || "We deliver a spa-level grooming experience where every detail is designed for your pup's comfort, style, and happiness."}
    </p>
  )
}

export type Testimonial = { id: string; quote: string; author: string; visible?: boolean }

export function HomeTestimonial({ testimonials }: { testimonials: Testimonial[] }) {
  const testimonial = testimonials[0]

  // With no testimonials published the section stays as the static
  // marketing copy — nothing renders.
  if (!testimonial) return null

  return (
    <>
      <p className="script mt-5 text-[24px]">A few words from our family</p>
      <p className="mt-3 max-w-[400px] text-[12.5px] italic leading-[1.8] text-ink-soft">&ldquo;{testimonial.quote}&rdquo;</p>
      <p className="mt-2 text-[12px] text-ink-soft">– {testimonial.author}</p>
    </>
  )
}
