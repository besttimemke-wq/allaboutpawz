import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/filters/[id]/values — add a value to a filter.
//   body: { value, slug?, display_order? }
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

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const { id: filterId } = await ctx.params

  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const value = String(body.value || "").trim()
  if (!value) return NextResponse.json({ error: "value is required" }, { status: 400 })

  const payload: Record<string, any> = {
    filter_id: Number(filterId),
    value,
    slug: String(body.slug || slugify(value)),
    display_order: Number(body.display_order ?? 0),
    created_at: new Date().toISOString(),
  }

  try {
    const created = await repo.create("pet_product_filter_values", payload)
    revalidateShop()
    return NextResponse.json({ value: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Create failed: ${msg}` }, { status: 502 })
  }
}
