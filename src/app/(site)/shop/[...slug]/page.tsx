import type { Metadata } from "next"
import { flattenTaxonomyDb } from "@/lib/shop/taxonomy-db"
import { CategoryView, categoryMetadata, type CategoryPageProps } from "../category-view"

// Pre-built (ISR) category pages served from the CDN. Requests carrying a
// query string (filters/sort/page) are rewritten by src/proxy.ts to
// /shop-filtered/*, which renders dynamically. Nothing here reads searchParams.
export const revalidate = 300
export const dynamicParams = true

export async function generateStaticParams() {
  const nodes = await flattenTaxonomyDb()
  return nodes
    .map((n) => n.path.replace(/^\/shop\//, "").split("/"))
    .filter((slug) => slug.length > 0 && slug[0])
    .map((slug) => ({ slug }))
}

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  return categoryMetadata(props)
}

export default async function CategoryPage({ params }: Pick<CategoryPageProps, "params">) {
  return <CategoryView params={params} searchParams={Promise.resolve({})} />
}
