import Link from "next/link"
import { ChevronRight, Truck, Lock, Award } from "lucide-react"
import type { NavCategory } from "@/lib/shop/catalog"
import { CATEGORY_ICONS as ICONS } from "./category-icons"
import { PawPrint } from "lucide-react"
import { categoryHero } from "./hero-images"
import { ProductCard } from "./product-card"
import type { ShopProduct } from "@/lib/shop/catalog"

// ---------------------------------------------------------------------------
// Shared pieces for the three category templates + the shop landing.
// Server components throughout — data arrives as props from SQL.
// ---------------------------------------------------------------------------

/** Taxonomy-aware breadcrumb with the flattened display hierarchy. */
export function Breadcrumbs({ chain }: { chain: NavCategory[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 border-b border-gold/25 bg-cream px-8 py-3.5 lg:px-12"
    >
      <span className="text-[10.5px] font-bold tracking-[0.2em] text-gold-deep">06</span>
      <Link
        href="/shop"
        className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"
      >
        SHOP
      </Link>
      {chain.map((c) => (
        <span key={c.path} className="flex items-center gap-2">
          <ChevronRight className="h-3 w-3 text-gold/60" strokeWidth={2} aria-hidden="true" />
          {chain[chain.length - 1] === c ? (
            <span className="text-[10.5px] font-bold tracking-[0.2em] text-ink">
              {c.displayName.toUpperCase()}
            </span>
          ) : (
            <Link
              href={c.path}
              className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"
            >
              {c.displayName.toUpperCase()}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

/** Large hero for the parent landing (Template 1). */
export function ParentHero({ node }: { node: NavCategory }) {
  const hero = categoryHero(node.key)
  return (
    <section className="marble relative grid grid-cols-1 items-stretch gap-10 bg-cream px-8 pt-10 pb-12 lg:min-h-[440px] lg:grid-cols-[1.1fr_0.9fr] lg:px-12">
      <div className="flex flex-col justify-center">
        <p className="eyebrow">THE PAWZ COLLECTION</p>
        <h1 className="mt-3 font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">
          {node.displayName}
        </h1>
        <p className="mt-6 max-w-[380px] text-[12.5px] leading-[1.85] text-ink-soft">
          Everything your {node.displayName.toLowerCase()} needs for a happy, healthy life —
          hand-selected by our groomers for quality, comfort, and style.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="#categories" className="btn-gold">
            SHOP BY CATEGORY <ChevronRight className="ml-1 inline h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <Link href="/book" className="btn-ghost">BOOK A GROOM</Link>
        </div>
      </div>
      <div className="relative flex items-end justify-center">
        {hero && (
          <>
            { }
            <img
              src={hero.src}
              alt={hero.alt}
              width={640}
              height={640}
              className="max-h-[420px] w-auto max-w-full rounded-full border border-gold/25 object-cover shadow-sm"
            />
            <span className="absolute left-2 top-0 bg-ink px-3 py-1.5 text-[9px] font-bold tracking-[0.16em] text-gold">
              SHOP {node.displayName.toUpperCase()}
            </span>
          </>
        )}
      </div>
    </section>
  )
}

/** Compact hero for the primary category (Template 2). */
export function PrimaryHero({ node }: { node: NavCategory }) {
  const hero = categoryHero(node.key)
  return (
    <section className="marble grid grid-cols-1 items-center gap-8 bg-cream px-8 py-10 lg:grid-cols-[1fr_auto] lg:px-12">
      <div>
        <p className="eyebrow">{node.parentKey ? `${node.parentKey.toUpperCase()} /` : ""} SHOP</p>
        <h1 className="mt-2 font-display text-[34px] leading-[1.1] text-ink lg:text-[40px]">
          {node.displayName}
        </h1>
        <p className="mt-4 max-w-[460px] text-[12.5px] leading-[1.8] text-ink-soft">
          {node.count > 0
            ? `${node.count} ${node.count === 1 ? "product" : "products"} for bathing, brushing, de-shedding, and maintaining a healthy coat.`
            : "Curated picks for a clean, comfortable, healthy companion."}
        </p>
      </div>
      {hero && (
        <div className="hidden lg:block">
          { }
          <img
            src={hero.src}
            alt={hero.alt}
            width={220}
            height={220}
            className="h-[180px] w-[180px] rounded-full border border-gold/25 object-cover"
          />
        </div>
      )}
    </section>
  )
}

/** Image-led category navigation cards (Template 1 + 2 subcategory nav). */
export function CategoryCards({
  title,
  nodes,
  variant = "grid",
}: {
  title: string
  nodes: NavCategory[]
  variant?: "grid" | "rail"
}) {
  if (nodes.length === 0) return null
  return (
    <section id="categories" className="marble scroll-mt-24 border-t border-gold/25 bg-cream px-8 py-10 lg:px-12">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[10.5px] font-bold tracking-[0.2em] text-ink">{title}</h2>
        <p className="text-[10px] font-bold tracking-[0.14em] text-ink-soft">{nodes.length} CATEGORIES</p>
      </div>
      {variant === "grid" ? (
        <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {nodes.map((n) => (
            <CategoryCard key={n.key} node={n} />
          ))}
        </div>
      ) : (
        <div className="mt-6 -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 xl:grid-cols-5 2xl:grid-cols-6">
          {nodes.map((n) => (
            <CategoryCard key={n.key} node={n} compact />
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryCard({ node, compact = false }: { node: NavCategory; compact?: boolean }) {
  const Icon = ICONS[node.key] || PawPrint
  const hero = categoryHero(node.key)
  return (
    <Link
      href={node.path}
      className={`group flex shrink-0 snap-start flex-col border border-ink/10 bg-white transition-colors hover:border-gold-deep/40 ${
        compact ? "w-[150px] lg:w-auto" : ""
      }`}
    >
      <div className="relative flex h-[110px] items-center justify-center overflow-hidden bg-cream-deep/40">
        {hero ? (
                    <img
            src={hero.src}
            alt={hero.alt}
            width={280}
            height={200}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
        ) : (
          <Icon className="h-8 w-8 text-gold-deep/60" strokeWidth={1.2} aria-hidden="true" />
        )}
        {node.count > 0 && (
          <span className="absolute right-2 top-2 bg-ink/85 px-2 py-0.5 text-[8.5px] font-bold tracking-[0.1em] text-gold">
            {node.count}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <Icon className="h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.6} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold tracking-[0.04em] text-ink group-hover:text-gold-deep">
          {node.displayName}
        </span>
        <ChevronRight className="h-3 w-3 shrink-0 text-ink-soft/50 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
      </div>
    </Link>
  )
}

/** Sibling pills for lateral browsing (Template 3). */
export function SiblingTabs({ nodes, currentPath, parentPath, parentLabel }: {
  nodes: NavCategory[]
  currentPath: string
  parentPath: string
  parentLabel: string
}) {
  if (nodes.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Link
        href={parentPath}
        className={`shrink-0 border px-3.5 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
          currentPath === parentPath
            ? "border-gold-deep bg-gold-deep text-cream"
            : "border-ink/15 bg-white text-ink-soft hover:border-gold-deep hover:text-gold-deep"
        }`}
      >
        All {parentLabel}
      </Link>
      {nodes.map((n) => (
        <Link
          key={n.key}
          href={n.path}
          aria-current={n.path === currentPath ? "page" : undefined}
          className={`shrink-0 border px-3.5 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase transition-colors ${
            n.path === currentPath
              ? "border-gold-deep bg-gold-deep text-cream"
              : "border-ink/15 bg-white text-ink-soft hover:border-gold-deep hover:text-gold-deep"
          }`}
        >
          {n.displayName}
        </Link>
      ))}
    </div>
  )
}

/** Horizontal merchandising rail (Best Sellers / New Arrivals). */
export function ProductRail({
  title,
  products,
  viewAllHref,
}: {
  title: string
  products: ShopProduct[]
  viewAllHref?: string
}) {
  if (products.length === 0) return null
  return (
    <section className="border-t border-gold/25 bg-cream-deep px-8 py-10 lg:px-12">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[10.5px] font-bold tracking-[0.2em] text-ink">{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-[9.5px] font-bold tracking-[0.14em] text-gold-deep underline-offset-2 hover:underline">
            VIEW ALL
          </Link>
        )}
      </div>
      <div className="mt-6 -mx-2 flex snap-x gap-6 overflow-x-auto px-2 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
        {products.map((p) => (
          <div key={p.id} className="w-[170px] shrink-0 snap-start lg:w-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  )
}

/** Trust / benefits strip. */
export function TrustStrip() {
  const items = [
    { Icon: Truck, title: "Free Standard Shipping", body: "On every order — 5–7 business days." },
    { Icon: Lock, title: "Secure Checkout", body: "Payments processed by Stripe." },
    { Icon: Award, title: "Groomer Approved", body: "The same tools we use in-salon." },
  ]
  return (
    <section className="border-y border-gold/25 bg-cream-deep px-8 py-6 lg:px-12">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
        {items.map(({ Icon, title, body }, i) => (
          <div key={title} className={`flex items-start gap-3 ${i > 0 ? "sm:border-l sm:border-gold/25 sm:pl-6" : ""}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" strokeWidth={1.4} aria-hidden="true" />
            <div>
              <p className="text-[11px] font-bold tracking-[0.08em] text-ink">{title.toUpperCase()}</p>
              <p className="mt-1 text-[11.5px] leading-[1.6] text-ink-soft">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
