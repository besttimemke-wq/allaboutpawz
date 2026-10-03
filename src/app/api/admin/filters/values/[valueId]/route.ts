import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/filters/values/[valueId] — delete a single filter value.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ valueId: string }> }) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const { valueId } = await ctx.params

  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  try {
    await repo.remove("pet_product_filter_values", valueId)
    revalidateShop()
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Delete failed: ${msg}` }, { status: 502 })
  }
}
