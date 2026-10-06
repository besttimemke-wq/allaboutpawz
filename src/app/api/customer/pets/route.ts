import { NextRequest, NextResponse } from "next/server"
import { repo } from "@/lib/repo"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"
import { sizeTierFromWeight } from "@/lib/booking/pricing"

// ============================================================================
// /api/customer/pets — the customer's own pet registry (the CRM's dogs table).
//
//   GET    → their dogs (the salon's records for their family)
//   POST   → add a pet (name, breed, birthday, weight in pounds)
//   PATCH  → edit a pet (the full pet form — spec §8.3)
//   DELETE → remove a pet (spec §8.3 Remove)
//
// Session-scoped to the signed-in email/userId — the caller can only touch
// the dogs of their OWN customer record. Door-free (site-flow session): the
// booking wizard's Pet step reads and saves pets mid-flow, before checkout,
// and a public flow must never bounce a signed-in identity. Every write is
// the same `dogs` table the groomers and the admin CRM read — one registry,
// no copies, so an edit here shows up everywhere.
// ============================================================================

function noStore(body: Record<string, unknown>, status = 200): NextResponse {
  const res = NextResponse.json(body, { status })
  res.headers.set("Cache-Control", "no-store, max-age=0")
  return res
}

async function resolveCustomer(user: any) {
  const email = String(user.email || "").toLowerCase()
  const customers = (await repo.list("customers").catch(() => [])) as any[]
  return customers.find(
    (c) => String(c.email || "").toLowerCase() === email || c.userId === user.authUserId,
  )
}

function petShape(d: any) {
  return {
    id: d.id,
    name: d.name,
    breed: d.breedName || d.breed || null,
    breedId: d.breedId || null,
    birthDate: d.birthDate || null,
    weightLbs: d.weightLbs || null,
    size: d.size || null,
    photoUrl: d.photoUrl || null,
    vaccinationNotes: d.vaccinationNotes || null,
    createdAt: d.createdAt,
  }
}

export async function GET() {
  try {
    const { user } = await sessionForSiteFlow()
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)

    const customer = await resolveCustomer(user)
    if (!customer) return noStore({ pets: [] })

    const dogs = (await repo.list("dogs").catch(() => [])) as any[]
    const pets = dogs
      .filter((d) => d.customerId === customer.id)
      .map(petShape)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    return noStore({ pets })
  } catch (err: any) {
    console.error("[GET /api/customer/pets]", err)
    return NextResponse.json({ error: err.message || "Failed to load pets" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow()
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)
    const email = String(user.email || "").toLowerCase()
    const body = await req.json()

    const name = String(body.name || "").trim()
    const breedName = String(body.breedName || "").trim()
    const breedId = body.breedId ? String(body.breedId) : null
    const birthDate = body.birthDate ? String(body.birthDate) : null
    const weight = parseFloat(String(body.weightLbs || ""))

    if (!name) return NextResponse.json({ error: "Pet name is required." }, { status: 400 })
    if (!breedName) return NextResponse.json({ error: "Breed is required." }, { status: 400 })
    if (!Number.isFinite(weight) || weight <= 0 || weight > 300) {
      return NextResponse.json({ error: "Enter a weight in pounds." }, { status: 400 })
    }

    // Find-or-create the customer row: the Pet step may save a pet BEFORE the
    // first checkout creates the record — the registry must never dead-end.
    let customer = await resolveCustomer(user)
    if (!customer) {
      const ownerName = String(user.name || email.split("@")[0])
      customer = await repo.create("customers", {
        firstName: ownerName.split(" ")[0] || "",
        lastName: ownerName.split(" ").slice(1).join(" ") || "",
        email,
        customerStatus: "PENDING",
        userId: user.authUserId,
      })
    }

    const dog = await repo.create("dogs", {
      customerId: customer.id,
      name,
      breedName,
      breedId,
      birthDate,
      weightLbs: String(weight),
      size: sizeTierFromWeight(weight),
    })

    return noStore({ ok: true, pet: petShape(dog) }, 201)
  } catch (err: any) {
    console.error("[POST /api/customer/pets]", err)
    return NextResponse.json({ error: err.message || "Failed to add pet" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow()
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)

    const body = await req.json()
    const petId = String(body.id || "")
    if (!petId) return NextResponse.json({ error: "Pet id is required." }, { status: 400 })

    const customer = await resolveCustomer(user)
    if (!customer) return NextResponse.json({ error: "Customer record not found." }, { status: 404 })

    // Ownership: the pet must belong to THIS customer — never trust a bare id.
    const dogs = (await repo.list("dogs").catch(() => [])) as any[]
    const dog = dogs.find((d) => d.id === petId && d.customerId === customer.id)
    if (!dog) return NextResponse.json({ error: "Pet not found." }, { status: 404 })

    const updates: Record<string, string> = {}
    if (body.name !== undefined) {
      const name = String(body.name || "").trim()
      if (!name) return NextResponse.json({ error: "Pet name is required." }, { status: 400 })
      updates.name = name
    }
    if (body.breedName !== undefined) {
      const breedName = String(body.breedName || "").trim()
      if (!breedName) return NextResponse.json({ error: "Breed is required." }, { status: 400 })
      updates.breedName = breedName
    }
    if (body.breedId !== undefined) updates.breedId = body.breedId ? String(body.breedId) : null as any
    if (body.birthDate !== undefined) updates.birthDate = body.birthDate ? String(body.birthDate) : null as any
    if (body.weightLbs !== undefined) {
      const weight = parseFloat(String(body.weightLbs || ""))
      if (!Number.isFinite(weight) || weight <= 0 || weight > 300) {
        return NextResponse.json({ error: "Enter a weight in pounds." }, { status: 400 })
      }
      updates.weightLbs = String(weight)
      updates.size = sizeTierFromWeight(weight)
    }

    const updated = await repo.update("dogs", petId, updates)
    return noStore({ ok: true, pet: petShape(updated || { ...dog, ...updates }) })
  } catch (err: any) {
    console.error("[PATCH /api/customer/pets]", err)
    return NextResponse.json({ error: err.message || "Failed to update pet" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow()
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)

    const petId = new URL(req.url).searchParams.get("id") || ""
    if (!petId) return NextResponse.json({ error: "Pet id is required." }, { status: 400 })

    const customer = await resolveCustomer(user)
    if (!customer) return NextResponse.json({ error: "Customer record not found." }, { status: 404 })

    const dogs = (await repo.list("dogs").catch(() => [])) as any[]
    const dog = dogs.find((d) => d.id === petId && d.customerId === customer.id)
    if (!dog) return NextResponse.json({ error: "Pet not found." }, { status: 404 })

    await repo.remove("dogs", petId)
    return noStore({ ok: true })
  } catch (err: any) {
    console.error("[DELETE /api/customer/pets]", err)
    return NextResponse.json({ error: err.message || "Failed to remove pet" }, { status: 500 })
  }
}
