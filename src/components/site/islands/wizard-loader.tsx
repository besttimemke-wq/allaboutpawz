"use client"

import { BookingWizardV2 } from "./booking-wizard-v2"
import { wizardData } from "@/content/wizard-data"

// ---------------------------------------------------------------------------
// Wizard loader — embedded reference data. The breeds, services, groomers,
// and lookup tables the wizard needs are baked into the bundle
// (src/content/wizard-data.ts), so the wizard mounts instantly: no fetch, no
// API call, no database. BookingWizardV2 itself is untouched: same props,
// same flow. (Submitting a booking still POSTs to the API — the database is
// only ever touched when a visitor submits.)
// ---------------------------------------------------------------------------

export function WizardLoader({ flow }: { flow: "appointment" | "consultation" }) {
  return (
    <BookingWizardV2
      flow={flow}
      breeds={wizardData.breeds}
      services={wizardData.services}
      groomers={wizardData.groomers}
      lookups={wizardData.lookups}
    />
  )
}
