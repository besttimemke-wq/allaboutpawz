"use client"

import { useEffect, useState } from "react"
import { BookingWizardV2 } from "./booking-wizard-v2"

// ---------------------------------------------------------------------------
// Wizard loader — CSR shell for both wizard pages.
// The page (headline, back link, intro copy) renders statically; this island
// fetches the wizard's reference data (breeds, services, groomers, lookups)
// from /api/wizard/data after paint and mounts the wizard when ready. The
// wizard itself is untouched: same props, same flow, same behavior.
// ---------------------------------------------------------------------------

type Breed = { id: string; name: string; sizeCategory?: string; coatType?: string; akcGroup?: string }
type Service = { id: string; name: string; price: string; durationMinutes?: number; description?: string }
type Groomer = { id: string; name: string; role: string; bio?: string }
type LookupItem = { id: string; name: string; [k: string]: any }
type WizardLookups = Record<string, LookupItem[]>

type WizardData = {
  breeds: Breed[]
  services: Service[]
  groomers: Groomer[]
  lookups: WizardLookups
}

export function WizardLoader({ flow }: { flow: "appointment" | "consultation" }) {
  const [data, setData] = useState<WizardData | null>(null)

  useEffect(() => {
    let alive = true
    fetch("/api/wizard/data")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d === "object") setData(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  if (!data) {
    // Skeleton — the wizard card's shape: header band + step dots + form body.
    return (
      <div className="animate-pulse rounded-lg border border-gold/30 bg-card">
        <div className="h-14 border-b border-gold/20 bg-cream/60" />
        <div className="space-y-6 p-8">
          <div className="flex gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-2 w-8 rounded-full bg-ink/5" />
            ))}
          </div>
          <div className="h-4 w-40 bg-ink/5" />
          <div className="h-11 w-full rounded-md border border-gold/20 bg-cream/60" />
          <div className="h-11 w-full rounded-md border border-gold/20 bg-cream/60" />
          <div className="h-11 w-2/3 rounded-md border border-gold/20 bg-cream/60" />
          <div className="flex justify-between pt-4">
            <div className="h-10 w-24 rounded-md bg-ink/5" />
            <div className="h-10 w-32 rounded-md bg-ink/10" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <BookingWizardV2
      flow={flow}
      breeds={data.breeds}
      services={data.services}
      groomers={data.groomers}
      lookups={data.lookups}
    />
  )
}
