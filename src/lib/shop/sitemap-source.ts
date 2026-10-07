// ---------------------------------------------------------------------------
// Sitemap source — the single source of truth for every URL that goes into
// both /sitemap.xml (machine) and /sitemap (human HTML). One source, two
// renderings — they never drift.
//
// Tier 1 — v_sitemap view: when the Pet Supply Taxonomy SQL has been
//   applied, the database publishes a v_sitemap view that generates URLs
//   from every published taxonomy node, brand page, product, and related-
//   search page, split by animal. We query it directly via pgQuery.
//
// Tier 2 — catalog resolvers (fallback): before the taxonomy SQL is
//   applied, we build entries from the existing catalog resolvers
//   (getNavTree + flattenNav + getProducts + getMerchCollections). This
//   gives shallower coverage (species landings + departments + products)
//   but keeps the sitemap functional.
//
// Tier 3 — static routes: always present regardless of DB state. Core
//   site pages + location pages + policies.
//
// Hygiene rules (per owner spec):
//   • Only 200-status indexable URLs go in — no redirecting URLs, no
//     filter-param URLs (filter state is encoded in query strings, never
//     routes — per the Shop SEO Page Architecture spec).
//   • Location pages (/grooming/[slug]) are money pages — always included.
//   • Regenerates on every publish event (revalidate = 0 in the route
//     handlers; cache breaks on every request so a new taxonomy publish
//     is reflected within the next crawl).
// ---------------------------------------------------------------------------

import { SITE_URL } from "@/lib/site-url"
import { BUSINESS, CITY_LANDINGS, SHELBY_HUB } from "@/lib/business"
import { getNavTree, flattenNav, getProducts, getMerchCollections } from "@/lib/shop/catalog"
import { getResource } from "@/lib/site-data"
import { pgQuery } from "@/lib/pg"

export type SitemapEntry = {
  loc: string           // full URL including https://
  path: string          // path only (for HTML rendering)
  lastModified: Date
  changeFrequency: "weekly" | "monthly" | "yearly" | "daily"
  priority: number      // 0.0 - 1.0
  pageType: string      // "home" | "about" | "shop-landing" | "animal" | "department" | "category" | "brand" | "product" | "related-search" | "location" | "policy" | "static"
  label: string         // human-readable label for HTML sitemap
}

const BASE = SITE_URL

