import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/filters/[id]/map — map a filter to a category.
//   body: { category_id?: number | null, display_order?: number }
//   (category_id === null or omitted → global mapping)
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

  const categoryId =
    body.category_id === null || body.category_id === undefined || body.category_id === ""
      ? null
      : Number(body.category_id)

  const payload: Record<string, any> = {
    filter_id: Number(filterId),
    category_id: categoryId,
    display_order: Number(body.display_order ?? 0),
    created_at: new Date().toISOString(),
  }

  try {
    const created = await repo.create("pet_category_filters", payload)
    revalidateShop()
    return NextResponse.json({ mapping: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Create failed: ${msg}` }, { status: 502 })
  }
}
