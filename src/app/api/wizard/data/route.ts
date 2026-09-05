import { NextResponse } from "next/server"
import { getWizardData } from "@/lib/wizard/wizard-data"

// GET /api/wizard/data
// Everything the booking/consultation wizards need (breeds, bookable services,
// groomers, grooming lookups) in one payload. The wizard pages render their
// shell statically and fetch this client-side after paint — the credentials
// stay server-side, the browser never needs any keys.
export async function GET() {
  return NextResponse.json(await getWizardData())
}
