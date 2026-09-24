import { redirect, notFound } from "next/navigation"
import { resolveLegacyCategorySlug } from "@/lib/shop/catalog"

// ---------------------------------------------------------------------------
// Legacy redirect — /shop/category/[slug] → the canonical customer-facing
// category route (/shop/dog/grooming/…). Old sitemap/SEO links keep working;
// the new SSR category system lives at /shop/[...slug].
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata() {
  return { title: "Shop — All About Pawz" }
}

export default async function LegacyCategoryPage({ params }: Params) {
  const { slug } = await params
  const target = await resolveLegacyCategorySlug(slug)
  if (target) redirect(target)
  notFound()
}
