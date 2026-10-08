import Link from "next/link"
import { X, ChevronLeft, ChevronRight, PawPrint } from "lucide-react"
import {
  getMerchCollections,
  getFilterSections,
  queryProducts,
  parseSearchParams,
  formatCents,
  type NavCategory,
  type MerchKey,
  type SortKey,
} from "@/lib/shop/catalog"
import { queryTaxProducts, getTaxFacets, getNodeFacetSections, buildNavFromTaxonomyDb, type TaxProduct } from "@/lib/shop/taxonomy-db"
import { buildNavTreeFromTaxonomy } from "@/lib/shop-nav"
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
  // LIVE taxonomy scope — products resolve from the Supabase catalog
  // (products / product_nodes / taxonomy_nodes) instead of the legacy
  // mini-catalog. The sidebar tree is built from the LIVE taxonomy.
  | {
      kind: "taxonomy"
      title: string
      path: string
      nodeIds: string[]
      /** The resolved node itself (subtree root) — facet sections walk UP
       *  the ancestor chain from here (L3 → its L2 → …) per the owner's
       *  node_filters mapping. */
      rootId: string
    }

export async function Plp({
  scope,
  searchParams,
  perPage = 48,
  path,
  categoryFilter,
  fallbackImage,
}: {
  scope: PlpScope
  searchParams: Record<string, string | string[] | undefined>
  /** Page size — 48 per page (4 cols × 12 rows desktop) per owner spec,
   *  with the AA promo banner injected after row 6. "See More" loads the
   *  next page server-side. */
  perPage?: number
  /** The current shop route path (e.g. "/shop", "/shop/cat/food"), used to
   *  resolve page-specific facets from src/lib/shop/facets.ts. */
  path?: string
  /** Category names to filter products by. When provided, only products whose
   *  metadata category matches one of these names will appear in the grid.
   *  This is what makes the bedding page show ONLY bedding products. */
  categoryFilter?: string[]
  /** Category-page image shown on cards whose feed product has no photo —
   *  the category image is duplicated onto the ecommerce grid so nothing
   *  renders an empty placeholder. */
  fallbackImage?: string | null
}) {
  const isTax = scope.kind === "taxonomy"
  const scopeIds =
    scope.kind === "category" ? scope.node.rawIds : scope.kind === "merch" ? null : null

  const currentPath =
    path ||
    (isTax
      ? scope.path
      : scope.kind === "category"
        ? scope.node.path
        : scope.kind === "merch"
          ? `/shop/${scope.merch}`
          : "/shop")

  // Old taxonomy slugs → new canonical slugs (same map as taxonomy-pages.tsx).
  // Inline here so plp.tsx doesn't need a cross-import.
  const DEPT_ALIASES: Record<string, string> = {
    "dog/wellness": "dog/health-wellness",
    "dog/treats": "dog/treats-chews",
    "dog/chew-toys": "dog/toys",
    "dog/feeding-watering": "dog/bowls-feeding",
    "dog/grooming": "dog/grooming-bathing",
    "dog/grooming-essentials": "dog/grooming-bathing",
    "dog/travel": "dog/outdoor-travel-gear",
    "dog/beds-furniture": "dog/beds-bedding",
    "cat/feeding-watering": "cat/bowls-feeders",
    "cat/grooming": "cat/grooming-bathing",
    "cat/health": "cat/health-wellness",
  }

  // Context-aware nav tree — the sidebar's CATEGORIES section shows the
  // CHILDREN of wherever the visitor is (per the owner's pasted-content spec:
  // every page starts with "Categories" = the children of the current node,
  // then the filters below).
  //
  //   /shop            → all animals (Cat, Dog as top-level)
  //   /shop/cat        → cat's departments (Food, Toys, Beds...)
  //   /shop/cat/food   → food's subcategories (Broths, Dry Food, Wet Food...)
  //   /shop/cat/food/dry-cat-food → same subcategories (siblings, current highlighted)
  //
  // For the LIVE taxonomy scope the tree is built from Supabase (cached);
  // the same pathSegments logic below picks the active node.
  const fullTree = (
    isTax ? await buildNavFromTaxonomyDb() : buildNavTreeFromTaxonomy()
  ) as unknown as NavCategory[]
  const pathSegments = currentPath.split("/").filter(Boolean)

  let navTree: NavCategory[]
  let currentNode: NavCategory | null = null
  let ancestors: SidebarData["ancestors"] = []

  if (pathSegments.length <= 1) {
    // /shop → all animals
    navTree = fullTree
  } else {
    const animalSlug = pathSegments[1] // "cat" or "dog"
    const animalNode = fullTree.find(n => n.key === animalSlug)
    if (!animalNode) {
      navTree = fullTree
    } else if (pathSegments.length === 2) {
      // /shop/cat → cat's departments
      navTree = [animalNode]
      currentNode = animalNode
    } else {
      // /shop/cat/food or deeper → find the department, show ONLY its subcategories
      const rawDeptSlug = pathSegments[2]
      const canonicalDeptSlug = DEPT_ALIASES[`${animalSlug}/${rawDeptSlug}`] || rawDeptSlug
      const deptNode = animalNode.children.find(c => c.key === `${animalSlug}/${canonicalDeptSlug}`)
      if (deptNode) {
        navTree = [deptNode]
        currentNode = deptNode
        ancestors = [{ displayName: animalNode.displayName, path: animalNode.path }]
      } else {
        navTree = [animalNode]
        currentNode = animalNode
      }
    }
  }

  const state = parseSearchParams(searchParams)

  let filterSections: SidebarData["filterSections"]
  let merchCollections: Awaited<ReturnType<typeof getMerchCollections>> = []
  let result: { items: Array<Record<string, unknown>>; total: number; page: number; pages: number }
  let gridItems: Array<Record<string, unknown>>

  if (isTax) {
    // ---- LIVE catalog: facets + products straight from Supabase ----
    const [facets, dbSections, taxResult] = await Promise.all([
      getTaxFacets(scope.nodeIds),
      getNodeFacetSections(scope.rootId),
      Promise.resolve(state),
    ])
    filterSections = taxonomyFilterSections(facets, dbSections)
    const tax = await queryTaxProducts({
      nodeIds: scope.nodeIds,
      sort: state.sort,
      page: state.page,
      perPage,
      filters: {
        minPrice: state.filters.minPrice,
        maxPrice: state.filters.maxPrice,
        priceBucket: state.filters.priceBucket ?? null,
        rating: state.filters.rating ?? null,
        availability: state.filters.availability,
        q: state.q,
        brands: state.facets?.brand,
      },
    })
    result = tax
    gridItems = tax.items.map((t) => taxProductToCard(t, fallbackImage)) as unknown as Array<Record<string, unknown>>
  } else {
    const [merch, sections] = await Promise.all([
      getMerchCollections(),
      getFilterSections(scopeIds, currentPath),
    ])
    filterSections = sections
    const legacy = await queryProducts({
      scopeIds,
      merch: scope.kind === "merch" ? scope.merch : null,
      filters: state.filters,
      sort: state.sort,
      page: state.page,
      perPage,
      categoryFilter,
    })
    result = legacy as unknown as { items: Array<Record<string, unknown>>; total: number; page: number; pages: number }
    gridItems = legacy.items as unknown as Array<Record<string, unknown>>
    merchCollections = merch
  }

  // Applied URL state for the rail + chips (kept as display strings).
  // Banner pick comes from THIS page's listings so the CTA always routes
  // to a product the visitor is already shopping.
  const bannerItem = pickBannerItem(gridItems)
  const one = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : null)
  const applied: SidebarData["applied"] = {
    minPrice: one("minPrice") || "",
    maxPrice: one("maxPrice") || "",
    priceBucket: one("priceBucket"),
    rating: one("rating"),
    availability: one("availability")?.split(",").filter(Boolean) || [],
    facets: state.facets || {},
    q: state.q || "",
  }

  const sidebar: SidebarData = {
    categories: navTree,
    merch: merchCollections,
    ancestors,
    current: currentNode,
    currentMerch: scope.kind === "merch" ? scope.merch : null,
    filterSections,
    applied,
  }

  const basePath = currentPath

  // GA4 view_item_list — the server knows the exact rendered list, so it
  // hands the page's items to a null-rendering tracking island.
  const listId = isTax ? `taxonomy-${scope.path}` : scope.kind === "category" ? `category-${scope.node.path}` : scope.kind === "merch" ? `merch-${scope.merch}` : "shop-all"
  const listName = isTax ? scope.title : scope.kind === "category" ? scope.node.displayName : scope.kind === "merch" ? scope.title || scope.merch : "All Products"
  const analyticsItems = gridItems.map((p) => ({
    item_id: String(p.id),
    item_name: String(p.name),
    item_category: (p.category as string | null) ?? undefined,
    price: p.priceCents != null ? Number(p.priceCents) / 100 : undefined,
  }))

  return (
    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
      {/* Desktop rail — sticky. NO outer border + NO internal scrollbar:
          the sidebar is white background that blends into the page. When
          a filter section expands, the PAGE gets longer (the rail pushes
          the page down with it). The owner is explicit: "no scroller
          anywhere — make the page long enough to fit when it expands." */}
      <aside className="hidden w-[280px] shrink-0 self-start lg:sticky lg:top-6 lg:block">
        <div className="bg-white">
          <ShopSidebar key={JSON.stringify(applied)} data={sidebar} />
        </div>
      </aside>

      <div className="min-w-0">
        <TrackViewItemList listId={listId} listName={listName} items={analyticsItems} />
        <PlpToolbar total={result.total} shown={result.items.length} sort={state.sort} sidebar={sidebar} />

        {/* Active filter chips — individually removable, server-rendered */}
        {(applied.priceBucket || applied.minPrice || applied.maxPrice || applied.rating || applied.availability.length > 0 || applied.q || Object.values(applied.facets).some((vs) => vs.length > 0)) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink-soft">Active:</span>
            {applied.q && (
              <FilterChip label={`"${applied.q}"`} params={["q"]} basePath={basePath} searchParams={searchParams} />
            )}
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
            {Object.entries(applied.facets).flatMap(([key, values]) =>
              values.map((v) => (
                <FilterChip
                  key={`${key}-${v}`}
                  label={facetLabel(key, v)}
                  params={[key]}
                  basePath={basePath}
                  searchParams={searchParams}
                  multiValue={v}
                />
              )),
            )}
            <Link
              href={basePath}
              className="ml-1 text-[14px] font-semibold text-[#002B5C] underline decoration-[#F2C500] decoration-2 underline-offset-4"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Product grid — 48/page (4 cols × 12 rows desktop per owner spec).
            The AA promo banner injects after row 6 (24 cards) and routes to
            a product with a GET THIS NOW CTA. */}
        {gridItems.length > 0 ? (
          <>
            <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
              {gridItems.slice(0, BANNER_AFTER).map((p, i) => (
                <ProductCard key={String(p.id)} product={p as never} priority={i < 4 && state.page === 1} />
              ))}
            </div>
            {gridItems.length > BANNER_AFTER && bannerItem != null && (
              <PromoBanner product={bannerItem} />
            )}
            {gridItems.length > BANNER_AFTER && (
              <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {gridItems.slice(BANNER_AFTER).map((p) => (
                  <ProductCard key={String(p.id)} product={p as never} />
                ))}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            basePath={basePath}
            hasFilters={
              result.total === 0 &&
              !!(applied.priceBucket || applied.minPrice || applied.maxPrice || applied.rating || applied.availability.length > 0 || applied.q || Object.values(applied.facets).some((vs) => vs.length > 0))
            }
          />
        )}

        {/* Pagination — 10 per page with a See More control (per spec).
            Server-rendered links; no numbered grid. */}
        {result.pages > 1 && (
          <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-4">
            {result.page > 1 && (
              <PageLink basePath={basePath} searchParams={searchParams} page={result.page - 1} label="Previous page">
                <span className="inline-flex items-center gap-1.5">
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /> Previous
                </span>
              </PageLink>
            )}
            <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-soft uppercase">
              Page {result.page} of {result.pages} — {result.total} products
            </span>
            {result.page < result.pages && (
              <PageLink
                basePath={basePath}
                searchParams={searchParams}
                page={result.page + 1}
                label={`See more products (page ${result.page + 1} of ${result.pages})`}
                primary
              >
                <span className="inline-flex items-center gap-1.5">
                  See More <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
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

/** Map a LIVE-catalog product (taxonomy-db) to the ProductCard contract.
 *  Products without feed media inherit the category-page image. */
function taxProductToCard(p: TaxProduct, fallbackImage?: string | null) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: formatCents(p.priceCents ?? 0),
    priceCents: p.priceCents,
    basePriceCents: p.priceCents,
    compareAtPriceCents: p.compareAtPriceCents,
    image: p.image ?? fallbackImage ?? null,
    alt: p.name,
    category: p.brand,
    isOnSale: p.isOnSale,
    isNew: p.isNew,
    isBestseller: p.isBestseller,
    rating: { avg: p.ratingAvg ?? 0, count: p.ratingCount },
  }
}

/** AA promo banner injects after this many cards — row 6 on the 4-col grid. */
const BANNER_AFTER = 24

/** Pick the banner's featured product from the page's own listings:
 *  best-seller first, then sale item, then anything with an image. */
function pickBannerItem(items: Array<Record<string, unknown>>): Record<string, unknown> | null {
  if (items.length === 0) return null
  const byFlag = (flag: string) => items.find((p) => p[flag] === true)
  return (
    byFlag("isBestseller") ||
    byFlag("isOnSale") ||
    items.find((p) => p.image != null) ||
    items[0]
  )
}

/** Full-width AA promo banner — routes to the featured product's PDP with a
 *  high-contrast GET THIS NOW CTA (owner spec: banner between grid rows). */
function PromoBanner({
  product,
}: {
  product: Record<string, unknown>
}) {
  const href = `/products/${String(product.slug ?? "")}`
  const image = product.image as string | null | undefined
  const price = typeof product.price === "string" ? product.price : null
  const compareAt =
    product.compareAtPriceCents != null && product.priceCents != null && (product.isOnSale as boolean)
      ? `$${((product.compareAtPriceCents as number) / 100).toFixed(2)}`
      : null

  return (
    <section
      aria-label="Featured deal"
      className="mt-10 flex flex-col overflow-hidden border-2 border-[#002B5C] bg-[#002B5C] sm:flex-row sm:items-stretch"
    >
      <div className="relative h-44 w-full shrink-0 bg-[#002B5C]/60 sm:h-auto sm:w-56 lg:w-72">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={String(product.name ?? "Featured product")}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
        <span className="absolute left-4 top-4 bg-[#F2C500] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#002B5C]">
          AA Pick
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start justify-center gap-2 px-6 py-6 sm:px-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#F2C500]">
          {String(product.category ?? "All About Pawz")}
        </p>
        <h2 className="text-[22px] font-extrabold leading-[1.15] text-white lg:text-[26px]">
          {String(product.name ?? "")}
        </h2>
        <p className="flex items-baseline gap-2.5">
          {price && <span className="text-[20px] font-extrabold text-white">{price}</span>}
          {compareAt && <span className="text-[14px] font-semibold text-white/60 line-through">{compareAt}</span>}
        </p>
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-2 bg-[#F2C500] px-6 py-3 text-[14px] font-extrabold uppercase tracking-[0.1em] text-[#002B5C] transition-colors hover:bg-white"
        >
          Get This Now
          <ChevronRight className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

/** Sidebar filter sections: the owner's DB-driven per-node facets FIRST
 *  (node_filters → attributes → node_filter_values — Material, Color,
 *  Flavor, … whatever that node maps to), then the live-computed
 *  Brand / Price / Rating / Availability sections after. */
function taxonomyFilterSections(
  f: Awaited<ReturnType<typeof getTaxFacets>>,
  dbSections: Awaited<ReturnType<typeof getNodeFacetSections>>,
): SidebarData["filterSections"] {
  const sections: SidebarData["filterSections"] = []
  for (const s of dbSections) {
    sections.push({
      kind: "check",
      key: s.key,
      label: s.label,
      options: s.options.map((o) => ({ value: o.value, label: o.label, count: 0 })),
      searchable: s.searchable,
      collapsible: s.collapsible,
      defaultVisible: s.defaultVisible,
    })
  }
  if (f.priceBuckets.length > 0) {
    sections.push({ kind: "price", label: "Price Range", buckets: f.priceBuckets })
  }
  if (f.ratingRows.length > 0) {
    sections.push({ kind: "rating", label: "Rating", rows: f.ratingRows })
  }
  const availability: { value: string; label: string; count: number }[] = []
  if (f.inStock > 0) availability.push({ value: "in-stock", label: "In Stock", count: f.inStock })
  if (f.outStock > 0) availability.push({ value: "out-of-stock", label: "Out of Stock", count: f.outStock })
  if (availability.length > 0) {
    sections.push({ kind: "check", key: "availability", label: "Availability", options: availability, defaultVisible: 99 })
  }
  if (f.brands.length > 0) {
    sections.push({
      kind: "check",
      key: "brand",
      label: "Brand",
      options: f.brands.map((b) => ({ value: b.name, label: b.name, count: b.count })),
      searchable: true,
      collapsible: true,
      defaultVisible: 8,
    })
  }
  return sections
}

function bucketLabel(bucket: string): string {
  if (bucket === "under-10") return "Under $10"
  if (bucket === "10-25") return "$10 to $25"
  if (bucket === "25-50") return "$25 to $50"
  if (bucket === "50-100") return "$50 to $100"
  if (bucket === "over-100") return "Over $100"
  if (bucket === "under-25") return "Under $25"
  if (bucket === "over-50") return "Over $50"
  return bucket
}

/** Look up the customer-facing label for a single selected facet value. */
function facetLabel(facetKey: string, value: string): string {
  // Pull the canonical facet definition from src/lib/shop/facets.ts lazily —
  // this is a server-rendered module so the import cost is at module load.
  // We avoid a static import here to keep the chips rendering tree-shakeable.
  const FACET_LABELS: Record<string, Record<string, string>> = {
    brand: { "all-about-pawz": "All About Pawz", "pawz-signature": "Pawz Signature", "pawz-pro": "Pawz Pro" },
    // For other facets, fall back to a humanized version of the value.
  }
  const map = FACET_LABELS[facetKey]
  if (map && map[value]) return map[value]
  // Humanize "dry-food" → "Dry Food", "extra-small-breed" → "Extra Small Breed"
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** A removable filter chip — link to the same path minus the given params.
 *  When `multiValue` is set, only that specific value is removed from the
 *  comma-separated list (preserving any other values for the same key). */
function FilterChip({
  label,
  params,
  basePath,
  searchParams,
  multiValue,
}: {
  label: string
  params: string[]
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
  /** When set, the chip represents a single value within a multi-value
   *  param (e.g. one brand from ?brand=a,b,c). The chip removes only this
   *  value, not the whole key. */
  multiValue?: string
}) {
  const next = new URLSearchParams()
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v !== "string" || !v) continue
    if (params.includes(k)) {
      if (multiValue) {
        // Remove just this value from the comma-separated list.
        const remaining = v
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && s !== multiValue)
        if (remaining.length > 0) next.set(k, remaining.join(","))
      }
      // Otherwise: drop the whole key.
    } else {
      next.set(k, v)
    }
  }
  const qs = next.toString()
  return (
    <Link
      href={qs ? `${basePath}?${qs}` : basePath}
      className="inline-flex items-center gap-2 border border-ink/15 bg-white px-3 py-1.5 text-[14px] font-semibold text-ink transition-colors hover:border-[#F2C500]"
      aria-label={`Remove filter ${label}`}
    >
      {label}
      <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
    </Link>
  )
}

function PageLink({
  basePath,
  searchParams,
  page,
  label,
  active,
  primary,
  children,
}: {
  basePath: string
  searchParams: Record<string, string | string[] | undefined>
  page: number
  label: string
  active?: boolean
  primary?: boolean
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
      className={`inline-flex h-11 min-h-11 items-center justify-center px-5 text-[14px] font-bold tracking-[0.06em] uppercase transition-colors ${
        primary
          ? "bg-[#002B5C] text-white hover:bg-[#001F44]"
          : active
            ? "bg-[#002B5C] text-white"
            : "border border-ink/15 bg-white text-ink hover:border-[#F2C500]"
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
    <div className="mt-7 flex flex-col items-center border border-ink/10 bg-white-deep/40 px-6 py-14 text-center">
      <PawPrint className="h-8 w-8 text-[#002B5C]/50" strokeWidth={1.2} aria-hidden="true" />
      <p className="mt-4 text-[17px] font-semibold text-ink">
        {hasFilters ? "No products match these filters." : "No products here yet."}
      </p>
      <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-soft">
        {hasFilters
          ? "Try removing a filter or exploring related categories."
          : "New arrivals land regularly — check back soon or browse the collection."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {hasFilters && (
          <Link href={basePath} className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#002B5C] px-5 text-[14px] font-bold tracking-[0.06em] text-white uppercase transition-colors hover:bg-[#001F44]">
            CLEAR ALL FILTERS
          </Link>
        )}
        <Link href="/shop" className={hasFilters ? "btn-ghost min-h-11 text-[14px]" : "inline-flex min-h-11 items-center justify-center rounded-md bg-[#002B5C] px-5 text-[14px] font-bold tracking-[0.06em] text-white uppercase transition-colors hover:bg-[#001F44]"}>
          {hasFilters ? "VIEW ALL PRODUCTS" : "BROWSE THE COLLECTION"}
        </Link>
      </div>
    </div>
  )
}
