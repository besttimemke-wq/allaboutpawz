"use client"

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Phone, Mail, Clock, CalendarDays, Facebook, Instagram, Menu, ShoppingBag, User,
  LayoutDashboard, Receipt, RotateCcw, Heart, Repeat, CalendarClock, Gift, Calendar,
  Stethoscope, GraduationCap, Pill, Building2, ShieldCheck, PawPrint, CreditCard,
  House, Bell, LifeBuoy, BriefcaseBusiness, LogOut, ChevronRight, X,
} from "lucide-react"
import { PawGlyph } from "./brand"
import { NAV } from "./nav"
import { useNavPromoGate, type PromoPlacement } from "./islands/promo-popup"
import { useCart } from "@/lib/wizard/cart-store"
import { BUSINESS } from "@/lib/business"
import { SiteFooter } from "@/components/site/footer"
import { ShopFlyout } from "@/components/site/shop-flyout"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"

// Nav labels that carry a promo-popup placement (owner spec §2): clicking
// SERVICES / PRICING / SHOP / BOOK surfaces the eligible offers for that
// page before navigating. Everything else navigates plain.
const NAV_PROMO_PLACEMENTS: Record<string, PromoPlacement> = {
  SERVICES: "services",
  PRICING: "pricing",
  SHOP: "shop",
  BOOK: "book",
}

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
// Bag indicator — the customer's bag, always visible at the TOP of the page.
// Rendered client-side only (count lives in localStorage); the hydration gate
// keeps SSR markup stable so the count never flashes or mismatches.
// ---------------------------------------------------------------------------
function HeaderBagLink({ variant = "label" }: { variant?: "label" | "icon" }) {
  const items = useCart((s) => s.items)
  const emptySubscribe = () => () => {}
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const count = hydrated ? items.reduce((n, i) => n + i.quantity, 0) : null

  if (variant === "icon") {
    return (
      <Link
        href="/shop/bag"
        aria-label={count != null ? `View bag (${count} ${count === 1 ? "item" : "items"})` : "View bag"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-cream-deep/60 text-ink-soft transition-colors hover:border-gold-deep/60 hover:text-black"
      >
        <ShoppingBag className="h-4 w-4 text-black" strokeWidth={1.7} aria-hidden="true" />
        {count != null && count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold-deep px-1 text-[9px] font-bold leading-none text-cream">
            {count}
          </span>
        )}
      </Link>
    )
  }

  return (
    <Link
      href="/shop/bag"
      aria-label={count != null ? `View bag (${count} ${count === 1 ? "item" : "items"})` : "View bag"}
      className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-ink-soft transition-colors hover:text-black"
    >
      <span className="relative flex h-7 w-7 items-center justify-center">
        <ShoppingBag className="h-4 w-4 text-black" strokeWidth={1.7} aria-hidden="true" />
        {count != null && count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-gold-deep px-1 text-[8px] font-bold leading-none text-cream">
            {count}
          </span>
        )}
      </span>
      BAG{count != null && count > 0 ? ` · ${count}` : ""}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Account button — SIGN IN / HI, {NAME}, at the very top of every page.
//
// ONE PERSON, ONE PERSONAL PORTAL. The session cookie is the source of truth
// (no-store fetch of /api/auth/portal-session), so a returning visitor is
// recognized the moment they enter an email or connect Google. Clicking the
// account when signed in OPENS THE CUSTOMER-PORTAL NAVIGATION DRAWER — the
// full My Account tree — right where they are. It NEVER routes through
// another sign-in page: the shopper, the learner, the booker, and the staff
// member who is also a pet parent are all the same person, and this drawer
// is that person's map. Staff additionally get one AT WORK row → their work
// console (a deliberate trip, never a hijack). Their work is separate from
// their pets.
// ---------------------------------------------------------------------------
type SessionUser = { name: string; email?: string; role: string; scope: string; membershipRole?: string }

/** Their WORK console (deliberate, separate from their personal portal). */
function workConsoleFor(u: SessionUser): string | null {
  const mr = String(u.membershipRole || "").toLowerCase()
  if (["seller", "seller", "reception"].includes(mr)) return "/seller/dashboard"
  if (u.scope === "admin") return "/admin/dashboard"
  if (u.scope === "employee") return "/groomer/dashboard"
  return null
}

/** The customer-portal tree, verbatim — the same routes the portal sidebar
 *  renders (components/pawz/Sidebar CUSTOMER_NAV), kept local so the public
 *  chrome never bundles the portal's store. */
const ACCOUNT_NAV: { category?: string; items: { label: string; icon: React.ElementType; href: string }[] }[] = [
  {
    category: "My Orders",
    items: [
      { label: "Order History", icon: Receipt, href: "/customer/orders" },
      { label: "Buy Again", icon: RotateCcw, href: "/customer/orders/buy-again" },
      { label: "Wish List", icon: Heart, href: "/customer/orders/wish-list" },
      { label: "Autoship", icon: Repeat, href: "/customer/orders/autoship" },
      { label: "Subscriptions", icon: CalendarClock, href: "/customer/orders/subscriptions" },
      { label: "Perks Dashboard", icon: Gift, href: "/customer/orders/perks" },
    ],
  },
  {
    category: "My Appointments",
    items: [
      { label: "Grooming Appointments", icon: Calendar, href: "/customer/appointments" },
      { label: "Vet Appointments", icon: Stethoscope, href: "/customer/appointments/vet" },
    ],
  },
  { items: [{ label: "Learn Courses", icon: GraduationCap, href: "/customer/learn" }] },
  {
    category: "My Pet Health",
    items: [
      { label: "My Prescriptions", icon: Pill, href: "/customer/health/prescriptions" },
      { label: "My Vet", icon: Building2, href: "/customer/health/my-vet" },
      { label: "Insurance", icon: ShieldCheck, href: "/customer/health/insurance" },
    ],
  },
  {
    category: "My Profile",
    items: [
      { label: "My Pets", icon: PawPrint, href: "/customer/pets" },
      { label: "Payment Methods", icon: CreditCard, href: "/customer/profile/payment-methods" },
      { label: "Address Book", icon: House, href: "/customer/profile/address-book" },
      { label: "Communication Preferences", icon: Bell, href: "/customer/profile/communication-preferences" },
    ],
  },
  { items: [{ label: "Need Help?", icon: LifeBuoy, href: "/customer/help" }] },
]

function HeaderAccountLink({ variant = "label" }: { variant?: "label" | "icon" }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  useEffect(() => {
    let alive = true
    fetch("/api/auth/portal-session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) {
          setUser(d && d.user ? d.user : null)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (alive) setLoaded(true)
      })
    const onSessionChange = () => {
      fetch("/api/auth/portal-session", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && setUser(d && d.user ? d.user : null))
        .catch(() => {})
    }
    window.addEventListener("pawz:session-changed", onSessionChange)
    return () => {
      alive = false
      window.removeEventListener("pawz:session-changed", onSessionChange)
    }
  }, [])

  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "there"
  const workConsole = user ? workConsoleFor(user) : null

  // One sign-out behavior everywhere: clear the session server-side, tell
  // every mounted listener, land on home.
  const signOut = async () => {
    setSigningOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    setUser(null)
    setOpen(false)
    window.dispatchEvent(new Event("pawz:session-changed"))
    router.replace("/")
    router.refresh()
  }

  const icon = (
    <span className="relative flex h-7 w-7 items-center justify-center">
      <User className="h-4 w-4 text-black" strokeWidth={1.7} aria-hidden="true" />
    </span>
  )

  // Signed out — the only case that goes to the sign-in flow.
  if (loaded && !user) {
    return (
      <Link
        href="/access-customer"
        aria-label="Sign in to your account"
        className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-ink-soft transition-colors hover:text-black"
      >
        {icon}
        {variant === "label" ? "SIGN IN" : null}
      </Link>
    )
  }

  const trigger =
    variant === "icon" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Hi ${firstName} — open your account menu`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-cream-deep/60 text-ink-soft transition-colors hover:border-gold-deep/60 hover:text-black"
      >
        <User className="h-4 w-4 text-black" strokeWidth={1.7} aria-hidden="true" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Hi ${firstName} — open your account menu`}
        aria-haspopup="dialog"
        className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-ink-soft transition-colors hover:text-black"
      >
        {icon}
        {loaded && user ? `HI, ${firstName.toUpperCase()}` : "ACCOUNT"}
      </button>
    )

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col border-l border-gold/30 bg-cream p-0 sm:max-w-[360px]"
        >
          <SheetHeader className="border-b border-gold/25 bg-white px-6 pb-4 pt-6 text-left">
            <SheetTitle className="font-display text-[15px] tracking-[0.1em] text-ink">
              HI, {firstName.toUpperCase()}
            </SheetTitle>
            <SheetDescription className="truncate text-[11px] text-ink-soft">
              {user?.email || "Your account"}
            </SheetDescription>
            <Link
              href="/customer/dashboard"
              onClick={() => setOpen(false)}
              className="mt-3 flex min-h-[44px] w-full items-center justify-between rounded-md bg-ink px-4 text-[10.5px] font-bold tracking-[0.14em] text-cream transition-colors hover:bg-gold-deep"
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                GO TO MY ACCOUNT
              </span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </SheetHeader>

          {/* The full My Account tree — same routes as the portal sidebar.
              Scrollable: the drawer is a map, never a wall. */}
          <nav
            aria-label="Your account"
            className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5"
          >
            {ACCOUNT_NAV.map((block, bi) => (
              <div key={bi} className={bi > 0 ? "mt-5" : ""}>
                {block.category && (
                  <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                    {block.category}
                  </p>
                )}
                <ul>
                  {block.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="group flex min-h-[40px] items-center gap-3 rounded-md px-2 text-[11.5px] font-semibold text-ink-soft transition-colors hover:bg-white hover:text-black"
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-black" strokeWidth={1.8} aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* STAFF: their work console is a deliberate trip from their
                personal portal — offered, never forced. */}
            {workConsole && (
              <div className="mt-5 border-t border-gold/25 pt-5">
                <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                  At work
                </p>
                <Link
                  href={workConsole}
                  onClick={() => setOpen(false)}
                  className="group flex min-h-[44px] items-center gap-3 rounded-md border border-ink/15 bg-white px-3 text-[11.5px] font-bold text-ink transition-colors hover:border-gold-deep/50"
                >
                  <BriefcaseBusiness className="h-4 w-4 shrink-0 text-ink-soft" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1">Open staff console</span>
                  <ChevronRight className="h-4 w-4 text-black" aria-hidden="true" />
                </Link>
                <p className="mt-1.5 px-1 text-[10px] leading-snug text-neutral-400">
                  Your salon tools — separate from your pets and appointments.
                </p>
              </div>
            )}
          </nav>

          <div className="border-t border-gold/25 bg-white px-6 py-4">
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-ink/15 text-[10.5px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:border-gold-deep/50 hover:text-black disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {signingOut ? "SIGNING OUT…" : "SIGN OUT"}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function SiteChrome({ children, settings: initialSettings }: { children: ReactNode; settings?: Record<string, string> }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  // Nav promo popups — the Services / Pricing / Shop / Book nav clicks offer
  // the eligible published promos for that page (once per session per
  // placement; no offers → straight through). Owner spec §2.
  const { gate, dialog } = useNavPromoGate()
  // CSR data layer: the chrome shell renders instantly with built-in
  // fallbacks, then fills in salon settings (address, phone, hours) from the
  // site API after paint. No database in the render path.
  const [fetched, setFetched] = useState<Record<string, string> | null>(null)
  useEffect(() => {
    let alive = true
    fetch("/api/cms/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d === "object" && !Array.isArray(d)) setFetched(d)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
  const s = { ...(fetched || initialSettings || {}) }
  return (
    <div className="min-h-screen bg-white">
      {/* Hamburger sidebar — slides in from left on ALL screen sizes. */}

      <Sidebar settings={s} pathname={pathname} gate={gate} open={open} onClose={() => setOpen(false)} />
      {/* ONE tan header bar — All About Pawz + login + cart. Per spec D:
          one bar only, no second bar, no local-pride strip. Everything else
          on every page is white. */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-[#E8D5B7] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setOpen((o) => !o)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded text-black hover:bg-black/10">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <PawGlyph className="h-5 w-5 text-black" />
            <span className="font-display text-sm font-bold tracking-[0.14em] text-black">ALL ABOUT PAWZ</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <HeaderAccountLink variant="icon" />
          <HeaderBagLink variant="icon" />
        </div>
      </div>
      <main>{children}</main>
      {dialog}
      <SiteFooter />
    </div>
  )
}

function Sidebar({ settings, pathname, gate, open, onClose }: { settings: Record<string, string>; pathname: string; gate: ReturnType<typeof useNavPromoGate>["gate"]; open: boolean; onClose: () => void }) {
  const [shopHovered, setShopHovered] = useState(false)
  const s = settings
  const phone = s.phone || "901-722-1114"
  const email = s.email || "booking@aapawz.com"
  return (
    <aside className={`marble fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col overflow-y-auto border-r border-gold/25 bg-cream transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      {/* Close button — top right of the sidebar */}
      <button onClick={onClose} aria-label="Close menu" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded text-ink-soft hover:text-black">
        <X className="h-5 w-5" />
      </button>
      <div className="px-7 pt-8">
        <Link href="/" onClick={onClose} className="block w-full cursor-pointer text-center">
          <PawGlyph className="mx-auto h-9 w-9 text-black" />
          <div className="mt-3 font-display text-[15px] tracking-[0.16em] text-ink">ALL ABOUT PAWZ</div>
        </Link>
      </div>
      <div className="mt-6 h-px bg-gold/20" />
      <div className="px-7 pt-5">
        <Link href="/book/appointment" onClick={onClose} className="flex w-full cursor-pointer items-center justify-center gap-2 border border-gold-deep/70 bg-cream-deep px-3 py-3.5 text-[9.5px] font-bold tracking-[0.14em] text-ink transition-colors hover:bg-gold-deep hover:text-on-dark">
          <CalendarDays className="h-3.5 w-3.5 text-black" />
          BOOK APPOINTMENT
        </Link>
      </div>
      <div className="px-7 pt-3">
        <HeaderAccountLink />
      </div>
      <nav className="relative px-7 py-6">
        <span className="absolute bottom-9 left-[42px] top-9 w-px bg-gold/25" />
        <ul className="space-y-[9px]">
          {NAV.map((item) => {
            const active = pathname === item.to
            const isShop = item.label === "SHOP"
            return (
              <li
                key={item.to}
                className={isShop ? "relative" : ""}
                onMouseEnter={isShop ? () => setShopHovered(true) : undefined}
                onMouseLeave={isShop ? () => setShopHovered(false) : undefined}
              >
                <Link
                  href={item.to}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    onClose()
                    const placement = NAV_PROMO_PLACEMENTS[item.label]
                    if (placement) gate(placement, e, item.to)
                  }}
                  className="group relative flex cursor-pointer items-center gap-3"
                >
                  <span className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[9px] font-bold transition-colors ${active ? "border-gold-deep bg-gold-deep text-on-dark" : "border-gold/45 bg-cream text-black"}`}>
                    {item.n}
                  </span>
                  <span className={`text-[10.5px] font-bold tracking-[0.13em] transition-colors ${active ? "text-black" : "text-ink-soft group-hover:text-black"}`}>
                    {item.label}
                  </span>
                  {isShop && <ChevronRight size={10} className="text-gray-400" />}
                </Link>
                {isShop && shopHovered && (
                  <ShopFlyout onClose={onClose} />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="mt-7 space-y-3.5 px-7 text-[10.5px] leading-[1.55] text-ink-soft">
        <div className="flex gap-2.5">
          <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black" />
          <span>{phone}</span>
        </div>
        <div className="flex gap-2.5">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black" />
          <span>{email}</span>
        </div>
        <div className="flex gap-2.5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black" />
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

export function PageHeader({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-gold/25 bg-cream px-8 py-3.5 lg:px-12">
      <span className="text-[10.5px] font-bold tracking-[0.2em] text-black">{n}</span>
      <span className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft">{label}</span>
      {/* Account + bag — always visible at the top-right of every page */}
      <span className="ml-auto flex items-center gap-5">
        <HeaderAccountLink />
        <HeaderBagLink />
      </span>
    </div>
  )
}

// Slim top utility strip for pages that render their own hero instead of a
// PageHeader (currently the home page) — keeps the bag visible at the top on
// desktop. Mobile already has the sticky mobile bar with the bag icon.
export function TopUtilityBar() {
  return (
    <div className="hidden items-center justify-end gap-5 border-b border-gold/25 bg-cream px-8 py-2.5 lg:flex">
      <HeaderAccountLink />
      <HeaderBagLink />
    </div>
  )
}
// Old inline SiteFooter removed — replaced by the data-driven
// SiteFooter component in src/components/site/footer.tsx (7 columns +
// NAP block + legal row, driven by src/lib/footer-nav.ts).

