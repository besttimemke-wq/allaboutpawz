"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { ServicePrice, MemberSavingsBadge } from "./service-price"

// ---------------------------------------------------------------------------
// ServiceMenuSections — the Pawz Service Menu (owner schedule) for the public
// pricing page. Two adjacent sections render from ONE client-side fetch of
// /api/booking/menu (the tenant catalog — service_items):
//
//   1. SELECT SERVICE — the packages (Bath Only / Bath & Haircut) with the
//      standard size ladder AND the PAWfection Bath Club member ladder,
//      plus the "All services include" inclusions band.
//   2. PREMIUM TREATMENTS — size-tiered surcharges (max one per booking),
//      XL = custom quote, on the dark ink band.
//
// Every price renders from the API response — nothing is hardcoded. The
// headline on each card follows the ServicePrice display rule ("starts at $X
// · Bath Club members: $Y"); NULL member price = no member line, no badge.
// ---------------------------------------------------------------------------

type SizeTier = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE"
type TierPrices = Record<SizeTier, number | null>

type MenuPackage = {
  id: string
  name: string
  category: string
  prices: TierPrices
  memberPrices: TierPrices
}
type MenuTreatment = MenuPackage & { note: string | null }

type BookingMenu = {
  packages: MenuPackage[]
  treatments: MenuTreatment[]
  isMember: boolean
}

// Product details per service — image + brand-voice blurb. Keyed by
// lowercased catalog name; unknown services fall back to the generic card.
const SERVICE_META: Record<string, { image: string; alt: string; blurb: string }> = {
  "bath only": {
    image: "/services/bath_and_spa_.jpeg",
    alt: "Small dog enjoying a warm bath in the All About Pawz grooming sink",
    blurb:
      "The full Pawz bath — deep-cleaning wash, fluff dry, and a thorough brush-out, finished with the pampering details. The perfect refresh between grooms.",
  },
  "bath & haircut": {
    image: "/services/grooming_services.jpeg",
    alt: "Professional grooming station where All About Pawz bath and haircut services are performed",
    blurb:
      "Everything in the bath plus a full haircut, styled to your pup's breed and your preferences — finished to show quality.",
  },
}
const genericMeta = (name: string) => ({
  image: "/services/grooming_services.jpeg",
  alt: `${name} grooming service at All About Pawz`,
  blurb: "Full-service grooming, tailored to your dog.",
})

// Ladder rows for the package cards (X-Large label per the schedule).
const PACKAGE_TIERS: [SizeTier, string][] = [
  ["SMALL", "Small"],
  ["MEDIUM", "Medium"],
  ["LARGE", "Large"],
  ["XLARGE", "X-Large"],
]

// Column labels for the treatments table ("XL" per the schedule).
const TREATMENT_TIERS: [SizeTier, string][] = [
  ["SMALL", "Small"],
  ["MEDIUM", "Medium"],
  ["LARGE", "Large"],
  ["XLARGE", "XL"],
]

// Brand copy — the inclusions every service carries (owner schedule).
const ALL_SERVICES_INCLUDE = [
  "Deep-cleaning shampoo",
  "Blow-dry",
  "15-min brush out",
  "Ear cleaning",
  "Nail trim",
  "Scented spritz",
]

