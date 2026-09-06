import Link from "next/link"
import { ArrowRight, Layers } from "lucide-react"

// ---------------------------------------------------------------------------
// Category Grid — the "C grid" from the design library (CategoryPageView's
// Dedicated Subcategories Section). Every category page renders it: the
// node's own subcategories (department + intermediate pages) or its siblings
// (leaf pages). The subcategory ROUTES live here, in the content column —
// never in the filter rail. 2 / 3 / 5 responsive card grid, square tokens.
//
// Grouping: when a department's direct child is an intermediate wrapper
// (Grooming → 15 leaves, Beds & Furniture → 9 leaves), the wrapper renders
// as a group label and its leaves as the cards — exactly the structure the
// taxonomy spec describes. Direct leaf children render as one unlabeled
// section.
// ---------------------------------------------------------------------------

export type CategoryGridItem = {
  name: string
  slug: string
  count: number
}

export type CategoryGridSection = {
  label?: string
  items: CategoryGridItem[]
}

function itemLine(count: number) {
  if (count > 1) return `${count} curated products`
  if (count === 1) return "1 curated product"
  return "New arrivals coming soon"
}

function Cards({ items }: { items: CategoryGridItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <Link
          key={item.slug}
          href={`/shop/category/${item.slug}`}
          className="group flex flex-col justify-between border border-gold/30 bg-card p-4 transition-colors hover:border-gold-deep hover:shadow-[0_1px_8px_rgba(157,124,64,0.12)]"
        >
          <div>
            <h3 className="text-[11.5px] font-bold leading-snug text-ink transition-colors group-hover:text-gold-deep">
              {item.name}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[10px] leading-[1.6] text-ink-soft">
              {itemLine(item.count)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-gold/20 pt-2 text-[9px] font-bold tracking-[0.14em] text-gold-deep group-hover:underline">
            <span>BROWSE PAGE</span>
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </div>
        </Link>
      ))}
    </div>
  )
}

export function CategoryGrid({
  title,
  sections,
}: {
  title: string
  sections: CategoryGridSection[]
}) {
  const total = sections.reduce((n, s) => n + s.items.length, 0)
  if (total === 0) return null

  return (
    <section aria-labelledby="subcategories-heading" className="space-y-5">
      <div className="flex items-center justify-between border-b border-gold/25 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.8} />
          <h2
            id="subcategories-heading"
            className="font-display text-[20px] leading-tight text-ink"
          >
            {title}
          </h2>
          <span className="ml-1 text-[10px] font-bold tracking-[0.14em] text-gold-deep">
            {total}
          </span>
        </div>
        <span className="hidden text-[9.5px] font-bold tracking-[0.14em] text-ink-soft sm:inline">
          SELECT A CATEGORY TO BROWSE
        </span>
      </div>

      {sections.map((section, i) => (
        <div key={section.label ?? `section-${i}`} className="space-y-3">
          {section.label && (
            <p className="text-[9.5px] font-bold tracking-[0.16em] text-gold-deep uppercase">
              {section.label}
            </p>
          )}
          <Cards items={section.items} />
        </div>
      ))}
    </section>
  )
}
