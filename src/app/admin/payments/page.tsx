"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"

type Payment = {
  id: string; bookingId: string | null; customerId: string | null
  amount: string; type: string; status: string
  stripeCheckoutSessionId: string | null; stripePaymentIntentId: string | null
  createdAt: string
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/cms/payments").then((r) => r.json()).then(setRows).finally(() => setLoading(false))
  }, [])

  const columns: Column<Payment>[] = [
    { key: "createdAt", label: "Date", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "amount", label: "Amount", sortable: true, align: "right", render: (r) => <span className="font-semibold">{r.amount || "—"}</span> },
    { key: "type", label: "Type", render: (r) => r.type || "—" },
    { key: "status", label: "Status", render: (r) => {
      const cls = r.status === "paid" || r.status === "succeeded" ? "bg-emerald-100 text-emerald-700" : r.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"
      return <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${cls}`}>{r.status}</span>
    }},
    { key: "customerId", label: "Customer", render: (r) => r.customerId ? r.customerId.slice(0, 8) + "…" : "—" },
    { key: "bookingId", label: "Booking", render: (r) => r.bookingId ? r.bookingId.slice(0, 8) + "…" : "—" },
    { key: "stripe", label: "Stripe Ref", render: (r) => r.stripeCheckoutSessionId ? <code className="text-[10px] text-zinc-500">{r.stripeCheckoutSessionId.slice(0, 20)}…</code> : "—" },
  ]

  const totalPaid = rows.filter((r) => r.status === "paid" || r.status === "succeeded").reduce((s, r) => s + parseFloat(r.amount?.replace(/[^0-9.]/g, "") || "0"), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Commerce</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Payments</h1>
        </div>
        <div className="rounded-lg border border-black/10 bg-white px-4 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Total Collected</p>
          <p className="text-[20px] font-bold text-emerald-600">${totalPaid.toFixed(2)}</p>
        </div>
      </div>
      <DataTable rows={rows} columns={columns} loading={loading} searchPlaceholder="Search payments…" searchKeys={["amount", "type", "status", "stripeCheckoutSessionId"]} pageSize={50} />
    </div>
  )
}
