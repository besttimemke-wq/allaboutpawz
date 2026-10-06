import { NextRequest, NextResponse } from "next/server"
import { repo, supabaseConfig, usingSupabase, supabaseReady } from "@/lib/repo"
import { sessionForSiteFlow } from "@/lib/portal-session-scope"

// ============================================================================
// /api/customer/pets/vaccinations — vaccination-record photos on a pet.
//
//   POST   (multipart/form-data: file + id) → upload to the cms-media bucket
//          (dogs/{id}/vax-…) and APPEND the public URL to
//          dogs."vaccinationPhotoUrls" (jsonb array, newest last).
//   DELETE (?id=…&url=…) → remove one URL from the array.
//
// Session-scoped: the dog must belong to the signed-in customer's own
// record — a bare id is never trusted. The same column the admin CRM reads,
// so a photo uploaded here is on the groomer's screen before the next visit.
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

/** The dog row IF it belongs to the session's customer — else null. */
async function ownedDog(user: any, dogId: string) {
  const customer = await resolveCustomer(user)
  if (!customer) return null
  const dogs = (await repo.list("dogs").catch(() => [])) as any[]
  return dogs.find((d) => d.id === dogId && d.customerId === customer.id) || null
}

/** vaccinationPhotoUrls arrives as a jsonb array (or a JSON string). */
function parseVaxUrls(d: any): string[] {
  const raw = d?.vaccinationPhotoUrls
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(String(raw)) } catch { return [] } })()
  return Array.isArray(arr) ? arr.filter((u: unknown) => typeof u === "string" && u.length > 0) : []
}

/** PATCH the dogs row's vaccinationPhotoUrls via PostgREST (jsonb-safe). */
async function patchVaxUrls(dogId: string, urls: string[]) {
  const res = await fetch(
    `${supabaseConfig.url}/rest/v1/dogs?id=eq.${encodeURIComponent(dogId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseConfig.key!,
        Authorization: `Bearer ${supabaseConfig.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ vaccinationPhotoUrls: urls }),
    },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    return { ok: false, status: res.status, body }
  }
  return { ok: true, status: res.status, body: "" }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow()
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)

    if (!supabaseReady || !(await usingSupabase())) {
      return noStore({ error: "Photo upload requires Supabase storage." }, 503)
    }

    const form = await req.formData()
    const file = form.get("file")
    const dogId = String(form.get("id") || "")
    if (!dogId) return noStore({ error: "Pet id is required." }, 400)
    if (!(file instanceof File)) return noStore({ error: "No file provided." }, 400)

    // 5 MB cap, images only (same policy as pet photos)
    const MAX = 5 * 1024 * 1024
    if (file.size > MAX) return noStore({ error: "Image too large (5 MB max)." }, 413)
    if (!/^image\//.test(file.type || "")) return noStore({ error: "File must be an image." }, 415)

    const dog = await ownedDog(user, dogId)
    if (!dog) return noStore({ error: "Pet not found." }, 404)

    // ---- Upload to Supabase Storage (cms-media bucket) ----
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")
    const path = `dogs/${dogId}/vax-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())

    const upRes = await fetch(`${supabaseConfig.url}/storage/v1/object/cms-media/${path}`, {
      method: "POST",
      headers: {
        apikey: supabaseConfig.key!,
        Authorization: `Bearer ${supabaseConfig.key}`,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert": "true",
      },
      body: buf,
    })
    if (!upRes.ok) {
      const t = await upRes.text().catch(() => upRes.statusText)
      return noStore({ error: `Upload failed (${upRes.status}): ${t}` }, 502)
    }
    const publicUrl = `${supabaseConfig.url}/storage/v1/object/public/cms-media/${path}`

    // ---- Append to vaccinationPhotoUrls ----
    const next = [...parseVaxUrls(dog), publicUrl]
    const patch = await patchVaxUrls(dogId, next)
    if (!patch.ok) {
      // PGRST204 → migration 0016 hasn't been run against this project yet
      if (patch.body.includes("vaccinationPhotoUrls") && (patch.body.includes("PGRST204") || patch.body.includes("schema cache"))) {
        return noStore(
          { error: "The dogs table is missing the vaccinationPhotoUrls column. Run supabase/migrations/0016_dog_vaccination_records.sql in the Supabase SQL editor, then retry.", migration: "supabase/migrations/0016_dog_vaccination_records.sql" },
          503,
        )
      }
      return noStore({ error: `Failed to save the record (${patch.status}).` }, 502)
    }

    return noStore({ ok: true, url: publicUrl, vaccinationPhotoUrls: next })
  } catch (err: any) {
    console.error("[POST /api/customer/pets/vaccinations]", err)
    return NextResponse.json({ error: err.message || "Failed to upload record" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await sessionForSiteFlow()
    if (!user) return noStore({ error: "not_signed_in", code: "NO_SESSION" }, 401)

    const dogId = new URL(req.url).searchParams.get("id") || ""
    const url = new URL(req.url).searchParams.get("url") || ""
    if (!dogId || !url) return noStore({ error: "Pet id and url are required." }, 400)

    const dog = await ownedDog(user, dogId)
    if (!dog) return noStore({ error: "Pet not found." }, 404)

    const next = parseVaxUrls(dog).filter((u) => u !== url)
    const patch = await patchVaxUrls(dogId, next)
    if (!patch.ok) return noStore({ error: `Failed to remove the record (${patch.status}).` }, 502)

    return noStore({ ok: true, vaccinationPhotoUrls: next })
  } catch (err: any) {
    console.error("[DELETE /api/customer/pets/vaccinations]", err)
    return NextResponse.json({ error: err.message || "Failed to remove record" }, { status: 500 })
  }
}
