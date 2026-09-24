"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { useCms, visibleOnly } from "./use-cms"

type Faq = { id: string; question: string; answer: string }

export function FaqAccordion({ initialFaqs = [] }: { initialFaqs?: Faq[] }) {
  // CSR: questions load after paint; the page shell never waits. The server
  // passes the same rows as initialFaqs so crawlers and no-JS visitors get
  // the full question list in the initial HTML; the client-side fetch
  // re-syncs the list after paint (data wins once it arrives).
  const { data, loading } = useCms<Faq>("faqs")
  const faqs = data.length > 0 ? data : initialFaqs
  const [open, setOpen] = useState<number | null>(0)

  if (loading && faqs.length === 0) {
    return (
      <div className="max-w-3xl border-t border-gold/25">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-6 border-b border-gold/25 py-5">
            <div className="h-4 w-2/3 animate-pulse bg-ink/5" />
            <div className="h-4 w-4 animate-pulse bg-ink/5" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl border-t border-gold/25">
      {faqs.map((f, i) => (
        <div key={f.id} className="border-b border-gold/25">
          {/* The question is a real h3 that WRAPS the trigger button (a
              heading must never sit inside a <button>). The span pins the
              body font + normal tracking explicitly — h1–h4 default to the
              display serif via the base layer, and the question has always
              rendered in Lato — so the visuals are unchanged. */}
          <h3>
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-6 py-5 text-left">
              <span className="type-body text-[16px] leading-[1.4] tracking-normal text-ink">{f.question}</span>
              {open === i ? <Minus className="h-4 w-4 shrink-0 text-gold-deep" /> : <Plus className="h-4 w-4 shrink-0 text-gold-deep" />}
            </button>
          </h3>
          {open === i && <p className="pb-6 pr-10 text-[12.5px] leading-[1.9] text-ink-soft">{f.answer}</p>}
        </div>
      ))}
    </div>
  )
}
