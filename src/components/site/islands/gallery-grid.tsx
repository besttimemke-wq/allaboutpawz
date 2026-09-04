"use client"

import { useState } from "react"
import { Instagram } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"

type Photo = { id: string; alt: string; category: string; image: string }
const FILTERS = ["ALL", "GROOMING", "BATH & SPA", "TRANSFORMATIONS"] as const

export function GalleryGrid({ photos, instagram }: { photos: Photo[]; instagram?: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL")
  const shown = filter === "ALL" ? photos : photos.filter((p) => p.category === filter)
  return (
    <>
      <div className="mt-8 flex flex-wrap gap-8 border-b border-gold/25 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`relative pb-2 text-[10px] font-bold tracking-[0.16em] transition-colors ${filter === f ? "text-gold-deep" : "text-ink-soft hover:text-gold-deep"}`}
          >
            {f}
            {filter === f && <span className="absolute -bottom-[13px] left-0 h-[2px] w-full bg-gold-deep" />}
          </button>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {shown.map((p) => (
           
          <img key={p.id} src={p.image} alt={p.alt} width={640} height={768} className="aspect-[5/6] w-full object-cover" />
        ))}
      </div>
      <section className="mt-10 flex flex-col items-center gap-4 bg-ink px-8 py-10 text-center lg:flex-row lg:justify-center lg:gap-6 lg:text-left">
        <PawGlyph className="h-7 w-7 text-gold" />
        <p className="text-[12.5px] leading-[1.7] text-on-dark-muted">Every pup leaves looking their best<br />and feeling even better.</p>
        <a href={instagram || "#"} className="btn-gold">FOLLOW US <Instagram className="h-3.5 w-3.5" /></a>
      </section>
    </>
  )
}
