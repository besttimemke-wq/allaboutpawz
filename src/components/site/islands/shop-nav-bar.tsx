"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star } from "lucide-react"
import { SHOP_NAV_CATEGORIES, type ShopCategory } from "@/lib/shop-nav"
import { loadShopDepartments, type ShopDepartment } from "@/lib/shop-departments"

// ---------------------------------------------------------------------------
// ShopNavBar — the shared global shop navigation, rendered on EVERY /shop
// route directly below the PageHeader breadcrumb bar.
//
// LIVE TAXONOMY FIRST, STATIC CONFIG AS THE FLOOR. The bar reads
// /api/shop/categories (the admin-managed tree: new categories appear,
// sort_order reorders, featured_in_mega_menu / promo_blurb surface) — but it
// NEVER depends on that fetch: while it loads, on failure, or when the
// taxonomy is empty, the curated nine-department config renders instead.
// The department bar is always on the page (this is what production lost
// when it was swapped for a click-to-open dropdown — never again).
//
//   Desktop: the department destinations in one row. Hovering a category
//   opens ITS mega menu below the bar (no chevrons, no product counts —
//   hover IS the expansion cue):
//
//   ┌────────────────────────────────────────────────────────────────┐
//   │ Subcategories (narrow) │ WHAT'S NEW (prominent) │ 3 × 1:1 images │
//   └────────────────────────────────────────────────────────────────┘
//
//   For departments the admin added after the static config was written
//   (no curated What's-New/images yet), the panel renders the live
//   subcategories in two columns plus the admin's promo blurb.
//
//   Behavior: moving between categories switches the open menu; moving the
//   pointer from the bar INTO the panel keeps it open; leaving the nav +
//   panel region closes it (180ms delay, no flicker). Keyboard: focusing a
//   category opens its menu (focus is the hover equivalent); Escape closes;
//   tabbing into the panel works because the links are real focus stops.
//   Touch/mobile: the row becomes a horizontal scroll rail of the
//   categories — tap navigates (no hover dependency).
//
// Data: live tree from src/lib/shop-departments.ts (one memoized fetch) +
// curated panels from src/lib/shop-nav.ts.
// ---------------------------------------------------------------------------

// Close delay so diagonal pointer moves bar → panel never flicker closed.
const CLOSE_DELAY_MS = 180
// Live panels cap their subcategory column the same way the curated ones do.
const MAX_SUBS_PER_DEPT = 10

/** One bar/panel entry — live taxonomy overlaid on the curated config. */
type BarCategory = {
  slug: string
  name: string
  /** Canonical route (/shop/dog/grooming) when the live join resolved it;
   *  legacy /shop/category/<slug> otherwise (still redirects correctly). */
  href: string
  subcategories: { slug: string; name: string; href: string }[]
  whatsNew?: ShopCategory["whatsNew"]
  images: ShopCategory["images"]
  featured?: boolean
  blurb?: string | null
}

/** The link for a raw taxonomy node: canonical path when the join resolved
 *  it, the legacy redirect route otherwise. */
const linkFor = (node: { slug: string; navPath?: string | null }): string =>
  node.navPath || `/shop/category/${node.slug}`

/** A live department's navigable leaves: wrapper children are flattened. */
function liveLeaves(dept: ShopDepartment): ShopDepartment[] {
  const out: ShopDepartment[] = []
  for (const c of dept.children) {
    if (c.children.length > 0) out.push(...c.children)
    else out.push(c)
  }
  return out
}

/** Build the bar: live tree (admin order/flags) with curated panels where
 *  the config knows the department. Empty/absent live data → static config.
 *
 *  Naming: a department the curated config knows keeps its CUSTOMER-FACING
 *  name ("Grooming", never "Dog Grooming Supplies"); admin-added departments
 *  keep the name the admin wrote. Ordering: an admin-set sort_order wins;
 *  otherwise known departments follow the curated order and new departments
 *  append alphabetically after them. */
function buildCategories(live: ShopDepartment[] | null): BarCategory[] {
  if (!live || live.length === 0) {
    return SHOP_NAV_CATEGORIES.map((c) => ({
      slug: c.slug,
      name: c.name,
      href: `/shop/category/${c.slug}`,
      subcategories: c.subcategories.map((s) => ({
        slug: s.slug,
        name: s.name,
        href: `/shop/category/${s.slug}`,
      })),
      whatsNew: c.whatsNew,
      images: c.images,
    }))
  }
  const curatedIndexOf = new Map(SHOP_NAV_CATEGORIES.map((c, i) => [c.slug, i]))
  // Sort the LIVE list first. sort_order semantics: an explicit admin value
  // (> 0) positions the department exactly there; 0/null means unset — the
  // migration's default — so known departments fall back to the curated
  // order and brand-new admin departments append alphabetically after them.
  const keyOf = (d: ShopDepartment): number => {
    if (d.sortOrder != null && d.sortOrder > 0) return d.sortOrder
    const ci = curatedIndexOf.get(d.slug)
    return ci != null ? ci : 500
  }
  const sorted = [...live].sort((a, b) => {
    const oa = keyOf(a)
    const ob = keyOf(b)
    if (oa !== ob) return oa - ob
    return a.name.localeCompare(b.name)
  })
  const built = sorted.map((dept) => {
    const curated = SHOP_NAV_CATEGORIES.find((c) => c.slug === dept.slug)
    const leaves = liveLeaves(dept)
    return {
      slug: dept.slug,
      name: curated?.name ?? dept.name,
      href: linkFor(dept),
      subcategories: (leaves.length > 0 ? leaves : curated?.subcategories || []).map((s) => ({
        slug: s.slug,
        name: curated && curated.subcategories.some((cs) => cs.slug === s.slug)
          ? curated.subcategories.find((cs) => cs.slug === s.slug)!.name
          : s.name,
        href: "navPath" in s ? linkFor(s as { slug: string; navPath?: string | null }) : `/shop/category/${s.slug}`,
      })),
      whatsNew: curated?.whatsNew,
      images: curated?.images || [],
      featured: !!dept.featuredInMegaMenu,
      blurb: dept.promoBlurb || null,
    }
  })
  return built
}

