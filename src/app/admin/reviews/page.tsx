"use client"

import { useEffect, useMemo, useState } from "react"
import { DataTable, type Column } from "@/components/admin/data-table"
import { Star, Check, EyeSlash, Trash } from "@phosphor-icons/react"

type Review = {
  id: string
  productId: string
  author: string
  rating: number
  title: string | null
  body: string
  verified: boolean
  visible: boolean
  status: string | null
  createdAt: string
}

type Product = { id: string; name: string; image: string | null }

type ReviewStatus = "approved" | "pending" | "hidden"

// Reviews carry an explicit status column; anything without one falls back
// to its visible flag (visible = approved, otherwise pending).
const statusOf = (r: Review): ReviewStatus =>
  (r.status === "approved" || r.status === "pending" || r.status === "hidden" ? r.status
    : r.visible ? "approved" : "pending") as ReviewStatus

const STATUS_CHIP: Record<ReviewStatus, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700" },
  hidden: { label: "Hidden", cls: "bg-zinc-100 text-zinc-500" },
}

export default function ReviewsPage() {
  const [rows, setRows] = useState<Review[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [productFilter, setProductFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch("/api/cms/product_reviews").then((r) => r.json()),
      fetch("/api/cms/products").then((r) => r.json()),
    ]).then(([reviews, prods]) => {
      if (!alive) return
      setRows(Array.isArray(reviews) ? reviews : [])
      setProducts(Array.isArray(prods) ? prods : [])
    }).catch(() => {}).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const productById = useMemo(() => {
    const m = new Map<string, Product>()
    for (const p of products) m.set(p.id, p)
    return m
  }, [products])

  const filtered = rows.filter((r) => {
    if (productFilter !== "ALL" && r.productId !== productFilter) return false
    if (statusFilter !== "ALL" && statusOf(r) !== statusFilter) return false
    return true
  })

  const pendingCount = rows.filter((r) => statusOf(r) === "pending").length
  const avgRating = rows.length
    ? (rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.length).toFixed(1)
    : "—"

  const update = async (r: Review, data: Partial<Review>) => {
    const res = await fetch(`/api/cms/product_reviews/${r.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      alert("Could not update the review. Please try again.")
      return
    }
    setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...data } as Review : x)))
  }

  const del = async (r: Review) => {
    if (!confirm("Delete this review? This cannot be undone.")) return
    const res = await fetch(`/api/cms/product_reviews/${r.id}`, { method: "DELETE" })
    if (!res.ok) {
      alert("Could not delete the review. Please try again.")
      return
    }
    setRows((prev) => prev.filter((x) => x.id !== r.id))
  }

  const columns: Column<Review>[] = [
    { key: "productId", label: "Product", render: (r) => {
      const p = productById.get(r.productId)
      return (
        <div className="flex items-center gap-2">
          {p?.image ? (
             
            <img src={p.image} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
          ) : <div className="h-6 w-6 shrink-0 rounded bg-zinc-100" />}
          <span className="max-w-[140px] truncate font-medium text-zinc-900">{p?.name || "—"}</span>
        </div>
      )
    }},
    { key: "author", label: "Author", render: (r) => (
      <span className="font-medium text-zinc-900">{r.author}</span>
    )},
    { key: "rating", label: "Rating", sortable: true, width: "90px", render: (r) => (
      <span className="flex items-center gap-0.5" aria-label={`${r.rating} of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={12} weight={i < r.rating ? "fill" : "regular"} className={i < r.rating ? "text-amber-400" : "text-zinc-300"} />
        ))}
      </span>
    )},
    { key: "title", label: "Title", render: (r) => r.title || "—" },
    { key: "body", label: "Review", render: (r) => (
      <span className="line-clamp-2 max-w-[280px] font-normal text-zinc-400">{r.body}</span>
    )},
    { key: "verified", label: "Verified", render: (r) => r.verified ? (
      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">Verified</span>
    ) : (
      <span className="text-[9px] text-zinc-400">—</span>
    )},
    { key: "visible", label: "Status", render: (r) => {
      const s = STATUS_CHIP[statusOf(r)]
      return <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${s.cls}`}>{s.label}</span>
    }},
    { key: "createdAt", label: "Received", sortable: true, render: (r) => new Date(r.createdAt).toLocaleDateString() },
    { key: "actions", label: "Actions", align: "right", width: "170px", render: (r) => {
      const s = statusOf(r)
      return (
        <div className="flex items-center justify-end gap-1.5">
          {s !== "approved" && (
            <button
              onClick={() => update(r, { status: "approved", visible: true })}
              title="Approve — show on the product page"
              className="flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
            >
              <Check size={11} weight="bold" /> Approve
            </button>
          )}
          {s !== "hidden" && (
            <button
              onClick={() => update(r, { status: "hidden", visible: false })}
              title="Hide from the product page"
              className="flex items-center gap-1 rounded border border-black/10 bg-white px-2 py-1 text-[10px] font-bold text-zinc-600 hover:bg-zinc-50"
            >
              <EyeSlash size={11} weight="bold" /> Hide
            </button>
          )}
          <button
            onClick={() => del(r)}
            title="Delete review"
            className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-100"
          >
            <Trash size={11} weight="bold" />
          </button>
        </div>
      )
    }},
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Commerce</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">Reviews</h1>
        <p className="mt-1 text-[12px] text-zinc-500">{rows.length} reviews across {new Set(rows.map((r) => r.productId)).size} products · approve to publish on the product page</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Total reviews</p>
          <p className="mt-1 text-[20px] font-semibold tracking-tight text-zinc-900">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Pending approval</p>
          <p className={`mt-1 text-[20px] font-semibold tracking-tight ${pendingCount > 0 ? "text-amber-600" : "text-zinc-900"}`}>{pendingCount}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Average rating</p>
          <p className="mt-1 flex items-center gap-1.5 text-[20px] font-semibold tracking-tight text-zinc-900">
            {avgRating}{rows.length > 0 && <Star size={13} weight="fill" className="text-amber-400" />}
          </p>
        </div>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search author, title, review…"
        searchKeys={["author", "title", "body"]}
        pageSize={50}
        filters={
          <div className="flex items-center gap-2">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              aria-label="Filter by product"
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="ALL">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-md border border-black/10 bg-white px-3 py-2 text-[12px] font-medium text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="ALL">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        }
      />
    </div>
  )
}
