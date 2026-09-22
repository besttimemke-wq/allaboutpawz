import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAdminApi } from "@/lib/admin/gate"

// ============================================================================
// POST /api/revalidate-shop
//
// Purges the storefront's ISR cache for the home page, the shop index, the
// canonical catch-all category/PLP routes (`/shop/dog`, `/shop/dog/grooming`,
// …), the shopping bag, and the product detail pages.
//
// Auth (either path is sufficient):
//   1. Bearer token via the `Authorization` header (REVALIDATE_SECRET) — used
//      by external callers (e.g. Stripe webhooks, build scripts).
//   2. Admin-cookie auth via requireAdminApi() — used by the admin pages
//      themselves so they can refresh the storefront after a save without
//      ever receiving the bearer secret.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const authToken = req.headers.get("authorization")
    const expectedToken = process.env.REVALIDATE_SECRET
      ? `Bearer ${process.env.REVALIDATE_SECRET}`
      : null

    const bearerOk = !!expectedToken && !!authToken && authToken === expectedToken

    let adminOk = false
    if (!bearerOk) {
      const gate = await requireAdminApi()
      adminOk = gate === null
    }

    if (!bearerOk && !adminOk) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    // Home page (featured products / category tiles).
    revalidatePath("/")
    // Shop index + canonical category PLP routes (`/shop/dog`,
    // `/shop/dog/grooming`, …).
    revalidatePath("/shop")
    revalidatePath("/shop/[...slug]", "page")
    // Shopping bag.
    revalidatePath("/shop/bag")
    // Product detail pages.
    revalidatePath("/products/[slug]", "page")

    return NextResponse.json({
      revalidated: true,
      paths: ["/", "/shop", "/shop/[...slug]", "/shop/bag", "/products/[slug]"],
      now: Date.now(),
    })
  } catch {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 })
  }
}
