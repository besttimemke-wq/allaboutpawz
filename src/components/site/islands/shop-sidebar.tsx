"use client"

import { useMemo } from "react"
import Link from "next/link"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Shop Sidebar — the /shop landing rail.
//
//   Left rail (desktop) / collapsible panel (mobile):
//   DEPARTMENTS — the 10 root categories as LINKS with live product counts
//                 (routing to the full category pages, which carry their own
//                 subcategory nav + filters). Categories are navigation, not
//                 checkboxes.
//   PRICE       — min/max inputs + data-backed quick buckets.
//   RATING      — 4★ & up / 3★ & up (only when rated products exist).
//   AVAILABILITY— In stock / Backordered (only when products match).
//
//   Visual language matches the /shop/category/[slug] filter rail exactly
//   (same card, headings, checkboxes) so the two sidebars are consistent.
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

const PRICE_BUCKETS: { key: string; label: string; test: (cents: number) => boolean }[] = [
  { key: "under25", label: "Under $25", test: (c) => c < 2500 },
  { key: "25to50", label: "$25 – $50", test: (c) => c >= 2500 && c <= 5000 },
  { key: "over50", label: "Over $50", test: (c) => c > 5000 },
]

const railHeadingCls = "text-[9px] font-bold tracking-[0.18em] text-gold-deep uppercase"
const checkRowCls = "flex cursor-pointer items-center gap-2 text-[11px] text-ink-soft"
const checkBoxCls = "h-3.5 w-3.5 shrink-0 accent-gold-deep"
const numInputCls =
  "w-full min-w-0 border border-gold/35 bg-cream px-2.5 py-2 text-[11px] text-ink placeholder:text-ink-soft/50 " +
  "focus:outline-none focus:ring-1 focus:ring-gold-deep [appearance:textfield] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

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

  const bucketOptions = useMemo(
    () =>
      PRICE_BUCKETS.map((b) => ({
        ...b,
        count: cents.filter(({ c }) => c != null && b.test(c)).length,
      })).filter((b) => b.count > 0),
    [cents],
  )

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

  const toggleBucket = (key: string) =>
    onPriceChange({
      ...price,
      buckets: price.buckets.includes(key)
        ? price.buckets.filter((k) => k !== key)
        : [...price.buckets, key],
    })

  const rail = (
    <div className="space-y-6" aria-label="Shop filters">
      {/* DEPARTMENTS — links to the full category pages (each carries its
          own subcategory nav + filters). Navigation, not checkboxes. */}
      <div>
        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
          <p className={railHeadingCls}>Departments</p>
          <Link
            href="/shop"
            className="text-[9px] font-bold tracking-[0.14em] text-gold-deep transition-colors hover:text-ink"
          >
            ALL
          </Link>
        </div>
        <ul className="mt-2.5 space-y-0.5">
          {categories.map((root) => (
            <li key={root.id}>
              <Link
                href={`/shop/category/${root.slug}`}
                className="flex items-center justify-between rounded-sm px-1.5 py-1.5 text-[10px] font-bold tracking-[0.1em] text-ink transition-colors hover:bg-gold/5 hover:text-gold-deep"
              >
                <span className="truncate">{root.name.toUpperCase()}</span>
                <span className="ml-2 shrink-0 text-[9.5px] font-bold text-gold-deep/70">
                  {root.productCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* PRICE — range + data-backed quick buckets */}
      <div>
        <p className={railHeadingCls}>Price</p>
        <div className="mt-2.5 flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={price.min}
            onChange={(e) => onPriceChange({ ...price, min: e.target.value })}
            placeholder="MIN $"
            aria-label="Minimum price"
            className={numInputCls}
          />
          <span className="text-gold/60" aria-hidden="true">—</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={price.max}
            onChange={(e) => onPriceChange({ ...price, max: e.target.value })}
            placeholder="MAX $"
            aria-label="Maximum price"
            className={numInputCls}
          />
        </div>
        {bucketOptions.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {bucketOptions.map((b) => (
              <label key={b.key} className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={price.buckets.includes(b.key)}
                  onChange={() => toggleBucket(b.key)}
                  className={checkBoxCls}
                />
                <span className="flex-1">{b.label}</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{b.count}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* RATING — only when there are rated products */}
      {ratingOptions.length > 0 && (
        <div>
          <p className={railHeadingCls}>Rating</p>
          <div className="mt-2.5 space-y-1.5">
            {ratingOptions.map((o) => (
              <label key={o.value} className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={price.buckets.includes(`rating${o.value}`)}
                  onChange={() => toggleBucket(`rating${o.value}`)}
                  className={checkBoxCls}
                />
                <span className="flex-1">{o.label}</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{o.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* AVAILABILITY — options that actually match products */}
      {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
        <div>
          <p className={railHeadingCls}>Availability</p>
          <div className="mt-2.5 space-y-1.5">
            {stockCounts.inStock > 0 && (
              <label className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={price.buckets.includes("instock")}
                  onChange={() => toggleBucket("instock")}
                  className={checkBoxCls}
                />
                <span className="flex-1">In stock</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{stockCounts.inStock}</span>
              </label>
            )}
            {stockCounts.backordered > 0 && (
              <label className={checkRowCls}>
                <input
                  type="checkbox"
                  checked={price.buckets.includes("backorder")}
                  onChange={() => toggleBucket("backorder")}
                  className={checkBoxCls}
                />
                <span className="flex-1">Backordered</span>
                <span className="text-[9.5px] font-bold text-ink-soft/70">{stockCounts.backordered}</span>
              </label>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  )

  return rail
}
