"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Plus } from "@phosphor-icons/react"
import Link from "next/link"

type Booking = {
  id: string; ownerName: string; dogName: string; breed: string | null
  service: string; size: string | null; date: string; time: string
  status: string; paymentStatus: string | null; groomerId: string | null
  customerId: string | null; dogId: string | null; createdAt: string
}

const STATUS_BADGE: Record<string, string> = {
  PAYMENT_PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-zinc-800 text-white",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  CHECKED_IN: "bg-sky-100 text-sky-700",
  IN_SERVICE: "bg-indigo-100 text-indigo-700",
  NO_SHOW: "bg-red-100 text-red-700",
}

export default function BookingsPage() {
  const [rows, setRows] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")

  const filters = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PAYMENT_PENDING" },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Cancelled", value: "CANCELLED" },
  ]

  useEffect(() => {
    fetch("/api/cms/bookings").then((r) => r.json()).then(setRows).finally(() => setLoading(false))
  }, [])

  const filtered = filter === "ALL" ? rows : rows.filter((r) => r.status === filter)

  const columns: Column<Booking>[] = [
    { key: "date", label: "Date", sortable: true, render: (r) => (
      <div><span className="text-zinc-900">{r.date}</span><span className="block text-[10px] text-zinc-400">{r.time}</span></div>
    )},
    { key: "ownerName", label: "Customer", sortable: true, render: (r) => (
      <div><span className="font-medium text-zinc-900">{r.ownerName}</span>{r.customerId && <Link href={`/admin/customers/${r.customerId}`} className="block text-[9px] text-blue-500 hover:underline">view profile</Link>}</div>
    )},
    { key: "dogName", label: "Dog", render: (r) => (
      <div><span className="text-zinc-900">{r.dogName}</span>{r.breed && <span className="block text-[10px] text-zinc-400">{r.breed}</span>}</div>
    )},
    { key: "service", label: "Service", sortable: true },
    { key: "status", label: "Status", render: (r) => (
      <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${STATUS_BADGE[r.status] || "bg-zinc-100 text-zinc-500"}`}>{r.status}</span>
    )},
    { key: "paymentStatus", label: "Payment", render: (r) => (
      <span className={`text-[10px] ${r.paymentStatus === "DEPOSIT_PAID" ? "text-emerald-600" : "text-zinc-400"}`}>{r.paymentStatus || "—"}</span>
    )},
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Operations</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Bookings</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{rows.length} total bookings</p>
      </div>

      {/* Saved views / tabs */}
      <div className="flex items-center gap-1 border-b border-black/10">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`border-b-2 px-3 py-2 text-[11px] font-semibold transition-colors ${
              filter === f.value ? "border-black text-black" : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            {f.label} {f.value !== "ALL" && `(${rows.filter((r) => r.status === f.value).length})`}
          </button>
        ))}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search customer, dog, service…"
        searchKeys={["ownerName", "dogName", "service", "breed"]}
        pageSize={100}
        rowHref={(r) => `/admin/bookings/${r.id}`}
      />
    </div>
  )
}
