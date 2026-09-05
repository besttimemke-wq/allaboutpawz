"use client"

import { useSyncExternalStore } from "react"
import { Scissors, PawPrint, ArrowRight } from "@phosphor-icons/react"
import { useWizard, type BookingType } from "@/lib/wizard/wizard-store"

// ---------------------------------------------------------------------------
// BookingEntryCard — the appointment / consultation entry cards.
//
// The two options that used to sit side by side on the wizard's first screen
// now live in their own sections on the page (each beside a dog photo).
// Clicking a card selects that flow in the shared wizard store and scrolls
// the wizard into view. The card matching the wizard's current mode stays
// highlighted, so the pair doubles as a visible mode switcher.
// ---------------------------------------------------------------------------

export function BookingEntryCard({ type }: { type: BookingType }) {
  const s = useWizard()
  // Hydration gate — false on the server and the first client render, true
  // after (same pattern as the bag indicator in the site chrome).
  const emptySubscribe = () => () => {}
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const isConsult = type === "consultation"
  // null (fresh visit) reads as the appointment flow — same on server and
  // on the first client render, so hydration never mismatches.
  const active = hydrated
    ? (isConsult ? s.bookingType === "consultation" : (s.bookingType ?? "appointment") === "appointment")
    : !isConsult

  const choose = () => {
    s.patch({ bookingType: type, step: Math.max(1, s.step) })
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <button
      type="button"
      onClick={choose}
      aria-pressed={active}
      className={`group block w-full border bg-card p-8 text-center transition-colors lg:p-10 ${
        active
          ? "border-gold-deep bg-cream-deep"
          : "border-gold/35 hover:border-gold-deep hover:bg-cream-deep"
      }`}
    >
      {isConsult ? (
        <PawPrint size={36} weight="fill" className="mx-auto text-gold-deep" />
      ) : (
        <Scissors size={36} weight="fill" className="mx-auto text-gold-deep" />
      )}
      <h3 className="mt-4 font-display text-[26px] leading-[1.15] text-ink">
        {isConsult ? "Schedule a Consultation" : "Book an Appointment"}
      </h3>
      <p className="mx-auto mt-3.5 max-w-[300px] text-[12px] leading-[1.8] text-ink-soft">
        {isConsult
          ? "Free — meet the team, talk through your pup's coat, and get a custom plan before the first groom. No deposit, no pressure."
          : "A $25 deposit secures your pup's visit — nine quick steps, about two minutes, and we take care of the rest."}
      </p>
      <span className="btn-gold mt-7 inline-flex">
        {isConsult ? "REQUEST A CONSULTATION" : "BOOK AN APPOINTMENT"}
        <ArrowRight size={14} weight="bold" className="ml-1.5" />
      </span>
    </button>
  )
}
