import { NextResponse } from "next/server"
import { getNavTree, flattenNav, type NavCategory } from "@/lib/shop/catalog"

// GET /api/shop/nav
//
// Public customer-facing navigation tree (the same resolver the shop sidebar
// uses). Roots are virtual species parents (Dog); their children are the
// flattened department nodes (Grooming, Wellness, …) with canonical
// `/shop/<species>/<department>` paths. Used by the storefront header mega
// menu. No secrets — only category names, slugs, paths, and rolled-up counts.

export async function GET() {
  const tree = await getNavTree()
  const flat = flattenNav(tree)
  return NextResponse.json({ ready: true, categories: tree, flat })
}

export type NavResponse = {
  ready: boolean
  categories: NavCategory[]
  flat: NavCategory[]
}
