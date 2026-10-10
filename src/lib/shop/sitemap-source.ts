// ---------------------------------------------------------------------------
// Sitemap source — the single source of truth for every URL that goes into
// both /sitemap.xml (machine) and /sitemap (human HTML). One source, two
// renderings — they never drift.
//
// Tier 1 — v_sitemap view: when the Pet Supply Taxonomy SQL has been
//   applied AND the taxonomy pages have real content (products + copy),
//   the v_sitemap view generates URLs from every published taxonomy node,
//   brand page, product, and related-search page. GATED by
//   TAXONOMY_SITEMAP_ENABLED — stays false until Wave 1 pages pass §11a
//   (real products + unique copy). This keeps the sitemap honest — no
//   empty taxonomy URLs until the pages render real content.
//
// Tier 2 — catalog resolvers (fallback): the existing catalog resolvers
//   (getNavTree + flattenNav + getProducts + getMerchCollections). This
//   is what runs today — the old pet_product_categories + commerce_products
//   tables. Gives ~46 honest URLs.
//
// Tier 3 — static routes: always present. Core site pages + location
//   pages + policies.
//
// Hygiene rules (per owner spec):
//   • Only 200-status indexable URLs go in — no redirecting URLs, no
//     filter-param URLs, no test products, no duplicates.
//   • Location pages (/grooming/[slug]) are money pages — always included.
//   • TAXONOMY_SITEMAP_ENABLED gates Tier 1 — flip to true per-wave when
//     pages are ready. Default false = honest ~46-URL sitemap.
// ---------------------------------------------------------------------------

import { SITE_URL } from "@/lib/site-url"
import { BUSINESS, CITY_LANDINGS, SHELBY_HUB } from "@/lib/business"
import { getNavTree, flattenNav, getProducts, getMerchCollections } from "@/lib/shop/catalog"
import { getResource } from "@/lib/site-data"
import { pgQuery } from "@/lib/pg"
import { SHOP_NAV_TAXONOMY, departmentPath, subcategoryPath } from "@/lib/shop-nav"
import { getAllSlugs, getGuideDataBySlug, getProductCategoryPaths } from "@/lib/pawzsly-u/taxonomy-data"
import { SHOP_SEO_COPY } from "@/lib/shop/seo-copy"
import { flattenTaxonomyDb } from "@/lib/shop/taxonomy-db"

// GATE: Tier 1 (v_sitemap) is disabled until Wave 1 pages have real content.
// Flip to true per-wave when pages pass §11a (products + unique copy).
// Default false = sitemap stays at ~46 honest URLs (old catalog + static +
// location + policies), no empty taxonomy URLs.
const TAXONOMY_SITEMAP_ENABLED = false

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

// A hand-written route: everything except what buildSitemap() derives.
type RouteDef = Omit<SitemapEntry, "loc" | "lastModified">
// Static routes — always present. These are the core site pages that don't
// depend on the taxonomy or catalog data layer.
const STATIC_ROUTES: RouteDef[] = [
  // Core site pages
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
  // Seller program — the only seller URL that is a public page.
  { path: "/seller",     label: "Seller Program",     pageType: "seller",        changeFrequency: "monthly", priority: 0.5 },
]

// Learning Academy routes
const LEARN_ROUTES: RouteDef[] = [
  { path: "/learn",                          label: "Learning Academy",              pageType: "learn",     changeFrequency: "monthly", priority: 0.7 },
  { path: "/learn/courses",                  label: "Course Catalog",                pageType: "learn",     changeFrequency: "weekly",  priority: 0.7 },
  { path: "/learn/enroll",                   label: "Enroll",                        pageType: "learn",     changeFrequency: "monthly", priority: 0.6 },
  // Individual courses (15 from footer)
  { path: "/learn/courses/animal-behavior-technician",         label: "Animal Behavior Technician",         pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/animal-care-assistant",              label: "Animal Care Assistant",             pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/equine-nursing-technicians",         label: "Equine Nursing Technicians",        pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/felines-and-health",                 label: "Felines & Health",                   pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/pet-grooming",                       label: "Pet Grooming",                      pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/grooming-salon-practice-management", label: "Grooming Salon Practice Management", pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/professional-trainer",              label: "Professional Trainer",              pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/pre-veterinary-medicine",            label: "Pre-Veterinary Medicine",            pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/veterinary-assistant",               label: "Veterinary Assistant",              pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/veterinary-practice-management",     label: "Veterinary Practice Management",     pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/veterinary-pathology-technician",    label: "Veterinary Pathology Technician",    pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/veterinary-surgical-technician",    label: "Veterinary Surgical Technician",    pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/veterinary-technician",             label: "Veterinary Technician",             pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/veterinary-technology",             label: "Veterinary Technology",              pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/zookeeper-assistant",               label: "Zookeeper Assistant",               pageType: "course", changeFrequency: "monthly", priority: 0.6 },
  { path: "/learn/courses/positive-dog-training",             label: "Positive Dog Training",              pageType: "course", changeFrequency: "monthly", priority: 0.6 },
]

