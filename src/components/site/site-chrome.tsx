"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Phone, Mail, Clock, CalendarDays, Facebook, Instagram, Menu, ShoppingBag,
  ShieldCheck, Sparkles, Truck, Heart, MapPin,
} from "lucide-react"
import { PawGlyph } from "./brand"
import { NAV } from "./nav"
import { useCart } from "@/lib/wizard/cart-store"
import { ShopMegaMenu } from "./islands/shop-mega-menu"

function TikTok({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.5 3c.3 2 1.6 3.5 3.5 3.8v2.6c-1.3.1-2.6-.3-3.7-1v6.3c0 3.2-2.5 5.6-5.6 5.6A5.6 5.6 0 1 1 12 8.9v2.8a2.8 2.8 0 1 0 2 2.7V3h2.5Z" />
    </svg>
  )
}
function Pinterest({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.7 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.3 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.4-4.4-3 0-4.8 2.2-4.8 4.6 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1c0 .2-.1.3-.3.2-1.3-.6-2-2.4-2-3.9 0-3.2 2.3-6.1 6.6-6.1 3.5 0 6.2 2.5 6.2 5.8 0 3.4-2.2 6.2-5.2 6.2-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.8 2-1.2 2.6A10 10 0 1 0 12 2Z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Bag button — the customer's bag, always in the top corner of EVERY page.
// No box: the bag glyph sits directly against the canvas (transparent, no
// border, no fill) with its live count badge. Rendered client-side only
// (count lives in the persisted Zustand store); the hydration gate keeps SSR
// markup stable so the count never flashes or mismatches.
// ---------------------------------------------------------------------------
function HeaderBagLink() {
  const items = useCart((s) => s.items)
  const emptySubscribe = () => () => {}
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const count = hydrated ? items.reduce((n, i) => n + i.quantity, 0) : null

  return (
    <Link
      href="/shop/bag"
      aria-label={count != null ? `View bag (${count} ${count === 1 ? "item" : "items"})` : "View bag"}
      className="relative flex shrink-0 items-center justify-center p-1.5 transition-transform hover:scale-[1.06]"
    >
      <ShoppingBag className="h-6 w-6 text-gold-deep" strokeWidth={1.6} aria-hidden="true" />
      {count != null && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center bg-gold-deep px-1 text-[9.5px] font-bold leading-none text-cream">
          {count}
        </span>
      )}
    </Link>
  )
}

export function SiteChrome({ children, settings }: { children: ReactNode; settings?: Record<string, string> }) {
  const pathname = usePathname()
  const isShopRoute = pathname.startsWith("/shop")
  const [open, setOpen] = useState(false)
  // Settings arrive SERVER-RENDERED (fetched once in the (site) layout) —
  // no client-side fetch, no flash. Code fallbacks cover any missing key.
  const s = { ...(settings || {}) }
  return (
    <div className="min-h-screen bg-cream">
      <Sidebar settings={s} pathname={pathname} />
      {/* Mobile bar — logo left, bag + menu right (sticky, top of every page) */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-gold/25 bg-cream px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2">
          <PawGlyph className="h-5 w-5 text-gold-deep" />
          <span className="font-display text-[13px] tracking-[0.14em] text-ink">ALL ABOUT PAWZ</span>
        </Link>
        <div className="flex items-center gap-3">
          <HeaderBagLink />
          <button onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <Menu className="h-5 w-5 text-ink" />
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-b border-gold/25 bg-cream px-6 py-4 lg:hidden">
          <ul className="space-y-2">
            {NAV.map((i) => (
              <li key={i.to}>
                <Link
                  href={i.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 text-[11px] font-bold tracking-[0.13em] text-ink-soft"
                >
                  <span className="text-gold-deep">{i.n}</span>
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <main className="lg:pl-[232px]">{children}</main>
      {/* The full shop footer lives ONLY on shop routes. Every other page
          keeps the original thin strip footer. */}
      {isShopRoute ? <ShopFooter settings={s} /> : <ThinFooter settings={s} />}
    </div>
  )
}

function Sidebar({ settings, pathname }: { settings: Record<string, string>; pathname: string }) {
  const s = settings
  const phone = s.phone || "901-800-7182"
  const email = s.email || "help@aapawz.com"
  return (
    <aside className="marble fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col overflow-y-auto border-r border-gold/25 bg-cream lg:flex">
      <div className="px-7 pt-8">
        <Link href="/" className="block w-full text-center">
          <PawGlyph className="mx-auto h-9 w-9 text-gold-deep" />
          <div className="mt-3 font-display text-[15px] tracking-[0.16em] text-ink">ALL ABOUT PAWZ</div>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span className="h-px w-4 bg-gold/60" />
            <span className="text-[8px] font-bold tracking-[0.3em] text-ink-soft">LUXURY GROOMING</span>
            <span className="h-px w-4 bg-gold/60" />
          </div>
          <div className="script mt-3 text-[19px]">From Pawz to PAWfection</div>
        </Link>
      </div>
      <div className="mt-6 h-px bg-gold/20" />
      <nav className="relative px-7 py-6">
        <span className="absolute bottom-9 left-[42px] top-9 w-px bg-gold/25" />
        <ul className="space-y-[9px]">
          {NAV.map((item) => {
            const active = pathname === item.to
            return (
              <li key={item.to}>
                <Link href={item.to} aria-current={active ? "page" : undefined} className="group relative flex items-center gap-3">
                  <span className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-colors ${active ? "border-gold-deep bg-gold-deep text-on-dark" : "border-gold/45 bg-cream text-gold-deep"}`}>
                    {item.n}
                  </span>
                  <span className={`text-[10.5px] font-bold tracking-[0.13em] transition-colors ${active ? "text-gold-deep" : "text-ink-soft group-hover:text-gold-deep"}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="px-6">
        <Link href="/book" className="flex w-full items-center justify-center gap-2 border border-gold-deep/70 bg-cream-deep px-3 py-3.5 text-[9.5px] font-bold tracking-[0.14em] text-ink transition-colors hover:bg-gold-deep hover:text-on-dark">
          <CalendarDays className="h-3.5 w-3.5 text-gold-deep" />
          BOOK APPOINTMENT
        </Link>
      </div>
      <div className="mt-7 space-y-3.5 px-7 text-[10.5px] leading-[1.55] text-ink-soft">
        <div className="flex gap-2.5">
          <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
          <span>{phone}</span>
        </div>
        <div className="flex gap-2.5">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
          <span>{email}</span>
        </div>
        <div className="flex gap-2.5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-deep" />
          <span>
            Tue – Sat {s.hoursTueSat || "9am – 6pm"}<br />
            Sun {s.hoursSun || "10am – 4pm"}<br />
            Mon {s.hoursMon || "Closed"}
          </span>
        </div>
      </div>
      <div className="mt-6 flex gap-2 px-7">
        {[Facebook, Instagram, TikTok, Pinterest].map((Icon, i) => (
          <a key={i} href={s.instagram || "#"} aria-label="Social profile" className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-cream transition-colors hover:bg-gold-deep">
            <Icon className="h-3.5 w-3.5" />
          </a>
        ))}
      </div>
    </aside>
  )
}

// One header row — never two. Interior pages pass `crumbs` (the real
// breadcrumb chain: SHOP / …ancestors / current) so the departments row and
// the breadcrumb are a SINGLE bar: number + breadcrumb + mega menu + bag.
// Pages without a chain (landing, bag, about…) pass a plain `label`.
export const crumbLinkCls =
  "text-[10.5px] font-bold tracking-[0.2em] text-ink-soft transition-colors hover:text-gold-deep"

export function PageHeader({
  n,
  label,
  crumbs,
}: {
  n: string
  label?: string
  crumbs?: { name: string; href: string | null }[]
}) {
  const pathname = usePathname()
  // Shop routes carry the departments mega menu in the header bar, so the
  // collection sidebar stays clean (subcategories + price; facets on demand).
  const isShop = pathname.startsWith("/shop")
  // Mobile shows the current page name only (the full chain wraps a narrow
  // bar into stacked lines); desktop shows the collapsed crumb chain.
  const mobileLabel = crumbs && crumbs.length > 0 ? crumbs[crumbs.length - 1].name : label
  return (
    // `relative` anchors the mega menu's full-width panel to this header row.
    <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-gold/25 bg-cream px-8 py-3.5 lg:px-12">
      <span className="text-[10.5px] font-bold tracking-[0.2em] text-gold-deep">{n}</span>
      {crumbs ? (
        <>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5 lg:flex">
          {(() => {
            // The remote repo's breadcrumb shape: SHOP / … / immediate
            // parent / current — never the full ancestor chain (a long chain
            // wraps the bar into a second line, which reads as a double
            // header). Middle levels collapse into a single ellipsis.
            const rest = crumbs.slice(1)
            const middleDropped = rest.length > 2
            const items: ({ name: string; href: string | null } | "…")[] = [
              crumbs[0],
              ...(middleDropped ? (["…"] as const) : []),
              ...rest.slice(-2),
            ]
            return items.map((c, i) => {
              const isCurrent = c !== "…" && (i === items.length - 1 || c.href == null)
              return (
                <span key={i} className="flex min-w-0 items-center gap-2.5">
                  {i > 0 && <span className="text-[10px] text-gold/50">/</span>}
                  {c === "…" ? (
                    <span className="text-[10.5px] font-bold tracking-[0.2em] text-gold/50">…</span>
                  ) : isCurrent ? (
                    <span className="max-w-[280px] truncate text-[10.5px] font-bold tracking-[0.2em] text-ink">
                      {c.name}
                    </span>
                  ) : (
                    <Link href={c.href as string} className={`${crumbLinkCls} max-w-[220px] truncate`}>
                      {c.name}
                    </Link>
                  )}
                </span>
              )
            })
          })()}
          </nav>
          <span className="min-w-0 truncate text-[10.5px] font-bold tracking-[0.2em] text-ink-soft lg:hidden">
            {mobileLabel}
          </span>
        </>
      ) : (
        <span className="min-w-0 truncate text-[10.5px] font-bold tracking-[0.2em] text-ink-soft">{label}</span>
      )}
      <span className="ml-auto shrink-0 lg:ml-0">{isShop && <ShopMegaMenu />}</span>
      {/* Bag — top-right corner on desktop. Mobile keeps its own sticky top
          bar (logo + bag + menu) on every page, so the bag never renders
          twice in the mobile header. */}
      <span className="ml-auto hidden shrink-0 lg:block">
        <HeaderBagLink />
      </span>
    </div>
  )
}

// Slim top utility strip for pages that render their own hero instead of a
// PageHeader (currently the home page) — keeps the bag in the top-right
// corner on desktop. Mobile already has the sticky mobile bar with the bag.
export function TopUtilityBar() {
  return (
    <div className="hidden items-center justify-end border-b border-gold/25 bg-cream px-8 py-2 lg:flex">
      <HeaderBagLink />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Thin strip footer — the original site footer, restored for every page that
// is NOT part of the shop (home, about, services, pricing, gallery, book,
// contact, faq, policies…). One thin band: logo + nav row + legal hairline.
// ---------------------------------------------------------------------------
function ThinFooter({ settings }: { settings: Record<string, string> }) {
  const links: [string, string][] = [
    ["HOME", "/"], ["ABOUT US", "/about"], ["SERVICES", "/services"],
    ["PRICING", "/pricing"], ["SHOP", "/shop"], ["GALLERY", "/gallery"],
    ["BOOK", "/book"], ["CONTACT", "/contact"],
  ]
  return (
    <footer className="bg-ink px-8 py-8 lg:px-12">
      {/* Logo sits to the LEFT of the nav row — the footer stays one thin
          band; the legal row runs below it under a hairline. */}
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-7 lg:flex-row lg:items-center lg:justify-between">
          <img src="/brand/footer-logo.png" alt="All About Pawz" width={1021} height={729} className="h-12 w-auto lg:h-14" />
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
            {links.map(([label, to]) => (
              <Link key={to} href={to} className="text-[10px] font-bold tracking-[0.16em] text-on-dark-muted hover:text-gold">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 border-t border-gold/15 pt-5 text-[10.5px] text-on-dark-muted">
          <p>{settings.footerNote || "© 2024 All About Pawz LLC. All rights reserved."}</p>
          <Link href="/policies/privacy-policy" className="text-gold hover:underline">Privacy Policy</Link>
          <Link href="/policies/terms-of-service" className="text-gold hover:underline">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Shop footer — the full e-commerce footer (the remote design wins; adapted
// to the site token system). Contained to /shop routes ONLY. Carries the 10
// departments (SEO internal links), the Stripe-required policy links, and
// salon contact from live settings.
// ---------------------------------------------------------------------------
const FOOTER_DEPARTMENTS: [string, string][] = [
  ["Pet Supplies", "/shop/category/pet-supplies"],
  ["Dog Feeding & Watering", "/shop/category/dog-feeding-watering-supplies"],
  ["Dog Grooming Supplies", "/shop/category/dog-grooming-supplies"],
  ["Dog Beds & Furniture", "/shop/category/dog-beds-furniture"],
  ["Dog Treats, Cookies & Snacks", "/shop/category/dog-treat-cookies-biscuits-snacks"],
  ["Dog Apparel & Accessories", "/shop/category/dog-apparel-accessories"],
  ["Dog Chew Toys", "/shop/category/dog-chew-toys"],
  ["Collars, Harnesses & Leashes", "/shop/category/collars-harnesses-leashes"],
  ["Carriers & Travel Products", "/shop/category/carriers-travel-products"],
  ["Health Supplies", "/shop/category/health-supplies"],
]

const FOOTER_VALUE_PROPS: { Icon: typeof Heart; title: string; body: string }[] = [
  { Icon: ShieldCheck, title: "SALON TESTED", body: "Used daily by professional groomers in our salon." },
  { Icon: Sparkles, title: "CRUELTY-FREE & PURE", body: "Sulfate-free, paraben-free, ethically formulated." },
  { Icon: Truck, title: "FREE DELIVERY", body: "Complimentary standard shipping on every order." },
  { Icon: Heart, title: "PAWS-FIRST GUARANTEE", body: "30-day happiness guarantee on every product." },
]

const FOOTER_POLICY_LINKS: [string, string][] = [
  ["Privacy Policy", "/policies/privacy-policy"],
  ["Terms of Service", "/policies/terms-of-service"],
  ["Refunds & Returns", "/policies/refunds-returns"],
  ["Shipping & Delivery", "/policies/shipping-delivery"],
]

function ShopFooter({ settings }: { settings: Record<string, string> }) {
  const phone = settings.phone || "901-800-7182"
  const email = settings.email || "help@aapawz.com"
  const address =
    [settings.addressLine1, settings.addressLine2].filter(Boolean).join(", ") ||
    "699 Waring Rd, Memphis, TN 38122"
  return (
    <footer id="site-footer" className="bg-ink px-8 pb-8 pt-12 lg:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Value props band */}
        <div className="grid grid-cols-1 gap-6 border-b border-gold/15 pb-10 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_VALUE_PROPS.map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={1.4} aria-hidden="true" />
              <div>
                <h4 className="text-[10px] font-bold tracking-[0.16em] text-on-dark">{title}</h4>
                <p className="mt-1 text-[10.5px] leading-[1.6] text-on-dark-muted">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main columns */}
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand + contact */}
          <div className="space-y-4 lg:col-span-2">
            <img src="/brand/footer-logo.png" alt="All About Pawz" width={1021} height={729} className="h-12 w-auto" />
            <p className="max-w-sm text-[11px] leading-[1.75] text-on-dark-muted">
              Dedicated to canine health, comfort, and radiant vitality — a modern pet shop built on salon expertise, clean ingredients, and honest design.
            </p>
            <div className="space-y-1.5 text-[10.5px] text-on-dark-muted">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                <span>{email}</span>
              </div>
            </div>
          </div>

          {/* Departments 1–5 */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold tracking-[0.2em] text-gold">DEPARTMENTS · 01–05</h4>
            <ul className="space-y-2">
              {FOOTER_DEPARTMENTS.slice(0, 5).map(([name, to]) => (
                <li key={to}>
                  <Link href={to} className="text-[11px] leading-[1.6] text-on-dark-muted transition-colors hover:text-gold">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Departments 6–10 */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold tracking-[0.2em] text-gold">DEPARTMENTS · 06–10</h4>
            <ul className="space-y-2">
              {FOOTER_DEPARTMENTS.slice(5, 10).map(([name, to]) => (
                <li key={to}>
                  <Link href={to} className="text-[11px] leading-[1.6] text-on-dark-muted transition-colors hover:text-gold">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Shop & salon */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold tracking-[0.2em] text-gold">SHOP & SALON</h4>
            <ul className="space-y-2">
              {([
                ["Shop the Collection", "/shop"],
                ["Book an Appointment", "/book"],
                ["Our Services", "/services"],
                ["FAQ & Policies", "/faq"],
                ["Contact Us", "/contact"],
              ] as [string, string][]).map(([name, to]) => (
                <li key={to}>
                  <Link href={to} className="text-[11px] leading-[1.6] text-on-dark-muted transition-colors hover:text-gold">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal bar — Stripe-required policy links */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-gold/15 pt-6 text-center text-[10px] tracking-[0.08em] text-on-dark-muted sm:flex-row sm:text-left">
          <p>{settings.footerNote || "© 2024 All About Pawz LLC. All rights reserved."}</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {FOOTER_POLICY_LINKS.map(([name, to]) => (
              <Link key={to} href={to} className="text-gold transition-colors hover:text-on-dark">
                {name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
