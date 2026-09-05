"use client"

import { ShopClient, type ShopProduct } from "./shop-client"
import type { SidebarCategory } from "./shop-sidebar"
import {
  products as embeddedProducts,
  productReviews,
  categoryTree,
  type CmsRow,
} from "@/content/site-content"
import { visibleOnly } from "./use-cms"

// ---------------------------------------------------------------------------
// Shop loader — embedded catalog. The published products, category tree, and
// review rollups are baked into the bundle (src/content/site-content.ts), so
// the grid renders on first paint: no fetch, no API call, no database, no
// skeleton. ShopClient is untouched: same props, same flow.
// ---------------------------------------------------------------------------

type Rating = { avg: number; count: number }

// Visible products sorted by the catalog `order` field (same shaping the
// loader performed on the fetched rows — now computed once at module load).
const products: ShopProduct[] = visibleOnly(embeddedProducts as ShopProduct[]).sort(
  (a, b) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name)),
)

const tree: SidebarCategory[] = categoryTree.categories as SidebarCategory[]

// Review rollup per product (a review shows when it is visible OR explicitly
// approved — same rule as the category pages).
const ratings: Record<string, Rating> = {}
for (const r of productReviews as CmsRow[]) {
  if (!(r.visible === true || r.status === "approved")) continue
  const cur = ratings[r.productId] || { avg: 0, count: 0 }
  ratings[r.productId] = {
    avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
    count: cur.count + 1,
  }
}

export function ShopLoader() {
  return <ShopClient products={products} categoryTree={tree} ratings={ratings} />
}
