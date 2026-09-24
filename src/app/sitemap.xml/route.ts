import { getNavTree, flattenNav, getProducts, getMerchCollections } from "@/lib/shop/catalog"
import { getResource } from "@/lib/site-data"

// ---------------------------------------------------------------------------
// /sitemap.xml — served by an explicit route handler (instead of the
// app/sitemap.ts metadata convention) because the site ALSO ships a
// human-readable HTML sitemap page at /sitemap. Next.js rejects the
// combination "page at /sitemap + metadata file sitemap.ts" (route
// conflict); this handler keeps the exact same URL, entries, and shape
// Search Console already knows.
//
// Public site routes + the canonical shop category routes and product pages
// (resolved from the data layer at request time — the same server resolvers
// the pages use). Filter combinations are intentionally NOT listed: they
// render on request, per the SSR-on-demand architecture.
// ---------------------------------------------------------------------------

export const revalidate = 3600

type Entry = {
  url: string
  lastModified: Date
  changeFrequency: "weekly" | "monthly" | "yearly"
  priority: number
}

const BASE = "https://aapawz.com"

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

async function buildEntries(): Promise<Entry[]> {
  const now = new Date()
  const routes: [string, "weekly" | "monthly", number][] = [
    ["", "weekly", 1],
    ["/about", "monthly", 0.8],
    ["/services", "monthly", 0.9],
    ["/process", "monthly", 0.7],
    ["/pricing", "monthly", 0.9],
    ["/shop", "weekly", 0.8],
    ["/book", "monthly", 0.9],
    ["/book/appointment", "monthly", 0.9],
    ["/book/consultation", "monthly", 0.8],
    ["/gallery", "monthly", 0.6],
    ["/contact", "monthly", 0.7],
    ["/faq", "monthly", 0.6],
  ]
  const entries: Entry[] = routes.map(([path, changeFrequency, priority]) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  // Shop category + product URLs — fail-safe (static routes survive even if
  // the data layer is unavailable at generation time).
  try {
    const tree = await getNavTree()
    for (const node of flattenNav(tree)) {
      // Species landings + departments (level 0/1) and product-bearing
      // leaves only — empty leaves stay out of the sitemap.
      if (node.level <= 1 || node.count > 0) {
        entries.push({
          url: `${BASE}${node.path}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: node.level === 0 ? 0.8 : 0.7,
        })
      }
    }
    for (const m of await getMerchCollections()) {
      entries.push({
        url: `${BASE}${m.path}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
    for (const p of await getProducts()) {
      entries.push({
        url: `${BASE}/products/${p.slug}`,
        lastModified: p.createdAt ? new Date(p.createdAt) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      })
    }
  } catch {
    // Data layer unavailable — static routes only.
  }

  // Policy pages (/policies/[slug]) — the same rows + slugify the policy
  // page resolves with (title → slug, e.g. "TERMS OF SERVICE" →
  // "terms-of-service"), so every policy the admin publishes is listed.
  // Fail-safe: static routes survive even if the data call fails.
  try {
    const policies = (await getResource<{ id: string; title: string }>("policies")) || []
    const seen = new Set<string>()
    for (const p of policies) {
      const slug = p.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      entries.push({
        url: `${BASE}/policies/${slug}`,
        lastModified: now,
        changeFrequency: "yearly",
        priority: 0.3,
      })
    }
  } catch {
    // Policies unavailable — the rest of the sitemap stands.
  }

  return entries
}

export async function GET() {
  const entries = await buildEntries()
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries
      .map(
        (e) =>
          `  <url>\n` +
          `    <loc>${esc(e.url)}</loc>\n` +
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
