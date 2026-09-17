import Link from "next/link"
import { X, ChevronLeft, ChevronRight, PawPrint } from "lucide-react"
import {
  getNavTree,
  getMerchCollections,
  getFilterSections,
  queryProducts,
  parseSearchParams,
  type NavCategory,
  type MerchKey,
  type SortKey,
} from "@/lib/shop/catalog"
import { ShopSidebar, type SidebarData } from "./shop-sidebar"
import { PlpToolbar } from "./plp-toolbar"
import { ProductCard } from "./product-card"
import { TrackViewItemList } from "../islands/track-view"

// ---------------------------------------------------------------------------
// Plp — the shared server-rendered Product Listing Page section used by
// /shop (all products), the primary-category template, the focused
// subcategory template, and the merchandising collections. One component,
// three page templates — no per-page duplicates.
//
//   [ sticky sidebar rail ]   [ count + sort ]
//   CATEGORIES (nav)          [ active chips ]
//   FILTERS  (checkboxes)     [ product grid ]
//                             [ pagination ]
// ---------------------------------------------------------------------------

export type PlpScope =
  | { kind: "all" }
  | { kind: "category"; node: NavCategory }
  | { kind: "merch"; merch: MerchKey; title: string; blurb: string }

export async function Plp({
  scope,
  searchParams,
  perPage = 12,
}: {
  scope: PlpScope
  searchParams: Record<string, string | string[] | undefined>
  perPage?: number
}) {
  const scopeIds =
    scope.kind === "category" ? scope.node.rawIds : scope.kind === "merch" ? null : null

  const [navTree, merch, filterSections, state] = await Promise.all([
    getNavTree(),
    getMerchCollections(),
    getFilterSections(scopeIds),
    Promise.resolve(parseSearchParams(searchParams)),
  ])

  const result = await queryProducts({
    scopeIds,
    merch: scope.kind === "merch" ? scope.merch : null,
    filters: state.filters,
    sort: state.sort,
    page: state.page,
    perPage,
  })

  // Applied URL state for the rail + chips (kept as display strings).
  const one = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : null)
  const applied: SidebarData["applied"] = {
    minPrice: one("minPrice") || "",
    maxPrice: one("maxPrice") || "",
    priceBucket: one("priceBucket"),
    rating: one("rating"),
    availability: one("availability")?.split(",").filter(Boolean) || [],
  }

  const sidebar: SidebarData = {
    categories: navTree,
    merch,
    current: scope.kind === "category" ? scope.node : null,
    currentMerch: scope.kind === "merch" ? scope.merch : null,
    filterSections,
    applied,
  }

  const basePath = scope.kind === "category" ? scope.node.path : scope.kind === "merch" ? `/shop/${scope.merch}` : "/shop"

  // GA4 view_item_list — the server knows the exact rendered list, so it
  // hands the page's items to a null-rendering tracking island.
  const listId = scope.kind === "category" ? `category-${scope.node.path}` : scope.kind === "merch" ? `merch-${scope.merch}` : "shop-all"
  const listName = scope.kind === "category" ? scope.node.displayName : scope.kind === "merch" ? scope.title || scope.merch : "All Products"
  const analyticsItems = result.items.map((p) => ({
    item_id: p.id,
    item_name: p.name,
    item_category: p.category ?? undefined,
    price: p.priceCents != null ? p.priceCents / 100 : undefined,
  }))

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
      {/* Desktop rail — sticky; categories navigate, filters refine */}
      <aside className="hidden w-[240px] shrink-0 self-start border border-ink/10 bg-white lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)]">
        <div className="flex max-h-[calc(100vh-3rem)] flex-col">
          <ShopSidebar key={JSON.stringify(applied)} data={sidebar} />
        </div>
      </aside>

      <div className="min-w-0">
        <TrackViewItemList listId={listId} listName={listName} items={analyticsItems} />
        <PlpToolbar total={result.total} shown={result.items.length} sort={state.sort} sidebar={sidebar} />

        {/* Active filter chips — individually removable, server-rendered */}
        {(applied.priceBucket || applied.minPrice || applied.maxPrice || applied.rating || applied.availability.length > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-bold tracking-[0.14em] text-ink-soft">ACTIVE:</span>
            {applied.priceBucket && (
              <FilterChip label={bucketLabel(applied.priceBucket)} params={["priceBucket"]} basePath={basePath} searchParams={searchParams} />
            )}
            {!applied.priceBucket && (applied.minPrice || applied.maxPrice) && (
              <FilterChip
                label={`$${applied.minPrice || "0"} – ${applied.maxPrice || "∞"}`}
                params={["minPrice", "maxPrice"]}
                basePath={basePath}
                searchParams={searchParams}
              />
            )}
            {applied.rating && (
              <FilterChip label={`${applied.rating}★ & up`} params={["rating"]} basePath={basePath} searchParams={searchParams} />
            )}
            {applied.availability.map((a) => (
              <FilterChip
                key={a}
                label={a === "in-stock" ? "In Stock" : "Out of Stock"}
                params={["availability"]}
                basePath={basePath}
                searchParams={searchParams}
              />
            ))}
            <Link
              href={basePath}
              className="ml-1 text-[9px] font-bold tracking-[0.1em] text-gold-deep uppercase underline-offset-2 hover:underline"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Product grid */}
        {result.items.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4 && state.page === 1} />
            ))}
          </div>
        ) : (
          <EmptyState
            basePath={basePath}
            hasFilters={
              result.total === 0 &&
              !!(applied.priceBucket || applied.minPrice || applied.maxPrice || applied.rating || applied.availability.length > 0)
            }
          />
        )}

        {/* Pagination */}
        {result.pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
            {result.page > 1 && (
              <PageLink basePath={basePath} searchParams={searchParams} page={result.page - 1} label="Previous page">
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              </PageLink>
            )}
            {Array.from({ length: result.pages }).map((_, i) => (
              <PageLink
                key={i + 1}
                basePath={basePath}
                searchParams={searchParams}
                page={i + 1}
                label={`Page ${i + 1}`}
                active={result.page === i + 1}
              >
                {i + 1}
              </PageLink>
            ))}
            {result.page < result.pages && (
              <PageLink basePath={basePath} searchParams={searchParams} page={result.page + 1} label="Next page">
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              </PageLink>
            )}
          </nav>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function bucketLabel(bucket: string): string {
  if (bucket === "under-25") return "Under $25"
  if (bucket === "25-50") return "$25 to $50"
  if (bucket === "over-50") return "Over $50"
  return bucket
}

/** A removable filter chip — link to the same path minus the given params. */
function FilterChip({
  label,
  params,
  basePath,
  searchParams,
}: {
  label: string
  params: string[]
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
}) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string" && v && !params.includes(k)) next.set(k, v)
  }
  const qs = next.toString()
  return (
    <Link
      href={qs ? `${basePath}?${qs}` : basePath}
      className="inline-flex items-center gap-1.5 border border-ink/15 bg-white px-2.5 py-1 text-[10px] font-semibold text-ink transition-colors hover:border-gold-deep hover:text-gold-deep"
      aria-label={`Remove filter ${label}`}
    >
      {label}
      <X className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
    </Link>
  )
}

