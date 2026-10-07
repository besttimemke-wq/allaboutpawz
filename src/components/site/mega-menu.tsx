"use client"

// ---------------------------------------------------------------------------
// MegaMenu — Petco-style horizontal category tab strip with multi-column
// hover panels. Sits below the primary tan header bar inside the sticky
// header wrapper so it stays pinned to the top when the page scrolls.
//
// Tabs:
//   Dog | Cat | Sale | New Arrivals | Gift Cards | Brands | Book a Groom
//
// Dog + Cat tabs open a multi-column hover panel that slides down below the
// tab strip. The other tabs are plain navigation links. "Book a Groom" is a
// styling CTA to /book/appointment.
//
// Behavior (Petco-grade):
//   1. 250ms hover grace period between trigger-leave and panel-close.
//   2. Panel-enter cancels any pending close timer.
//   3. Click-outside closes the panel.
//   4. Escape closes the panel + returns focus to the trigger.
//   5. Route change closes the panel.
//   6. Keyboard accessible: Down Arrow on a focused tab opens the panel and
//      moves focus to the first department link; Tab moves between links;
//      Escape closes + returns focus.
//   7. On mobile (< md) the strip is hidden — the existing ShopFlyout handles
//      mobile shop navigation.
//   8. SSR-safe: openTab state starts null so SSR markup is just the tab
//      strip (no hydration mismatch).
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SHOP_NAV_TAXONOMY,
  departmentPath,
  subcategoryPath,
  type ShopNavAnimal,
  type ShopNavDepartment,
} from "@/lib/shop-nav"

const CLOSE_GRACE_MS = 250
const MAX_VISIBLE_SUBS = 6

// Tabs that have a hover panel (real subcategory trees from SHOP_NAV_TAXONOMY)
const ANIMAL_TABS: { slug: "cat" | "dog"; label: string }[] = [
  { slug: "dog", label: "Dog" },
  { slug: "cat", label: "Cat" },
]

// Tabs that are plain navigation links (no hover panel)
const LINK_TABS: { label: string; href: string }[] = [
  { label: "Sale", href: "/shop/sale" },
  { label: "New Arrivals", href: "/shop/new-arrivals" },
  { label: "Gift Cards", href: "/gift-cards" },
  { label: "Brands", href: "/shop/brands" },
]

type AnimalSlug = "cat" | "dog"

