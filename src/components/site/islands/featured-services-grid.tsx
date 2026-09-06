import { Scissors } from "lucide-react"
import { getIcon } from "@/lib/icons"

// The 4-up featured services band used on the home page and the services
// page. Presentational — the SERVER fetches the services and passes them in
// (visible rows only, already trimmed to `count`).
export type FeaturedService = {
  id: string
  icon?: string
  title: string
  description: string
}

export function FeaturedServicesGrid({ services }: { services: FeaturedService[] }) {
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
