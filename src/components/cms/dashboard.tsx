"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Scissors, ShoppingBag, Image as ImageIcon, Tag, Sparkle, Question,
  ShieldCheck, Quotes, CalendarCheck, PhoneCall, Tray, EnvelopeSimple,
  ArrowUpRight, TrendUp, PawPrint,
} from "@phosphor-icons/react"
import { cms, type Stats } from "@/lib/cms-api"

const COUNT_META: { key: string; label: string; icon: typeof Scissors; section: string }[] = [
  { key: "services", label: "Services", icon: Scissors, section: "services" },
  { key: "products", label: "Products", icon: ShoppingBag, section: "products" },
  { key: "gallery", label: "Gallery", icon: ImageIcon, section: "gallery" },
  { key: "packages", label: "Packages", icon: Tag, section: "packages" },
  { key: "addons", label: "Add-ons", icon: Sparkle, section: "addons" },
  { key: "faqs", label: "FAQs", icon: Question, section: "faqs" },
  { key: "policies", label: "Policies", icon: ShieldCheck, section: "policies" },
  { key: "testimonials", label: "Testimonials", icon: Quotes, section: "testimonials" },
  { key: "bookings", label: "Bookings", icon: CalendarCheck, section: "bookings" },
  { key: "consultations", label: "Consultations", icon: PhoneCall, section: "consultations" },
  { key: "messages", label: "Messages", icon: Tray, section: "messages" },
  { key: "newsletter", label: "Newsletter", icon: EnvelopeSimple, section: "settings" },
]

const ALERTS = [
  { key: "pendingBookings", label: "Pending bookings", section: "bookings" },
  { key: "pendingConsultations", label: "Pending consultations", section: "consultations" },
  { key: "unreadMessages", label: "Unread messages", section: "messages" },
] as const

export function Dashboard({ onNavigate }: { onNavigate: (section: string) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    cms.stats()
      .then((s) => alive && setStats(s))
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Content Studio</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-zinc-900">
          Manage every detail of your site.
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="h-px w-12 bg-zinc-200" />
          <PawPrint size={14} className="text-zinc-400" />
          <span className="h-px w-12 bg-zinc-200" />
        </div>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-zinc-500">
          Edit services, products, pricing, gallery, FAQs and more. Changes save instantly to the live site.
        </p>
      </div>

      {/* Alerts */}
      <div className="grid gap-4 sm:grid-cols-3">
        {ALERTS.map((al) => {
          const count = loading ? null : (stats as any)?.[al.key] ?? 0
          return (
            <button key={al.key} onClick={() => onNavigate(al.section)} className="text-left">
              <Card className="flex items-center justify-between border border-black/10 bg-white p-5 transition-colors hover:border-zinc-900">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{al.label}</p>
                  <span className="mt-1.5 block text-[28px] font-semibold leading-none text-zinc-900">
                    {count === null ? <Skeleton className="h-7 w-8" /> : count}
                  </span>
                </div>
                <Badge className="bg-black px-2 py-1 text-[10px] font-semibold text-white hover:bg-zinc-800">
                  <ArrowUpRight size={12} weight="bold" className="mr-1" /> review
                </Badge>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Content counts */}
      <Card className="border border-black/10 bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <TrendUp size={20} weight="fill" className="text-zinc-900" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Content overview</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COUNT_META.map((m) => (
            <button
              key={m.key}
              onClick={() => onNavigate(m.section)}
              className="group flex items-center gap-3 rounded-md border border-black/10 bg-white px-4 py-3 text-left transition-colors hover:border-zinc-900 hover:bg-zinc-50"
            >
              <span className="text-zinc-900">
                <m.icon size={20} weight="fill" />
              </span>
              <div className="min-w-0">
                <span className="block text-[20px] font-semibold leading-none text-zinc-900">
                  {loading ? <Skeleton className="h-5 w-6" /> : stats?.counts?.[m.key] ?? 0}
                </span>
                <p className="mt-1 truncate text-[10.5px] font-semibold uppercase tracking-wide text-zinc-400">{m.label}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Recent activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col border border-black/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Recent bookings</h3>
            <button onClick={() => onNavigate("bookings")} className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900">View all</button>
          </div>
          <ScrollArea className="max-h-72">
            <ul className="space-y-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : (stats?.recentBookings?.length ?? 0) === 0 ? (
                <li className="py-8 text-center text-[13px] text-zinc-400">No bookings yet.</li>
              ) : (
                stats?.recentBookings.map((b) => (
                  <li key={b.id} className="flex items-center justify-between rounded-md border border-black/10 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">{b.ownerName} · {b.dogName}</p>
                      <p className="truncate text-[11px] text-zinc-400">{b.service} · {b.date} {b.time}</p>
                    </div>
                    <Badge className="bg-black px-2 py-0.5 text-[9.5px] font-semibold text-white">{b.status}</Badge>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col border border-black/10 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Recent messages</h3>
            <button onClick={() => onNavigate("messages")} className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-900">View all</button>
          </div>
          <ScrollArea className="max-h-72">
            <ul className="space-y-2">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : (stats?.recentMessages?.length ?? 0) === 0 ? (
                <li className="py-8 text-center text-[13px] text-zinc-400">No messages yet.</li>
              ) : (
                stats?.recentMessages.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-black/10 bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-900">{m.name}</p>
                      <p className="truncate text-[11px] text-zinc-400">{m.subject || m.message}</p>
                    </div>
                    <Badge className={m.status === "UNREAD" ? "bg-black px-2 py-0.5 text-[9.5px] font-semibold text-white" : "bg-zinc-100 px-2 py-0.5 text-[9.5px] font-semibold text-zinc-500"}>{m.status}</Badge>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-zinc-400">
        <PawPrint size={14} className="text-zinc-400" />
        Every edit saves instantly to the live site.
      </div>
    </div>
  )
}
