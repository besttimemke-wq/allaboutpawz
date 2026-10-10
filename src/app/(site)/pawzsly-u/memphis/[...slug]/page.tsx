import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { SeoPageTemplate } from "@/components/seopages/SeoPageTemplate"
import { getAllSlugs, getGuideDataBySlug, getProductCategoryPaths } from "@/lib/seopages/taxonomy-data"
import type { GuidePageData } from "@/lib/seopages/types"
import { SITE_URL } from "@/lib/site-url"

type PageProps = { params: Promise<{ slug: string[] }> }

const KNOWN_SINGLE_SLUGS = new Set(getAllSlugs())
const KNOWN_CATEGORY_PATHS = new Set(getProductCategoryPaths())

function isKnownPath(slug: string[]) {
  return slug.length === 1
    ? KNOWN_SINGLE_SLUGS.has(slug[0]) || slug[0] === "bowls-dishes"
    : KNOWN_CATEGORY_PATHS.has(`/${slug.join("/")}`)
}

async function sourceData(params: PageProps["params"]) {
  const { slug } = await params
  if (slug.length === 1 && (slug[0] === "guides" || slug[0] === "dog-breeds")) {
    permanentRedirect(`/${slug[0]}`)
  }
  if (!slug.length || !isKnownPath(slug)) notFound()
  const data = getGuideDataBySlug(slug[slug.length - 1], slug)
  if (!data) notFound()
  const path = `/pawzsly-u/memphis${data.path}`
  return { ...data, path, canonicalUrl: `${SITE_URL}${path}` } satisfies GuidePageData
}

export async function generateStaticParams() {
  return [
    ...getAllSlugs().map((slug) => ({ slug: [slug] })),
    ...getProductCategoryPaths().map((path) => ({ slug: path.split("/").filter(Boolean) })),
  ]
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await sourceData(params)
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: { canonical: data.canonicalUrl },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: data.canonicalUrl,
      images: [{ url: data.heroImageUrl, width: 1200, height: 675, alt: data.heroImageAlt }],
      type: "article",
    },
  }
}

export default async function PawzslyUArticlePage({ params }: PageProps) {
  const data = await sourceData(params)
  return <SeoPageTemplate data={data} useSiteChrome />
}