function PageLink({
  basePath,
  searchParams,
  page,
  label,
  active,
  children,
}: {
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
  page: number
  label: string
  active?: boolean
  children: React.ReactNode
}) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string" && v && k !== "page") next.set(k, v)
  }
  if (page > 1) next.set("page", String(page))
  const qs = next.toString()
  return (
    <Link
      href={qs ? `${basePath}?${qs}` : basePath}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 min-w-8 items-center justify-center px-2 text-[11px] font-bold transition-colors ${
        active
          ? "bg-gold-deep text-cream"
          : "border border-ink/15 bg-white text-ink hover:border-gold-deep hover:text-gold-deep"
      }`}
    >
      {children}
    </Link>
  )
}

function EmptyState({
  basePath,
  hasFilters,
}: {
  basePath: string
  hasFilters: boolean
}) {
  return (
    <div className="mt-7 flex flex-col items-center border border-ink/10 bg-white px-6 py-14 text-center">
      <PawPrint className="h-8 w-8 text-gold/50" strokeWidth={1.2} aria-hidden="true" />
      <p className="mt-4 text-[13px] font-semibold text-ink">
        {hasFilters ? "No products match these filters." : "No products here yet."}
      </p>
      <p className="mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-ink-soft">
        {hasFilters
          ? "Try removing a filter or exploring related categories."
          : "New arrivals land regularly — check back soon or browse the collection."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {hasFilters && (
          <Link href={basePath} className="btn-gold text-[9px]">
            CLEAR ALL FILTERS
          </Link>
        )}
        <Link href="/shop" className={hasFilters ? "btn-ghost text-[9px]" : "btn-gold text-[9px]"}>
          {hasFilters ? "VIEW ALL PRODUCTS" : "BROWSE THE COLLECTION"}
        </Link>
      </div>
    </div>
  )
}
