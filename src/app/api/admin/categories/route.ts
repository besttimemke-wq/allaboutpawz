import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/categories — admin-gated CRUD for pet_product_categories.
//
//   GET   list every category (sorted by parent_id NULLS FIRST, then
//         sort_order, then name) including the mega-menu fields.
//   POST  create a new category with the full mega-menu payload; the
//         server fills id + slug + timestamps.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(_req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const rows = await repo.list("pet_product_categories")
  // Sort: top-level first, then sort_order, then name. PostgREST's
  // CUSTOM_ORDER uses id.asc — we re-sort here for the admin tree view.
  const sorted = [...rows].sort((a, b) => {
    const pa = a.parent_id ? 1 : 0
    const pb = b.parent_id ? 1 : 0
    if (pa !== pb) return pa - pb
    const sa = Number(a.sort_order ?? 0)
    const sb = Number(b.sort_order ?? 0)
    if (sa !== sb) return sa - sb
    return String(a.name || "").localeCompare(String(b.name || ""))
  })
  return NextResponse.json({ categories: sorted })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const now = new Date().toISOString()
  const id = Number.isFinite(Number(body.id)) ? Number(body.id) : undefined
  const slug = (body.slug as string) || slugify(body.name as string)
  if (!slug) {
    return NextResponse.json({ error: "name (or slug) is required" }, { status: 400 })
  }

  const payload: Record<string, any> = {
    name: body.name,
    slug,
    parent_id: body.parent_id === "" || body.parent_id === null ? null : Number(body.parent_id),
    hero_image: body.hero_image ?? null,
    promo_blurb: body.promo_blurb ?? null,
    sort_order: Number(body.sort_order ?? 0),
    featured_in_mega_menu: !!body.featured_in_mega_menu,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    is_active: body.is_active !== false,
    created_at: now,
    updated_at: now,
  }
  if (id !== undefined) payload.id = id
  if (body.source_url) payload.source_url = body.source_url

  try {
    const created = await repo.create("pet_product_categories", payload)
    revalidateShop()
    return NextResponse.json({ category: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Create failed: ${msg}` }, { status: 502 })
  }
}
