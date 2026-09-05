import type { MetadataRoute } from "next"

// Public site routes. TN city landing pages will be appended here once the
// local SEO pages are built.
export default function sitemap(): MetadataRoute.Sitemap {
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
  return routes.map(([path, changeFrequency, priority]) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }))
}