// Special Occasions collections (/shop/collections/*)
const COLLECTION_ROUTES: RouteDef[] = [
  { path: "/shop/collections/my-human-favorites",            label: "$10 & Under My Human Favorites",  pageType: "collection", changeFrequency: "weekly", priority: 0.5 },
  { path: "/shop/collections/back-to-school",                 label: "Back to School",                   pageType: "collection", changeFrequency: "weekly", priority: 0.5 },
  { path: "/shop/collections/better-for-your-dog",            label: "Better for Your Dog",             pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/birthday",                       label: "Birthday",                        pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/birthday/pet-birthday-cakes-treats",       label: "Pet Birthday Cakes & Treats",     pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/birthday/pet-birthday-hats-outfits",       label: "Pet Birthday Hats & Outfits",     pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/birthday/pet-birthday-party-supplies-gifts", label: "Pet Birthday Party Supplies & Gifts", pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/birthday/pet-birthday-toys",     label: "Pet Birthday Toys",                pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/easter",                         label: "Easter",                          pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/easter/cat-easter",              label: "Cat Easter",                      pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/easter/dog-easter",              label: "Dog Easter",                      pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/exclusively-by-all-about-pawz",  label: "Exclusively by All About Pawz",  pageType: "collection", changeFrequency: "monthly", priority: 0.5 },
  { path: "/shop/collections/fall",                           label: "Fall",                            pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fall/cozy-beds-furniture-more",  label: "Cozy Beds, Furniture & More",     pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fall/fall-flavors",              label: "Fall Flavors",                    pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fall/fall-pet-apparel",          label: "Fall Pet Apparel",                pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fall/travel-essentials",        label: "Travel Essentials",               pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/family-game-night",              label: "Family Game Night",               pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fathers-day",                   label: "Father's Day",                    pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fourth-of-july",                 label: "Fourth of July",                  pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/fourth-of-july/calming-supplements",  label: "Calming Supplements",       pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/fourth-of-july/clothes-accessories",  label: "Clothes & Accessories",     pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/fourth-of-july/collars-leashes-harnesses", label: "Collars, Leashes & Harnesses", pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/fourth-of-july/food-treats",     label: "Food & Treats",                   pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/fourth-of-july/toys",            label: "Toys",                            pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/fresh-finds-under-20",          label: "Fresh Finds Under $20",          pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/get-outside",                    label: "Get Outside",                     pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/low-prices-everyday-essentials", label: "Low Prices Everyday Essentials", pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/mothers-day",                    label: "Mother's Day",                    pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/new-pet-essentials",             label: "New Pet Essentials",              pageType: "collection", changeFrequency: "monthly", priority: 0.5 },
  { path: "/shop/collections/new",                            label: "New",                             pageType: "collection", changeFrequency: "weekly",  priority: 0.6 },
  { path: "/shop/collections/new/new-for-cats",               label: "New for Cats",                   pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/new/new-for-dogs",               label: "New for Dogs",                    pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/new/new-for-pet-parents",        label: "New for Pet Parents",              pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/all-about-pawz-picks",          label: "All About Pawz Picks",           pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/pride-for-pets",                 label: "Pride for Pets",                  pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/pride-for-pets/dog-pride",       label: "Dog Pride",                      pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/spring",                          label: "Spring",                          pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/spring/spring-cleaning",         label: "Spring Cleaning",                pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/spring/spring-fashion",          label: "Spring Fashion",                  pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/spring/spring-travel",           label: "Spring Travel",                   pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/st-patricks-day",                label: "St. Patrick's Day",              pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/st-patricks-day/st-patricks-day-cat",     label: "St. Patrick's Day Cat",  pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/st-patricks-day/st-patricks-day-my-human", label: "St. Patrick's Day My Human", pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/summer-adventures",              label: "Summer Adventures",              pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/summer-adventures/hydrating-food-treats",      label: "Hydrating Food & Treats", pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/summer-adventures/summer-clothing-accessories", label: "Summer Clothing & Accessories", pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/summer-adventures/summer-toys",  label: "Summer Toys",                    pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/summer-bbq",                     label: "Summer BBQ",                     pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/trending-now",                   label: "Trending Now",                   pageType: "collection", changeFrequency: "weekly",  priority: 0.5 },
  { path: "/shop/collections/valentines-day",                 label: "Valentine's Day",                pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/valentines-day/my-human-valentines-day", label: "My Human Valentine's Day", pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/winter",                         label: "Winter",                         pageType: "collection", changeFrequency: "monthly", priority: 0.4 },
  { path: "/shop/collections/winter/winter-toys-treats",      label: "Winter Toys & Treats",           pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/shop/collections/winter/winter-weather-essentials", label: "Winter Weather Essentials",     pageType: "collection", changeFrequency: "monthly", priority: 0.3 },
]

// Location pages — the 5 city landings + Shelby County hub. These are money
// pages for "dog grooming in [city]" — always included, never excluded.
const LOCATION_ROUTES: RouteDef[] = [
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
// Taxonomy routes — generated from SHOP_NAV_TAXONOMY in shop-nav.ts.
// All routes now return 200 (wired in /shop/[...slug]/page.tsx via
// resolveTaxonomyPage). These are the animal landings, departments,
// and subcategories from the full cat/dog taxonomy tree.
// ---------------------------------------------------------------------------
const TAXONOMY_ROUTES: RouteDef[] = []
for (const animal of SHOP_NAV_TAXONOMY) {
  // Animal landing: /shop/dog, /shop/cat
  TAXONOMY_ROUTES.push({
    path: `/shop/${animal.slug}`,
    label: animal.name,
    pageType: "animal",
    changeFrequency: "weekly",
    priority: 0.8,
  })
  for (const dept of animal.departments) {
    // Department: /shop/dog/food, /shop/cat/beds-bedding
    TAXONOMY_ROUTES.push({
      path: departmentPath(animal.slug, dept.slug),
      label: dept.name,
      pageType: "department",
      changeFrequency: "weekly",
      priority: 0.7,
    })
    for (const sub of dept.subcategories) {
      // Subcategory: /shop/cat/beds-bedding/bolster-cat-beds
      TAXONOMY_ROUTES.push({
        path: subcategoryPath(animal.slug, dept.slug, sub.slug),
        label: sub.name,
        pageType: "subcategory",
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Tier 1 — v_sitemap view query. Returns empty if the view doesn't exist
// (taxonomy SQL not yet applied). Never throws — the caller falls back.
// ---------------------------------------------------------------------------
async function tryVSitemap(): Promise<SitemapEntry[]> {
  // GATE: Tier 1 is disabled until Wave 1 pages have real content.
  // When false, returns empty → buildSitemap() falls back to Tier 2
  // (old catalog resolvers) → sitemap stays honest at ~46 URLs.
  if (!TAXONOMY_SITEMAP_ENABLED) return []
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
// catalog resolvers (getNavTree + flattenNav + getMerchCollections) plus the
// ENTERPRISE product slugs. Shallower coverage than v_sitemap but functional.
// ---------------------------------------------------------------------------
/**
 * Enterprise product slugs — the sitemap needs only slugs + dates, NEVER the
 * full catalog object graph. (listCatalogProducts with its per-item media
 * LATERAL aggregation timed out build workers once the enterprise tables
 * filled with the 12.8k feed items.)
 */
async function getEnterpriseProductSlugs(): Promise<{ slug: string; name: string; created_at: string | null }[]> {
  const tenant = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"
  return pgQuery<{ slug: string; name: string; created_at: string | null }>(
    `SELECT ci.metadata->>'slug' AS slug, ci.name, ci.created_at
       FROM commerce_catalog_items ci
      WHERE ci.tenant_id = $1::uuid
        AND ci.active = true AND ci.ecommerce_enabled = true AND ci.sellable = true
        AND COALESCE(ci.metadata->>'slug','') <> ''
      ORDER BY ci.created_at DESC NULLS LAST`,
    [tenant],
  )
}

async function fallbackCatalogEntries(includeProducts: boolean): Promise<SitemapEntry[]> {
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
    for (const p of includeProducts ? await getEnterpriseProductSlugs() : []) {
      entries.push({
        loc: `${BASE}/products/${p.slug}`,
        path: `/products/${p.slug}`,
        lastModified: p.created_at ? new Date(p.created_at) : now,
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
// Category pages from the live taxonomy (animal → department → subcategory).
// Empty categories are skipped so the sitemap never lists a "no products" page.
// ---------------------------------------------------------------------------
async function dbCategoryEntries(now: Date): Promise<SitemapEntry[]> {
  try {
    const nodes = await flattenTaxonomyDb()
    return nodes
      .filter((n) => n.count > 0)
      .map((n) => {
        const depth = n.path.split("/").filter(Boolean).length
        return {
          loc: `${BASE}${n.path}`,
          path: n.path,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: depth === 2 ? 0.8 : depth === 3 ? 0.7 : 0.6,
          pageType: depth === 2 ? "animal" : depth === 3 ? "department" : "subcategory",
          label: n.name,
        }
      })
  } catch {
    return []
  }
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

export async function buildSitemap(
  opts: { includeProducts?: boolean } = {},
): Promise<SitemapEntry[]> {
  const { includeProducts = true } = opts
  const now = new Date()

  // Tier 1: try v_sitemap view (when taxonomy SQL is applied).
  const vSitemap = await tryVSitemap()

  // Tier 2: fallback to catalog resolvers if v_sitemap is empty.
  const catalogEntries = vSitemap.length > 0 ? [] : await fallbackCatalogEntries(includeProducts)

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
  // Taxonomy entries — all animal landings, departments, and subcategories
  // from SHOP_NAV_TAXONOMY. All routes now return 200 (wired in the
  // /shop/[...slug] catch-all via resolveTaxonomyPage).
  const taxonomyEntries: SitemapEntry[] = TAXONOMY_ROUTES.map((r) => ({
    ...r,
    loc: `${BASE}${r.path}`,
    lastModified: now,
  }))
  const policyEntriesResolved = await policyEntries()

  // Merge + dedupe by path + exclude known redirects.
  // Convert all route arrays to full SitemapEntry with loc + lastModified
  const learnEntries: SitemapEntry[] = LEARN_ROUTES.map((r) => ({ ...r, loc: `${BASE}${r.path}`, lastModified: now }))
  // Collections: the hand-curated list plus every collection in the SEO copy.
  const collectionEntries: SitemapEntry[] = [
    ...COLLECTION_ROUTES,
    ...SHOP_SEO_COPY.filter((b) => b.type === "collection").map<RouteDef>((b) => ({
      path: b.path,
      label: b.h1,
      pageType: "collection",
      changeFrequency: "monthly",
      priority: 0.4,
    })),
  ].map((r) => ({ ...r, loc: `${BASE}${r.path}`, lastModified: now }))
  // Category pages — parents and children straight from the live taxonomy.
  const categoryEntries = await dbCategoryEntries(now)
  // Pawzsly U — the imported education library is the canonical guide surface:
  // every guide slug plus every product-category path.
  const guideEntries: SitemapEntry[] = [
    ...getAllSlugs().map((slug) => ({ slug, segments: [slug] })),
    ...getProductCategoryPaths().map((p) => {
      const segments = p.split("/").filter(Boolean)
      return { slug: segments[segments.length - 1], segments }
    }),
  ].map(({ slug, segments }) => {
    const path = `/pawzsly-u/memphis/${segments.join("/")}`
    return {
      loc: `${BASE}${path}`,
      path,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      pageType: "guide",
      label: getGuideDataBySlug(slug, segments).heroTitle,
    }
  })

  // Merge + dedupe by path + exclude known redirects.
  const all = [...staticEntries, ...locationEntries, ...taxonomyEntries, ...categoryEntries, ...learnEntries, ...collectionEntries, ...guideEntries, ...vSitemap, ...catalogEntries, ...policyEntriesResolved]
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
// Product URLs are skipped by default: a human page doesn't list 12.8k items.
export async function buildSitemapSections() {
  const entries = await buildSitemap({ includeProducts: false })
  return {
    salon: entries.filter((e) =>
      ["home", "about", "services", "static"].includes(e.pageType) &&
      !e.path.startsWith("/book") &&
      !e.path.startsWith("/shop") &&
      !e.path.startsWith("/grooming") &&
      !e.path.startsWith("/policies") &&
      !e.path.startsWith("/guides") &&
      !e.path.startsWith("/learn") &&
      !e.path.startsWith("/seller")
    ),
    booking: entries.filter((e) => e.path.startsWith("/book")),
    boutique: entries.filter((e) =>
      e.path.startsWith("/shop") || ["shop-landing", "animal", "department", "category", "subcategory", "brand", "related-search", "collection"].includes(e.pageType)
    ),
    products: entries.filter((e) => e.pageType === "product"),
    serving: entries.filter((e) => e.pageType === "location"),
    policies: entries.filter((e) => e.pageType === "policy"),
    guides: entries.filter((e) => e.pageType === "guide"),
    learn: entries.filter((e) => e.pageType === "learn" || e.pageType === "course"),
    seller: entries.filter((e) => e.path === "/seller"),
    total: entries.length,
  }
}
