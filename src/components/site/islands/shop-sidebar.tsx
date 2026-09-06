"use client"

import { useMemo } from "react"
import Link from "next/link"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Shop Sidebar — the /shop landing rail.
//
//   The DEPARTMENTS card is the design library's landing sidebar markup
//   (ExactShopLandingPageView): canvas-tone card, "Departments" header with
//   a VIEW ALL link, "All Products" + the departments as links with live
//   product counts (normal case — categories are navigation, not checkboxes).
//
//   Below it, the same filter card the category pages use: Price Range
//   (slider + $ inputs), Rating, Availability — visible rows, no accordions.
//
// Pure client state — no persistence, no hydration gate.
// ---------------------------------------------------------------------------

export type SidebarProduct = {
  id: string
  price: string
  categoryId?: number | null
  stock?: number | null
}

export type SidebarCategory = {
  id: number
  name: string
  slug: string
  productCount: number
  children: SidebarCategory[]
}

export type SidebarRating = { avg: number; count: number }

const numSpinCls =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

export function ShopSidebar({
  categories,
  products,
  ratings,
  price,
  onPriceChange,
  children,
}: {
  categories: SidebarCategory[]
  products: SidebarProduct[]
  ratings: Record<string, SidebarRating>
  price: { min: string; max: string; buckets: string[] }
  onPriceChange: (next: { min: string; max: string; buckets: string[] }) => void
  children?: React.ReactNode
}) {
  // ---- data-backed facet availability (never render dead controls) ----
  const cents = useMemo(
    () => products.map((p) => ({ p, c: parsePriceToCents(p.price) })),
    [products],
  )

  // Price bounds for the range slider (live data).
  const priceBounds = useMemo(() => {
    const cs = cents.map(({ c }) => c).filter((c): c is number => c != null)
    if (cs.length === 0) return { min: 0, max: 100 }
    const min = Math.floor(Math.min(...cs) / 100)
    const max = Math.ceil(Math.max(...cs) / 100)
    return { min, max: Math.max(max, min + 1) }
  }, [cents])

  const sliderMax = useMemo(() => {
    const v = parseFloat(price.max)
    if (price.max.trim() !== "" && isFinite(v)) return Math.max(priceBounds.min, Math.min(priceBounds.max, Math.round(v)))
    return priceBounds.max
  }, [price.max, priceBounds])

  const ratingOptions = useMemo(() => {
    const rated = products.filter((p) => (ratings[p.id]?.count ?? 0) > 0)
    if (rated.length === 0) return []
    return [4, 3]
      .map((v) => ({
        value: v,
        label: `${v}★ & up`,
        count: rated.filter((p) => (ratings[p.id]?.avg ?? 0) >= v).length,
      }))
      .filter((o) => o.count > 0)
  }, [products, ratings])

  const stockCounts = useMemo(
    () => ({
      inStock: products.filter((p) => (p.stock == null ? true : p.stock > 0)).length,
      backordered: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  )

  const totalProducts = categories.reduce((n, c) => n + c.productCount, 0)

  const toggleBucket = (key: string) =>
    onPriceChange({
      ...price,
      buckets: price.buckets.includes(key)
        ? price.buckets.filter((k) => k !== key)
        : [...price.buckets, key],
    })

  return (
    <div className="space-y-6" aria-label="Shop filters">
      {/* DEPARTMENTS — the repo's landing sidebar card: links to the full
          category pages (each carries its own subcategory nav + filters). */}
      <nav
        aria-label="Departments"
        className="rounded-none border border-[#d8c2b7]/70 bg-[#FAF8F5] p-4 shadow-xs"
      >
        <div className="mb-1 flex items-center justify-between border-b border-[#d8c2b7]/40 px-2 py-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#53443b]">
            Departments
          </span>
          <Link
            href="/shop"
            className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider text-[#7d441d] hover:underline"
          >
            View All
          </Link>
        </div>
        <ul className="space-y-1 pt-2 text-sm">
          <li>
            <Link
              href="/shop"
              aria-current="page"
              className="flex items-center justify-between rounded-none bg-[#ebdcd4] px-3 py-2 font-bold text-[#7d441d] transition-colors"
            >
              <span>All Products</span>
              <span className="rounded-none bg-[#FAF8F5] px-2 py-0.5 text-xs font-semibold text-[#7d441d]">
                {totalProducts}
              </span>
            </Link>
          </li>
          {categories.map((root) => (
            <li key={root.id}>
              <Link
                href={`/shop/category/${root.slug}`}
                className="flex items-center justify-between rounded-none px-3 py-2 text-[#53443b] transition-colors hover:bg-[#ebdcd4]/50 hover:text-[#1F1B18]"
              >
                <span>{root.name}</span>
                <span className="text-xs text-[#85736a]">{root.productCount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* PRICE RANGE — the same card the category rail uses */}
      <div className="rounded-none border border-[#d8c2b7]/70 bg-[#FAF8F5] p-5 shadow-xs">
        <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[#7A7571]">
          Price Range
        </h3>
        <div className="space-y-3">
          <input
            type="range"
            min={priceBounds.min}
            max={priceBounds.max}
            value={sliderMax}
            onChange={(e) => onPriceChange({ ...price, max: e.target.value })}
            aria-label="Maximum price"
            className="h-1 w-full cursor-pointer appearance-none rounded-none bg-[#d8c2b7]/50 accent-[#7d441d]"
          />
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center rounded-none border border-[#d8c2b7] bg-[#FAF8F5] px-2.5 py-1.5">
              <span className="mr-1 text-xs text-[#85736a]">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={price.min}
                onChange={(e) => onPriceChange({ ...price, min: e.target.value })}
                placeholder={String(priceBounds.min)}
                aria-label="Minimum price"
                className={`w-full border-0 bg-transparent p-0 text-xs text-[#1F1B18] outline-none focus:ring-0 ${numSpinCls}`}
              />
            </div>
            <span className="text-xs text-[#85736a]">to</span>
            <div className="flex flex-1 items-center rounded-none border border-[#d8c2b7] bg-[#FAF8F5] px-2.5 py-1.5">
              <span className="mr-1 text-xs text-[#85736a]">$</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={price.max}
                onChange={(e) => onPriceChange({ ...price, max: e.target.value })}
                placeholder={String(priceBounds.max)}
                aria-label="Maximum price"
                className={`w-full border-0 bg-transparent p-0 text-xs text-[#1F1B18] outline-none focus:ring-0 ${numSpinCls}`}
              />
            </div>
          </div>
        </div>

        {/* RATING — only when there are rated products */}
        {ratingOptions.length > 0 && (
          <>
            <div className="my-4 h-px bg-[#d8c2b7]/50" />
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
              Rating
            </h3>
            <div className="space-y-2 text-xs">
              {ratingOptions.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-center justify-between text-xs text-[#53443b] hover:text-[#1F1B18]"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={price.buckets.includes(`rating${o.value}`)}
                      onChange={() => toggleBucket(`rating${o.value}`)}
                      className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-0"
                    />
                    <span className="flex text-xs text-amber-500">{"★".repeat(o.value)}</span>
                    <span>{o.label}</span>
                  </div>
                  <span className="text-[11px] text-[#85736a]">({o.count})</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* AVAILABILITY — options that actually match products */}
        {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
          <>
            <div className="my-4 h-px bg-[#d8c2b7]/50" />
            <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[#53443b]">
              Availability
            </h3>
            <div className="space-y-2 text-xs">
              {stockCounts.inStock > 0 && (
                <label className="flex cursor-pointer items-center justify-between text-xs text-[#53443b] hover:text-[#1F1B18]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={price.buckets.includes("instock")}
                      onChange={() => toggleBucket("instock")}
                      className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-0"
                    />
                    <span>In stock</span>
                  </div>
                  <span className="text-[11px] text-[#85736a]">({stockCounts.inStock})</span>
                </label>
              )}
              {stockCounts.backordered > 0 && (
                <label className="flex cursor-pointer items-center justify-between text-xs text-[#53443b] hover:text-[#1F1B18]">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={price.buckets.includes("backorder")}
                      onChange={() => toggleBucket("backorder")}
                      className="cursor-pointer rounded-none border-[#d8c2b7] accent-[#7d441d] focus:ring-0"
                    />
                    <span>Backordered</span>
                  </div>
                  <span className="text-[11px] text-[#85736a]">({stockCounts.backordered})</span>
                </label>
              )}
            </div>
          </>
        )}
      </div>

      {children}
    </div>
  )
}
