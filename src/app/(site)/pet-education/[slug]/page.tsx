import { permanentRedirect } from "next/navigation"
import { getAllSlugs } from "@/lib/seopages/taxonomy-data"

// Old /pet-education/[slug] → /guides/[slug] when the slug exists in the
// owner's seopages data (the same 185 guide/category slugs the old pages
// served), else the library hub. Route-level redirect keeps the mapping
// data-driven without hardcoding slugs into next.config.
const KNOWN_SLUGS = new Set(getAllSlugs())

type Params = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return Array.from(KNOWN_SLUGS).map((slug) => ({ slug }))
}

export default async function PetEducationSlugRedirect({ params }: Params) {
  const { slug } = await params
  permanentRedirect(KNOWN_SLUGS.has(slug) ? `/guides/${slug}` : "/guides")
}
