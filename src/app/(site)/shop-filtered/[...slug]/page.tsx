import type { Metadata } from "next"
import { CategoryView, categoryMetadata, type CategoryPageProps } from "../../shop/category-view"

export const dynamic = "force-dynamic"

export async function generateMetadata(props: CategoryPageProps): Promise<Metadata> {
  const m = await categoryMetadata(props)
  return { ...m, robots: { index: false, follow: true } }
}

export default function FilteredCategoryPage(props: CategoryPageProps) {
  return <CategoryView {...props} />
}
