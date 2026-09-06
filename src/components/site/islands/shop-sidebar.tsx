"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus, X } from "@phosphor-icons/react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Shop Sidebar — the regular ecommerce category rail.
//
//   Left rail (desktop) / collapsible panel (mobile):
//   CATEGORIES  — the full department tree with CHECKBOXES. Checking a
//                 category selects its entire subtree (cascading). Every
//                 row is identical in design: caret (only when the node has
//                 children) + checkbox + name + product count.
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

const TREE_SCROLL =
  "max-h-[380px] overflow-y-auto pr-1 " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-gold/40 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-gold-deep/60"

/** Flatten a node + all descendants into a list of ids. */
function subtreeIds(node: SidebarCategory): number[] {
  return [node.id, ...node.children.flatMap(subtreeIds)]
}

export function ShopSidebar({
  categories,
  products,
  ratings,
  checked,
  onToggleCategory,
  onClearCategories,
  price,
  onPriceChange,
  children,
}: {
  categories: SidebarCategory[]
  products: SidebarProduct[]
  ratings: Record<string, SidebarRating>
  checked: Set<number>
  onToggleCategory: (node: SidebarCategory) => void
  onClearCategories: () => void
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
      {/* CATEGORIES — the regular checkbox tree */}
      <div>
        <div className="flex items-center justify-between border-b border-gold/20 pb-3">
          <p className={railHeadingCls}>Categories</p>
          {checked.size > 0 && (
            <button
              type="button"
              onClick={onClearCategories}
              className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.14em] text-gold-deep transition-colors hover:text-ink"
            >
              <X size={10} weight="bold" /> CLEAR
            </button>
          )}
        </div>
        <div className={`mt-2.5 space-y-0.5 ${TREE_SCROLL}`}>
          {categories.map((root) => (
            <CategoryNode
              key={root.id}
              node={root}
              depth={0}
              checked={checked}
              onToggle={onToggleCategory}
            />
          ))}
        </div>
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

// ---------------------------------------------------------------------------
// CategoryNode — one row of the tree: caret (only when children exist) +
// checkbox + name + count. Children render indented when expanded.
// ---------------------------------------------------------------------------
function CategoryNode({
  node,
  depth,
  checked,
  onToggle,
}: {
  node: SidebarCategory
  depth: number
  checked: Set<number>
  onToggle: (node: SidebarCategory) => void
}) {
  const [expanded, setExpanded] = useState(depth === 0 && node.productCount > 0)
  const hasChildren = node.children.length > 0
  const ids = useMemo(() => subtreeIds(node), [node])

  const checkedCount = ids.filter((id) => checked.has(id)).length
  const state: "on" | "mixed" | "off" =
    checkedCount === ids.length ? "on" : checkedCount > 0 ? "mixed" : "off"

  const nameCls =
    depth === 0
      ? "flex-1 text-[10px] font-bold tracking-[0.1em] text-ink"
      : depth === 1
        ? "flex-1 text-[10.5px] text-ink-soft"
        : "flex-1 text-[10.5px] text-ink-soft/90"

  return (
    <div>
      <div
        className="flex items-center gap-1.5 rounded-sm py-[5px] pr-1 transition-colors hover:bg-gold/5"
        style={{ paddingLeft: `${depth * 14 + 2}px` }}
      >
        {/* Plus sign — rendered ONLY when the node has children, always in the
            same position and style (consistent across every department).
            Rotates to × when expanded (site-wide disclosure pattern). */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-soft/70 transition-colors hover:text-gold-deep"
          >
            <Plus
              size={11}
              weight="bold"
              className={`transition-transform duration-300 ${expanded ? "rotate-45 text-gold-deep" : ""}`}
            />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}

        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={state === "on"}
            ref={(el) => {
              if (el) el.indeterminate = state === "mixed"
            }}
            onChange={() => onToggle(node)}
            aria-label={`Filter by ${node.name}`}
            className={checkBoxCls}
          />
          <span className={`${nameCls} truncate`}>{depth === 0 ? node.name.toUpperCase() : node.name}</span>
          {node.productCount > 0 && (
            <span className="shrink-0 text-[9.5px] font-bold text-gold-deep/70">{node.productCount}</span>
          )}
        </label>

        {/* Deep levels can jump to the category page */}
        {depth > 0 && (
          <Link href={`/shop/category/${node.slug}`} aria-label={`Browse ${node.name}`} className="shrink-0 text-ink-soft/40 transition-colors hover:text-gold-deep">
            <Plus size={10} weight="bold" />
          </Link>
        )}
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <CategoryNode key={child.id} node={child} depth={depth + 1} checked={checked} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
