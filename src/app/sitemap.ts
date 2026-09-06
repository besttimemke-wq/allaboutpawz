import type { MetadataRoute } from "next"
import { getCategoryTree } from "@/lib/categories"
import { getSiteContent } from "@/lib/site-data"
import { repo } from "@/lib/repo"

// Public site routes — static pages + EVERY live category page (all 88 nodes
// of the taxonomy), every visible product, and every policy. Dynamic routes
// ([slug]) resolve to real, unique URLs here, so search engines index them
// exactly like hand-built pages.
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
    ["/shop/bag", "weekly", 0.3],
    ["/book", "monthly", 0.9],
    ["/book/appointment", "monthly", 0.9],
    ["/book/consultation", "monthly", 0.8],
    ["/gallery", "monthly", 0.6],
    ["/contact", "monthly", 0.7],
    ["/faq", "monthly", 0.6],
  ]
  const out: MetadataRoute.Sitemap = routes.map(([path, changeFrequency, priority]) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))

  // ---- category pages (the whole taxonomy — root, intermediate and leaf) ----
  try {
    const tree = await getCategoryTree()
    if (tree.ready) {
      const catPriority = (node: { productCount: number }) => (node.productCount > 0 ? 0.8 : 0.6)
      const walk = (nodes: typeof tree.categories) => {
        for (const n of nodes) {
          out.push({
            url: `${base}/shop/category/${n.slug}`,
            lastModified: now,
            changeFrequency: "weekly" as const,
            priority: catPriority(n),
          })
          if (n.children.length > 0) walk(n.children)
        }
      }
      walk(tree.categories)
    }
  } catch {
    // taxonomy unavailable — the static routes still ship
  }

  // ---- product pages ----
  try {
    const content = await getSiteContent()
    for (const p of (content.products as { slug?: string | null }[] | undefined) || []) {
      if (p.slug) {
        out.push({
          url: `${base}/shop/${p.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })
      }
    }
  } catch {
    // products unavailable
  }

  // ---- policy pages (Stripe-required legal pages included) ----
  try {
    const policies = (await repo.list("policies")) || []
    const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    for (const p of policies as { title?: string }[]) {
      if (p.title) {
        out.push({
          url: `${base}/policies/${slugify(p.title)}`,
          lastModified: now,
          changeFrequency: "yearly" as const,
          priority: 0.3,
        })
      }
    }
  } catch {
    // policies unavailable
  }

  return out
}
