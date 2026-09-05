import { PageHeader } from "@/components/site/site-chrome"
import { BagClient, type BagProduct, type BagRating } from "@/components/site/islands/bag-client"
import { products as allProducts, productReviews, type CmsRow } from "@/content/site-content"

// ---------------------------------------------------------------------------
// View Bag — /shop/bag
//   The pre-checkout bag view: line items, compare table, subtotal.
//   The visible product records (for the compare data) and the visible
//   review rollup come from the embedded published content — no database.
//   The island reads the persisted cart from localStorage, so a saved bag
//   survives visits and abandonment.
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Your Bag — All About Pawz Shop",
  description: "Review your bag, compare products side by side, and check out when you're ready.",
}

const visible: BagProduct[] = allProducts
  .filter((p: CmsRow) => p.visible)
  .sort((a: CmsRow, b: CmsRow) => (a.order ?? 99) - (b.order ?? 99))
  .map((p: CmsRow) => p as BagProduct)

const ratings: Record<string, BagRating> = {}
for (const r of productReviews as CmsRow[]) {
  if (!r.visible) continue
  const cur = ratings[r.productId] || { avg: 0, count: 0 }
  ratings[r.productId] = {
    avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
    count: cur.count + 1,
  }
}

export default function BagPage() {
  return (
    <>
      <PageHeader n="06" label="SHOP" />
      <section className="marble bg-cream px-8 pb-14 pt-12 lg:px-12">
        <BagClient products={visible} ratings={ratings} />
      </section>
    </>
  )
}
