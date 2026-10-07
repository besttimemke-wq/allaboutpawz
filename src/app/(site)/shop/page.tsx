import type { Metadata } from "next"
import Link from "next/link"
import { repo } from "@/lib/repo"
import { SHOP_NAV_TAXONOMY } from "@/lib/shop-nav"
import { SITE_URL } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "Shop | All About Pawz — Memphis, TN",
  description: "Shop dog and cat supplies at All About Pawz Memphis. Food, treats, beds, toys, grooming, health, and wellness.",
  alternates: { canonical: `${SITE_URL}/shop` },
}

export default async function ShopPage() {
  let products: any[] = []
  try {
    products = await repo.list("products")
  } catch {}

  return (
    <div className="bg-white">
      {/* Category nav strip — small utility links, NOT a "choose pet" screen */}
      <div className="border-b border-[#D4C5B9] px-6 py-3 lg:px-12">
        <div className="flex items-center gap-4 overflow-x-auto">
          {SHOP_NAV_TAXONOMY.map(animal => (
            <Link key={animal.slug} href={`/shop/${animal.slug}`} className="whitespace-nowrap text-sm font-semibold text-ink hover:text-[#8B7355]">
              {animal.name}
            </Link>
          ))}
          <span className="text-[#D4C5B9]">|</span>
          <Link href="/shop/sale" className="whitespace-nowrap text-sm font-semibold text-ink hover:text-[#8B7355]">Sale</Link>
          <Link href="/shop/collections" className="whitespace-nowrap text-sm font-semibold text-ink hover:text-[#8B7355]">Promotions</Link>
          <Link href="/gift-cards" className="whitespace-nowrap text-sm font-semibold text-ink hover:text-[#8B7355]">Gift Cards</Link>
          <Link href="/shop/brands" className="whitespace-nowrap text-sm font-semibold text-ink hover:text-[#8B7355]">Brands</Link>
        </div>
      </div>

      {/* Product grid — this is what a shop page is: PRODUCTS */}
      {products.length > 0 ? (
        <div className="px-6 py-8 lg:px-12">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((p: any) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group rounded-lg border border-[#D4C5B9]/40 p-4 transition hover:border-[#8B7355] hover:shadow-sm"
              >
                {/* Product image */}
                <div className="aspect-square overflow-hidden rounded bg-cream">
                  {p.image ? (
                    <img src={p.image} alt={p.alt || p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#D4C5B9]">
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                </div>
                {/* Product info */}
                <p className="mt-3 text-xs text-[#8B7355]">{p.brand || "All About Pawz"}</p>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-ink group-hover:text-[#8B7355]">{p.name}</h3>
                <p className="mt-1 text-sm font-bold text-ink">{p.basePrice || p.price || ""}</p>
                {p.badge && (
                  <span className="mt-1 inline-block rounded bg-[#8B7355] px-2 py-0.5 text-[10px] font-bold text-white">{p.badge}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-ink-soft">Products are being added. Check back soon.</p>
          <Link href="/shop/cat" className="mt-4 inline-block text-sm font-semibold text-[#8B7355] hover:underline">Browse Cat Supplies →</Link>
          <Link href="/shop/dog" className="mt-4 ml-4 inline-block text-sm font-semibold text-[#8B7355] hover:underline">Browse Dog Supplies →</Link>
        </div>
      )}

      {/* Department quick-links — small tiles, NOT full-page cards */}
      <div className="border-t border-[#D4C5B9] px-6 py-8 lg:px-12">
        <p className="mb-4 text-xs font-bold tracking-[0.1em] text-[#8B7355]">BROWSE BY DEPARTMENT</p>
        <div className="flex flex-wrap gap-2">
          {SHOP_NAV_TAXONOMY.flatMap(a => a.departments.slice(0, 5).map(d => ({
            label: d.name,
            href: `/shop/${a.slug}/${d.slug}`,
          }))).map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded border border-[#D4C5B9] px-3 py-1.5 text-xs text-ink hover:border-[#8B7355] hover:bg-cream"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
