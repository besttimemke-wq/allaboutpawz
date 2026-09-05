"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Plus, Star, X } from "@phosphor-icons/react"
import { parsePriceToCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Shop Sidebar — the ecommerce filter rail, built to the owner's reference
// design ("PAWZ & CO." concept):
//
//   White panel + hairline border on the cream page.
//   SHOP header (X closes the mobile drawer).
//   FILTERS + live count + CLEAR ALL.
//   CATEGORIES  — checkbox tree with counts (cascading, caret + jump link).
//   PRICE RANGE — $ MIN / $ MAX inputs + data-backed quick buckets.
//   RATING      — gold star rows with counts (only when rated products exist).
//   AVAILABILITY— In stock / Backordered (only when products match).
//   APPLY FILTERS — full-width, pinned to the rail's bottom edge. The
//   section list scrolls beneath it; on mobile, applying closes the drawer.
//
//   Filters are STAGED: every interaction updates the draft, APPLY commits
//   via onApply (the grid re-filters on commit only). CLEAR ALL clears the
//   draft AND commits the empty state in one click. The parent's live state
//   re-syncs the draft whenever it changes externally.
//
//   The rail frame is rendered here (border/bg) — the wrappers in
//   shop-client.tsx only position it: sticky + max-height on desktop,
//   slide-over drawer on mobile. Visual language mirrors the
//   /shop/category/[slug] rail (category-browser.tsx) so the two stay one
//   system.
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

export type SidebarFilterState = {
  checked: Set<number>
  price: { min: string; max: string; buckets: string[] }
}

const PRICE_BUCKETS: { key: string; label: string; test: (cents: number) => boolean }[] = [
  { key: "under25", label: "Under $25", test: (c) => c < 2500 },
  { key: "25to50", label: "$25 – $50", test: (c) => c >= 2500 && c <= 5000 },
  { key: "over50", label: "Over $50", test: (c) => c > 5000 },
]

// Shared rail visual language (kept identical in category-browser.tsx so
// the /shop and /shop/category/[slug] rails never drift apart).
const railHeadingCls = "text-[9.5px] font-bold tracking-[0.16em] text-ink uppercase"
const checkRowCls = "flex min-h-[30px] cursor-pointer items-center gap-2.5 py-[3px] text-[11.5px] text-ink-soft transition-colors hover:text-ink"
const checkBoxCls = "h-4 w-4 shrink-0 accent-gold-deep"
const countCls = "text-[9.5px] font-bold text-ink-soft/60"
const numInputCls =
  "w-full min-w-0 min-h-[38px] border border-ink/15 bg-white px-3 py-2.5 text-[11.5px] text-ink placeholder:text-ink-soft/50 " +
  "focus:outline-none focus:ring-1 focus:ring-gold-deep [appearance:textfield] " +
  "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

const RAIL_SCROLL =
  "overflow-y-auto " +
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent " +
  "[&::-webkit-scrollbar-thumb]:bg-gold/40 [&::-webkit-scrollbar-thumb]:rounded-full " +
  "hover:[&::-webkit-scrollbar-thumb]:bg-gold-deep/60"

const TREE_SCROLL = "max-h-[440px] overflow-y-auto pr-1 " + RAIL_SCROLL.slice("overflow-y-auto ".length)

/** Section heading with its live active count ("PRICE (2)"). */
function RailSection({ title, active }: { title: string; active?: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <p className={railHeadingCls}>{title}</p>
      {active ? <span className="text-[9px] font-bold text-gold-deep/80">({active})</span> : null}
    </div>
  )
}

/** Flatten a node + all descendants into a list of ids. */
function subtreeIds(node: SidebarCategory): number[] {
  return [node.id, ...node.children.flatMap(subtreeIds)]
}

export function ShopSidebar({
  categories,
  products,
  ratings,
  checked,
  price,
  onApply,
  onClose,
}: {
  categories: SidebarCategory[]
  products: SidebarProduct[]
  ratings: Record<string, SidebarRating>
  checked: Set<number>
  price: { min: string; max: string; buckets: string[] }
  onApply: (next: SidebarFilterState) => void
  onClose?: () => void
}) {
  // ---- staged filter state (draft) — committed only by APPLY FILTERS ----
  const [draftChecked, setDraftChecked] = useState<Set<number>>(checked)
  const [draftPrice, setDraftPrice] = useState(price)

  // Keep the draft in sync with the parent's applied state — fires after
  // APPLY (same identities → no-op) and after external resets (empty-state
  // CLEAR FILTERS, navigation) so the rail never shows stale checkboxes.
  useEffect(() => {
    setDraftChecked(checked)
  }, [checked])
  useEffect(() => {
    setDraftPrice(price)
  }, [price])

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

  // ---- draft mutations (staged until APPLY) ----
  const toggleCategory = (node: SidebarCategory) => {
    const ids = subtreeIds(node)
    setDraftChecked((prev) => {
      const next = new Set(prev)
      const allOn = ids.every((id) => next.has(id))
      for (const id of ids) {
        if (allOn) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  const toggleBucket = (key: string) =>
    setDraftPrice((prev) => ({
      ...prev,
      buckets: prev.buckets.includes(key)
        ? prev.buckets.filter((k) => k !== key)
        : [...prev.buckets, key],
    }))

  const clearAll = () => {
    const emptyPrice = { min: "", max: "", buckets: [] as string[] }
    setDraftChecked(new Set())
    setDraftPrice(emptyPrice)
    onApply({ checked: new Set(), price: emptyPrice })
  }

  const apply = () => {
    onApply({ checked: draftChecked, price: draftPrice })
    onClose?.()
  }

  // ---- live counts per section (draft-driven — the rail shows what's staged) ----
  const ratingActive = draftPrice.buckets.filter((k) => k.startsWith("rating")).length
  const stockActive = draftPrice.buckets.filter((k) => k === "instock" || k === "backorder").length
  const priceActive =
    draftPrice.buckets.filter((k) => !k.startsWith("rating") && k !== "instock" && k !== "backorder").length +
    (draftPrice.min || draftPrice.max ? 1 : 0)
  const activeCount = draftChecked.size + draftPrice.buckets.length + (draftPrice.min || draftPrice.max ? 1 : 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col border border-ink/10 bg-white" aria-label="Shop filters">
      {/* SHOP header — the rail's title. On mobile it doubles as the drawer
          header with a close affordance; on desktop it anchors the panel. */}
      <div className="flex shrink-0 items-center justify-between border-b border-ink/10 px-5 py-4">
        <p className="text-[10px] font-bold tracking-[0.22em] text-ink">SHOP</p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center text-ink-soft transition-colors hover:text-ink lg:hidden"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>

      {/* Scrollable filter sections — the APPLY button stays pinned below. */}
      <div className={`min-h-0 flex-1 p-5 ${RAIL_SCROLL}`}>
        <div className="space-y-7">
          {/* FILTERS + live count + CLEAR ALL */}
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <div className="flex items-baseline gap-2">
              <p className={railHeadingCls}>Filters</p>
              {activeCount > 0 && (
                <span className="text-[9px] font-bold text-gold-deep/80">({activeCount})</span>
              )}
            </div>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.14em] text-gold-deep transition-colors hover:text-ink"
              >
                <X size={10} weight="bold" /> CLEAR ALL
              </button>
            )}
          </div>

          {/* CATEGORIES — the cascading checkbox tree */}
          <div>
            <div className="flex items-center justify-between">
              <RailSection title="Categories" active={draftChecked.size} />
              {draftChecked.size > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftChecked(new Set())}
                  className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.14em] text-gold-deep/70 transition-colors hover:text-ink"
                >
                  <X size={10} weight="bold" /> CLEAR
                </button>
              )}
            </div>
            <div className={`mt-2 space-y-0.5 ${TREE_SCROLL}`}>
              {categories.map((root) => (
                <CategoryNode
                  key={root.id}
                  node={root}
                  depth={0}
                  checked={draftChecked}
                  onToggle={toggleCategory}
                />
              ))}
            </div>
          </div>

          {/* PRICE RANGE — $ min/max inputs + data-backed quick buckets */}
          <div>
            <RailSection title="Price Range" active={priceActive} />
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={draftPrice.min}
                onChange={(e) => setDraftPrice((p) => ({ ...p, min: e.target.value }))}
                placeholder="$ MIN"
                aria-label="Minimum price"
                className={numInputCls}
              />
              <span className="text-ink-soft/40" aria-hidden="true">—</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={draftPrice.max}
                onChange={(e) => setDraftPrice((p) => ({ ...p, max: e.target.value }))}
                placeholder="$ MAX"
                aria-label="Maximum price"
                className={numInputCls}
              />
            </div>
            {bucketOptions.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {bucketOptions.map((b) => (
                  <label key={b.key} className={checkRowCls}>
                    <input
                      type="checkbox"
                      checked={draftPrice.buckets.includes(b.key)}
                      onChange={() => toggleBucket(b.key)}
                      className={checkBoxCls}
                    />
                    <span className="flex-1">{b.label}</span>
                    <span className={countCls}>({b.count})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* RATING — gold star rows with counts (4★ & up / 3★ & up) */}
          {ratingOptions.length > 0 && (
            <div>
              <RailSection title="Rating" active={ratingActive} />
              <div className="mt-2 space-y-0.5">
                {ratingOptions.map((o) => (
                  <label key={o.value} className={checkRowCls}>
                    <input
                      type="checkbox"
                      checked={draftPrice.buckets.includes(`rating${o.value}`)}
                      onChange={() => toggleBucket(`rating${o.value}`)}
                      className={checkBoxCls}
                    />
                    <span className="flex flex-1 items-center gap-0.5" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          weight={i < o.value ? "fill" : "regular"}
                          className={i < o.value ? "text-gold" : "text-ink/25"}
                        />
                      ))}
                    </span>
                    <span className="sr-only">{`${o.value} stars & up`}</span>
                    <span className={countCls}>({o.count})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* AVAILABILITY — options that actually match products */}
          {(stockCounts.inStock > 0 || stockCounts.backordered > 0) && (
            <div>
              <RailSection title="Availability" active={stockActive} />
              <div className="mt-2 space-y-0.5">
                {stockCounts.inStock > 0 && (
                  <label className={checkRowCls}>
                    <input
                      type="checkbox"
                      checked={draftPrice.buckets.includes("instock")}
                      onChange={() => toggleBucket("instock")}
                      className={checkBoxCls}
                    />
                    <span className="flex-1">In stock</span>
                    <span className={countCls}>({stockCounts.inStock})</span>
                  </label>
                )}
                {stockCounts.backordered > 0 && (
                  <label className={checkRowCls}>
                    <input
                      type="checkbox"
                      checked={draftPrice.buckets.includes("backorder")}
                      onChange={() => toggleBucket("backorder")}
                      className={checkBoxCls}
                    />
                    <span className="flex-1">Backordered</span>
                    <span className={countCls}>({stockCounts.backordered})</span>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* APPLY FILTERS — pinned to the rail's bottom edge; the sections
          scroll above it. Committing also closes the mobile drawer. */}
      <div className="shrink-0 border-t border-ink/10 p-4">
        <button type="button" onClick={apply} className="btn-gold w-full">
          APPLY FILTERS
        </button>
      </div>
    </div>
  )
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
      ? "flex-1 text-[10.5px] font-bold tracking-[0.1em] text-ink"
      : depth === 1
        ? "flex-1 text-[11px] text-ink-soft"
        : "flex-1 text-[11px] text-ink-soft/90"

  return (
    <div>
      <div className="flex items-center gap-1.5 rounded-md py-[7px] pr-1 transition-colors hover:bg-gold/5">
        {/* Plus sign — rendered ONLY when the node has children, always in the
            same position and style (consistent across every department).
            Rotates to × when expanded (site-wide disclosure pattern). */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-ink-soft/70 transition-colors hover:text-gold-deep"
          >
            <Plus
              size={12}
              weight="bold"
              className={`transition-transform duration-300 ${expanded ? "rotate-45 text-gold-deep" : ""}`}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden="true" />
        )}

        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
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
            <span className="shrink-0 text-[9.5px] font-bold text-ink-soft/60">({node.productCount})</span>
          )}
        </label>

        {/* Deep levels can jump to the category page — an arrow (open page),
          deliberately distinct from the Plus expand caret above. */}
        {depth > 0 && (
          <Link
            href={`/shop/category/${node.slug}`}
            aria-label={`Browse ${node.name}`}
            title="Browse this category"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-ink-soft/35 transition-colors hover:text-gold-deep"
          >
            <ArrowUpRight size={11} weight="bold" />
          </Link>
        )}
      </div>

      {/* Children sit on a hairline guide rail under the parent's caret —
          depth reads at a glance without counting indents. */}
      {expanded && hasChildren && (
        <div className="ml-[15px] border-l border-gold/15 pl-[7px]">
          {node.children.map((child) => (
            <CategoryNode key={child.id} node={child} depth={depth + 1} checked={checked} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
