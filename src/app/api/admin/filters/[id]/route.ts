import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseConfig, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/filters/[id] — admin-gated PATCH + DELETE for a filter group.
//
// DELETE cascades: removes the filter row, its pet_product_filter_values,
// and its pet_category_filters mappings. PostgREST has no cascade delete
// out-of-the-box (no FK ON DELETE CASCADE assumed), so we issue parallel
// DELETEs before the parent delete.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const { id } = await ctx.params

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const payload: Record<string, any> = { ...body }
  if ("display_order" in payload) payload.display_order = Number(payload.display_order)
  if ("is_active" in payload) payload.is_active = payload.is_active !== false
  delete payload.id
  delete payload.created_at
  delete payload.values // nested; never persisted on the parent row

  try {
    const updated = await repo.update("pet_product_filters", id, payload)
    revalidateShop()
    return NextResponse.json({ filter: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Update failed: ${msg}` }, { status: 502 })
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const { id } = await ctx.params

  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  const headers = {
    apikey: supabaseConfig.key!,
    Authorization: `Bearer ${supabaseConfig.key}`,
  }

  // Cascade: delete child values + mappings before the parent filter.
  await Promise.all([
    fetch(
      `${supabaseConfig.url}/rest/v1/pet_product_filter_values?filter_id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers },
    ),
    fetch(
      `${supabaseConfig.url}/rest/v1/pet_category_filters?filter_id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE", headers },
    ),
  ])

  try {
    await repo.remove("pet_product_filters", id)
    revalidateShop()
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Delete failed: ${msg}` }, { status: 502 })
  }
}
