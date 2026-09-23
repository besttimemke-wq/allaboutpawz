import { PageHeader } from "@/components/site/site-chrome"
import { ShopMegaMenu } from "@/components/site/islands/shop-mega-menu"
import { BagClient, type BagProduct, type BagRating } from "@/components/site/islands/bag-client"
import { repo } from "@/lib/repo"
import { listCatalogProducts } from "@/lib/enterprise/catalog"

// ---------------------------------------------------------------------------
// ViewBag — /shop/bag
//   The pre-checkout bag view: line items, compare table, subtotal.
//   Server loads the visible catalog product records (for the compare data)
//   from the NORMALIZED enterprise schema (erp_products + erp_product_skus +
//   commerce_catalog_items + commerce_prices + commerce_product_media) and
//   the visible review rollup; the island reads the persisted cart from
//   localStorage, so a saved bag survives visits and abandonment.
// ---------------------------------------------------------------------------

export const metadata = {
  title: "Your Bag — All About Pawz Shop",
  description: "Review your bag, compare products side by side, and check out when you're ready.",
  robots: { index: false, follow: true },
}

export default async function BagPage() {
  const [catalogProducts, reviews] = await Promise.all([
    listCatalogProducts(),
    repo.list("product_reviews"),
  ])

  // Map the enterprise CatalogProduct → BagProduct shape the island consumes.
  // Price is the active display price (sale when on sale, else base).
  const visible: BagProduct[] = catalogProducts
    .filter((p) => p.visible)
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: `$${(p.priceCents / 100).toFixed(2)}`,
      image: p.image,
      alt: p.alt,
      badge: p.badge,
      category: p.category,
      categoryId: p.categoryId,
      stock: p.stock,
      shortDescription: p.shortDescription,
      description: p.description,
      specs: p.specs,
      materials: p.materials,
      ingredients: p.ingredients,
      directions: p.directions,
      warranty: p.warranty,
      visible: p.visible,
      featured: p.featured,
      order: p.sortOrder,
    }) as unknown as BagProduct)

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
      <ShopMegaMenu />
      <section className="marble bg-cream px-8 pb-14 pt-12 lg:px-12">
        <h1 className="sr-only">Your Bag — All About Pawz Boutique</h1>
        <BagClient products={visible} ratings={ratings} />
      </section>
    </>
  )
}
