import { Fragment } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { PawPrint } from "lucide-react"
import { repo } from "@/lib/repo"
import { getCategoryTree, findNode, type CategoryNode } from "@/lib/categories"
import { ProductBuyBox, ReviewForm, type BuyBoxProduct } from "@/components/site/islands/product-detail"

// ---------------------------------------------------------------------------
// Product detail — /shop/[slug]
//   Everything a pet parent needs before buying: what it's made of, the full
//   ingredient list (the chemicals, in plain words), how to use it, the
//   warranty, the specs, and verified reviews.
// ---------------------------------------------------------------------------

type Params = { params: Promise<{ slug: string }> }

async function loadProduct(slug: string) {
  const products = await repo.list("products")
  return (
    products.find((p: any) => p.slug === slug && p.visible) || null
  )
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = await loadProduct(slug)
  if (!product) return { title: "Product — All About Pawz Shop" }
  return {
    title: `${product.name} — All About Pawz Shop`,
    description: product.shortDescription || product.description || product.name,
  }
}

// Rating rendered as text — no star glyphs, matches the site's type-driven
// design language.
function Rating({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`font-display text-[15px] leading-none text-gold-deep ${className}`}>
      {value.toFixed(1)}
    </span>
  )
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

const hasText = (v: any) => typeof v === "string" && v.trim().length > 0

// Split a "·"-separated spec string into definition-list rows.
function specRows(specs: string) {
  return specs
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean)
}