function MegaPanel({ category }: { category: BarCategory }) {
  const rich = !!category.whatsNew && category.whatsNew.length > 0 && category.images.length > 0
  const shown = category.subcategories.slice(0, MAX_SUBS_PER_DEPT)
  const more = category.subcategories.length - shown.length

  return (
    <div
      role="group"
      aria-label={`${category.name} menu`}
      data-purpose="shop-mega-menu"
      className="absolute inset-x-0 top-full z-40 hidden animate-in fade-in slide-in-from-top-2 duration-150 border-b border-gold/40 bg-cream shadow-[0_18px_36px_-18px_rgba(31,27,24,0.35)] lg:block"
    >
      <div
        className={
          rich
            ? "grid grid-cols-1 gap-8 px-8 py-6 lg:grid-cols-[190px_minmax(240px,1fr)_minmax(330px,1.7fr)] lg:px-12"
            : "grid grid-cols-1 gap-8 px-8 py-6 lg:grid-cols-[minmax(240px,1fr)_minmax(330px,1.4fr)] lg:px-12"
        }
      >
        {/* SUBCATEGORIES — the narrow column. The department name is its
            header link; leaves below at compact text size. No counts. */}
        <nav aria-label={`${category.name} subcategories`}>
          <Link
            href={category.href}
            className="flex items-baseline gap-1.5 text-[11px] font-bold tracking-[0.04em] text-ink transition-colors hover:text-gold-deep hover:underline"
          >
            {category.name}
            {category.featured && (
              <Star className="h-3 w-3 fill-gold-deep text-gold-deep" aria-label="Featured department" />
            )}
          </Link>
          <ul className="mt-2.5 space-y-1.5">
            {shown.map((s) => (
              <li key={s.slug} className="min-w-0">
                <Link
                  href={s.href}
                  className="block truncate text-[10.5px] leading-[1.5] text-ink-soft transition-colors hover:text-gold-deep hover:underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
            {more > 0 && (
              <li>
                <Link
                  href={category.href}
                  className="text-[10.5px] font-semibold text-gold-deep transition-colors hover:underline"
                >
                  + {more} more
                </Link>
              </li>
            )}
          </ul>
          {category.blurb && (
            <p className="mt-3 max-w-[220px] text-[9.5px] leading-[1.55] italic text-ink-soft/70">
              {category.blurb}
            </p>
          )}
        </nav>

        {/* WHAT'S NEW — the larger, visually stronger column: display-font
            destinations with room to breathe. Admin-added departments get
            the same treatment built from their own subcategory leaves. */}
        {rich && category.whatsNew ? (
          <div>
            <p className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">WHAT&apos;S NEW</p>
            <ul className="mt-3.5 space-y-4">
              {category.whatsNew.map((w) => (
                <li key={w.href}>
                  <Link
                    href={w.href}
                    className="font-display text-[17px] leading-[1.25] text-ink transition-colors hover:text-gold-deep"
                  >
                    {w.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <p className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">
              SHOP {category.name.toUpperCase()}
            </p>
            <ul className="mt-3.5 space-y-4">
              {category.subcategories.slice(0, 3).map((s) => (
                <li key={`wn-${s.slug}`}>
                  <Link
                    href={s.href}
                    className="font-display text-[17px] leading-[1.25] text-ink transition-colors hover:text-gold-deep"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={category.href}
                  className="font-display text-[17px] leading-[1.25] text-gold-deep transition-colors hover:underline"
                >
                  View everything →
                </Link>
              </li>
            </ul>
          </div>
        )}

        {/* IMAGE RAIL — exactly three 1:1 promotional images, side by side,
            each a destination link with meaningful alt text. Admin-added
            departments have no curated rail yet; their column keeps the
            subcategory list running in a second column instead. */}
        {rich ? (
          <div className="grid grid-cols-3 gap-4">
            {category.images.slice(0, 3).map((image) => (
              <Link
                key={`${image.src}-${image.href}`}
                href={image.href}
                className="group/img block overflow-hidden border border-gold/25 bg-cream-deep"
              >
                <img
                  src={image.src}
                  alt={image.alt}
                  width={400}
                  height={400}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover/img:scale-[1.03]"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="hidden lg:block">
            <p className="text-[9.5px] font-bold tracking-[0.2em] text-gold-deep">BROWSE</p>
            <ul className="mt-3.5 space-y-1.5">
              {category.subcategories.slice(MAX_SUBS_PER_DEPT, MAX_SUBS_PER_DEPT + 8).map((s) => (
                <li key={`b-${s.slug}`} className="min-w-0">
                  <Link
                    href={s.href}
                    className="block truncate text-[10.5px] leading-[1.5] text-ink-soft transition-colors hover:text-gold-deep hover:underline"
                  >
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export function ShopNavBar() {
  const pathname = usePathname()
  const [active, setActive] = useState<string | null>(null)
  const [live, setLive] = useState<ShopDepartment[] | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // One memoized fetch per session (src/lib/shop-departments.ts) — the live
  // admin-managed taxonomy. Failure/empty falls back to the curated config.
  useEffect(() => {
    let alive = true
    loadShopDepartments().then((d) => {
      if (alive) setLive(d)
    })
    return () => {
      alive = false
    }
  }, [])

  const categories = useMemo(() => buildCategories(live), [live])

  // Never leak a pending close timer.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const open = (slug: string) => {
    clearClose()
    setActive(slug)
  }
  const scheduleClose = () => {
    clearClose()
    closeTimer.current = setTimeout(() => setActive(null), CLOSE_DELAY_MS)
  }

  // Keyboard: Escape closes the open menu.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && active != null) setActive(null)
  }
  // Focus leaving the bar + panel region closes the menu (focus equivalent
  // of pointer-leave).
  const onBlurCapture = (e: React.FocusEvent) => {
    if (
      active != null &&
      rootRef.current &&
      e.relatedTarget instanceof Node &&
      !rootRef.current.contains(e.relatedTarget)
    ) {
      setActive(null)
    }
  }

  // The category row's "current" department: the URL is the canonical route
  // (/shop/dog/grooming[/leaf]) when live data resolved it, so an exact or
  // subtree match of the item's href wins; legacy /shop/category/<slug>
  // paths still match for the pre-fetch/static-fallback render. Active
  // state = gold + underline + aria-current, never color alone.
  const currentSlug = (c: BarCategory) => {
    const canonical = c.href
    const legacy = `/shop/category/${c.slug}`
    const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
    return matches(canonical) || matches(legacy)
  }

  const activeCategory = categories.find((c) => c.slug === active) || null

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={clearClose}
      onMouseLeave={scheduleClose}
      onKeyDown={onKeyDown}
      onBlurCapture={onBlurCapture}
    >
      {/* Desktop — the department destinations. Hover (or focus) opens
          that category's mega menu; no chevrons, no counts. */}
      <nav
        aria-label="Shop departments"
        className="hidden flex-wrap items-center gap-x-6 gap-y-2 border-b border-gold/25 bg-cream px-8 py-3 lg:flex lg:px-12"
      >
        {categories.map((c) => {
          const isCurrent = currentSlug(c)
          return (
            <Link
              key={c.slug}
              href={c.href}
              onMouseEnter={() => open(c.slug)}
              onFocus={() => open(c.slug)}
              aria-haspopup="true"
              aria-expanded={active === c.slug}
              aria-current={isCurrent ? "true" : undefined}
              className={`whitespace-nowrap py-0.5 text-[10px] font-bold tracking-[0.14em] transition-colors hover:text-gold-deep focus-visible:text-gold-deep focus-visible:outline-none focus-visible:underline ${
                isCurrent || active === c.slug
                  ? "text-gold-deep underline underline-offset-4 decoration-gold/60"
                  : "text-ink-soft"
              } ${c.featured ? "flex items-center gap-1" : ""}`}
            >
              {c.featured && (
                <Star
                  className="h-2.5 w-2.5 fill-gold-deep text-gold-deep"
                  aria-label="Featured department"
                />
              )}
              {c.name}
            </Link>
          )
        })}
      </nav>

      {/* The open mega menu (desktop) — anchored below the bar, full-width
          panel in the site's cream treatment. */}
      {activeCategory && <MegaPanel category={activeCategory} />}

      {/* Mobile / touch — the categories as a horizontal scroll rail;
          tap navigates (no hover dependency). */}
      <nav
        aria-label="Shop departments"
        className="flex items-center gap-1.5 overflow-x-auto border-b border-gold/25 bg-cream px-4 py-2.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((c) => {
          const isCurrent = currentSlug(c)
          return (
            <Link
              key={c.slug}
              href={c.href}
              aria-current={isCurrent ? "true" : undefined}
              className={`flex shrink-0 items-center gap-1 whitespace-nowrap px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] transition-colors ${
                isCurrent
                  ? "text-gold-deep underline underline-offset-4 decoration-gold/60"
                  : "text-ink-soft hover:text-gold-deep"
              }`}
            >
              {c.featured && (
                <Star className="h-2.5 w-2.5 fill-gold-deep text-gold-deep" aria-label="Featured department" />
              )}
              {c.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
