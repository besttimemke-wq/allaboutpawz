"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Plus, Trash, Package, Tag, CreditCard, Image as ImageIcon, Check } from "@phosphor-icons/react"
import { ImageAssetPicker } from "@/components/cms/asset-picker"
import { ASSETS } from "@/lib/cms-config"

type Product = {
  id: string; name: string; price: string; category: string | null
  description: string | null; badge: string | null; image: string | null
  alt: string | null; stripePriceId: string | null; order: number; visible: boolean
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`/api/cms/products/${id}`).then((r) => r.json()).then((d) => {
      setProduct(d); setForm(d)
    }).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="py-20 text-center text-zinc-400">Loading product…</div>
  if (!product) return notFound()

  const save = async () => {
    setSaving(true); setSaved(false)
    await fetch(`/api/cms/products/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setProduct({ ...product, ...form } as Product)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const del = async () => {
    if (!confirm("Delete this product?")) return
    await fetch(`/api/cms/products/${id}`, { method: "DELETE" })
    window.location.href = "/admin/products"
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-zinc-400 hover:text-black">
          <ArrowLeft size={14} weight="bold" /> Products
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-black/10 pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Commerce / Product</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">{product.name}</h1>
          <p className="mt-1 text-[12px] text-zinc-400">{product.price} · {product.category || "Uncategorized"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={del} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-100">
            <Trash size={14} weight="fill" /> Delete
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-[11px] font-bold text-white hover:bg-zinc-800 disabled:opacity-40">
            {saving ? "Saving…" : saved ? <><Check size={14} weight="bold" /> Saved</> : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: product info */}
        <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Product Information</h3>
          <Field label="Name" value={form.name || ""} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Category" value={form.category || ""} onChange={(v) => setForm({ ...form, category: v })} placeholder="Shampoo, Tools, Accessories…" />
          <Field label="Price" value={form.price || ""} onChange={(v) => setForm({ ...form, price: v })} placeholder="$34.00" />
          <Field label="Badge" value={form.badge || ""} onChange={(v) => setForm({ ...form, badge: v })} placeholder="Bestseller" />
          <div>
            <label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">Description</label>
            <textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
          </div>
          <Field label="Order" type="number" value={String(form.order ?? 0)} onChange={(v) => setForm({ ...form, order: Number(v) })} />
          <div className="flex items-center justify-between rounded-md border border-black/10 px-4 py-3">
            <span className="text-[12px] font-medium text-zinc-700">Visible on site</span>
            <button
              onClick={() => setForm({ ...form, visible: !form.visible })}
              className={`relative h-5 w-9 rounded-full transition-colors ${form.visible ? "bg-black" : "bg-zinc-300"}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${form.visible ? "left-4" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Right column: image + stripe */}
        <div className="space-y-4">
          <div className="rounded-lg border border-black/10 bg-white p-6">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Product Image</h3>
            <ImageAssetPicker value={form.image || ""} onChange={(v) => setForm({ ...form, image: v })} assets={ASSETS} />
            <div className="mt-3">
              <Field label="Alt text" value={form.alt || ""} onChange={(v) => setForm({ ...form, alt: v })} />
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-6">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Stripe Integration</h3>
            <Field label="Stripe Price ID" value={form.stripePriceId || ""} onChange={(v) => setForm({ ...form, stripePriceId: v })} placeholder="price_… (enables checkout)" />
            <p className="mt-2 text-[11px] text-zinc-400">Create this product in Stripe, then paste the Price ID here to enable online checkout.</p>
            {product.stripePriceId ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                <Check size={12} weight="bold" /> Checkout enabled
              </span>
            ) : (
              <span className="mt-2 inline-block text-[10px] text-zinc-400">In-store only — no Stripe Price linked</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
    </div>
  )
}
