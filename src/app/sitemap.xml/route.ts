import { buildSitemap } from "@/lib/shop/sitemap-source"
import { SITE_URL } from "@/lib/site-url"
import { getAllSlugs, educationPath } from "@/lib/education/taxonomy-data"

// PET EDUCATION ADDENDUM: the education library (hub + articles + care
// sheets + every guide slug) is appended in GET() below, after buildSitemap()
// returns. lib/shop/sitemap-source.ts stays untouched — the HTML /sitemap
// page keeps rendering its own sections without the education URLs.

// ---------------------------------------------------------------------------
// /sitemap.xml — served by an explicit route handler (instead of the
// app/sitemap.ts metadata convention) because the site ALSO ships a
// human-readable HTML sitemap page at /sitemap. Next.js rejects the
// combination "page at /sitemap + metadata file sitemap.ts" (route
// conflict); this handler keeps the exact same URL Search Console knows.
//
// SINGLE SOURCE OF TRUTH: both /sitemap.xml (this route) and /sitemap
// (the HTML page) read from the same buildSitemap() function in
// src/lib/shop/sitemap-source.ts. One source, two renderings — they
// never drift.
//
// Tier 1 — v_sitemap view: when the Pet Supply Taxonomy SQL is applied,
//   the database publishes a v_sitemap view that generates URLs from
//   every published taxonomy node, brand page, product, and related-
//   search page, split by animal. buildSitemap() queries it directly.
// Tier 2 — catalog resolvers (fallback): before the taxonomy SQL is
//   applied, buildSitemap() builds entries from getNavTree + flattenNav
//   + getProducts + getMerchCollections.
// Tier 3 — static routes + location pages + policies: always present.
//
// Hygiene: only 200-status indexable URLs go in. No filter-param URLs
// (filter state is query-string only, never a route). Known redirecting
// URLs are excluded (Phase 2 populates KNOWN_REDIRECT_PATHS).
// ---------------------------------------------------------------------------

export const revalidate = 3600

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const entries = await buildSitemap()

  // Pet Education Center — static library URLs (hub + sub-indexes + every
  // guide slug from the education data layer). Appended here so the route
  // stays self-contained and lib/shop/sitemap-source.ts is untouched.
  const now = new Date()
  const educationHubEntries = [
    { loc: `${SITE_URL}/pet-education`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { loc: `${SITE_URL}/pet-education/articles`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { loc: `${SITE_URL}/pet-education/care-sheets`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
  ]
  const educationGuideEntries = getAllSlugs().map((slug) => ({
    loc: `${SITE_URL}${educationPath(slug)}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))
  const allEntries = [...entries, ...educationHubEntries, ...educationGuideEntries]

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    allEntries
      .map(
        (e) =>
          `  <url>\n` +
          `    <loc>${esc(e.loc)}</loc>\n` +
          `    <lastmod>${e.lastModified.toISOString()}</lastmod>\n` +
          `    <changefreq>${e.changeFrequency}</changefreq>\n` +
          `    <priority>${e.priority.toFixed(1)}</priority>\n` +
          `  </url>`,
      )
      .join("\n") +
    "\n</urlset>\n"

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