// Parse "Free of: a, b, c" out of an ingredient string.
function parseFreeOf(ingredients: string): { main: string; freeOf: string[] | null } {
  const idx = ingredients.indexOf("Free of:")
  if (idx === -1) return { main: ingredients, freeOf: null }
  const main = ingredients.slice(0, idx).trim()
  const list = ingredients
    .slice(idx + "Free of:".length)
    .split(/[.;]/)[0]
    .split(",")
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean)
  return { main, freeOf: list.length ? list : null }
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params
  // /shop/category/… owns the "category" path segment — a product slug that
  // collides with it can only ever resolve here, so bounce to the catalog.
  if (slug === "category") redirect("/shop")
  const product = await loadProduct(slug)
  if (!product) notFound()

  const [allReviews, allProducts, tree] = await Promise.all([
    repo.list("product_reviews"),
    repo.list("products"),
    getCategoryTree(),
  ])
  const reviews = allReviews
    .filter((r: any) => r.productId === product.id && r.visible)
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )
  const avg =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length
      : 0

  // Related products: same category first, then fill to 4 total.
  const others = allProducts.filter(
    (p: any) => p.id !== product.id && p.visible && p.slug,
  )
  const inCategory = others.filter((p: any) => p.category === product.category)
  const outCategory = others.filter((p: any) => p.category !== product.category)
  const related = [...inCategory, ...outCategory].slice(0, 4)

  const category = product.category || "Shop"

  // Real breadcrumb chain: SHOP / [root] / [mid] / [leaf] / name. Each
  // ancestor links to its /shop/category/[slug] page; when the product has
  // no category id we fall back to the old single link to /shop.
  const catNode: CategoryNode | null =
    product.categoryId != null && tree.ready
      ? findNode(tree.categories, (n) => n.id === product.categoryId)
      : null
  const crumbs: { name: string; slug: string }[] = []
  if (catNode) {
    const byId = new Map(tree.flat.map((f) => [f.id, f]))
    let cursor: CategoryNode | null | undefined = catNode
    while (cursor) {
      const parentId: number | null = cursor.parentId
      crumbs.unshift({ name: cursor.name, slug: cursor.slug })
      cursor = parentId != null ? byId.get(parentId) : null
    }
  }
  // Skip the generic umbrella root when it is merely an ancestor.
  const visibleCrumbs = crumbs.filter((c) => c.slug !== "pet-supplies")

  const freeOf = hasText(product.ingredients) ? parseFreeOf(product.ingredients) : null
  const specs = hasText(product.specs) ? specRows(product.specs) : []

  return (
    <>
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2.5 border-b border-gold/25 bg-cream px-8 py-3.5 lg:px-12"
      >
        <span className="text-[10.5px] font-bold tracking-[0.2em] text-gold-deep">06</span>
        <Link
          href="/shop"
          className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"
        >
          SHOP
        </Link>
        {visibleCrumbs.length > 0 ? (
          visibleCrumbs.map((c) => (
            <Fragment key={c.slug}>
              <span className="text-[10px] text-gold/50">/</span>
              <Link
                href={`/shop/category/${c.slug}`}
                className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"
              >
                {c.name.toUpperCase()}
              </Link>
            </Fragment>
          ))
        ) : (
          <>
            <span className="text-[10px] text-gold/50">/</span>
            <Link
              href="/shop"
              className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"
            >
              {String(category).toUpperCase()}
            </Link>
          </>
        )}
        <span className="text-[10px] text-gold/50">/</span>
        <span className="text-[10.5px] font-bold tracking-[0.2em] text-ink">{product.name}</span>
      </nav>

      {/* Two-column hero */}
      <section className="marble grid grid-cols-1 gap-10 bg-cream px-8 py-12 lg:grid-cols-[0.85fr_1fr] lg:gap-14 lg:px-12 lg:py-16">
        <div className="relative">
          {product.image ? (
            <img
              src={product.image}
              alt={product.alt || product.name}
              width={900}
              height={1024}
              className="h-[340px] w-full border border-gold/25 bg-cream-deep object-cover lg:h-[460px]"
            />
          ) : (
            <div className="flex h-[340px] w-full items-center justify-center border border-gold/25 bg-cream-deep lg:h-[460px]">
              <PawPrint className="h-10 w-10 text-gold/40" strokeWidth={1.2} />
            </div>
          )}
          {product.badge && (
            <span className="absolute left-4 top-4 bg-ink px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-gold">
              {String(product.badge).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="eyebrow">{String(category).toUpperCase()}</p>
          <h1 className="mt-3 font-display text-[34px] leading-[1.12] text-ink lg:text-[38px]">
            {product.name}
          </h1>

          {reviews.length > 0 && (
            <a href="#reviews" className="mt-3 inline-flex items-baseline gap-2.5">
              <Rating value={avg} />
              <span className="text-[11.5px] font-bold text-ink">
                <span className="font-normal text-ink-soft">· {reviews.length} {reviews.length === 1 ? "review" : "reviews"}</span>
              </span>
            </a>
          )}

          <p className="mt-4 text-[20px] font-bold text-gold-deep">{product.price}</p>
          {hasText(product.shortDescription) && (
            <p className="mt-4 max-w-[440px] text-[12.5px] leading-[1.85] text-ink-soft">
              {product.shortDescription}
            </p>
          )}

          <ProductBuyBox product={product as BuyBoxProduct} />
        </div>
      </section>

      {/* Detail sections */}
      {(hasText(product.description) ||
        hasText(product.materials) ||
        hasText(product.ingredients) ||
        hasText(product.directions) ||
        hasText(product.warranty) ||
        specs.length > 0) && (
        <section className="marble border-t border-gold/25 bg-cream px-8 pb-14 lg:px-12">
          <div className="divide-y divide-gold/20">
            {hasText(product.description) && (
              <DetailBlock label="THE DETAILS">
                <p className="max-w-2xl text-[12.5px] leading-[1.9] text-ink-soft">{product.description}</p>
              </DetailBlock>
            )}

            {hasText(product.materials) && (
              <DetailBlock label="MATERIALS & BUILD">
                <p className="max-w-2xl text-[12.5px] leading-[1.9] text-ink-soft">{product.materials}</p>
              </DetailBlock>
            )}

            {freeOf && (
              <DetailBlock label="INGREDIENTS & SAFETY">
                <div className="max-w-2xl border border-gold/30 bg-cream-deep p-5 lg:p-6">
                  <p className="text-[12.5px] leading-[1.9] text-ink-soft">{freeOf.main}</p>
                  {freeOf.freeOf && (
                    <div className="mt-4 border-t border-gold/20 pt-4">
                      <p className="text-[9px] font-bold tracking-[0.18em] text-gold-deep">FREE FROM</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {freeOf.freeOf.map((f) => (
                          <span
                            key={f}
                            className="border border-gold/40 bg-cream px-2.5 py-1 text-[9.5px] font-bold tracking-[0.08em] text-ink-soft"
                          >
                            {f.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DetailBlock>
            )}

            {hasText(product.directions) && (
              <DetailBlock label="HOW TO USE">
                <p className="max-w-2xl text-[12.5px] leading-[1.9] text-ink-soft">{product.directions}</p>
              </DetailBlock>
            )}

            {hasText(product.warranty) && (
              <DetailBlock label="WARRANTY & CARE">
                <p className="max-w-2xl border-l-2 border-gold-deep/60 pl-4 text-[12.5px] leading-[1.9] text-ink-soft">
                  {product.warranty}
                </p>
              </DetailBlock>
            )}

            {specs.length > 0 && (
              <DetailBlock label="SPECS">
                <dl className="max-w-2xl">
                  {specs.map((s, i) => (
                    <div
                      key={s}
                      className={`flex items-baseline gap-4 py-2.5 ${i > 0 ? "border-t border-gold/15" : ""}`}
                    >
                      <dt className="w-7 shrink-0 text-[10px] font-bold tracking-[0.1em] text-gold-deep">
                        {String(i + 1).padStart(2, "0")}
                      </dt>
                      <dd className="text-[12.5px] leading-[1.7] text-ink-soft">{s}</dd>
                    </div>
                  ))}
                </dl>
              </DetailBlock>
            )}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section id="reviews" className="marble scroll-mt-24 border-t border-gold/25 bg-cream px-8 pb-14 lg:px-12">
        <div className="pt-10">
          <p className="eyebrow">REVIEWS</p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-[26px] text-ink">What pet parents say</h2>
            {reviews.length > 0 ? (
              <p className="flex items-baseline gap-2 text-[11.5px] text-ink-soft">
                <Rating value={avg} />
                <span className="font-bold text-ink">{avg.toFixed(1)}</span>
                {" · "}
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            ) : (
              <p className="text-[11.5px] text-ink-soft">Be the first to review this product.</p>
            )}
          </div>

          {reviews.length > 0 && (
            <ul className="mt-7 divide-y divide-gold/20 border-y border-gold/20">
              {reviews.map((r: any) => (
                <li key={r.id} className="py-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Rating value={r.rating || 0} className="text-[14px]" />
                    <p className="text-[10.5px] text-ink-soft">{fmtDate(r.createdAt)}</p>
                  </div>
                  {hasText(r.title) && (
                    <h3 className="mt-2.5 text-[12.5px] font-bold tracking-[0.04em] text-ink">{r.title}</h3>
                  )}
                  <p className="mt-2 max-w-2xl text-[12px] leading-[1.8] text-ink-soft">{r.body}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <p className="text-[11px] font-bold text-ink">{r.author}</p>
                    {r.verified && (
                      <span className="border border-gold/40 px-2 py-0.5 text-[8.5px] font-bold tracking-[0.14em] text-gold-deep">
                        VERIFIED BUYER
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-9">
            <ReviewForm productId={product.id} />
          </div>
        </div>
      </section>

      {/* Related products */}
      {related.length > 0 && (
        <section className="marble border-t border-gold/25 bg-cream-deep px-8 py-12 lg:px-12">
          <h2 className="border-t border-gold/25 pt-8 text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">
            YOU MAY ALSO LIKE
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-4">
            {related.map((p: any) => (
              <article key={p.id} className="group flex flex-col">
                <Link
                  href={`/shop/${p.slug}`}
                  className="relative block overflow-hidden border border-gold/25 bg-cream p-4 transition-colors group-hover:border-gold-deep/50"
                  aria-label={`View ${p.name}`}
                >
                  {p.badge && (
                    <span className="absolute left-0 top-0 z-10 bg-ink px-2.5 py-1 text-[8px] font-bold tracking-[0.14em] text-gold">
                      {String(p.badge).toUpperCase()}
                    </span>
                  )}
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.alt || p.name}
                      width={512}
                      height={640}
                      className="mx-auto h-[170px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-[170px] items-center justify-center">
                      <PawPrint className="h-9 w-9 text-gold/40" strokeWidth={1.2} />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col pt-4 text-center">
                  {p.category && (
                    <p className="text-[8.5px] font-bold tracking-[0.18em] text-gold-deep/80">
                      {String(p.category).toUpperCase()}
                    </p>
                  )}
                  <Link
                    href={`/shop/${p.slug}`}
                    className="mt-1 text-[12.5px] leading-[1.5] text-ink transition-colors hover:text-gold-deep"
                  >
                    {p.name}
                  </Link>
                  <p className="mt-2 text-[13px] font-bold text-gold-deep">{p.price}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/shop" className="btn-ghost">BROWSE THE FULL COLLECTION</Link>
          </div>
        </section>
      )}
    </>
  )
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 py-9 lg:grid-cols-[220px_1fr]">
      <p className="eyebrow lg:pt-1">{label}</p>
      <div>{children}</div>
    </div>
  )
}
