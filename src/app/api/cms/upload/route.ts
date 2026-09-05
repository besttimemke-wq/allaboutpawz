import { NextRequest, NextResponse } from "next/server"
import { supabaseConfig, usingSupabase } from "@/lib/repo"

// POST /api/cms/upload  (multipart/form-data, field "file")
// Uploads the image to the Supabase Storage bucket "cms-media" and returns
// its public URL. Only available when Supabase is configured AND the schema
// has been applied (tables exist).
export async function POST(req: NextRequest) {
  if (!(await usingSupabase())) {
    return NextResponse.json(
      { error: "Image upload requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (and run supabase/schema.sql in the Supabase SQL editor if you haven't), then restart the dev server." },
      { status: 503 },
    )
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const res = await fetch(`${supabaseConfig.url}/storage/v1/object/cms-media/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseConfig.key!,
      Authorization: `Bearer ${supabaseConfig.key}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: buf,
  })

  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText)
    return NextResponse.json({ error: `Upload failed (${res.status}): ${t}` }, { status: 502 })
  }

  const publicUrl = `${supabaseConfig.url}/storage/v1/object/public/cms-media/${path}`
  return NextResponse.json({ url: publicUrl, path })
}
