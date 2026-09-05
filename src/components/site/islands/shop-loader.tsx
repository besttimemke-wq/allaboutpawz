"use client"

import { useEffect, useState } from "react"
import { ShopClient, type ShopProduct } from "./shop-client"
import type { SidebarCategory } from "./shop-sidebar"
import { visibleOnly } from "./use-cms"

// ---------------------------------------------------------------------------
// Shop loader — CSR shell for the shop page. The page (hero, badges,
// assurances, CTA bands) renders statically; this island fetches the catalog,
// category tree, and review rollups after paint and mounts ShopClient when
// ready. ShopClient itself is untouched: same props, same flow.
// ---------------------------------------------------------------------------

type Rating = { avg: number; count: number }

export function ShopLoader() {
  const [products, setProducts] = useState<ShopProduct[] | null>(null)
  const [tree, setTree] = useState<SidebarCategory[] | null>(null)
  const [ratings, setRatings] = useState<Record<string, Rating>>({})

  useEffect(() => {
    let alive = true

    fetch("/api/cms/products")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: any[]) => {
        if (!alive) return
        // getSiteContent filtered visible; the live catalog is deduplicated in
        // the database (unique slugs) — just sort by the catalog `order` field.
        const unique = visibleOnly(rows).sort(
          (a: any, b: any) => (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name)),
        )
        setProducts(unique)
      })
      .catch(() => {
        if (alive) setProducts([])
      })

    fetch("/api/shop/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.categories)) setTree(d.categories)
        else if (alive) setTree([])
      })
      .catch(() => {
        if (alive) setTree([])
      })

    fetch("/api/cms/product_reviews")
      .then((r) => (r.ok ? r.json() : []))
      .then((reviews: any[]) => {
        if (!alive) return
        // Review rollup per product (same pattern as the category pages: a
        // review shows when it is visible OR explicitly approved).
        const rollup: Record<string, Rating> = {}
        for (const r of reviews || []) {
          if (!(r.visible === true || r.status === "approved")) continue
          const cur = rollup[r.productId] || { avg: 0, count: 0 }
          rollup[r.productId] = {
            avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
            count: cur.count + 1,
          }
        }
        setRatings(rollup)
      })
      .catch(() => {})

    return () => {
      alive = false
    }
  }, [])

  if (products === null || tree === null) {
    // Skeleton — the product grid's shape: image + title + price rows.
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-gold/30 bg-card">
            <div className="aspect-[4/5] animate-pulse bg-ink/5" />
            <div className="space-y-3 p-6">
              <div className="h-3 w-24 animate-pulse bg-ink/5" />
              <div className="h-4 w-40 animate-pulse bg-ink/5" />
              <div className="h-4 w-16 animate-pulse bg-ink/5" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return <ShopClient products={products} categoryTree={tree} ratings={ratings} />
}
