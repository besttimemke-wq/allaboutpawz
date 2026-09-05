"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Plus } from "lucide-react"

const STEPS = [
  {
    n: "01",
    title: "BOOK YOUR APPOINTMENT",
    body: "Choose a time that works for you.",
    more: "Book online in about a minute or call the salon — same-day spots when we have them. Tell us your pup's breed, size, and coat so we can reserve the right groomer and the right amount of time. You'll get an instant confirmation, plus a friendly reminder the day before.",
  },
  {
    n: "02",
    title: "WARM WELCOME",
    body: "We greet your pup and discuss their needs and preferences.",
    more: "Every visit starts slow: a hello, a treat, and a sniff around. We'll go over your wishlist together — cut length, style, and anything sensitive like mats, hips, or noise — and it all goes in your pup's profile so every groomer knows exactly what your dog loves.",
  },
  {
    n: "03",
    title: "SPA EXPERIENCE",
    body: "Our groomers work their magic with gentle, expert care.",
    more: "One groomer, one pup, start to finish — never handed off mid-groom. A warm bath with premium pet-safe products, gentle brush-out, and a breed-specific cut at your dog's pace. Wiggly or nervous pups get breaks and patience. Force-free, always.",
  },
  {
    n: "04",
    title: "FINISHING TOUCHES",
    body: "Style, fragrance, and those perfect little details.",
    more: "The finish is where the polish happens: a final brush-out, a light signature fragrance, and a bandana or bow of your choosing. Nails filed smooth, ears fresh, sanitary trim tidy — the details people notice on the walk home.",
  },
  {
    n: "05",
    title: "PICK UP & REBOOK",
    body: "Happy pup, happier you. We'll help you schedule their next visit.",
    more: "Your pup goes home clean, fluffy, and proud of themselves. We'll recap the visit — what we did and how it went — and book the next groom before you leave, because regular grooming keeps coats healthy and keeps your pup on a routine they know.",
  },
]

// Interactive process steps — the 01–05 list keeps its number, title, and
// descriptor exactly as written (read left to right). Click a number and its
// card slides in from the left, aligned with that number, carrying MORE
// information beyond the descriptor. Cards stack as you tap through.
export function ProcessSteps() {
  // All cards closed by default — nothing revealed until the user acts.
  const [revealed, setRevealed] = useState<number[]>([])

  const toggle = (i: number) =>
    setRevealed((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]))

  return (
    <ol className="relative space-y-6 lg:space-y-8">
      {/* Gold connector line down the numbers, as the list always had */}
      <span className="absolute bottom-[15px] left-[15px] top-[15px] w-px bg-gold/30" aria-hidden="true" />
      {STEPS.map((s, i) => {
        const isOn = revealed.includes(i)
        const panelId = `process-panel-${s.n}`
        return (
          <li key={s.n} className="relative grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1fr)] lg:gap-10">
            {/* The 1–5 list — number, title, and descriptor stay in place.
                Click anywhere on the row (plus rotates to ×) to reveal its card. */}
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOn}
              aria-controls={panelId}
              className="relative flex w-full items-start gap-5 text-left"
            >
              <span
                className={`relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors duration-300 ${
                  isOn ? "border-gold-deep bg-gold-deep text-cream" : "border-gold-deep bg-cream text-gold-deep"
                }`}
              >
                {s.n}
              </span>
              <span className="min-w-0 flex-1 pt-1">
                <span className="block text-[11px] font-bold tracking-[0.14em] text-ink">{s.title}</span>
                <span className="mt-1.5 block max-w-[330px] text-[12px] leading-[1.7] text-ink-soft">{s.body}</span>
              </span>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center border transition-all duration-300 ${
                  isOn ? "border-gold-deep bg-gold-deep text-on-dark" : "border-gold-deep/50 text-gold-deep"
                }`}
              >
                <Plus className={`h-3.5 w-3.5 transition-transform duration-300 ${isOn ? "rotate-45" : ""}`} strokeWidth={2} />
              </span>
            </button>

            {/* Card slot — to the RIGHT of the number (left-to-right reading).
                The card slides in from the left, aligned with that number. */}
            <div id={panelId} className="lg:min-h-[104px]">
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
                    <p className="mt-3 max-w-[470px] text-[12px] leading-[1.75] text-on-dark-muted">{s.more}</p>
                  </motion.article>
                )}
              </AnimatePresence>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
