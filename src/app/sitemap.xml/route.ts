import { buildSitemap } from "@/lib/shop/sitemap-source"

// EDUCATION CENTER: the owner's seopages inventory (his standalone
// app/sitemap.ts — /guides, /dog-breeds, every product-category path,
// every guide-directory item) lives INSIDE buildSitemap() in
// src/lib/shop/sitemap-source.ts, replacing the retired /pet-education
// and /guides/grooming/* entries. Keeping it there (not appended here)
// preserves the single-source-of-truth contract below: /sitemap.xml and
// the HTML /sitemap page render the same URL set, deduped, never drifting.

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
  const allEntries = await buildSitemap()

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
