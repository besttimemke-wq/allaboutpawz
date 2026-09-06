"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { getIcon } from "@/lib/icons"
import { useCms } from "./use-cms"

// ---------------------------------------------------------------------------
// Pricing page data islands (CSR — fetch after paint, skeleton meanwhile).
// The pricing page shell (hero, band headers, CTAs) is fully static.
// ---------------------------------------------------------------------------

const SIZES: [string, string][] = [
  ["SMALL", "smallPrice"],
  ["MEDIUM", "mediumPrice"],
  ["LARGE", "largePrice"],
  ["X-LARGE", "xlargePrice"],
]

// Product details per package — everything shown inside the cards.
const PACKAGE_META: Record<string, { image: string; alt: string; blurb: string; badge?: string }> = {
  "Bath & Brush": {
    image: "/services/bath_and_spa_.jpeg",
    alt: "Small dog enjoying a warm bath in the All About Pawz grooming sink",
    blurb: "The essentials, done beautifully. A warm premium bath, blow-dry, full brush-out, and a tidy finish — the perfect refresh between grooms.",
  },
  "Full Groom": {
    image: "/services/grooming_services.jpeg",
    alt: "Professional grooming station where All About Pawz full grooms are performed",
    blurb: "Everything in the Bath & Brush plus a full breed-specific haircut, styled to your preferences and finished to show quality.",
    badge: "MOST POPULAR",
  },
  "Deluxe Spa": {
    image: "/services/serviceshero2.jpeg",
    alt: "Groomed dog wearing a bandana after the All About Pawz deluxe spa experience",
    blurb: "Our signature experience. The Full Groom plus a de-shedding treatment, teeth brushing, paw balm, and a signature fragrance finish.",
  },
}

export function AddonsGrid() {
  const { data: addons, loading } = useCms<{
    id: string
    title: string
    price: string
    icon?: string
  }>("addons")

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`px-2 text-center sm:px-4 ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-white/10" />
            <div className="mx-auto mt-4 h-2.5 w-24 animate-pulse bg-white/10" />
            <div className="mx-auto mt-2 h-3 w-12 animate-pulse bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-5">
      {addons.map(({ id, title, price, icon }, i: number) => {
        const Icon = getIcon(icon, Sparkles)
        const t = String(title || "").toUpperCase()
        // The toothbrush & comb marks — gold, from the brand icon set.
        const customIcon =
          t === "TEETH BRUSHING" ? "/assets/icon-toothbrush-gold.png"
          : t === "DE-SHEDDING" ? "/assets/icon-comb-gold.png"
          : null
        return (
          <div key={id} className={`px-2 text-center sm:px-4 ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            {customIcon ? (
              <img src={customIcon} alt="" width={120} height={120} className="mx-auto h-10 w-10 object-contain" />
            ) : (
              <Icon className="mx-auto h-10 w-10 text-gold" strokeWidth={1.2} />
            )}
            <h3 className="mt-4 text-[11px] font-bold tracking-[0.14em] text-gold">{title.toUpperCase()}</h3>
            <p className="mt-2 text-[13px] font-bold text-on-dark">{price}</p>
          </div>
        )
      })}
    </div>
  )
}

export function PackageCards() {
  const { data: packages, loading } = useCms<any>("packages")

  // Seed data carries duplicate rows per package name — show each product once.
  const seen = new Set<string>()
  const uniquePackages = packages.filter((p: any) => {
    if (seen.has(p.name)) return false
    seen.add(p.name)
    return true
  })

  if (loading) {
    return (
      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <article key={i} className="flex flex-col border border-gold/30 bg-card">
            <div className="aspect-[4/3] animate-pulse bg-ink/5" />
            <div className="space-y-3 p-7 lg:p-8">
              <div className="h-2.5 w-28 animate-pulse bg-ink/5" />
              <div className="h-6 w-36 animate-pulse bg-ink/5" />
              <div className="h-3 w-full animate-pulse bg-ink/5" />
              <div className="h-3 w-2/3 animate-pulse bg-ink/5" />
              <div className="mt-7 grid grid-cols-4 gap-2 pt-6">
                {SIZES.map(([label]) => (
                  <div key={label} className="text-center">
                    <div className="mx-auto h-2 w-8 animate-pulse bg-ink/5" />
                    <div className="mx-auto mt-1.5 h-3.5 w-10 animate-pulse bg-ink/5" />
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
      {uniquePackages.map((p: any, i: number) => {
        const meta = PACKAGE_META[p.name] ?? {
          image: "/services/grooming_services.jpeg",
          alt: `${p.name} grooming package at All About Pawz`,
          blurb: p.description || "A premium grooming experience tailored to your pup.",
        }
        return (
          <article key={p.id} className="flex flex-col border border-gold/30 bg-card">
            {/* Product image + optional badge */}
            <div className="relative aspect-[4/3]">
              <img src={meta.image} alt={meta.alt} width={2752} height={1536} className="absolute inset-0 h-full w-full object-cover" />
              {meta.badge && (
                <span className="absolute left-5 top-5 bg-ink px-3.5 py-2 text-[9px] font-bold tracking-[0.18em] text-gold">{meta.badge}</span>
              )}
            </div>

            {/* Product body */}
            <div className="flex flex-1 flex-col p-7 lg:p-8">
              <p className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">GROOMING PACKAGE</p>
              <h3 className="mt-2.5 font-display text-[26px] leading-[1.12] text-ink">{p.name}</h3>
              <p className="mt-3.5 text-[12px] leading-[1.75] text-ink-soft">{meta.blurb}</p>

              {/* Divider + transparent size pricing (stacks 2×2 on mobile) */}
              <div className="mt-7 border-t border-gold/25 pt-6">
                <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4 sm:gap-2">
                  {SIZES.map(([label, key]) => (
                    <div key={key} className="text-center">
                      <p className="text-[8.5px] font-bold tracking-[0.14em] text-ink-soft/70">{label}</p>
                      <p className="mt-1.5 text-[14px] font-bold text-ink">{p[key]}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call to action — pinned to the card bottom so all Book
                  buttons align across the row regardless of blurb length */}
              <div className="mt-auto pt-7">
                <Link href="/book" className="btn-gold w-full">BOOK THIS PACKAGE</Link>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
