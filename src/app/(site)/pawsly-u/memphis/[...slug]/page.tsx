import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PawslyUArticle } from "@/components/site/pawsly-u/pawsly-u-page"
import { getAllSlugs, getGuideDataBySlug } from "@/lib/pawsly-u/taxonomy-data"
import { SEO_SITE_URL, seoUrl } from "@/lib/pawsly-u/site-url"

type Params = { params: Promise<{ slug: string[] }> }

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug: [slug] }))
}

async function getData(params: Params["params"]) {
  const { slug } = await params
  if (!slug.length) notFound()
  return getGuideDataBySlug(slug[slug.length - 1], slug)
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getData(params)
  return {
    title: data.metaTitle.replace("All About Pawz", "Pawsly U | All About Pawz"),
    description: data.metaDescription,
    alternates: { canonical: `${SEO_SITE_URL}${data.path}` },
    openGraph: { title: data.metaTitle, description: data.metaDescription, url: seoUrl(data.path), type: "article" },
  }
}

export default async function PawslyUArticlePage({ params }: Params) {
  const data = await getData(params)
  return <PawslyUArticle data={data} />
}
