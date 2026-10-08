"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SlidersHorizontal } from "lucide-react"
import { ShopSidebar, type SidebarData } from "./shop-sidebar"
import { SORT_OPTIONS, type SortKey } from "@/lib/shop/types"

// ---------------------------------------------------------------------------
// PLP toolbar — product count + sort control + the mobile FILTERS trigger
// that opens the slide-over drawer (spec: mobile replaces the desktop rail
// with sticky Filter/Sort controls; the drawer keeps category navigation,
// selected counts, active state, clear all, and APPLY).
// ---------------------------------------------------------------------------

export function PlpToolbar({
  total,
  shown,
  sort,
  sidebar,
}: {
  total: number
  shown: number
  sort: SortKey
  sidebar: SidebarData
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const appliedCount =
    sidebar.applied.availability.length +
    (sidebar.applied.minPrice.trim() ? 1 : 0) +
    (sidebar.applied.maxPrice.trim() ? 1 : 0) +
    (sidebar.applied.priceBucket ? 1 : 0) +
    (sidebar.applied.rating ? 1 : 0) +
    (sidebar.applied.q.trim() ? 1 : 0) +
    Object.values(sidebar.applied.facets).reduce((s, vs) => s + vs.length, 0)

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [drawerOpen])

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 pb-4">
        {/* Mobile filter trigger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          className="inline-flex min-h-[44px] items-center gap-2 border border-ink/15 bg-white px-4 text-[14px] font-bold tracking-[0.08em] text-ink transition-colors hover:border-[#F2C500] lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
          FILTERS
          {appliedCount > 0 && (
            <span className="flex h-[20px] min-w-[20px] items-center justify-center bg-[#002B5C] px-1 text-[12px] font-bold leading-none text-white">
              {appliedCount}
            </span>
          )}
        </button>

        {/* Product count */}
        <p className="text-[15px] font-semibold text-ink" aria-live="polite">
          {shown === total ? `${total} products` : `${shown} of ${total} products`}
        </p>

        {/* Sort */}
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="plp-sort" className="hidden text-[14px] font-semibold text-ink-soft sm:block">
            Sort by
          </label>
          <select
            id="plp-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="min-h-[44px] cursor-pointer border border-ink/15 bg-white px-3 py-2 text-[15px] font-semibold text-ink focus:border-[#002B5C] focus:outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile slide-over drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div
            className="absolute inset-0 bg-ink/45"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-[340px] flex-col border-r border-ink/10 bg-white-deep/50 shadow-2xl animate-in slide-in-from-left duration-300">
            <ShopSidebar
              key={JSON.stringify(sidebar.applied)}
              data={sidebar}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
