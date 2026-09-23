import { NextRequest, NextResponse } from "next/server"
import { supabaseConfig, usingSupabase, supabaseReady } from "@/lib/repo"
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise"

// ============================================================================
// POST /api/dogs/[id]/photo  (multipart/form-data, field "file")
// ----------------------------------------------------------------------------
// Uploads a pet photo to Supabase Storage (cms-media bucket), then PATCHes the
// dogs row so its photoUrl column points at the new public URL.
//
// Returns: { url: string, path: string }
//
// If the photoUrl column has not been applied to the dogs table yet, returns
// 503 with a clear message pointing the user at the SQL migration file.
// ============================================================================

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  if (!supabaseReady) {
    return NextResponse.json(
      { error: "Pet photo upload requires Supabase. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env." },
      { status: 503 },
    )
  }

  if (!(await usingSupabase())) {
    return NextResponse.json(
      { error: "Pet photo upload requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env." },
      { status: 503 },
    )
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // 5 MB cap, images only
  const MAX = 5 * 1024 * 1024
  if (file.size > MAX) {
    return NextResponse.json({ error: "Image too large (5 MB max)" }, { status: 413 })
  }
  if (!/^image\//.test(file.type || "")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 415 })
  }

  // ---- Upload to Supabase Storage ----
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")
  const path = `dogs/${id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
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
    return NextResponse.json({ error: `Upload failed (${upRes.status}): ${t}` }, { status: 502 })
  }

  const publicUrl = `${supabaseConfig.url}/storage/v1/object/public/cms-media/${path}`

  // ---- Update dogs.photoUrl ----
  const patchRes = await fetch(
    `${supabaseConfig.url}/rest/v1/dogs?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseConfig.key!,
        Authorization: `Bearer ${supabaseConfig.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ photoUrl: publicUrl }),
    },
  )

  if (!patchRes.ok) {
    const body = await patchRes.text().catch(() => patchRes.statusText)

    // PGRST204 = column not found in schema cache → migration hasn't been run yet
    if (body.includes("photoUrl") && (body.includes("PGRST204") || body.includes("schema cache"))) {
      return NextResponse.json(
        {
          error:
            "The dogs table is missing the photoUrl column. Run the migration in supabase/migrations/0001_add_dog_photo.sql inside the Supabase SQL editor, then retry.",
          migration: "supabase/migrations/0001_add_dog_photo.sql",
        },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: `Failed to link photo to dog (${patchRes.status}): ${body}` },
      { status: 502 },
    )
  }

  return NextResponse.json({ url: publicUrl, path })
}

// Convenience: GET returns the current photo URL for a dog (used by the
// dashboard to detect whether the column has been applied).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }
  // Try to fetch the photoUrl column. If the column doesn't exist, PostgREST
  // returns PGRST204 — surface that as a clear signal to the caller.
  const res = await fetch(
    `${supabaseConfig.url}/rest/v1/dogs?select=photoUrl&id=eq.${encodeURIComponent(id)}&limit=1`,
    {
      headers: {
        apikey: supabaseConfig.key!,
        Authorization: `Bearer ${supabaseConfig.key}`,
      },
    },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: body }, { status: res.status })
  }
  const rows = await res.json().catch(() => [])
  const photoUrl = Array.isArray(rows) && rows[0] ? rows[0].photoUrl : null
  return NextResponse.json({ photoUrl })
}

// PATCH /api/dogs/[id]/photo  (body: { url: string })
// Used by the booking wizard: photo is uploaded to Supabase Storage BEFORE
// the dog row exists (via /api/cms/upload), then this endpoint links the
// resulting public URL to the dog row after creation.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 })
  }

  let url: string | undefined
  try {
    const body = await req.json()
    url = body?.url
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing 'url' field" }, { status: 400 })
  }

  const res = await fetch(
    `${supabaseConfig.url}/rest/v1/dogs?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        apikey: supabaseConfig.key!,
        Authorization: `Bearer ${supabaseConfig.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ photoUrl: url }),
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    if (body.includes("photoUrl") && (body.includes("PGRST204") || body.includes("schema cache"))) {
      return NextResponse.json(
        {
          error:
            "The dogs table is missing the photoUrl column. Run the migration in supabase/migrations/0001_add_dog_photo.sql inside the Supabase SQL editor, then retry.",
          migration: "supabase/migrations/0001_add_dog_photo.sql",
        },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: `Failed to link photo (${res.status}): ${body}` },
      { status: 502 },
    )
  }

  // ---- Dual-write: crm_documents (canonical pet photo) ----
  // Resolve the crm_pets row via source_pet_id back-link, then insert a
  // crm_documents row so the photo appears in the admin CRM.
  await withPg(async (client) => {
    const tenant = TENANT_ID()
    // 1. Find crm_pets by source_pet_id = legacy dogs.id
    const petRes = await client.query(
      `SELECT id::text, primary_customer_id::text AS customer_id, name FROM public.crm_pets
       WHERE tenant_id = $1 AND source_pet_id = $2 LIMIT 1`,
      [tenant, String(id)],
    )
    const pet = petRes.rows[0]
    if (!pet?.id || !pet?.customer_id) {
      // No canonical pet row — try fallback: look up the legacy dogs row →
      // find crm_customers by source_customer_id → find crm_pets by name
      const dogRes = await fetch(
        `${supabaseConfig.url}/rest/v1/dogs?id=eq.${encodeURIComponent(id)}&select=name,customerId&limit=1`,
        { headers: { apikey: supabaseConfig.key!, Authorization: `Bearer ${supabaseConfig.key}` } },
      ).catch(() => null)
      if (dogRes?.ok) {
        const rows = await dogRes.json().catch(() => [])
        const d = Array.isArray(rows) ? rows[0] : null
        if (d?.name && d?.customerId) {
          const cust = await client.query(
            `SELECT id::text FROM public.crm_customers WHERE tenant_id = $1 AND source_customer_id = $2 LIMIT 1`,
            [tenant, String(d.customerId)],
          )
          if (cust.rows[0]?.id) {
            const byName = await client.query(
              `SELECT id::text, primary_customer_id::text AS customer_id FROM public.crm_pets
               WHERE tenant_id = $1 AND primary_customer_id = $2::uuid AND lower(name) = lower($3) LIMIT 1`,
              [tenant, cust.rows[0].id, String(d.name)],
            )
            if (byName.rows[0]?.id) {
              pet.id = byName.rows[0].id
              pet.customer_id = byName.rows[0].customer_id || cust.rows[0].id
            }
          }
        }
      }
    }
    if (pet?.id && pet?.customer_id) {
      try {
        await client.query("SAVEPOINT photo_sp")
        const docIns = await client.query(
          `INSERT INTO public.crm_documents
             (tenant_id, customer_id, pet_id, name, status, storage_path, mime_type, uploaded_at, metadata)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'submitted', $5, $6, now(), $7::jsonb)
           RETURNING id::text`,
          [tenant, pet.customer_id, pet.id, `Pet Photo — ${pet.name || "Unnamed"}`, url, "image/jpeg", JSON.stringify({ source: "booking_wizard", photo_url: url, legacy_dog_id: String(id) })],
        )
        const docId = docIns.rows[0]?.id
        try {
          await platformAudit(client, {
            action: "crm.pet.photo.uploaded",
            targetType: "crm_document",
            targetId: docId,
            actorRole: "system",
            metadata: { petId: pet.id, customerId: pet.customer_id, source: "booking_wizard" },
          })
        } catch {}
        await client.query("RELEASE SAVEPOINT photo_sp")
      } catch (photoErr) {
        console.warn("[api/dogs/[id]/photo] crm_documents insert failed (non-fatal):", photoErr instanceof Error ? photoErr.message : photoErr)
        await client.query("ROLLBACK TO SAVEPOINT photo_sp").catch(() => {})
      }
    }
  }).catch(() => {})

  return NextResponse.json({ url })
}
