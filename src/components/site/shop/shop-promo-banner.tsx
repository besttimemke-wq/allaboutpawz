"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, PawPrint } from "lucide-react"

type EligibleOffer = {
  id: string
  name: string
  code: string
  description: string | null
  finePrint: string | null
  ctaLabel: string | null
}

export function ShopPromoBanner({
  image,
  imageAlt,
  href,
}: {
  image?: string
  imageAlt: string
  href: string
}) {
  const [offer, setOffer] = useState<EligibleOffer | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/promos/eligible?placement=shop", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.offers)) setOffer(data.offers[0] || null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (!offer) return null

  return (
    <section className="px-6 pb-7 lg:px-12">
      <div className="mx-auto grid max-w-7xl overflow-hidden border border-[#002B5C]/15 bg-[#002B5C] text-white md:grid-cols-5">
        <div className={`relative flex aspect-[16/9] items-center justify-center overflow-hidden md:col-span-2 md:aspect-auto md:min-h-[220px] ${image ? "bg-neutral-100" : "bg-[#001F44]"}`}>
          {image ? (
            <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <PawPrint className="h-12 w-12 text-white/40" strokeWidth={1.1} aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 px-6 py-7 sm:px-9 md:col-span-3 md:py-9">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/65">Current shop offer</p>
          <h2 className="font-display text-[25px] font-bold leading-tight sm:text-[32px]">{offer.name}</h2>
          {offer.description && <p className="max-w-xl text-[12px] leading-relaxed text-white/80">{offer.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
            <code className="border border-white/35 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-[0.12em]">{offer.code}</code>
            <Link href={href} className="inline-flex min-h-10 items-center gap-2 bg-[#F2C500] px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[#002B5C] transition-colors hover:bg-white">
              {offer.ctaLabel || "Shop offer"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          {offer.finePrint && <p className="text-[10px] leading-relaxed text-white/60">{offer.finePrint}</p>}
        </div>
      </div>
    </section>
  )
}