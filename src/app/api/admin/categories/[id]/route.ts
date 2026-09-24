import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseConfig, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/categories/[id] — admin-gated PATCH + DELETE.
//
// DELETE is guarded: a category with children OR products assigned to it
// cannot be removed (returns 409 with a message). After every successful
// mutation the storefront is revalidated.
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

  // pet_product_categories has NO created_at/updated_at columns (verified
  // against the live schema). Strip them + read-only fields.
  const payload: Record<string, any> = { ...body }
  if ("parent_id" in payload) {
    payload.parent_id =
      payload.parent_id === "" || payload.parent_id === null ? null : Number(payload.parent_id)
  }
  if ("sort_order" in payload) payload.sort_order = Number(payload.sort_order)
  if ("featured_in_mega_menu" in payload) payload.featured_in_mega_menu = !!payload.featured_in_mega_menu
  if ("is_active" in payload) payload.is_active = payload.is_active !== false
  delete payload.id
  delete payload.created_at
  delete payload.updated_at

  try {
    const updated = await repo.update("pet_product_categories", id, payload)
    revalidateShop()
    return NextResponse.json({ category: updated })
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

  // 1. Block if the category has children.
  const childRes = await fetch(
    `${supabaseConfig.url}/rest/v1/pet_product_categories?select=id&parent_id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: { apikey: supabaseConfig.key!, Authorization: `Bearer ${supabaseConfig.key}` } },
  )
  if (childRes.ok) {
    const arr = (await childRes.json().catch(() => [])) as unknown[]
    if (arr.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete a category that still has child categories. Remove or reassign them first." },
        { status: 409 },
      )
    }
  }

  // 2. Block if any commerce_products reference this category via category_id.
  const prodRes = await fetch(
    `${supabaseConfig.url}/rest/v1/commerce_products?select=id&category_id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: { apikey: supabaseConfig.key!, Authorization: `Bearer ${supabaseConfig.key}` } },
  )
  if (prodRes.ok) {
    const arr = (await prodRes.json().catch(() => [])) as unknown[]
    if (arr.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete a category that still has products assigned. Move or remove the products first." },
        { status: 409 },
      )
    }
  }

  try {
    await repo.remove("pet_product_categories", id)
    revalidateShop()
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Delete failed: ${msg}` }, { status: 502 })
  }
}
