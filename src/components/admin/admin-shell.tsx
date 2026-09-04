"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, type ReactNode } from "react"
import {
  SquaresFour, Scissors, ShoppingBag, Image as ImageIcon, Tag, Sparkle,
  Question, ShieldCheck, Quotes, CalendarCheck, PhoneCall, Tray,
  Gear, ArrowLeft, PawPrint, ListChecks, Users, Dog, Calendar,
  CreditCard, Package, Bell, EnvelopeSimple,
  FileText, Megaphone, ChatCircle, CurrencyDollar,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import { AdminUserMenu } from "@/components/admin/user-menu"
import { cms } from "@/lib/cms-api"

// THREE DOMAINS:
// CRM = customer relationship (customers, dogs, communications)
// CMS = content published to the frontend (services, pricing, gallery, grooming data, products, site content)
// Operations = business operations (calendar, bookings, payments, staff, financial health)

type NavItem = { label: string; href: string; icon: Icon; badge?: string }
type NavGroup = { label: string; items: NavItem[] }

const TOP_NAV: { label: string; icon: Icon; items: NavItem[] }[] = [
  {
    label: "Dashboard", icon: SquaresFour,
    items: [
      { label: "Overview", href: "/admin", icon: SquaresFour },
      { label: "Activity Log", href: "/admin/activity_log", icon: ListChecks },
    ],
  },
  {
    label: "CRM", icon: Users,
    items: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Dogs", href: "/admin/dogs", icon: Dog },
      { label: "Messages", href: "/admin/messages", icon: Tray, badge: "unreadMessages" },
      { label: "Newsletter", href: "/admin/newsletter", icon: Megaphone },
    ],
  },
  {
    label: "CMS", icon: FileText,
    items: [
      { label: "Services", href: "/admin/services", icon: Scissors },
      { label: "Pricing & Packages", href: "/admin/packages", icon: Tag },
      { label: "Add-ons", href: "/admin/addons", icon: Sparkle },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Gallery", href: "/admin/gallery", icon: ImageIcon },
      { label: "Testimonials", href: "/admin/testimonials", icon: Quotes },
      { label: "FAQs", href: "/admin/faqs", icon: Question },
      { label: "Policies", href: "/admin/policies", icon: ShieldCheck },
      { label: "Grooming Data", href: "/admin/grooming-data", icon: Scissors },
      { label: "Site Settings", href: "/admin/settings", icon: Gear },
    ],
  },
  {
    label: "Operations", icon: CalendarCheck,
    items: [
      { label: "Calendar", href: "/admin/calendar", icon: Calendar },
      { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck, badge: "pendingBookings" },
      { label: "Consultations", href: "/admin/consultations", icon: PhoneCall, badge: "pendingConsultations" },
      { label: "Groomers & Staff", href: "/admin/staff", icon: Users },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    ],
  },
]

const CONTEXT_SIDEBARS: Record<string, NavGroup[]> = {
  crm: [
    { label: "CRM", items: [
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Dogs", href: "/admin/dogs", icon: Dog },
      { label: "Messages", href: "/admin/messages", icon: Tray },
      { label: "Newsletter", href: "/admin/newsletter", icon: Megaphone },
    ]},
  ],
  cms: [
    { label: "CMS", items: [
      { label: "Services", href: "/admin/services", icon: Scissors },
      { label: "Pricing & Packages", href: "/admin/packages", icon: Tag },
      { label: "Add-ons", href: "/admin/addons", icon: Sparkle },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Gallery", href: "/admin/gallery", icon: ImageIcon },
      { label: "Testimonials", href: "/admin/testimonials", icon: Quotes },
      { label: "FAQs", href: "/admin/faqs", icon: Question },
      { label: "Policies", href: "/admin/policies", icon: ShieldCheck },
      { label: "Grooming Data", href: "/admin/grooming-data", icon: Scissors },
      { label: "Site Settings", href: "/admin/settings", icon: Gear },
    ]},
  ],
  operations: [
    { label: "Operations", items: [
      { label: "Calendar", href: "/admin/calendar", icon: Calendar },
      { label: "Bookings", href: "/admin/bookings", icon: CalendarCheck },
      { label: "Consultations", href: "/admin/consultations", icon: PhoneCall },
      { label: "Groomers & Staff", href: "/admin/staff", icon: Users },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
    ]},
  ],
}

