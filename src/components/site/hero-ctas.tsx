import Link from "next/link"

// ---------------------------------------------------------------------------
// HeroCtas — the standard two-button hero call-to-action pair, prominent on
// every page except the shop: BOOK TODAY (appointment flow) and SCHEDULE
// CONSULT (free consultation flow). Each flow is its own page.
// ---------------------------------------------------------------------------

export function HeroCtas({
  bookLabel = "BOOK TODAY",
  consultLabel = "SCHEDULE CONSULT",
  className = "mt-8 flex flex-wrap gap-4",
}: {
  bookLabel?: string
  consultLabel?: string
  className?: string
}) {
  return (
    <div className={className}>
      <Link href="/book/appointment" className="btn-gold">{bookLabel}</Link>
      <Link href="/book/consultation" className="btn-ghost">{consultLabel}</Link>
    </div>
  )
}
