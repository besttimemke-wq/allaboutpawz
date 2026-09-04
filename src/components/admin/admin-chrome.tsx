"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  SquaresFour, Scissors, ShoppingBag, Image as ImageIcon, Tag, Sparkle,
  Question, ShieldCheck, Quotes, CalendarCheck, PhoneCall, Tray,
  Gear, ArrowLeft, PawPrint, ListChecks, Users, Dog, PaintBrush,
  Scissors as ScissorsIcon, HandsPraying, Drop, Tooth, PawPrint as PawIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import { useEffect, useState } from "react"
import { cms } from "@/lib/cms-api"

type Section = string
type Item = { key: Section; label: string; icon: Icon; badge?: "pendingBookings" | "unreadMessages" | "pendingConsultations" }
type Group = { group: string; items: Item[] }

const NAV: Group[] = [
  { group: "Overview", items: [{ key: "dashboard", label: "Dashboard", icon: SquaresFour }] },
  {
    group: "Content",
    items: [
      { key: "services", label: "Services", icon: Scissors },
      { key: "products", label: "Shop", icon: ShoppingBag },
      { key: "gallery", label: "Gallery", icon: ImageIcon },
      { key: "packages", label: "Pricing Packages", icon: Tag },
      { key: "addons", label: "Add-ons", icon: Sparkle },
      { key: "faqs", label: "FAQs", icon: Question },
      { key: "policies", label: "Policies", icon: ShieldCheck },
      { key: "testimonials", label: "Testimonials", icon: Quotes },
    ],
  },
  {
    group: "Tray",
    items: [
      { key: "bookings", label: "Bookings", icon: CalendarCheck, badge: "pendingBookings" },
      { key: "consultations", label: "Consultations", icon: PhoneCall, badge: "pendingConsultations" },
      { key: "messages", label: "Messages", icon: Tray, badge: "unreadMessages" },
    ],
  },
  { group: "Commerce", items: [
    { key: "orders", label: "Orders", icon: ShoppingBag },
    { key: "customers", label: "Customers", icon: Users },
    { key: "activity_log", label: "Activity Log", icon: ListChecks },
  ] },
  { group: "Grooming Data", items: [
    { key: "dog_breeds", label: "Dog Breeds", icon: Dog },
    { key: "haircut_styles", label: "Haircut Styles", icon: ScissorsIcon },
    { key: "coat_types", label: "Coat Types", icon: PaintBrush },
    { key: "coat_textures", label: "Coat Textures", icon: PaintBrush },
    { key: "coat_lengths", label: "Coat Lengths", icon: PaintBrush },
    { key: "coat_conditions", label: "Coat Conditions", icon: PaintBrush },
    { key: "shedding_levels", label: "Shedding Levels", icon: Drop },
    { key: "clip_lengths", label: "Clip Lengths", icon: ScissorsIcon },
    { key: "body_styles", label: "Body Styles", icon: ScissorsIcon },
    { key: "leg_styles", label: "Leg Styles", icon: ScissorsIcon },
    { key: "face_styles", label: "Face Styles", icon: ScissorsIcon },
    { key: "head_styles", label: "Head Styles", icon: ScissorsIcon },
    { key: "ear_styles", label: "Ear Styles", icon: ScissorsIcon },
    { key: "tail_styles", label: "Tail Styles", icon: ScissorsIcon },
    { key: "feet_styles", label: "Feet Styles", icon: PawIcon },
    { key: "sanitary_options", label: "Sanitary", icon: HandsPraying },
    { key: "nail_services", label: "Nail Services", icon: PawIcon },
    { key: "paw_pad_services", label: "Paw Pad Services", icon: PawIcon },
    { key: "ear_services", label: "Ear Services", icon: Sparkle },
    { key: "teeth_services", label: "Teeth Services", icon: Tooth },
    { key: "deshedding_services", label: "Deshedding", icon: Drop },
    { key: "coat_techniques", label: "Coat Techniques", icon: PaintBrush },
  ] },
  { group: "Staff", items: [
    { key: "staff", label: "Groomers", icon: Users },
  ] },
  { group: "System", items: [{ key: "settings", label: "Settings", icon: Gear }] },
]

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === "/admin" ? "dashboard" : (pathname.split("/")[2] || "dashboard")
  const [counts, setCounts] = useState({ pendingBookings: 0, unreadMessages: 0, pendingConsultations: 0 })

  useEffect(() => {
    let alive = true
    cms.stats()
      .then((s) => alive && setCounts({ pendingBookings: s.pendingBookings, unreadMessages: s.unreadMessages, pendingConsultations: s.pendingConsultations }))
      .catch(() => {})
    return () => { alive = false }
  }, [active])

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-black/10 bg-black md:flex">
        <div className="px-6 pt-7">
          <Link href="/" className="block w-full text-center">
            <PawPrint size={32} weight="fill" className="mx-auto text-white" />
            <div className="mt-2 text-[14px] font-semibold tracking-[0.14em] text-white">ALL ABOUT PAWZ</div>
            <div className="mt-1 text-[8px] font-bold tracking-[0.3em] text-zinc-500">CONTENT STUDIO</div>
          </Link>
        </div>
        <div className="mx-6 mt-5 h-px bg-white/10" />
        <ScrollArea className="flex-1">
          <nav className="px-4 py-4">
            {NAV.map((grp) => (
              <div key={grp.group} className="mb-3">
                <p className="px-3 pb-1 pt-3 text-[8.5px] font-bold tracking-[0.2em] text-zinc-600">{grp.group.toUpperCase()}</p>
                <ul className="space-y-0.5">
                  {grp.items.map((item) => {
                    const isActive = active === item.key
                    const badge = item.badge ? counts[item.badge] : 0
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.key === "dashboard" ? "/admin" : `/admin/${item.key}`}
                          className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[11px] font-bold tracking-[0.1em] transition-colors ${isActive ? "bg-white text-black" : "text-zinc-400 hover:bg-white/5 hover:text-white"}`}
                        >
                          <item.icon size={16} weight="fill" className="shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <Badge className={`${isActive ? "bg-black text-white" : "bg-white text-black"} px-1.5 py-0 text-[9px]`}>{badge}</Badge>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </ScrollArea>
        <div className="border-t border-white/10 px-6 py-4">
          <Link href="/" className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] text-zinc-400 hover:text-white">
            <ArrowLeft size={14} weight="bold" /> Back to site
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-white px-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-zinc-400 hover:text-black">
              <ArrowLeft size={14} weight="bold" /> Site
            </Link>
            <span className="text-black/20">/</span>
            <span className="text-[11px] font-bold tracking-[0.12em] text-black">Content Studio</span>
          </div>
          <div className="flex items-center gap-2">
            <BackendBadge />
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-[11px] font-bold text-white">AP</span>
          </div>
        </header>
        <main className="flex flex-1 flex-col">
          <div className="flex-1">
            <div className="mx-auto max-w-7xl px-6 py-8 md:px-10">{children}</div>
          </div>
          <footer className="mt-auto border-t border-black/10 bg-black px-6 py-3">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 text-[10px] text-zinc-500">
              <span>© 2024 All About Pawz LLC — Content Studio</span>
              <span className="flex items-center gap-1.5"><PawPrint size={12} weight="fill" className="text-zinc-400" /> From Pawz to PAWfection</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}

function BackendBadge() {
  const [info, setInfo] = useState<{ backend: string; supabaseConfigured: boolean } | null>(null)
  useEffect(() => {
    let alive = true
    cms.status().then((s) => alive && setInfo(s)).catch(() => {})
    return () => { alive = false }
  }, [])
  if (!info) return null
  const isSupabase = info.backend === "supabase"
  return (
    <span className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:flex ${isSupabase ? "border-emerald-500/30 bg-emerald-50 text-emerald-700" : "border-amber-500/30 bg-amber-50 text-amber-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isSupabase ? "bg-emerald-500" : "bg-amber-500"}`} />
      {isSupabase ? "Supabase" : "SQLite"}
    </span>
  )
}