function resolveSection(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/activity_log") return "dashboard"
  if (pathname.startsWith("/admin/customers") || pathname.startsWith("/admin/dogs") ||
      pathname.startsWith("/admin/messages") || pathname.startsWith("/admin/newsletter")) return "crm"
  if (pathname.startsWith("/admin/calendar") || pathname.startsWith("/admin/bookings") ||
      pathname.startsWith("/admin/consultations") || pathname.startsWith("/admin/staff") ||
      pathname.startsWith("/admin/payments") || pathname.startsWith("/admin/orders")) return "operations"
  return "cms"
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [counts, setCounts] = useState({ pendingBookings: 0, unreadMessages: 0, pendingConsultations: 0 })

  useEffect(() => {
    let alive = true
    cms.stats().then((s) => alive && setCounts({
      pendingBookings: s.pendingBookings, unreadMessages: s.unreadMessages,
      pendingConsultations: s.pendingConsultations,
    })).catch(() => {})
    return () => { alive = false }
  }, [pathname])

  // Login page renders standalone — no shell, no nav
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  const section = resolveSection(pathname)
  const sidebarGroups = CONTEXT_SIDEBARS[section] || []

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 flex h-12 items-center gap-1 border-b border-black/10 bg-black px-4">
        <Link href="/" className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-bold tracking-wide text-zinc-400 hover:bg-white/5 hover:text-white">
          <ArrowLeft size={14} weight="bold" /> Site
        </Link>
        <span className="text-white/20">|</span>

        {TOP_NAV.map((menu) => {
          const isActive = menu.items.some((item) => pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)))
          return (
            <div key={menu.label} className="relative" onMouseEnter={() => setOpenMenu(menu.label)} onMouseLeave={() => setOpenMenu(null)}>
              <button onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
                className={`flex items-center gap-1 rounded px-3 py-1.5 text-[11px] font-bold tracking-wide transition-colors ${isActive ? "bg-white text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}>
                {menu.label}<span className="text-[8px]">▼</span>
              </button>
              {openMenu === menu.label && (
                <div className="absolute left-0 top-full min-w-[200px] border border-black/10 bg-white py-1 shadow-xl">
                  {menu.items.map((item) => {
                    const badge = item.badge ? (counts as any)[item.badge] || 0 : 0
                    const isCurrent = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setOpenMenu(null)}
                        className={`flex items-center gap-2.5 px-4 py-2 text-[12px] font-medium transition-colors ${isCurrent ? "bg-zinc-100 text-black" : "text-zinc-700 hover:bg-zinc-50"}`}>
                        <item.icon size={14} weight="fill" className={isCurrent ? "text-black" : "text-zinc-400"} />
                        <span className="flex-1">{item.label}</span>
                        {badge > 0 && <span className="rounded-full bg-black px-1.5 py-0 text-[9px] font-bold text-white">{badge}</span>}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden sm:block">
            <input placeholder="Search customers, dogs, bookings…" className="w-56 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white placeholder:text-zinc-500 focus:outline-none focus:w-72 focus:ring-1 focus:ring-white/20 transition-all" />
          </div>
          <button className="relative text-zinc-400 hover:text-white">
            <Bell size={16} weight="fill" />
            {counts.pendingBookings + counts.unreadMessages + counts.pendingConsultations > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[7px] font-bold text-white">
                {counts.pendingBookings + counts.unreadMessages + counts.pendingConsultations}
              </span>
            )}
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-black"><AdminUserMenu /></span>
        </div>
      </header>

      <div className="flex flex-1">
        {section !== "dashboard" && sidebarGroups.length > 0 && (
          <aside className="hidden w-56 shrink-0 border-r border-black/10 bg-zinc-50 md:block">
            <nav className="p-3">
              {sidebarGroups.map((grp) => (
                <div key={grp.label} className="mb-3">
                  <p className="px-3 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-400">{grp.label}</p>
                  <ul className="space-y-0.5">
                    {grp.items.map((item) => {
                      const isCurrent = pathname === item.href || (item.href && item.href !== "/admin" && pathname.startsWith(item.href))
                      return (
                        <li key={item.label}>
                          <Link href={item.href} className={`flex items-center gap-2.5 rounded px-3 py-2 text-[12px] font-medium transition-colors ${isCurrent ? "bg-black text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
                            <item.icon size={14} weight="fill" className={isCurrent ? "text-white" : "text-zinc-400"} />
                            {item.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">
            <div className="mx-auto max-w-[1400px] px-6 py-6">{children}</div>
          </div>
          <footer className="mt-auto border-t border-black/10 bg-black px-6 py-2.5">
            <div className="flex items-center justify-between text-[9px] text-zinc-500">
              <span>© 2024 All About Pawz LLC — Business OS</span>
              <span className="flex items-center gap-1"><PawPrint size={10} weight="fill" className="text-zinc-600" /> From Pawz to PAWfection</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
