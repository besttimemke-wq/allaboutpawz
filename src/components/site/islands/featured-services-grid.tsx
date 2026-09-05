"use client"

import { Scissors } from "lucide-react"
import { getIcon } from "@/lib/icons"
import { useCms, visibleOnly } from "./use-cms"

// The 4-up featured services band used on the home page and the services
// page. CSR: fetches after paint — the band's headline/CTA never wait.
export function FeaturedServicesGrid({ count = 4 }: { count?: number }) {
  const { data, loading } = useCms<{
    id: string
    icon?: string
    title: string
    description: string
    visible?: boolean
  }>("services")
  const services = visibleOnly(data).slice(0, count)

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-white/10" />
            <div className="mx-auto mt-4 h-3 w-24 animate-pulse bg-white/10" />
            <div className="mx-auto mt-3 h-2.5 w-32 animate-pulse bg-white/10" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
      {services.map(({ id, icon, title, description }, i) => {
        const Icon = getIcon(icon, Scissors)
        return (
          <div key={id} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
            <Icon className="mx-auto h-10 w-10 text-gold" strokeWidth={1.2} />
            <h3 className="mt-4 text-[11.5px] font-bold tracking-[0.15em] text-gold">{title}</h3>
            <p className="mt-3 whitespace-pre-line text-[12px] leading-[1.7] text-on-dark-muted">{description}</p>
          </div>
        )
      })}
    </div>
  )
}