// Static routes — always present. These are the core site pages that don't
// depend on the taxonomy or catalog data layer.
const STATIC_ROUTES: Omit<SitemapEntry, "lastModified">[] = [
  { path: "",            label: "Home",              pageType: "home",          changeFrequency: "weekly",  priority: 1.0 },
  { path: "/about",      label: "About Us",          pageType: "about",         changeFrequency: "monthly", priority: 0.8 },
  { path: "/services",   label: "Services",          pageType: "services",      changeFrequency: "monthly", priority: 0.9 },
  { path: "/process",    label: "Our Process",       pageType: "static",        changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing",    label: "Pricing",            pageType: "static",        changeFrequency: "monthly", priority: 0.9 },
  { path: "/gallery",    label: "Gallery",            pageType: "static",        changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact",    label: "Contact",            pageType: "static",        changeFrequency: "monthly", priority: 0.7 },
  { path: "/faq",        label: "FAQ & Policies",     pageType: "static",        changeFrequency: "monthly", priority: 0.6 },
  { path: "/shop",       label: "Shop Home",          pageType: "shop-landing",  changeFrequency: "weekly",  priority: 0.8 },
  { path: "/book",       label: "Booking Overview",   pageType: "static",        changeFrequency: "monthly", priority: 0.9 },
  { path: "/book/appointment",  label: "Book Appointment",    pageType: "static", changeFrequency: "monthly", priority: 0.9 },
  { path: "/book/consultation", label: "Free Consultation",   pageType: "static", changeFrequency: "monthly", priority: 0.8 },
]

// Location pages — the 5 city landings + Shelby County hub. These are money
// pages for "dog grooming in [city]" — always included, never excluded.
const LOCATION_ROUTES: Omit<SitemapEntry, "lastModified">[] = [
  ...CITY_LANDINGS.map((c) => ({
    path: `/grooming/${c.slug}`,
    label: c.titleShort,
    pageType: "location" as const,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  })),
  {
    path: `/grooming/${SHELBY_HUB.slug}`,
    label: SHELBY_HUB.titleShort,
    pageType: "location",
    changeFrequency: "monthly",
    priority: 0.9,
  },
]

// ---------------------------------------------------------------------------
// Tier 1 — v_sitemap view query. Returns empty if the view doesn't exist
// (taxonomy SQL not yet applied). Never throws — the caller falls back.
// ---------------------------------------------------------------------------
async function tryVSitemap(): Promise<SitemapEntry[]> {
  try {
    const rows = await pgQuery<{ loc: string; lastmod: string | null; page_type: string }>(
      `SELECT loc, lastmod, page_type FROM public.v_sitemap WHERE tenant_id = $1::uuid`,
      [process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"],
    )
    if (!rows || rows.length === 0) return []
    return rows.map((r) => {
      const path = r.loc.replace(BASE, "").replace(/^\/?$/, "")
      return {
        loc: r.loc,
        path: path === "" ? "" : path.startsWith("/") ? path : `/${path}`,
        lastModified: r.lastmod ? new Date(r.lastmod) : new Date(),
        changeFrequency: r.page_type === "product" ? "weekly" : "monthly",
        priority: priorityForPageType(r.page_type),
        pageType: r.page_type,
        label: labelFromPath(path, r.page_type),
      }
    })
  } catch {
    // v_sitemap view doesn't exist yet (taxonomy SQL not applied) or query
    // failed. Fall back to catalog resolvers.
    return []
  }
}

function priorityForPageType(pt: string): number {
  switch (pt) {
    case "shop-landing": return 0.8
    case "animal": return 0.8
    case "department": return 0.7
    case "category": return 0.7
    case "brand": return 0.6
    case "product": return 0.7
    case "related-search": return 0.5
    default: return 0.5
  }
}

function labelFromPath(path: string, pageType: string): string {
  if (!path) return "Shop Home"
  const parts = path.split("/").filter(Boolean)
  const last = parts[parts.length - 1] || "Shop"
  const formatted = last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
  if (pageType === "brand") return `${formatted} (Brand)`
  if (pageType === "product") return formatted
  return formatted
}

// ---------------------------------------------------------------------------
// Tier 2 — catalog resolvers fallback. Builds entries from the existing
// catalog.ts resolvers (getNavTree + flattenNav + getProducts +
// getMerchCollections). Shallower coverage than v_sitemap but functional.
// ---------------------------------------------------------------------------
async function fallbackCatalogEntries(): Promise<SitemapEntry[]> {
  const now = new Date()
  const entries: SitemapEntry[] = []

  try {
    const tree = await getNavTree()
    for (const node of flattenNav(tree)) {
      // Include species landings (level 0) + departments (level 1) + any
      // node with products. Deeper levels (subcategories, leaf categories)
      // are included when v_sitemap exists (Tier 1).
      if (node.level <= 2 || node.count > 0) {
        entries.push({
          loc: `${BASE}${node.path}`,
          path: node.path,
          lastModified: now,
          changeFrequency: "weekly",
          priority: node.level === 0 ? 0.8 : node.level === 1 ? 0.7 : 0.6,
          pageType: node.level === 0 ? "animal" : node.level === 1 ? "department" : "category",
          label: node.displayName,
        })
      }
    }
  } catch {
    // Catalog unavailable — static routes still stand.
  }

  try {
    for (const m of await getMerchCollections()) {
      entries.push({
        loc: `${BASE}${m.path}`,
        path: m.path,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
        pageType: "category",
        label: m.displayName,
      })
    }
  } catch {
    // Merch collections unavailable.
  }

  try {
    for (const p of await getProducts()) {
      entries.push({
        loc: `${BASE}/products/${p.slug}`,
        path: `/products/${p.slug}`,
        lastModified: p.createdAt ? new Date(p.createdAt) : now,
        changeFrequency: "weekly",
        priority: 0.7,
        pageType: "product",
        label: p.name,
      })
    }
  } catch {
    // Products unavailable.
  }

  return entries
}

// ---------------------------------------------------------------------------
// Tier 3 — policies. Resolved from the data layer with a static fallback.
// ---------------------------------------------------------------------------
async function policyEntries(): Promise<SitemapEntry[]> {
  const now = new Date()
  const fallback: [string, string][] = [
    ["Privacy Policy", "/policies/privacy-policy"],
    ["Terms of Service", "/policies/terms-of-service"],
    ["Cancellations", "/policies/cancellations"],
    ["Late Arrivals", "/policies/late-arrivals"],
    ["Vaccinations", "/policies/vaccinations"],
    ["Matted Coats", "/policies/matted-coats"],
    ["Refunds & Returns", "/policies/refunds-returns"],
    ["Shipping & Delivery", "/policies/shipping-delivery"],
  ]
  try {
    const policies = (await getResource<{ id: string; title: string }>("policies")) || []
    const seen = new Set<string>()
    const resolved: SitemapEntry[] = []
    for (const p of policies) {
      const slug = p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      resolved.push({
        loc: `${BASE}/policies/${slug}`,
        path: `/policies/${slug}`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.3,
        pageType: "policy",
        label: p.title,
      })
    }
    if (resolved.length > 0) return resolved
  } catch {
    // Policies unavailable — fallback stands.
  }
  return fallback.map(([label, path]) => ({
    loc: `${BASE}${path}`,
    path,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.3,
    pageType: "policy",
    label,
  }))
}

// ---------------------------------------------------------------------------
// buildSitemap — the single entry point both /sitemap.xml and /sitemap
// call. Returns the full URL set with no duplicates, sorted by priority
// descending then by path. Excludes filter-param URLs (none are generated
// here — filter state is query-string only, never a route) and any URL
// that's known to redirect (the 5 redirecting URLs from GSC will be
// excluded here once identified in Phase 2).
// ---------------------------------------------------------------------------

// URLs known to redirect (Phase 2 will populate this). For now, empty —
// the redirect audit hasn't run yet.
const KNOWN_REDIRECT_PATHS = new Set<string>([
  // Phase 2 will add the 5 redirecting URLs here.
])

export async function buildSitemap(): Promise<SitemapEntry[]> {
  const now = new Date()

  // Tier 1: try v_sitemap view (when taxonomy SQL is applied).
  const vSitemap = await tryVSitemap()

  // Tier 2: fallback to catalog resolvers if v_sitemap is empty.
  const catalogEntries = vSitemap.length > 0 ? [] : await fallbackCatalogEntries()

  // Tier 3: static + location + policies (always present).
  const staticEntries: SitemapEntry[] = STATIC_ROUTES.map((r) => ({
    ...r,
    loc: `${BASE}${r.path}`,
    lastModified: now,
  }))
  const locationEntries: SitemapEntry[] = LOCATION_ROUTES.map((r) => ({
    ...r,
    loc: `${BASE}${r.path}`,
    lastModified: now,
  }))
  const policyEntriesResolved = await policyEntries()

  // Merge + dedupe by path + exclude known redirects.
  const all = [...staticEntries, ...locationEntries, ...vSitemap, ...catalogEntries, ...policyEntriesResolved]
  const seen = new Set<string>()
  const deduped = all
    .filter((e) => {
      if (KNOWN_REDIRECT_PATHS.has(e.path)) return false
      if (seen.has(e.path)) return false
      seen.add(e.path)
      return true
    })
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority
      return a.path.localeCompare(b.path)
    })

  return deduped
}

// Convenience — for the HTML sitemap page, group entries by section.
export async function buildSitemapSections() {
  const entries = await buildSitemap()
  return {
    salon: entries.filter((e) =>
      ["home", "about", "services", "static"].includes(e.pageType) &&
      !e.path.startsWith("/book") &&
      !e.path.startsWith("/shop") &&
      !e.path.startsWith("/grooming") &&
      !e.path.startsWith("/policies")
    ),
    booking: entries.filter((e) => e.path.startsWith("/book")),
    boutique: entries.filter((e) =>
      e.path.startsWith("/shop") || ["shop-landing", "animal", "department", "category", "brand", "related-search"].includes(e.pageType)
    ),
    products: entries.filter((e) => e.pageType === "product"),
    serving: entries.filter((e) => e.pageType === "location"),
    policies: entries.filter((e) => e.pageType === "policy"),
    total: entries.length,
  }
}
