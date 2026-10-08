"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Check, X, PawPrint, CalendarCheck, Percent, Repeat } from "lucide-react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// BathClubSection — the PAWfection Bath Club subscription menu (owner spec).
// Every number renders from the tenant catalog (subscription_plans):
// tier prices, weight ranges, visits, prepay + multi-pet rules. XL renders
// "Custom quote" — no online price. Manage lives in the portal under
// Subscriptions (same shell, same session).
// ---------------------------------------------------------------------------

type Plan = {
  id: string
  name: string
  sizeTier: "SMALL" | "MEDIUM" | "LARGE" | "XLARGE"
  sizeLabel: string
  weightRange: string
  monthlyPriceCents: number | null
  visitsPerMonth: number
  annualPrepayMonths: number
  annualPrepayChargeMonths: number
  multiPetDiscountPercent: number
  includes: string[]
  excludes: string[]
  terms: string[]
  annualSavingsCents: number | null
}

const money = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`

export function BathClubSection() {
  const [plans, setPlans] = useState<Plan[] | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/subscriptions/plans", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.plans)) setPlans(d.plans)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (plans === null) {
    // Skeleton while the catalog loads — matches the package cards' rhythm.
    return (
      <section id="bath-club" className="bg-cream px-8 py-14 lg:px-12" aria-busy="true">
        <div className="mx-auto max-w-6xl">
          <div className="h-8 w-72 animate-pulse rounded bg-neutral-200/70" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[420px] animate-pulse rounded-xl bg-neutral-200/50" />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (plans.length === 0) return null
  const featured = plans[0]

  return (
    <section id="bath-club" className="bg-cream px-8 py-14 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">PAWFECTION BATH CLUB</p>
        <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-ink sm:text-[34px]">
          One membership.<br />A cleaner pup, every week.
        </h2>
        <p className="mt-4 max-w-xl text-[13px] leading-[1.8] text-ink-soft">
          Monthly membership — up to {featured?.visitsPerMonth ?? 4} baths a month (one per week),
          appointments required. {featured?.monthlyPriceCents != null && "Prepay 12 months for the price of 10 — two months free. "}
          {featured && featured.multiPetDiscountPercent > 0 && `${featured.multiPetDiscountPercent}% off each additional membership in the same household.`}
        </p>

        {/* Tier cards — the catalog ladder */}
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex flex-col rounded-xl border bg-white p-6",
                p.monthlyPriceCents == null ? "border-neutral-300" : "border-gold-deep/40",
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
                {p.sizeLabel}
              </p>
              <p className="mt-1 text-[12px] text-neutral-500">{p.weightRange}</p>
              {p.monthlyPriceCents != null ? (
                <>
                  <p className="type-body mt-4 text-[30px] font-bold tabular-nums leading-none text-ink">
                    {money(p.monthlyPriceCents)}
                    <span className="ml-1 text-[13px] font-semibold text-neutral-400">/mo</span>
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
                    {p.visitsPerMonth} baths a month
                  </p>
                </>
              ) : (
                <>
                  <p className="type-body mt-4 text-[22px] font-bold leading-tight text-ink">
                    Custom quote
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
                    Call us and we&apos;ll set your XL pup up right.
                  </p>
                </>
              )}
              <Link
                href="/customer/orders/subscriptions"
                className={cn(
                  "mt-5 flex h-11 items-center justify-center rounded-md text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                  p.monthlyPriceCents != null
                    ? "bg-ink text-cream hover:bg-gold-deep"
                    : "border border-neutral-300 bg-white text-ink hover:border-ink",
                )}
              >
                {p.monthlyPriceCents != null ? "Start membership" : "Call the salon"}
              </Link>
            </div>
          ))}
        </div>

        {/* Every visit includes / not included — catalog lists */}
        <div className="mt-10 grid gap-8 border-t border-gold/25 pt-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">EVERY VISIT INCLUDES</p>
            <ul className="mt-4 space-y-2.5">
              {(featured?.includes ?? []).map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink">
                  <Check className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">NOT INCLUDED</p>
            <ul className="mt-4 space-y-2.5">
              {(featured?.excludes ?? []).map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink-soft">
                  <X className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pay early + multi-pet + terms */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gold-deep/30 bg-amber-50/40 p-5">
            <PawPrint className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            <p className="mt-3 text-[13px] font-bold text-ink">Pay early and save</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Prepay {featured?.annualPrepayMonths ?? 12} months for the price of{" "}
              {featured?.annualPrepayChargeMonths ?? 10} — two months free.
            </p>
          </div>
          <div className="rounded-lg border border-gold-deep/30 bg-amber-50/40 p-5">
            <Percent className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            <p className="mt-3 text-[13px] font-bold text-ink">Multi-pet discount</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              {featured?.multiPetDiscountPercent ?? 10}% off each additional Bath Club membership
              in the same household.
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <Repeat className="h-5 w-5 text-gold-deep" aria-hidden="true" />
            <p className="mt-3 text-[13px] font-bold text-ink">Manage your membership</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Pause, skip a month, or cancel anytime in the portal under{" "}
              <Link href="/customer/orders/subscriptions" className="font-semibold text-gold-deep underline underline-offset-2">
                Subscriptions
              </Link>
              . Cancellation takes effect at the end of the billing cycle.
            </p>
          </div>
        </div>

        {/* Terms — the catalog's terms list, verbatim */}
        {featured && featured.terms.length > 0 && (
          <div className="mt-8 flex items-start gap-3 rounded-lg bg-neutral-100 p-4">
            <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
            <ul className="text-[11.5px] leading-relaxed text-neutral-500">
              {featured.terms.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
