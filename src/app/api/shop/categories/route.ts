import { NextResponse } from "next/server"
import { getCategoryTree } from "@/lib/categories"

// GET /api/shop/categories
// Public read-only category tree (with visible-product counts rolled up per
// node). Used by the storefront category menus and the admin product editor /
// categories page. No secrets — only category names, slugs and counts.
export async function GET() {
  const tree = await getCategoryTree()
  return NextResponse.json({
    ready: tree.ready,
    categories: tree.categories,
    flat: tree.flat,
  })
}
