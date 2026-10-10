"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Bath,
  BookOpen,
  ClipboardList,
  FileText,
  HeartPulse,
  HelpCircle,
  LifeBuoy,
  MapPin,
  Minus,
  Package,
  Plus,
  Scissors,
  Utensils,
  X,
} from "lucide-react"
import { FOOTER_NAV } from "@/lib/footer-nav"

// ---------------------------------------------------------------------------
// FaqFlyout — the SHOP flyout methodology applied to the FAQ / Education
// side of the site (owner directive): full-screen overlay, left sidebar with
// hover-select rows, right panel with linked cards. Routes to the FAQ page
// and the Pet Education Center so neither is reachable from the footer only.
//
// Two views mirror the shop flyout's "animal / brands" views:
//   - "education" — the Pet Education Center: hub, articles, care sheets,
//     and one card per content pillar (guide counts live in the labels).
//   - "faq" — the FAQ page plus the policy library (policies sourced from
//     footer-nav so the flyout can never drift from the footer).
// ---------------------------------------------------------------------------

type FaqView = "education" | "faq"

const EDUCATION_CARDS: {
  name: string
  meta: string
  href: string
  icon: React.ElementType
}[] = [
  { name: "Pet Education Center", meta: "Start here", href: "/guides", icon: BookOpen },
  { name: "Articles By Pets", meta: "The full library", href: "/guides", icon: FileText },
  { name: "Pet Care Sheets", meta: "Quick reference", href: "/guides", icon: ClipboardList },
  { name: "Grooming", meta: "58 guides", href: "/guides#grooming", icon: Scissors },
  { name: "Nutrition", meta: "27 guides", href: "/guides#nutrition", icon: Utensils },
  { name: "Health & Wellness", meta: "8 guides", href: "/guides#health", icon: HeartPulse },
  { name: "Buying Guides", meta: "12 guides", href: "/guides#buying-guides", icon: Package },
  { name: "Local Mid-South", meta: "6 guides", href: "/guides#local", icon: MapPin },
  { name: "Feeding & Watering", meta: "9 guides", href: "/feeding-and-watering", icon: Bath },
  { name: "Grooming Essentials", meta: "12 guides", href: "/grooming-essentials", icon: ClipboardList },
]

export function FaqFlyout({ onClose, onEnter, onLeave }: { onClose: () => void; onEnter: () => void; onLeave: () => void }) {
  const [view, setView] = useState<FaqView>("education")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  const policies = FOOTER_NAV.find((c) => c.heading === "Policies")?.links ?? []

  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="fixed inset-0 z-[60] flex h-screen w-screen bg-white shadow-2xl"
    >
      {/* Left sidebar — same geometry and states as the shop flyout's */}
      <div className="relative flex w-[200px] shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white px-4 py-7 sm:w-[270px] sm:px-6">
        <button
          onClick={onClose}
          aria-label="Close help menu"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center text-neutral-600 transition-colors hover:text-black"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="mb-3 pr-10 text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Learn &amp; help by</p>

        <div>
          {([
            { key: "education" as FaqView, label: "Pet Education" },
            { key: "faq" as FaqView, label: "FAQ & Policies" },
          ]).map(item => (
            <button
              key={item.key}
              onMouseEnter={() => setView(item.key)}
              onClick={() => setView(item.key)}
              aria-expanded={view === item.key}
              className={`flex w-full items-center justify-between gap-2 py-2.5 text-left text-[16px] leading-snug underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline ${
                view === item.key
                  ? "font-semibold text-[#002B5C] underline"
                  : "text-neutral-900"
              }`}
            >
              {item.label}
              {view === item.key
                ? <Minus size={16} aria-hidden="true" />
                : <Plus size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="my-4 border-t border-neutral-200" />

        <div>
          <Link href="/faq" onClick={onClose} className="block py-2.5 text-[16px] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">All FAQs</Link>
          <Link href="/book/appointment" onClick={onClose} className="block py-2.5 text-[16px] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">Book appointment</Link>
          <Link href="/contact" onClick={onClose} className="block py-2.5 text-[16px] text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">Contact us</Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {view === "education" && (
          <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h2 className="font-display text-[26px] font-bold leading-tight text-[#002B5C]">Pet Education Center</h2>
                <p className="mt-1 text-[15px] text-neutral-700">Care guides, articles, and quick reference sheets — written by our groomers.</p>
              </div>
              <Link href="/guides" onClick={onClose} className="shrink-0 text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4">
                Visit the center
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {EDUCATION_CARDS.map(card => {
                const Icon = card.icon
                return (
                  <article key={card.href} className="min-w-0 border border-neutral-200 bg-white">
                    <Link href={card.href} onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-cream-deep/40">
                      <Icon className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#002B5C]/50" strokeWidth={1.1} aria-hidden="true" />
                    </Link>
                    <Link href={card.href} onClick={onClose} className="flex min-h-12 items-center px-3 pt-1 text-[16px] font-semibold leading-snug text-neutral-900 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
                      {card.name}
                    </Link>
                    <p className="px-3 pb-3 text-[13px] text-neutral-600">{card.meta}</p>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {view === "faq" && (
          <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-7">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-4">
              <div>
                <h2 className="font-display text-[26px] font-bold leading-tight text-[#002B5C]">FAQ &amp; Policies</h2>
                <p className="mt-1 text-[15px] text-neutral-700">Answers to the questions pet parents ask most, plus the policies that keep every pup safe.</p>
              </div>
              <Link href="/faq" onClick={onClose} className="shrink-0 text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4">
                All FAQs
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* FAQ + help cards */}
              <div className="flex flex-col gap-4">
                <article className="flex flex-col border border-neutral-200 bg-white">
                  <Link href="/faq" onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-cream-deep/40">
                    <HelpCircle className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#002B5C]/50" strokeWidth={1.1} aria-hidden="true" />
                  </Link>
                  <div className="px-4 py-4">
                    <h3 className="text-[16px] font-semibold leading-snug text-neutral-900">Frequently Asked Questions</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">Appointments, vaccinations, matted coats, and everything else pet parents ask before their first visit.</p>
                    <Link href="/faq" onClick={onClose} className="mt-3 inline-block text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4">
                      Open the FAQ
                    </Link>
                  </div>
                </article>
                <article className="flex flex-col border border-neutral-200 bg-white">
                  <Link href="/contact" onClick={onClose} className="relative block aspect-[16/9] overflow-hidden bg-cream-deep/40">
                    <LifeBuoy className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-[#002B5C]/50" strokeWidth={1.1} aria-hidden="true" />
                  </Link>
                  <div className="px-4 py-4">
                    <h3 className="text-[16px] font-semibold leading-snug text-neutral-900">Still need help?</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-neutral-700">Reach the salon directly — we answer fast during business hours.</p>
                    <Link href="/contact" onClick={onClose} className="mt-3 inline-block text-[15px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4">
                      Contact us
                    </Link>
                  </div>
                </article>
              </div>

              {/* Policy library — same list styling as the flyout's sub lists */}
              <div className="border border-neutral-200 bg-white px-4 py-4 sm:px-5">
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Salon &amp; shop policies</p>
                <ul className="mt-2">
                  {policies.map(p => (
                    <li key={p.href}>
                      <Link href={p.href} onClick={onClose} className="block py-2 text-[15px] leading-snug text-neutral-800 underline-offset-4 decoration-[#F2C500] decoration-2 hover:underline">
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
