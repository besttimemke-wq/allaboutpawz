"use client"

import { useState } from "react"
import Link from "next/link"
import {
  PawPrint, Soup, Scissors, BedDouble, Cookie, Shirt, Bone, Dog,
  Luggage, HeartPulse, Plus, ArrowRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Category navigation — the department structure of the shop.
//
//   CATEGORIES ARE LINKS, NEVER CHECKBOXES.
//     /shop landing      → CategoryCards: the 10 root departments as cards
//                          at the top, routing to the full category pages.
//     /shop/category/*   → CategoryNavRail: the same 10 roots (with icons)
//                          in the sidebar; the active department expands to
//                          reveal its subcategory links.
//
//   Icons are part of the design system (lucide), mapped by root slug —
//   the taxonomy roots are the fixed departments of the shop.
// ---------------------------------------------------------------------------

export type CategoryLinkNode = {
  id: number
  name: string
  slug: string
  productCount: number
  children: CategoryLinkNode[]
}

const ROOT_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  "pet-supplies": PawPrint,
  "dog-feeding-watering-supplies": Soup,
  "dog-grooming-supplies": Scissors,
  "dog-beds-furniture": BedDouble,
  "dog-treat-cookies-biscuits-snacks": Cookie,
  "dog-apparel-accessories": Shirt,
  "dog-chew-toys": Bone,
  "collars-harnesses-leashes": Dog,
  "carriers-travel-products": Luggage,
  "health-supplies": HeartPulse,
}

// Stable glyph wrapper — renders the department icon by slug without
// creating a component reference during render.
function RootGlyph({
  slug,
  className,
  strokeWidth,
}: {
  slug: string
  className?: string
  strokeWidth?: number
}) {
  const Icon = ROOT_ICONS[slug]
  if (Icon) return <Icon className={className} strokeWidth={strokeWidth} />
  return <PawPrint className={className} strokeWidth={strokeWidth} />
}

// ---------------------------------------------------------------------------
// CategoryCards — the 10 departments at the top of /shop.
// Each card routes to its full category page (subcategories + own sidebar
// + filters live there).
// ---------------------------------------------------------------------------
export function CategoryCards({ roots }: { roots: CategoryLinkNode[] }) {
  if (roots.length === 0) return null
  return (
    <div>
      <div className="flex items-end justify-between border-b border-gold/25 pb-4">
        <div>
          <p className="eyebrow">SHOP BY CATEGORY</p>
          <h2 className="mt-2 font-display text-[26px] leading-tight text-ink">
            Every department, curated by our groomers
          </h2>
        </div>
        <p className="hidden pb-1 text-[10px] font-bold tracking-[0.14em] text-ink-soft/70 sm:block">
          {roots.length} DEPARTMENTS
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {roots.map((root) => {
          const count = root.productCount
          return (
            <Link
              key={root.id}
              href={`/shop/category/${root.slug}`}
              className="group flex flex-col items-start gap-3 border border-gold/25 bg-card p-4 transition-colors hover:border-gold-deep/60 hover:bg-cream-deep/40"
              aria-label={`Shop ${root.name}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 bg-cream text-gold-deep transition-colors group-hover:border-gold-deep group-hover:bg-gold-deep group-hover:text-cream">
                <RootGlyph slug={root.slug} className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10.5px] font-bold leading-[1.35] tracking-[0.04em] text-ink transition-colors group-hover:text-gold-deep">
                  {root.name}
                </span>
                <span className="mt-1 block text-[9.5px] font-bold tracking-[0.1em] text-ink-soft/70">
                  {count === 0 ? "COMING SOON" : `${count} ${count === 1 ? "PRODUCT" : "PRODUCTS"}`}
                </span>
              </span>
              <span className="mt-auto inline-flex items-center gap-1 text-[8.5px] font-bold tracking-[0.16em] text-gold-deep">
                BROWSE <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CategoryNavRail — the sidebar categories list on the category pages.
//   • The 10 root departments with icons — LINKS (never checkboxes).
//   • The ACTIVE department is highlighted and auto-expands to show its
//     subcategory links (children, and grandchildren under them).
//   • Checkboxes live ONLY in the filters section below this rail.
// ---------------------------------------------------------------------------
export function CategoryNavRail({
  roots,
  activeSlug,
  maxH = "max-h-[420px]",
}: {
  roots: CategoryLinkNode[]
  activeSlug?: string | null
  maxH?: string
}) {
  return (
    <div>
      <div className="border-b border-gold/20 pb-3">
        <p className="text-[9px] font-bold tracking-[0.18em] text-gold-deep uppercase">Categories</p>
      </div>

      <nav aria-label="Shop categories" className={`${maxH} mt-2.5 overflow-y-auto pr-1 scrollbar-thin`}>
        <ul className="space-y-0.5">
          {roots.map((root) => (
            <li key={root.id}>
              <RootRow root={root} activeSlug={activeSlug} />
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function subtreeHas(node: CategoryLinkNode, slug: string): boolean {
  if (node.slug === slug) return true
  return node.children.some((c) => subtreeHas(c, slug))
}

function RootRow({
  root,
  activeSlug,
}: {
  root: CategoryLinkNode
  activeSlug?: string | null
}) {
  // The root owning the active slug starts expanded — including when the
  // root itself is active (the department's subcategories must be visible).
  const [open, setOpen] = useState(
    activeSlug != null && subtreeHas(root, activeSlug)
  )
  const isActive = root.slug === activeSlug
  const hasChildren = root.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-sm py-[7px] pr-1 transition-colors ${
          isActive ? "bg-gold/10" : "hover:bg-gold/5"
        }`}
      >
        <Link
          href={`/shop/category/${root.slug}`}
          className="flex min-w-0 flex-1 items-center gap-2.5"
          aria-current={isActive ? "page" : undefined}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
              isActive
                ? "border-gold-deep bg-gold-deep text-cream"
                : "border-gold/30 bg-cream text-gold-deep"
            }`}
          >
            <RootGlyph slug={root.slug} className="h-3.5 w-3.5" strokeWidth={1.75} />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-[10px] font-bold tracking-[0.1em] ${
              isActive ? "text-gold-deep" : "text-ink"
            }`}
          >
            {root.name.toUpperCase()}
          </span>
          {root.productCount > 0 && (
            <span className="shrink-0 text-[9.5px] font-bold text-ink-soft/70">{root.productCount}</span>
          )}
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? `Collapse ${root.name} subcategories` : `Expand ${root.name} subcategories`}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-ink-soft/70 transition-colors hover:text-gold-deep"
          >
            <Plus
              className={`h-3 w-3 transition-transform duration-300 ${open ? "rotate-45 text-gold-deep" : ""}`}
              strokeWidth={2.5}
            />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul className="mt-0.5 mb-1 ml-[26px] space-y-0.5 border-l border-gold/20 pl-2.5">
          {root.children.map((child) => (
            <SubcategoryRow key={child.id} node={child} activeSlug={activeSlug} forceOpen={isActive} />
          ))}
        </ul>
      )}
    </div>
  )
}