export function MegaMenu() {
  const pathname = usePathname()
  const [openTab, setOpenTab] = useState<AnimalSlug | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null)

  // Which animal tab is "active" (matches current route). Used to underline
  // the matching tab so the visitor knows where they are.
  const activeAnimal: AnimalSlug | null = pathname.startsWith("/shop/cat")
    ? "cat"
    : pathname.startsWith("/shop/dog")
      ? "dog"
      : null

  // Route-change close — React's "adjust state during render when a value
  // changes" pattern (lastValue guard + setState during render). Avoids the
  // react-hooks/set-state-in-effect lint error that an useEffect would trip.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    if (openTab !== null) setOpenTab(null)
  }

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const openPanel = (tab: AnimalSlug) => {
    cancelClose()
    setOpenTab(tab)
  }

  const scheduleClose = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      setOpenTab(null)
      closeTimer.current = null
    }, CLOSE_GRACE_MS)
  }

  const closeNow = () => {
    cancelClose()
    setOpenTab(null)
  }

  // Cleanup any pending close timer on unmount
  useEffect(() => () => cancelClose(), [])

  // Escape closes the panel and returns focus to the trigger tab
  useEffect(() => {
    if (!openTab) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        const trigger = triggerRefs.current[openTab]
        closeNow()
        trigger?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [openTab])

  // Click-outside closes the panel (panel-enter and trigger-clicks are
  // excluded so the panel stays open during normal use)
  useEffect(() => {
    if (!openTab) return
    const onPointerDown = (e: globalThis.MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (panelRef.current && panelRef.current.contains(target)) return
      for (const slug of Object.keys(triggerRefs.current)) {
        const t = triggerRefs.current[slug]
        if (t && t.contains(target)) return
      }
      closeNow()
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [openTab])

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, slug: AnimalSlug) => {
    if (e.key === "ArrowDown" || e.key === "Down") {
      // Open the panel and move focus to the first department link
      e.preventDefault()
      setOpenTab(slug)
      // rAF so the panel has rendered before we move focus
      requestAnimationFrame(() => {
        firstLinkRef.current?.focus()
      })
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpenTab((prev) => (prev === slug ? null : slug))
    }
  }

  const animalFor = (slug: string) => SHOP_NAV_TAXONOMY.find((a) => a.slug === slug)

  return (
    <div className="relative hidden border-b border-ink/10 bg-white md:block">
      <nav
        aria-label="Shop categories"
        className="mx-auto flex max-w-[1400px] items-stretch gap-1 px-4 lg:px-6"
      >
        {ANIMAL_TABS.map((tab) => {
          const animal = animalFor(tab.slug)
          if (!animal) return null
          const isOpen = openTab === tab.slug
          const isActive = activeAnimal === tab.slug
          return (
            <MegaMenuTab
              key={tab.slug}
              buttonRef={(el) => {
                triggerRefs.current[tab.slug] = el
              }}
              label={tab.label}
              isOpen={isOpen}
              isActive={isActive}
              onMouseEnter={() => openPanel(tab.slug)}
              onMouseLeave={scheduleClose}
              onKeyDown={(e) => onTabKeyDown(e, tab.slug)}
            />
          )
        })}

        {LINK_TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href + "/"))
          return (
            <MegaMenuTab
              key={tab.label}
              as="link"
              href={tab.href}
              label={tab.label}
              isActive={active}
            />
          )
        })}

        <Link
          href="/book/appointment"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-md bg-gold-deep px-4 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-gold"
        >
          Book a Groom
        </Link>
      </nav>

      {openTab && (() => {
        const animal = animalFor(openTab)
        if (!animal) return null
        return (
          <MegaMenuPanel
            panelRef={(el) => {
              panelRef.current = el
            }}
            animal={animal}
            firstLinkRef={firstLinkRef}
            onEnter={cancelClose}
            onLeave={scheduleClose}
            onLinkClick={closeNow}
          />
        )
      })()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MegaMenuTab — a single horizontal tab. Renders as a <button> (when it
// opens a panel) or a <Link> (when it's a plain navigation tab). Same visual
// treatment either way: min-h-44px touch target, uppercase tracking-[0.12em]
// bold label, gold-deep underline on hover/active.
// ---------------------------------------------------------------------------

type MegaMenuTabProps =
  | {
      as?: "button"
      buttonRef?: (el: HTMLButtonElement | null) => void
      label: string
      isOpen: boolean
      isActive: boolean
      onMouseEnter: () => void
      onMouseLeave: () => void
      onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void
    }
  | {
      as: "link"
      href: string
      label: string
      isActive: boolean
    }

function MegaMenuTab(props: MegaMenuTabProps) {
  if (props.as === "link") {
    const { href, label, isActive } = props
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={`flex min-h-[44px] flex-1 items-center justify-center border-b-2 px-4 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors duration-150 ${
          isActive
            ? "border-gold-deep text-ink"
            : "border-transparent text-ink hover:text-gold-deep"
        }`}
      >
        {label}
      </Link>
    )
  }

  const { buttonRef, label, isOpen, isActive, onMouseEnter, onMouseLeave, onKeyDown } = props
  return (
    <button
      type="button"
      ref={buttonRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onKeyDown={onKeyDown}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-[44px] flex-1 items-center justify-center border-b-2 px-4 text-[12px] font-bold uppercase tracking-[0.12em] transition-colors duration-150 ${
        isOpen || isActive
          ? "border-gold-deep text-ink"
          : "border-transparent text-ink hover:text-gold-deep"
      }`}
    >
      {label}
    </button>
  )
}

// ---------------------------------------------------------------------------
// MegaMenuPanel — the full-width multi-column panel that slides down below
// the tab strip when a Dog/Cat tab is hovered. Contains:
//   • Eyebrow label ("DOG SUPPLIES")
//   • Multi-column grid of DepartmentColumns (one per department, up to 4 cols)
//   • Footer row: local-pickup promo + "Browse all {Animal} →" link
// The panel is absolutely positioned (top-full) below the tab strip.
// ---------------------------------------------------------------------------

type MegaMenuPanelProps = {
  panelRef?: (el: HTMLDivElement | null) => void
  animal: ShopNavAnimal
  firstLinkRef: RefObject<HTMLAnchorElement | null>
  onEnter: () => void
  onLeave: () => void
  onLinkClick: () => void
}

function MegaMenuPanel({
  panelRef,
  animal,
  firstLinkRef,
  onEnter,
  onLeave,
  onLinkClick,
}: MegaMenuPanelProps) {
  return (
    <div
      ref={panelRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      role="menu"
      aria-label={`${animal.name} menu`}
      className="absolute left-0 right-0 top-full z-40 border-b border-ink/10 bg-white shadow-2xl"
    >
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-soft">
          {animal.name}
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-4">
          {animal.departments.map((dept, i) => (
            <DepartmentColumn
              key={dept.slug}
              animalSlug={animal.slug}
              dept={dept}
              onLinkClick={onLinkClick}
              firstLinkRef={i === 0 ? firstLinkRef : undefined}
            />
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink-soft">
            Free local pickup at 699 Waring Rd, Memphis.{" "}
            <Link
              href="/book/appointment"
              onClick={onLinkClick}
              className="font-bold text-gold-deep hover:underline"
            >
              Book a groom while you shop →
            </Link>
          </p>
          <Link
            href={`/shop/${animal.slug}`}
            onClick={onLinkClick}
            className="text-[12px] font-bold text-gold-deep hover:underline"
          >
            Browse all {animal.name} →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DepartmentColumn — one department + its visible subcategories (capped at 6).
// If the department has more than 6 subcategories, a "+N more" link points to
// the department landing page.
// ---------------------------------------------------------------------------

type DepartmentColumnProps = {
  animalSlug: string
  dept: ShopNavDepartment
  onLinkClick: () => void
  firstLinkRef?: RefObject<HTMLAnchorElement | null>
}

function DepartmentColumn({
  animalSlug,
  dept,
  onLinkClick,
  firstLinkRef,
}: DepartmentColumnProps) {
  const visibleSubs = dept.subcategories.slice(0, MAX_VISIBLE_SUBS)
  const overflow = dept.subcategories.length - visibleSubs.length

  return (
    <div>
      <Link
        href={departmentPath(animalSlug, dept.slug)}
        onClick={onLinkClick}
        ref={firstLinkRef}
        className="block text-[14px] font-bold text-ink transition-colors hover:text-gold-deep"
      >
        {dept.name}
      </Link>
      {dept.subcategories.length > 0 && (
        <ul className="mt-2">
          {visibleSubs.map((sub) => (
            <li key={sub.slug}>
              <Link
                href={subcategoryPath(animalSlug, dept.slug, sub.slug)}
                onClick={onLinkClick}
                className="block py-0.5 text-[12px] text-ink-soft transition-colors hover:text-ink hover:underline"
              >
                {sub.name}
              </Link>
            </li>
          ))}
          {overflow > 0 && (
            <li>
              <Link
                href={departmentPath(animalSlug, dept.slug)}
                onClick={onLinkClick}
                className="block py-0.5 text-[12px] font-bold text-gold-deep hover:underline"
              >
                +{overflow} more
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
