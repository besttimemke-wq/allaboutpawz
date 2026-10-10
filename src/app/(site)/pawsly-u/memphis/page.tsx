import type { Metadata } from "next"
import { PawslyULanding } from "@/components/site/pawsly-u/pawsly-u-page"
import { PRODUCT_CATEGORIES } from "@/lib/pawsly-u/taxonomy-data"

export const metadata: Metadata = {
  title: "Pawsly U | Pet Care Guides for Memphis | All About Pawz",
  description: "Pawsly U is All About Pawz's Memphis pet care education center, organized by animal and practical care topic.",
  alternates: { canonical: "/pawsly-u/memphis" },
}

export default function PawslyUMemphisPage() {
  return (
    <PawslyULanding
      categories={PRODUCT_CATEGORIES}
    />
  )
}
