import Link from "next/link"
import { Store, Sparkle, ArrowDown, Scissors } from "lucide-react"
import { PageHeader } from "@/components/site/site-chrome"
import { TrustServiceBand } from "@/components/site/trust-band"
import { ShopTrustBand } from "@/components/site/home-bands"
import { ShopClient, type ShopProduct } from "@/components/site/islands/shop-client"
import type { SidebarCategory } from "@/components/site/islands/shop-sidebar"
import { getCategoryTree, type CategoryNode } from "@/lib/categories"
import { getResource } from "@/lib/site-data"

// Data-driven surface: SERVER-RENDERED from Supabase (catalog, category
// tree, review rollups) and revalidated on the same cadence as the category
// pages (ISR 300). The hero, badges, and cross-sell chrome stay in code.
export const revalidate = 300

export const metadata = {
  title: "Shop the Collection — All About Pawz",
  description:
    "Curated grooming products, tools, and accessories — hand-selected by our groomers for coat health, comfort, and style.",
}

// Department tree for the landing rail — the same shape the mega menu and
// category pages use. The generic pet-supplies umbrella is never a link.
function toSidebarTree(nodes: CategoryNode[]): SidebarCategory[] {
  return nodes
    .filter((n) => n.slug !== "pet-supplies")
    .map((n) => ({
      id: n.id,
      name: n.name,
      slug: n.slug,
      productCount: n.productCount,
      children: toSidebarTree(n.children),
    }))
}

export default async function ShopPage() {
  const [productRows, reviewRows, tree] = await Promise.all([
    getResource("products"),
    getResource("product_reviews"),
    getCategoryTree(),
  ])

  const products: ShopProduct[] = productRows
    .filter((p: any) => p.visible)
    .sort(
      (a: any, b: any) =>
        (a.order ?? 99) - (b.order ?? 99) || String(a.name).localeCompare(String(b.name)),
    )

  // Review rollup per product (a review shows when it is visible OR
  // explicitly approved — same rule as the category pages).
  const ratings: Record<string, { avg: number; count: number }> = {}
  for (const r of reviewRows) {
    if (!(r.visible === true || r.status === "approved")) continue
    const cur = ratings[r.productId] || { avg: 0, count: 0 }
    ratings[r.productId] = {
      avg: (cur.avg * cur.count + (r.rating || 0)) / (cur.count + 1),
      count: cur.count + 1,
    }
  }

  const categoryTree: SidebarCategory[] = tree.ready ? toSidebarTree(tree.categories) : []

  return (
    <>
      <PageHeader n="06" label="SHOP" />

      {/* Hero — raised to the top, natural height; the bottle stands at the
          base of its column, directly against the canvas (no container). */}
      <section className="marble grid grid-cols-1 items-stretch gap-10 bg-cream px-8 pt-6 lg:min-h-[520px] lg:grid-cols-[1fr_0.8fr] lg:px-12 lg:pt-8">
        <div className="flex flex-col justify-center pb-10">
          <p className="eyebrow flex items-center gap-2">
            <Sparkle className="h-3.5 w-3.5" strokeWidth={1.5} /> THE PAWZ COLLECTION
          </p>
          <h1 className="mt-3 font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
            Bring the<br />Pawfection<br />Home.
          </h1>
          <p className="mt-6 max-w-[340px] text-[12.5px] leading-[1.85] text-ink-soft">
            Curated grooming products, tools, and accessories — hand-selected by our groomers for coat health, comfort, and style.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#collection" className="btn-gold">
              SHOP THE COLLECTION <ArrowDown className="ml-1 inline h-3.5 w-3.5" strokeWidth={2} />
            </Link>
            <Link href="/book" className="btn-ghost">BOOK A GROOM</Link>
          </div>
        </div>
        <div className="relative flex items-end justify-center pb-2">
          <img
            src="/Shop/shop.png"
            alt="Pawz Signature Shampoo bottle"
            width={199}
            height={486}
            className="max-h-[460px] w-auto max-w-full self-end object-contain"
          />
          <span className="absolute left-0 top-0 bg-ink px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-gold">
            GROOMER FAVORITE
          </span>
        </div>
      </section>

      {/* Trust & service band — the remote project's 4-section band,
          directly beneath the hero (free shipping / secure checkout /
          groomer approved / return policy) */}
      <TrustServiceBand />

      {/* Collection */}
      <section id="collection" className="marble scroll-mt-24 bg-cream px-8 pb-14 pt-12 lg:px-12">
        <h2 className="border-t border-gold/25 pt-8 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">
          SHOP OUR FAVORITES
        </h2>
        <ShopClient products={products} categoryTree={categoryTree} ratings={ratings} />
      </section>

      {/* Trust badges — shared ShopTrustBand (Loved by Pups) */}
      <ShopTrustBand />

      {/* Cross-sell */}
      <section className="marble grid grid-cols-1 items-center gap-8 bg-cream-deep px-8 py-12 lg:grid-cols-[1fr_auto] lg:px-12">
        <div className="flex items-start gap-4">
          <Scissors className="mt-1 h-8 w-8 shrink-0 text-gold-deep" strokeWidth={1.2} />
          <div>
            <h2 className="font-display text-[24px] leading-tight text-ink">Pair your products with a pawfection groom.</h2>
            <p className="mt-2 max-w-md text-[12px] leading-[1.75] text-ink-soft">
              Our full-service grooming packages use these very products. Book a session and let our groomers work their magic.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/book" className="btn-gold">BOOK AN APPOINTMENT</Link>
          <Link href="/contact" className="btn-ghost"><Store className="mr-1.5 inline h-3.5 w-3.5" strokeWidth={1.5} /> VISIT THE SALON</Link>
        </div>
      </section>
    </>
  )
}
