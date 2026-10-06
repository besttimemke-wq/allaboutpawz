"use client"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// ServicePrice — the ONE pricing display rule for the whole service menu
// (owner spec): every service, package, add-on, and treatment renders
// "starts at $X" from the tenant catalog, plus the PAWfection Bath Club
// member line when the catalog row carries a member price for the pet's
// size tier. NULL member price = no member line, no badge. Nothing
// hardcoded — the caller passes catalog cents.
//
//   <ServicePrice
//     priceCents={service.price_cents}
//     memberPriceCents={service.member_price_cents}
//     petSize={selectedPetSize}
//   />
// ---------------------------------------------------------------------------

export function ServicePrice({
  priceCents,
  memberPriceCents,
  isMember = false,
  customQuote = false,
  size = "md",
  align = "right",
  compact = false,
  className,
}: {
  priceCents: number | null
  memberPriceCents?: number | null
  /** signed-in Bath Club member → the member price becomes THE price */
  isMember?: boolean
  /** XL treatments: no online price, "Custom quote" */
  customQuote?: boolean
  size?: "sm" | "md" | "lg"
  align?: "left" | "right"
  compact?: boolean
  className?: string
}) {
  const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
  const priceCls =
    size === "lg" ? "text-[18px]" : size === "sm" ? "text-[15px]" : "text-[17px]"

  if (customQuote) {
    return (
      <span className={cn("block text-right", className)}>
        <span className={cn("type-body block font-bold tabular-nums text-ink", priceCls)}>
          Custom quote
        </span>
        {!compact && (
          <span className="mt-0.5 block text-[11px] leading-tight text-neutral-400">
            priced at the salon
          </span>
        )}
      </span>
    )
  }

  if (priceCents == null) {
    return <span className={cn("block text-[13px] text-neutral-400", className)}>—</span>
  }

  const showMemberLine = memberPriceCents != null && memberPriceCents > 0
  const memberIsThePrice = isMember && showMemberLine

  return (
    <span className={cn("block", align === "right" && "text-right", className)}>
      {memberIsThePrice ? (
        <>
          <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-gold-deep">
            Bath Club price
          </span>
          <span className={cn("type-body block font-bold tabular-nums text-ink", priceCls)}>
            {money(memberPriceCents!)}
          </span>
        </>
      ) : (
        <>
          <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-400">
            starts at
          </span>
          <span className={cn("type-body block font-bold tabular-nums text-ink", priceCls)}>
            {money(priceCents)}
          </span>
          {showMemberLine && (
            <span className="mt-0.5 block text-[12px] font-semibold leading-tight text-neutral-500">
              · Bath Club members:{" "}
              <span className="text-gold-deep">{money(memberPriceCents!)}</span>
            </span>
          )}
        </>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// MemberSavingsBadge — "Members save $X" when the member price undercuts the
// standard price. Renders nothing when there's no member price or no saving.
// ---------------------------------------------------------------------------

export function MemberSavingsBadge({
  priceCents,
  memberPriceCents,
  className,
}: {
  priceCents: number | null | undefined
  memberPriceCents?: number | null
  className?: string
}) {
  if (priceCents == null || memberPriceCents == null) return null
  const save = priceCents - memberPriceCents
  if (save <= 0) return null
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-gold-deep ring-1 ring-gold-deep/30",
        className,
      )}
    >
      Members save ${(save / 100).toFixed(save % 100 === 0 ? 0 : 2)}
    </span>
  )
}
