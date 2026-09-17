import type { MetadataRoute } from "next"
import { getNavTree, flattenNav, getProducts, getMerchCollections } from "@/lib/shop/catalog"
import { getResource } from "@/lib/site-data"

// Public site routes + the canonical shop category routes and product pages
// (resolved from SQL at generation time — the same server resolver the pages
// use). Filter combinations are intentionally NOT listed: they render on
// request, per the SSR-on-demand architecture.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://aapawz.com"
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
  const entries: MetadataRoute.Sitemap = routes.map(([path, changeFrequency, priority]) => ({
    url: `${base}${path}`,
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
          url: `${base}${node.path}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: node.level === 0 ? 0.8 : 0.7,
        })
      }
    }
    for (const m of await getMerchCollections()) {
      entries.push({
        url: `${base}${m.path}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      })
    }
    for (const p of await getProducts()) {
      entries.push({
        url: `${base}/products/${p.slug}`,
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
        url: `${base}/policies/${slug}`,
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
