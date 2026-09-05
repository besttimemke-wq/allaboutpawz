"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Plus } from "@phosphor-icons/react"
import Link from "next/link"

type Consultation = {
  id: string; name: string; dogName: string | null; breed: string | null
  concerns: string | null; preferredTime: string | null; preferredDate: string | null
  phone: string | null; email: string | null; status: string
  customerId: string | null; createdAt: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  REQUESTED: "bg-amber-100 text-amber-700",
  CONTACTED: "bg-sky-100 text-sky-700",
  SCHEDULED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-zinc-800 text-white",
  CONVERTED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
}

export default function ConsultationsPage() {
  const [rows, setRows] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")

  useEffect(() => {
    let alive = true
    fetch("/api/cms/consultations").then((r) => r.json()).then((d) => { if (alive) { setRows(d); setLoading(false) } }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = filter === "ALL" ? rows : rows.filter((r) => r.status === filter)

  const columns: Column<Consultation>[] = [
    { key: "createdAt", label: "Requested", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "name", label: "Customer", sortable: true, render: (r) => (
      <div><span className="font-medium text-zinc-900">{r.name}</span>{r.customerId && <Link href={`/admin/customers/${r.customerId}`} className="block text-[9px] text-blue-500 hover:underline">view profile</Link>}</div>
    )},
    { key: "dogName", label: "Dog", render: (r) => r.dogName || "—" },
    { key: "preferredDate", label: "Preferred Date", render: (r) => r.preferredDate || r.preferredTime || "—" },
    { key: "status", label: "Status", render: (r) => (
      <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${STATUS_BADGE[r.status] || "bg-zinc-100 text-zinc-500"}`}>{r.status}</span>
    )},
  ]

  const tabs = [
    { label: "All", value: "ALL" },
    { label: "Pending", value: "PENDING" },
    { label: "Contacted", value: "CONTACTED" },
    { label: "Scheduled", value: "SCHEDULED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Converted", value: "CONVERTED" },
    { label: "Cancelled", value: "CANCELLED" },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Operations</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Consultations</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{rows.length} consultation requests</p>
      </div>

      <div className="flex items-center gap-1 border-b border-black/10">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => setFilter(t.value)} className={`border-b-2 px-3 py-2 text-[11px] font-semibold transition-colors ${filter === t.value ? "border-black text-black" : "border-transparent text-zinc-400 hover:text-zinc-700"}`}>
            {t.label} {t.value !== "ALL" && `(${rows.filter((r) => r.status === t.value).length})`}
          </button>
        ))}
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search name, dog, email…"
        searchKeys={["name", "dogName", "email", "breed"]}
        pageSize={50}
        rowHref={(r) => `/admin/consultations/${r.id}`}
      />
    </div>
  )
}
