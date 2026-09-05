"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Phone, Mail, Clock, CalendarDays, Facebook, Instagram, Menu, ShoppingBag,
} from "lucide-react"
import { PawGlyph } from "./brand"
import { NAV } from "./nav"
import { useCart } from "@/lib/wizard/cart-store"

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
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-cream-deep/60 text-ink-soft transition-colors hover:border-gold-deep/60 hover:text-gold-deep"
      >
        <ShoppingBag className="h-4 w-4 text-gold-deep" strokeWidth={1.7} aria-hidden="true" />
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
      className="flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] text-ink-soft transition-colors hover:text-gold-deep"
    >
      <span className="relative flex h-7 w-7 items-center justify-center">
        <ShoppingBag className="h-4 w-4 text-gold-deep" strokeWidth={1.7} aria-hidden="true" />
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

export function SiteChrome({ settings, children }: { settings: Record<string, string>; children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const s = settings
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
          <HeaderBagLink variant="icon" />
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
      {/* Every page — including home — gets the same centered footer */}
      <SiteFooter settings={s} />
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

export function PageHeader({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-gold/25 bg-cream px-8 py-3.5 lg:px-12">
      <span className="text-[10.5px] font-bold tracking-[0.2em] text-gold-deep">{n}</span>
      <span className="text-[10.5px] font-bold tracking-[0.2em] text-ink-soft">{label}</span>
      {/* Bag — always visible at the top-right of every page */}
      <span className="ml-auto">
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
    <div className="hidden items-center justify-end border-b border-gold/25 bg-cream px-8 py-2.5 lg:flex">
      <HeaderBagLink />
    </div>
  )
}

function SiteFooter({ settings }: { settings: Record<string, string> }) {
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
          <a href="#" className="text-gold hover:underline">Privacy Policy</a>
          <a href="#" className="text-gold hover:underline">Terms of Service</a>
          <a href="#" className="text-gold hover:underline">Investor Information</a>
        </div>
      </div>
    </footer>
  )
}
