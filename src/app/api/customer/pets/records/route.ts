import { NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sessionForPortal } from "@/lib/portal-session-scope"
import { bookingSignal, totalCentsOf } from "@/lib/booking/status"

// ============================================================================
// /api/customer/pets/records — each pet's health records in ONE place.
//
//   GET → { records: [{ dog, vaccinations, grooms }] }
//         dog          → id, name, breedName, birthday, weightLbs,
//                         sizeTier, photoUrl (the same dogs rows the CRM reads)
//         vaccinations → the dog's vaccinationPhotoUrls (jsonb-or-string,
//                         parsed exactly like the vaccinations route)
//         grooms       → the customer's COMPLETED bookings for that dog
//                         (same ownership + signal logic as
//                         /api/customer/appointments), newest first.
//
// Session-scoped to the customer portal: the caller only ever sees their own
// pets and their own bookings — the customer record is resolved exactly the
// way /api/customer/pets resolves it (email OR authUserId match).
// ============================================================================

function noStore(body: Record<string, unknown>, status = 200): NextResponse {
  const res = NextResponse.json(body, { status })
  res.headers.set("Cache-Control", "no-store, max-age=0")
  return res
}

// The customer record for the session's user — the same resolution pattern
// /api/customer/pets uses (email first, authUserId as the linkage fallback).
async function resolveCustomer(user: any) {
  const email = String(user.email || "").toLowerCase()
  const customers = (await repo.list("customers").catch(() => [])) as any[]
  return customers.find(
    (c) => String(c.email || "").toLowerCase() === email || c.userId === user.authUserId,
  )
}

/** vaccinationPhotoUrls arrives as a jsonb array (or a JSON string). */
function parseVaxUrls(d: any): string[] {
  const raw = d?.vaccinationPhotoUrls
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(String(raw)) } catch { return [] } })()
  return Array.isArray(arr) ? arr.filter((u: unknown) => typeof u === "string" && u.length > 0) : []
}

export async function GET() {
  try {
    const { user } = await sessionForPortal("customer")
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)

    const email = String(user.email || "").toLowerCase()
    const [customers, dogs, bookings] = await Promise.all([
      repo.list("customers").catch(() => []),
      repo.list("dogs").catch(() => []),
      repo.list("bookings").catch(() => []),
    ])

    const customer = (customers as any[]).find(
      (c) => String(c.email || "").toLowerCase() === email || c.userId === user.authUserId,
    )
    if (!customer) return noStore({ records: [] })

    // Their dogs — one record per pup, alphabetical (same order as My Pets).
    const myDogs = (dogs as any[])
      .filter((d) => d.customerId === customer.id)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))

    // Their completed grooms — the SAME ownership + signal logic as
    // /api/customer/appointments (byEmail OR byCustomer; completed via
    // bookingSignal), then grouped per dog, newest first.
    const completed = (bookings as any[])
      .filter((b) => {
        const byEmail = String(b.email || "").toLowerCase() === email
        const byCustomer = b.customerId === customer.id
        return (byEmail || byCustomer) && bookingSignal(b) === "completed"
      })
      .map((b) => ({
        id: b.id,
        dogId: b.dogId || null,
        date: b.date,
        time: b.time,
        service: b.service,
        notes: b.notes || "",
        totalCents: totalCentsOf(b),
      }))

    const records = myDogs.map((d) => ({
      dog: {
        id: d.id,
        name: d.name,
        breedName: d.breedName || d.breed || null,
        birthday: d.birthDate || null,
        weightLbs: d.weightLbs || null,
        sizeTier: d.size || null,
        photoUrl: d.photoUrl || null,
      },
      vaccinations: parseVaxUrls(d),
      grooms: completed
        .filter((g) => g.dogId === d.id)
        .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
    }))

    return noStore({ records })
  } catch (err: any) {
    console.error("[GET /api/customer/pets/records]", err)
    return NextResponse.json({ error: err.message || "Failed to load records" }, { status: 500 })
  }
}
