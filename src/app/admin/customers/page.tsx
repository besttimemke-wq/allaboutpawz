"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Plus, Export } from "@phosphor-icons/react"
import Link from "next/link"

type Customer = {
  id: string; firstName: string; lastName: string; email: string; phone: string
  city: string; state: string; stripeCustomerId: string | null; createdAt: string
}

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Record<string, number>>({})

  useEffect(() => {
    Promise.all([
      fetch("/api/cms/customers").then((r) => r.json()),
      fetch("/api/cms/stats").then((r) => r.json()),
    ]).then(([customers, s]) => {
      setRows(customers)
      setStats(s?.counts || {})
    }).finally(() => setLoading(false))
  }, [])

  const columns: Column<Customer>[] = [
    { key: "name", label: "Customer", sortable: true, render: (r) => (
      <span className="font-medium text-zinc-900">{r.firstName} {r.lastName}</span>
    )},
    { key: "phone", label: "Phone", render: (r) => r.phone || "—" },
    { key: "email", label: "Email", render: (r) => r.email || "—" },
    { key: "city", label: "City", sortable: true, render: (r) => r.city ? `${r.city}, ${r.state}` : "—" },
    { key: "stripe", label: "Stripe", render: (r) => r.stripeCustomerId ? (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Linked</span>
    ) : (
      <span className="text-[9px] text-zinc-400">—</span>
    )},
    { key: "createdAt", label: "Joined", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">CRM</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Customers</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{rows.length} customers</p>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search name, email, phone, Stripe ID…"
        searchKeys={["firstName", "lastName", "email", "phone", "stripeCustomerId", "city"]}
        pageSize={100}
        rowHref={(r) => `/admin/customers/${r.id}`}
        headerActions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50">
              <Export size={14} weight="bold" /> Export
            </button>
            <Link href="/admin/customers/new" className="flex items-center gap-1.5 rounded-md bg-black px-3 py-2 text-[11px] font-semibold text-white hover:bg-zinc-800">
              <Plus size={14} weight="bold" /> Add Customer
            </Link>
          </div>
        }
      />
    </div>
  )
}
