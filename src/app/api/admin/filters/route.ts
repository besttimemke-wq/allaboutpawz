import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/filters — admin-gated CRUD for the storefront filter system.
//
//   GET   returns three arrays:
//           { filters:  pet_product_filters[] (with nested `values`
//                       pulled from pet_product_filter_values),
//             mappings: pet_category_filters[],
//             categories: pet_product_categories[] (for the right-column
//                       multi-select UI) }
//   POST   create a new filter group:
//           body { name, slug?, display_order?, is_active?, scope? }
//
// Nested routes:
//   PATCH/DELETE  /api/admin/filters/[id]
//   POST          /api/admin/filters/[id]/values          add a value
//   DELETE        /api/admin/filters/values/[valueId]      remove a value
//   POST          /api/admin/filters/[id]/map             map filter→category
//   DELETE        /api/admin/filters/[id]/map/[mappingId]  remove a mapping
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

  const [filters, values, mappings, categories] = await Promise.all([
    repo.list("pet_product_filters"),
    repo.list("pet_product_filter_values"),
    repo.list("pet_category_filters"),
    repo.list("pet_product_categories"),
  ])

  const valuesByFilter = new Map<string, any[]>()
  for (const v of values) {
    const arr = valuesByFilter.get(String(v.filter_id)) || []
    arr.push(v)
    valuesByFilter.set(String(v.filter_id), arr)
  }

  const filtersWithValues = filters.map((f) => ({
    ...f,
    values: valuesByFilter.get(String(f.id)) || [],
  }))

  return NextResponse.json({
    filters: filtersWithValues,
    mappings,
    categories,
  })
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

  const name = String(body.name || "").trim()
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })
  const slug = String(body.slug || slugify(name))
  const now = new Date().toISOString()

  const payload: Record<string, any> = {
    name,
    slug,
    display_order: Number(body.display_order ?? 0),
    is_active: body.is_active !== false,
    scope: body.scope || "global",
    created_at: now,
  }

  try {
    const created = await repo.create("pet_product_filters", payload)
    revalidateShop()
    return NextResponse.json({ filter: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Create failed: ${msg}` }, { status: 502 })
  }
}
