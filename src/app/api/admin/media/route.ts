import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminApi } from "@/lib/admin/gate"
import { supabaseConfig, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/media — canonical server-side image upload proxy.
//
//   POST  multipart/form-data:
//           file   (required, image/*, <= 10 MB)
//           path   (optional sub-folder, default "products")
//
//   Returns { url, path }.
//
// Used by every admin page that needs a media URL (products, brands,
// categories' hero_image, etc.) so the browser anon key is never used for
// uploads — the service-role key is the only credential involved.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 })

  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No 'file' field provided" }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (10 MB max)" }, { status: 413 })
  }
  if (!/^image\//.test(file.type || "")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 415 })
  }

  const subFolder = String(form.get("path") || "products")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "products"
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
  const storagePath = `${subFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const upRes = await fetch(`${supabaseConfig.url}/storage/v1/object/cms-media/${storagePath}`, {
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

  const url = `${supabaseConfig.url}/storage/v1/object/public/cms-media/${storagePath}`
  revalidatePath("/shop")
  revalidatePath("/shop/[...slug]", "page")
  revalidatePath("/products/[slug]", "page")
  return NextResponse.json({ url, path: storagePath })
}
