import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { repo, supabaseReady } from "@/lib/repo"

// ============================================================================
// /api/admin/filters/[id]/map/[mappingId] — delete a single
// pet_category_filters mapping.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; mappingId: string }> },
) {
  const gate = await requireAdminApi()
  if (gate) return gate

  const { mappingId } = await ctx.params

  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }

  try {
    await repo.remove("pet_category_filters", mappingId)
    revalidateShop()
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Delete failed: ${msg}` }, { status: 502 })
  }
}
