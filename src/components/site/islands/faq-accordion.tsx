"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"

type Faq = { id: string; question: string; answer: string }

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="mt-10 max-w-3xl border-t border-gold/25">
      {faqs.map((f, i) => (
        <div key={f.id} className="border-b border-gold/25">
          <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-6 py-5 text-left">
            <span className="font-display text-[16px] leading-[1.4] text-ink">{f.question}</span>
            {open === i ? <Minus className="h-4 w-4 shrink-0 text-gold-deep" /> : <Plus className="h-4 w-4 shrink-0 text-gold-deep" />}
          </button>
          {open === i && <p className="pb-6 pr-10 text-[12.5px] leading-[1.9] text-ink-soft">{f.answer}</p>}
        </div>
      ))}
    </div>
  )
}
