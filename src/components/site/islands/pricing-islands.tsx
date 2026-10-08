"use client"

import { PawPrint } from "lucide-react"
import { getIcon } from "@/lib/icons"
import { useCms } from "./use-cms"

// ---------------------------------------------------------------------------
// Pricing page data islands (CSR — fetch after paint, skeleton meanwhile).
// The pricing page shell (hero, band headers, CTAs) is fully static.
//
// The Pawz Service Menu itself (Select Service + Premium Treatments) lives
// in service-menu.tsx — it renders from the tenant catalog via
// /api/booking/menu. Only the add-ons band renders from here.
// ---------------------------------------------------------------------------

export function AddonsGrid() {
  const { data: addons, loading } = useCms<{
    id: string
    title: string
    price: string
    icon?: string
  }>("addons")

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
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
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5">
      {addons.map(({ id, title, price, icon }, i: number) => {
        const Icon = getIcon(icon, PawPrint)
        const t = String(title || "").toUpperCase()
        // The toothbrush & comb marks — gold, from the brand icon set.
        const customIcon =
          t === "TEETH BRUSHING" ? "/assets/icon-toothbrush-gold.png"
          : t === "DE-SHEDDING" ? "/assets/icon-comb-gold.png"
          : null
        // Odd row: the last item takes the full mobile row (centered by the
        // text-center flow) instead of hugging the left column.
        const orphan = i === addons.length - 1 && addons.length % 2 === 1
        return (
          <div key={id} className={`px-2 text-center sm:px-4 ${orphan ? "col-span-2 lg:col-span-1" : ""} ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
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
