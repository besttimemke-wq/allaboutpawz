// ---------------------------------------------------------------------------
// api-error-text.ts — client-safe error text sanitizer.
//
// Final safety net for ANYTHING user-facing: if a technical payload
// (PostgREST/Postgres/Stripe-style JSON, error codes like 42804) ever
// reaches the client, swap it for plain salon language. The server-side
// mapper (src/lib/db-errors.ts) is the primary defense; this catches
// anything it misses. Pure function — safe for client components.
// ---------------------------------------------------------------------------

const TECHNICAL =
  /Supabase \d{3}:|PostgREST|"code"\s*:|error:.*column|42804|42703|23505|23503|22P02|"hint"|"details"|relation .* does not exist/i

export function sanitizeApiErrorText(text: string | undefined | null, fallback: string): string {
  const t = String(text || "")
  if (!t) return fallback
  if (TECHNICAL.test(t)) {
    return "We hit a snag saving your details. Please try again — if it keeps happening, call the salon and we'll get you booked right away."
  }
  return t
}
