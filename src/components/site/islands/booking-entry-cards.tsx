"use client"

import { Scissors, PawPrint, ArrowRight } from "@phosphor-icons/react"
import { useWizard, type BookingType } from "@/lib/wizard/wizard-store"

// ---------------------------------------------------------------------------
// BookingEntryCard — the appointment / consultation entry cards.
//
// Each card lives in its own section on the page (black dog | appointment
// card below the steps band, brown dog | consultation card below the consult
// band). Clicking a card opens the wizard below in that flow. The card is
// plain content on the page canvas — no box, same background as the page.
// ---------------------------------------------------------------------------

export function BookingEntryCard({ type }: { type: BookingType }) {
  const isConsult = type === "consultation"

  const choose = () => {
    const s = useWizard.getState()
    s.patch({ bookingType: type, step: Math.max(1, s.step) })
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <button type="button" onClick={choose} className="group block w-full text-center">
      {isConsult ? (
        <PawPrint size={36} weight="fill" className="mx-auto text-gold-deep" />
      ) : (
        <Scissors size={36} weight="fill" className="mx-auto text-gold-deep" />
      )}
      <h3 className="mt-4 font-display text-[30px] leading-[1.15] text-ink">
        {isConsult ? "Schedule a Consultation" : "Book an Appointment"}
      </h3>
      <p className="mx-auto mt-4 max-w-[300px] text-[12.5px] leading-[1.8] text-ink-soft">
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
