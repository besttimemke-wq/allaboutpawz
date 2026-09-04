import "server-only"
import { repo, type CmsResource } from "./repo"

// Server-side data access for the public site (server components).
// Reads from the same database the admin writes to (Supabase when configured +
// schema applied, otherwise local SQLite).

export type SiteContent = {
  services: any[]
  products: any[]
  gallery: any[]
  packages: any[]
  addons: any[]
  faqs: any[]
  policies: any[]
  testimonials: any[]
  settings: Record<string, string>
}

const cached: Partial<Record<CmsResource, any[]>> = {}

async function list<T = any>(r: CmsResource): Promise<T[]> {
  // Re-fetch per request; Next.js request memoization handles dedup within a
  // single render pass when called via the same async path.
  return (await repo.list(r)) as T[]
}

export async function getSiteContent(): Promise<SiteContent> {
  const [
    services, products, gallery, packages, addons,
    faqs, policies, testimonials, settings,
  ] = await Promise.all([
    list("services"), list("products"), list("gallery"), list("packages"),
    list("addons"), list("faqs"), list("policies"), list("testimonials"),
    repo.getSettings(),
  ])
  return {
    services: services.filter((s: any) => s.visible),
    products: products.filter((p: any) => p.visible),
    gallery: gallery.filter((g: any) => g.visible),
    packages, addons, faqs, policies,
    testimonials: testimonials.filter((t: any) => t.visible),
    settings,
  }
}

export async function getResource<T = any>(r: CmsResource): Promise<T[]> {
  return list<T>(r)
}

export async function getSettings(): Promise<Record<string, string>> {
  return repo.getSettings()
}
