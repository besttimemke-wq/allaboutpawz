import { PageHeader } from "@/components/site/site-chrome"
import { ShopNavBar } from "@/components/site/islands/shop-nav-bar"
import { BagClient, type BagProduct, type BagRating } from "@/components/site/islands/bag-client"
import { repo } from "@/lib/repo"

// ---------------------------------------------------------------------------
// ViewBag — /shop/bag
//   The pre-checkout bag view: line items, compare table, subtotal.
//   The island renders every line from the PERSISTED CART (localStorage);
//   the server supplies only optional per-product enrichment (compare
//   data). The storefront is the LIVE feed catalog (products, uuid ids) and
//   the cart ids are feed uuids — the old listCatalogProducts() load here
//   (whole normalized enterprise catalog, 1.4k rows per bag view) could
//   NEVER match a single cart id (zero id overlap) and was pure
//   session-pooler risk on the checkout path, so it's gone. Enrichment for
//   feed items is a future instruction, not a silent rebuild.
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Your Bag — All About Pawz Shop",
  description: "Review your bag, compare products side by side, and check out when you're ready.",
  robots: { index: false, follow: true },
}

export default async function BagPage() {
  const reviews = await repo.list("product_reviews")

  // No server-side product enrichment: every add-to-cart path on the site
  // sells the feed catalog, whose uuid ids never existed in the normalized
  // enterprise catalog this page used to load in full. Empty map keeps the
  // BagProduct contract; the island renders lines from the cart itself.
  const visible: BagProduct[] = []

  const ratings: Record<string, BagRating> = {}
  for (const r of reviews as any[]) {
    if (!r.visible) continue
    const cur = ratings[r.productId] || { avg: 0, count: 0 }
    ratings[r.productId] = {
      avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
      count: cur.count + 1,
    }
  }

  return (
    <>
      <PageHeader n="06" label="SHOP" />
      <ShopNavBar />
      <section className="bg-white px-8 pb-14 pt-12 lg:px-12">
        <h1 className="sr-only">Your Bag — All About Pawz Boutique</h1>
        <BagClient products={visible} ratings={ratings} />
      </section>
    </>
  )
}
