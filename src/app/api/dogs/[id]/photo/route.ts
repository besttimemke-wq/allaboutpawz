import { NextRequest, NextResponse } from "next/server"
import { supabaseConfig, usingSupabase, supabaseReady } from "@/lib/repo"

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

  return NextResponse.json({ url })
}