function SubcategoryRow({
  node,
  activeSlug,
  forceOpen,
}: {
  node: CategoryLinkNode
  activeSlug?: string | null
  forceOpen?: boolean
}) {
  // Expand when the active page is inside this node (drill-down path) or
  // when an ancestor of this node is active (the department page shows all
  // of its subcategories open).
  const [expanded, setExpanded] = useState(
    (activeSlug != null && subtreeHas(node, activeSlug)) || !!forceOpen
  )
  const isActive = node.slug === activeSlug
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div className="flex items-center gap-1.5 rounded-sm py-[4px] pr-1 transition-colors hover:bg-gold/5">
        <Link
          href={`/shop/category/${node.slug}`}
          className={`min-w-0 flex-1 truncate text-[10.5px] leading-[1.4] ${
            isActive ? "font-bold text-gold-deep" : "text-ink-soft hover:text-ink"
          }`}
          aria-current={isActive ? "page" : undefined}
        >
          {node.name}
        </Link>
        {node.productCount > 0 && (
          <span className="shrink-0 text-[9px] font-bold text-gold-deep/60">{node.productCount}</span>
        )}
        {hasChildren && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${node.name} subcategories` : `Expand ${node.name} subcategories`}
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-ink-soft/60 transition-colors hover:text-gold-deep"
          >
            <Plus
              className={`h-2.5 w-2.5 transition-transform duration-300 ${expanded ? "rotate-45 text-gold-deep" : ""}`}
              strokeWidth={2.5}
            />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="mb-1 ml-3 space-y-0.5 border-l border-gold/15 pl-2.5">
          {node.children.map((leaf) => (
            <li key={leaf.id} className="flex items-center gap-1.5 rounded-sm py-[3px] pr-1 hover:bg-gold/5">
              <Link
                href={`/shop/category/${leaf.slug}`}
                className={`min-w-0 flex-1 truncate text-[10px] leading-[1.4] ${
                  leaf.slug === activeSlug ? "font-bold text-gold-deep" : "text-ink-soft/90 hover:text-ink"
                }`}
                aria-current={leaf.slug === activeSlug ? "page" : undefined}
              >
                {leaf.name}
              </Link>
              {leaf.productCount > 0 && (
                <span className="shrink-0 text-[8.5px] font-bold text-gold-deep/50">{leaf.productCount}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
