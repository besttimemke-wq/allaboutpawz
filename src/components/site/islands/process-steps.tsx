"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"

const STEPS = [
  { n: "01", title: "BOOK YOUR APPOINTMENT", body: "Choose a time that works for you." },
  { n: "02", title: "WARM WELCOME", body: "We greet your pup and discuss their needs and preferences." },
  { n: "03", title: "SPA EXPERIENCE", body: "Our groomers work their magic with gentle, expert care." },
  { n: "04", title: "FINISHING TOUCHES", body: "Style, fragrance, and those perfect little details." },
  { n: "05", title: "PICK UP & REBOOK", body: "Happy pup, happier you. We'll help you schedule their next visit." },
]

// Interactive process steps — tap a number and its card slides in from the
// left, aligned with that number. Cards stack as more numbers are tapped;
// tapping again slides the card back out.
export function ProcessSteps() {
  const [revealed, setRevealed] = useState<number[]>([0])

  const toggle = (i: number) =>
    setRevealed((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]))

  return (
    <div className="space-y-4 lg:space-y-5">
      {STEPS.map((s, i) => {
        const isOn = revealed.includes(i)
        return (
          <div key={s.n} className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            {/* Card slot — the card slides in from the left, aligned with its number */}
            <div className="order-2 min-h-[96px] lg:order-1">
              <AnimatePresence initial={false}>
                {isOn && (
                  <motion.article
                    key={s.n}
                    initial={{ opacity: 0, x: -56 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -56 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-ink px-7 py-6 lg:px-9 lg:py-7"
                  >
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-[24px] leading-none text-gold">{s.n}</span>
                      <h3 className="text-[11px] font-bold tracking-[0.16em] text-on-dark">{s.title}</h3>
                    </div>
                    <p className="mt-3 max-w-[430px] text-[12px] leading-[1.75] text-on-dark-muted">{s.body}</p>
                  </motion.article>
                )}
              </AnimatePresence>
            </div>

            {/* Number button — plus sign rotates to × when its card is in */}
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOn}
              aria-label={`${isOn ? "Hide" : "Reveal"} step ${s.n}: ${s.title}`}
              className="group order-1 flex w-full items-center justify-between gap-6 border border-gold/30 bg-cream-deep/40 px-5 py-3.5 text-left transition-colors hover:border-gold-deep lg:order-2 lg:w-[240px]"
            >
              <span className={`font-display text-[30px] leading-none transition-colors lg:text-[34px] ${isOn ? "text-gold-deep" : "text-ink/60 group-hover:text-gold-deep"}`}>
                {s.n}
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center border transition-all duration-300 ${
                  isOn ? "border-gold-deep bg-gold-deep text-on-dark" : "border-gold-deep/50 text-gold-deep"
                }`}
              >
                <Plus className={`h-3.5 w-3.5 transition-transform duration-300 ${isOn ? "rotate-45" : ""}`} strokeWidth={2} />
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
