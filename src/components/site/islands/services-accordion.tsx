"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"

export type AccordionCategory = {
  id: string
  title: string
  description: string
  image: string | null
  alt: string | null
}

export type AccordionItem = {
  id: string
  category: string
  name: string
  price: string | null
  isPackage: boolean
  smallPrice: string | null
  mediumPrice: string | null
  largePrice: string | null
  xlargePrice: string | null
}

const SIZE_COLS: [string, keyof AccordionItem][] = [
  ["SMALL", "smallPrice"],
  ["MEDIUM", "mediumPrice"],
  ["LARGE", "largePrice"],
  ["X-LARGE", "xlargePrice"],
]

export function ServicesAccordion({
  categories,
  items,
}: {
  categories: AccordionCategory[]
  items: AccordionItem[]
}) {
  // One accordion open at a time — first starts expanded.
  const [open, setOpen] = useState(0)

  return (
    <div className="border border-gold/30">
      {categories.map((cat, i) => {
        const isOpen = open === i
        const catItems = items.filter((it) => it.category === cat.title)
        const packages = catItems.filter((it) => it.isPackage)
        const singles = catItems.filter((it) => !it.isPackage)
        return (
          <div key={cat.id} className={i > 0 ? "border-t border-gold/25" : ""}>
            {/* HEADER — image on the outside (right), full natural aspect —
                never cropped. Wide row: chevron + title/description grow,
                image anchors the right edge. */}
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 px-6 py-4 text-left transition-colors hover:bg-cream-deep/60 lg:gap-8 lg:px-8"
            >
              <div className="flex items-center gap-5 lg:gap-8">
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-gold-deep transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                  strokeWidth={1.2}
                />
                <div>
                  <h2 className="text-[12.5px] font-bold tracking-[0.16em] text-ink">{cat.title}</h2>
                  <p className="mt-1 max-w-[560px] text-[11.5px] leading-[1.6] text-ink-soft">{cat.description}</p>
                </div>
              </div>
              {cat.image && (
                <img
                  src={cat.image}
                  alt={cat.alt || `${cat.title} dog grooming at All About Pawz`}
                  width={640}
                  height={512}
                  className="hidden h-24 w-auto self-stretch object-cover sm:block lg:h-28"
                />
              )}
            </button>

            {/* BODY — pricing INSIDE the accordion. Packages render as a
                size table; single items render with their prices. GET
                PACKAGE CTA closes the row. */}
            {isOpen && (
              <div className="border-t border-gold/20 bg-cream/60 px-6 py-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-5">
                    {packages.length > 0 && (
                      <div className="border border-gold/30">
                        <div className="grid grid-cols-[minmax(120px,0.9fr)_repeat(4,minmax(70px,1fr))] border-b border-gold/25 bg-cream-deep px-4 py-2.5 text-[9.5px] font-bold tracking-[0.14em] text-gold-deep">
                          <span className="text-left">PACKAGE</span>
                          {SIZE_COLS.map(([label]) => <span key={label} className="text-center">{label}</span>)}
                        </div>
                        {packages.map((p) => (
                          <div key={p.id} className="grid grid-cols-[minmax(120px,0.9fr)_repeat(4,minmax(70px,1fr))] items-center border-b border-gold/15 px-4 py-3 text-[12px] last:border-0">
                            <span className="text-left font-bold text-ink">{p.name}</span>
                            {SIZE_COLS.map(([, key]) => (
                              <span key={key} className="text-center text-ink-soft">{p[key] as string}</span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {singles.length > 0 && (
                      <ul className="space-y-2">
                        {singles.map((it) => (
                          <li key={it.id} className="flex items-baseline gap-3">
                            <PawGlyph className="h-3.5 w-3.5 shrink-0 translate-y-[1px] text-gold-deep" />
                            <span className="text-[12.5px] text-ink">{it.name}</span>
                            {it.price && (
                              <span className="ml-auto text-[12px] font-bold text-gold-deep">{it.price}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* CTA column — encourage checkout */}
                  <div className="flex flex-col justify-center gap-3 border-l border-gold/25 pl-6">
                    <p className="text-[11.5px] leading-[1.6] text-ink-soft">Pamper your pup with<br />a grooming package.</p>
                    <Link href="/book" className="btn-gold self-start">GET PACKAGE</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
