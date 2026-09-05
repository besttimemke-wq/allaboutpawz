"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"
import { useCms, visibleOnly } from "./use-cms"

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

export function ServicesAccordion() {
  // CSR: categories + items load after paint; the page shell never waits.
  const { data: serviceRows, loading: loadingCats } = useCms<AccordionCategory & { visible?: boolean }>("services")
  const { data: itemRows, loading: loadingItems } = useCms<AccordionItem>("serviceItems")
  const categories = visibleOnly(serviceRows)
  const items = visibleOnly(itemRows as (AccordionItem & { visible?: boolean })[])
  const loading = loadingCats || loadingItems

  // One accordion open at a time — first starts collapsed.
  const [open, setOpen] = useState(-1)

  if (loading) {
    return (
      <div className="border border-gold/30">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={i > 0 ? "border-t border-gold/25" : ""}>
            <div className="grid grid-cols-1 items-center gap-5 px-6 py-5 sm:gap-6 lg:grid-cols-3 lg:gap-10 lg:px-10 lg:py-7">
              <div className="space-y-2">
                <div className="mx-auto h-3.5 w-28 animate-pulse bg-ink/5 lg:mx-0" />
                <div className="mx-auto h-2.5 w-40 animate-pulse bg-ink/5 lg:mx-0" />
              </div>
              <div className="mx-auto h-20 w-32 animate-pulse bg-ink/5 sm:h-24 lg:h-[130px]" />
              <div className="mx-auto h-9 w-28 animate-pulse bg-ink/5 lg:mr-0" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="border border-gold/30">
      {categories.map((cat, i) => {
        const isOpen = open === i
        const catItems = items.filter((it) => it.category === cat.title)
        const packages = catItems.filter((it) => it.isPackage)
        const singles = catItems.filter((it) => !it.isPackage)
        const panelId = `svc-panel-${cat.id.replace(/[^a-zA-Z0-9-]/g, "")}`
        return (
          <div key={cat.id} className={i > 0 ? "border-t border-gold/25" : ""}>
            {/* HEADER — three evenly spaced columns: category text | centered
                photo (natural aspect, never cropped) | SEE MORE + button. The
                plus sign rotates to × when open. */}
            <div className="grid grid-cols-1 items-center gap-5 px-6 py-5 sm:gap-6 lg:grid-cols-3 lg:gap-10 lg:px-10 lg:py-7">
              {/* Column 1 — category title + description */}
              <div className="text-center lg:text-left">
                <h2 className="text-[12.5px] font-bold tracking-[0.16em] text-ink">{cat.title}</h2>
                <p className="mt-1.5 text-[11.5px] leading-[1.6] text-ink-soft">{cat.description}</p>
              </div>

              {/* Column 2 — photo, centered, natural aspect ratio */}
              {cat.image && (
                <div className="flex justify-center">
                  <img
                    src={cat.image}
                    alt={cat.alt || `${cat.title} dog grooming at All About Pawz`}
                    width={2752}
                    height={1536}
                    className="h-20 w-auto rounded object-cover sm:h-24 lg:h-[130px]"
                  />
                </div>
              )}

              {/* Column 3 — SEE MORE with plus sign, opens the accordion */}
              <div className="flex justify-center lg:justify-end">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="inline-flex items-center gap-2.5 border border-gold-deep px-5 py-2.5 text-[10.5px] font-bold tracking-[0.16em] text-ink transition-all duration-300 hover:bg-gold-deep hover:text-on-dark"
                >
                  {isOpen ? "SEE LESS" : "SEE MORE"}
                  <Plus
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
                    strokeWidth={2}
                  />
                </button>
              </div>
            </div>

            {/* BODY — pricing INSIDE the accordion. Packages render as a
                size table; single items render with their prices. GET
                PACKAGE CTA closes the row and encourages checkout. */}
            {isOpen && (
              <div id={panelId} className="border-t border-gold/20 bg-cream/60 px-6 py-6 lg:px-10 lg:py-8">
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
