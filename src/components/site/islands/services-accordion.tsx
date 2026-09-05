"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Scissors } from "lucide-react"
import { getIcon } from "@/lib/icons"
import { PawGlyph } from "@/components/site/brand"

export type AccordionService = {
  id: string
  icon: string | null
  title: string
  description: string
  image: string | null
  alt: string | null
}

const CATEGORY_ITEMS: Record<string, { name: string; price?: string }[]> = {
  GROOMING: [
    { name: "Full Groom" },
    { name: "Haircuts" },
    { name: "Styling" },
    { name: "Bath & Brush" },
  ],
  "BATH & SPA": [
    { name: "Bath & Brush" },
    { name: "Deluxe Spa" },
    { name: "De-shedding", price: "$15 – $35" },
    { name: "Flea Bath", price: "$10" },
  ],
  "NAIL & PAW CARE": [
    { name: "Nail Trim", price: "$15" },
    { name: "Paw Treatment", price: "$15" },
  ],
  "ADD-ON SERVICES": [
    { name: "Teeth Brushing", price: "$15" },
    { name: "De-shedding", price: "$15 – $35" },
    { name: "Paw Treatment", price: "$15" },
    { name: "Nail Trim", price: "$15" },
    { name: "Flea Bath", price: "$10" },
    { name: "De-tangling" },
    { name: "Fragrance" },
  ],
}

export function ServicesAccordion({ services }: { services: AccordionService[] }) {
  // Only one accordion open at a time — the first starts expanded.
  const [open, setOpen] = useState(0)

  return (
    <div className="border border-gold/30">
      {services.map((s, i) => {
        const isOpen = open === i
        const items = CATEGORY_ITEMS[s.title.toUpperCase()] ?? []
        return (
          <div key={s.id} className={i > 0 ? "border-t border-gold/25" : ""}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-cream-deep/60 lg:px-8"
            >
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-gold-deep transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                strokeWidth={1.2}
              />
              <div>
                <h2 className="text-[12.5px] font-bold tracking-[0.16em] text-ink">{s.title}</h2>
                <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-soft">{s.description}</p>
              </div>
              <span className="eyebrow hidden text-gold-deep lg:block">{items.length} SERVICES</span>
            </button>

            {isOpen && (
              <div className="grid grid-cols-1 items-center gap-6 border-t border-gold/20 px-6 py-6 lg:grid-cols-[1.2fr_1fr_0.55fr] lg:px-8">
                {/* Service items — same info as the pricing page */}
                <ul className="space-y-2.5">
                  {items.map((it) => (
                    <li key={it.name + (it.price ?? "")} className="flex items-baseline gap-3">
                      <PawGlyph className="h-3.5 w-3.5 shrink-0 translate-y-[1px] text-gold-deep" />
                      <span className="text-[12.5px] text-ink">{it.name}</span>
                      {it.price && (
                        <span className="text-[12px] font-bold text-gold-deep">{it.price}</span>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Center image column — the service photo */}
                {s.image && (
                  <img
                    src={s.image}
                    alt={s.alt || `${s.title} dog grooming at All About Pawz`}
                    width={640}
                    height={512}
                    className="h-[170px] w-full object-cover"
                  />
                )}

                {/* CTA column — encourage checkout */}
                <div className="flex flex-col items-start gap-2 lg:items-center">
                  <p className="text-center text-[11.5px] leading-[1.6] text-ink-soft">Ready to book<br />this service?</p>
                  <Link href="/pricing" className="btn-gold self-start text-[10px] lg:self-auto">GET PACKAGE</Link>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