const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`

function useBookingMenu() {
  const [menu, setMenu] = useState<BookingMenu | null>(null)
  useEffect(() => {
    let alive = true
    fetch("/api/booking/menu", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.packages)) setMenu(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  return menu
}

// ─── Service card ───────────────────────────────────────────────────────────

function ServiceCard({ p, isMember }: { p: MenuPackage; isMember: boolean }) {
  const meta = SERVICE_META[String(p.name).trim().toLowerCase()] ?? genericMeta(p.name)

  // "Starts at" = the first tier the catalog prices (SMALL today); the
  // member line and savings badge read the SAME tier so they can never
  // disagree.
  const startTier = PACKAGE_TIERS.find(([t]) => p.prices[t] != null)?.[0] ?? "SMALL"
  const startCents = p.prices[startTier]
  const startMemberCents = p.memberPrices[startTier]

  // Member column only when the catalog carries ANY member price.
  const hasMemberCol = PACKAGE_TIERS.some(([t]) => p.memberPrices[t] != null)

  return (
    <article className="flex flex-col border border-gold/30 bg-card">
      {/* Product image */}
      <div className="relative aspect-[4/3]">
        <img
          src={meta.image}
          alt={meta.alt}
          width={2752}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Product body */}
      <div className="flex flex-1 flex-col p-5 sm:p-7 lg:p-8">
        <p className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">
          {String(p.category || "Grooming").toUpperCase()}
        </p>
        <h3 className="mt-2.5 font-display text-[26px] leading-[1.12] text-ink">{p.name}</h3>
        <p className="mt-3.5 text-[12px] leading-[1.75] text-ink-soft">{meta.blurb}</p>

        {/* Headline price — the ONE display rule: "starts at $X · Bath Club
            members: $Y". NULL member price = no member line, no badge. */}
        <div className="mt-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-gold/25 pt-5">
          <ServicePrice
            priceCents={startCents}
            memberPriceCents={startMemberCents}
            isMember={isMember}
            size="lg"
            align="left"
          />
          <MemberSavingsBadge priceCents={startCents} memberPriceCents={startMemberCents} className="mt-1" />
        </div>

        {/* The full size ladder — standard and member columns. */}
        <table className="mt-5 w-full">
          <caption className="sr-only">Size pricing for {p.name}</caption>
          <thead>
            <tr className="border-b border-gold/25 text-[9px] font-bold uppercase tracking-[0.14em] text-ink-soft/70">
              <th scope="col" className="pb-2.5 text-left font-bold">Size</th>
              <th scope="col" className="pb-2.5 text-right font-bold">Standard</th>
              {hasMemberCol && (
                <th scope="col" className="pb-2.5 text-right font-bold text-gold-deep">Bath Club</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gold/15">
            {PACKAGE_TIERS.map(([tier, label]) => {
              const std = p.prices[tier]
              const mem = p.memberPrices[tier]
              return (
                <tr key={tier}>
                  <th scope="row" className="py-2.5 text-left text-[12px] font-normal text-ink-soft">{label}</th>
                  <td className="py-2.5 text-right text-[13px] font-bold tabular-nums text-ink">
                    {std == null ? <span className="text-[11px] font-normal text-ink-soft">Custom quote</span> : money(std)}
                  </td>
                  {hasMemberCol && (
                    <td className="py-2.5 text-right text-[13px] font-bold tabular-nums text-gold-deep">
                      {mem == null ? "—" : money(mem)}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Call to action — straight into the booking wizard. mt-auto pins
            the buttons to the cards' bottom edge. */}
        <div className="mt-auto pt-7">
          <Link href="/book/appointment" className="btn-gold w-full">BOOK THIS SERVICE</Link>
        </div>
      </div>
    </article>
  )
}

// ─── Loading skeletons (match the old package-cards rhythm) ────────────────

function CardsSkeleton() {
  return (
    <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-10" aria-hidden="true">
      {[0, 1].map((i) => (
        <article key={i} className="flex flex-col border border-gold/30 bg-card">
          <div className="aspect-[4/3] animate-pulse bg-ink/5" />
          <div className="space-y-3 p-5 sm:p-7 lg:p-8">
            <div className="h-2.5 w-28 animate-pulse bg-ink/5" />
            <div className="h-6 w-36 animate-pulse bg-ink/5" />
            <div className="h-3 w-full animate-pulse bg-ink/5" />
            <div className="h-3 w-2/3 animate-pulse bg-ink/5" />
            <div className="mt-6 space-y-3 border-t border-gold/25 pt-5">
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="flex items-center justify-between">
                  <div className="h-2.5 w-14 animate-pulse bg-ink/5" />
                  <div className="h-3 w-16 animate-pulse bg-ink/5" />
                </div>
              ))}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function TreatmentsSkeleton() {
  return (
    <div className="mt-9 space-y-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse bg-white/5" />
      ))}
    </div>
  )
}

// ─── The island: SELECT SERVICE + PREMIUM TREATMENTS ───────────────────────

export function ServiceMenuSections() {
  const menu = useBookingMenu()
  const loading = menu === null

  return (
    <>
      {/* SELECT SERVICE — the Pawz Service Menu packages. Every price from
          the tenant catalog; the inclusions band is brand copy. */}
      <section className="marble bg-cream px-8 py-14 lg:px-12 lg:py-20" aria-busy={loading}>
        <div className="max-w-[280px]">
          <p className="eyebrow">SERVICE MENU</p>
          <h2 className="mt-3 font-display text-[38px] leading-[1.1] text-ink lg:text-[48px]">Select Service.</h2>
          <p className="mt-4 text-[12px] leading-[1.75] text-ink-soft">
            Priced by your pup's size — and every visit includes the full Pawz treatment.
          </p>
        </div>

        {loading ? (
          <CardsSkeleton />
        ) : menu!.packages.length === 0 ? (
          <p className="mt-12 text-[13px] text-ink-soft">
            Our service menu is being updated — call the salon for today's pricing.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-10">
            {menu!.packages.map((p) => (
              <ServiceCard key={p.id} p={p} isMember={menu!.isMember} />
            ))}
          </div>
        )}

        {/* ALL SERVICES INCLUDE — the six inclusions, verbatim. */}
        <div className="mt-12 border border-gold/30 bg-card p-6 sm:p-8 lg:mt-16 lg:p-10">
          <div className="flex items-center gap-4">
            <p className="eyebrow">ALL SERVICES INCLUDE</p>
            <span aria-hidden="true" className="h-px flex-1 bg-gold/25" />
          </div>
          <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_SERVICES_INCLUDE.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink">
                <Check className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-center text-[11px] italic leading-[1.7] text-ink-soft lg:mt-12">
          Prices are starting points. Final pricing may vary based on coat condition, temperament, and length of service.
        </p>
      </section>

      {/* PREMIUM TREATMENTS — optional upgrade, select 1 max. Size-tiered
          surcharges; XL = custom quote (no online price). */}
      {(loading || (menu?.treatments.length ?? 0) > 0) && (
        <section className="bg-ink px-8 py-14 lg:px-12 lg:py-16" aria-busy={loading}>
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow-dark">PREMIUM TREATMENTS</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark sm:text-[34px]">
              Targeted Care.<br />Optional Upgrades.
            </h2>
            <p className="mt-4 max-w-xl text-[12px] leading-[1.75] text-on-dark-muted">
              Designed to target specific needs. Select 1 max.
            </p>

            {loading ? (
              <TreatmentsSkeleton />
            ) : (
              <>
                {/* md+ — the tier table (surcharges carry the + prefix). */}
                <table className="mt-9 hidden w-full text-left md:table">
                  <caption className="sr-only">Premium treatment surcharges by dog size</caption>
                  <thead>
                    <tr className="border-b border-gold/30">
                      <th scope="col" className="pb-3 text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold">
                        Treatment
                      </th>
                      {TREATMENT_TIERS.map(([, label]) => (
                        <th
                          key={label}
                          scope="col"
                          className="pb-3 text-right text-[9.5px] font-bold uppercase tracking-[0.16em] text-gold"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {menu!.treatments.map((t) => (
                      <Fragment key={t.id}>
                        <tr>
                          <th scope="row" className="border-t border-white/10 py-4 pr-6 text-[13px] font-semibold text-on-dark">
                            {t.name}
                          </th>
                          {TREATMENT_TIERS.map(([tier]) => {
                            const v = t.prices[tier]
                            return (
                              <td key={tier} className="border-t border-white/10 py-4 text-right text-[13px] font-bold tabular-nums text-on-dark">
                                {v == null ? (
                                  <span className="text-[11px] font-normal italic text-on-dark-muted">Custom quote</span>
                                ) : (
                                  `+${money(v)}`
                                )}
                              </td>
                            )
                          })}
                        </tr>
                        {/* The catalog note (Deshed), verbatim beneath its row. */}
                        {t.note && (
                          <tr>
                            <td colSpan={5} className="pb-4 pt-1 text-[11px] italic leading-[1.65] text-on-dark-muted">
                              {t.note}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Mobile — stacked treatment cards: every tier readable at
                    390px with no clipping and no horizontal scroll. */}
                <div className="mt-8 space-y-4 md:hidden">
                  {menu!.treatments.map((t) => (
                    <div key={t.id} className="border border-white/10 p-4 sm:p-5">
                      <p className="text-[11px] font-bold tracking-[0.14em] text-gold">{String(t.name).toUpperCase()}</p>
                      <div className="mt-3.5 grid grid-cols-4 gap-2">
                        {TREATMENT_TIERS.map(([tier, label]) => {
                          const v = t.prices[tier]
                          return (
                            <div key={tier} className="text-center">
                              <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-on-dark-muted">{label}</p>
                              <p className="mt-1 text-[13px] font-bold tabular-nums text-on-dark">
                                {v == null ? (
                                  <span className="text-[10px] font-normal italic">Custom quote</span>
                                ) : (
                                  `+${money(v)}`
                                )}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      {t.note && (
                        <p className="mt-3.5 border-t border-white/10 pt-3 text-[11px] italic leading-[1.65] text-on-dark-muted">
                          {t.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}
    </>
  )
}
