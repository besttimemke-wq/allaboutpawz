"use client"

import { useEffect, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Plus, Export, ArrowsClockwise } from "@phosphor-icons/react"
import Link from "next/link"

type Product = {
  id: string; name: string; price: string; category: string | null
  stripePriceId: string | null; stripeProductId: string | null; badge: string | null; visible: boolean
  order: number; image: string | null; stock: number | null; createdAt: string
}

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetch("/api/cms/products").then((r) => r.json()).then((d) => setRows(d)).finally(() => setLoading(false))
  }, [])

  const syncToStripe = async (ids: string[]) => {
    if (ids.length === 0) return
    setSyncing(true)
    try {
      const res = await fetch("/api/shop/products/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: ids }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.ok) {
        alert(d.error || "Stripe sync failed.")
      } else if (d.failed?.length) {
        const names = d.failed.map((f: any) => f.name).join(", ")
        alert(`Synced with errors — failed: ${names}.`)
      }
      window.location.reload()
    } catch (e: any) {
      alert(e?.message || "Stripe sync failed.")
      setSyncing(false)
    }
  }

  const columns: Column<Product>[] = [
    {
      key: "image", label: "", width: "48px",
      render: (r) => r.image ? (
         
        <img src={r.image} alt="" className="h-8 w-8 rounded object-cover" />
      ) : <div className="h-8 w-8 rounded bg-zinc-100" />,
    },
    { key: "name", label: "Product", sortable: true, render: (r) => (
      <span className="font-medium text-zinc-900">{r.name}</span>
    )},
    { key: "category", label: "Category", sortable: true, render: (r) => r.category || "—" },
    { key: "price", label: "Price", sortable: true, align: "right", render: (r) => (
      <span className="font-semibold">{r.price}</span>
    )},
    { key: "stock", label: "Stock", sortable: true, align: "right", render: (r) => (
      <span className="text-zinc-500">{r.stock != null ? `${r.stock} units` : "—"}</span>
    )},
    { key: "stripePriceId", label: "Stripe", render: (r) => (r.stripeProductId || r.stripePriceId) ? (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Linked</span>
    ) : (
      <span className="text-[9px] text-zinc-400">Not linked</span>
    )},
    { key: "badge", label: "Badge", render: (r) => r.badge || "—" },
    { key: "visible", label: "Status", render: (r) => r.visible ? (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Active</span>
    ) : (
      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-500">Hidden</span>
    )},
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Commerce</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Products</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{rows.length} products in catalog · syncs to the /shop page and Stripe checkout</p>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search product name, SKU…"
        searchKeys={["name", "category", "price", "badge"]}
        pageSize={100}
        rowHref={(r) => `/admin/products/${r.id}`}
        selectable
        bulkActions={[
          { label: "Sync to Stripe", onClick: (ids) => syncToStripe(ids) },
          { label: "Activate", onClick: async (ids) => { await Promise.all(ids.map((id) => fetch(`/api/cms/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visible: true }) }))); window.location.reload() } },
          { label: "Hide", onClick: async (ids) => { await Promise.all(ids.map((id) => fetch(`/api/cms/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visible: false }) }))); window.location.reload() } },
          { label: "Delete", onClick: async (ids) => { if (!confirm(`Delete ${ids.length} products?`)) return; await Promise.all(ids.map((id) => fetch(`/api/cms/products/${id}`, { method: "DELETE" }))); window.location.reload() } },
        ]}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncToStripe(rows.filter((r) => r.visible).map((r) => r.id))}
              disabled={syncing || loading}
              className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ArrowsClockwise size={14} weight="bold" className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "Sync all to Stripe"}
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50">
              <Export size={14} weight="bold" /> Export
            </button>
            <Link href="/admin/products/new" className="flex items-center gap-1.5 rounded-md bg-black px-3 py-2 text-[11px] font-semibold text-white hover:bg-zinc-800">
              <Plus size={14} weight="bold" /> Add Product
            </Link>
          </div>
        }
      />
    </div>
  )
}
