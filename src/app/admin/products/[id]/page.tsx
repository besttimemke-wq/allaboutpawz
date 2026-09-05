"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import {
  ArrowLeft, Trash, Check, Package, Article, ClipboardText,
  Image as ImageIcon, CreditCard, ArrowsClockwise, WarningCircle,
} from "@phosphor-icons/react"
import { ImageAssetPicker } from "@/components/cms/asset-picker"
import { ASSETS } from "@/lib/cms-config"
import { Skeleton } from "@/components/ui/skeleton"

// Node shape returned by GET /api/shop/categories (migration 0004 taxonomy).
type CategoryNode = {
  id: number
  name: string
  slug: string
  parentId: number | null
  productCount: number
  children: CategoryNode[]
}

type Product = {
  id: string
  name: string
  price: string
  categoryId: number | null
  category: string | null
  badge: string | null
  order: number
  visible: boolean
  featured: boolean
  stock: number | null
  slug: string | null
  shortDescription: string | null
  description: string | null
  materials: string | null
  ingredients: string | null
  directions: string | null
  warranty: string | null
  specs: string | null
  image: string | null
  alt: string | null
  stripeProductId: string | null
  stripePriceId: string | null
}

type ProductForm = Omit<Product, "id" | "categoryId" | "category" | "badge" | "slug" | "shortDescription" | "description" | "materials" | "ingredients" | "directions" | "warranty" | "specs" | "image" | "alt" | "stripeProductId" | "stripePriceId"> & {
  categoryId: string; category: string; badge: string; slug: string; shortDescription: string
  description: string; materials: string; ingredients: string; directions: string
  warranty: string; specs: string; image: string; alt: string
  stripeProductId: string; stripePriceId: string
}

const EMPTY_FORM: ProductForm = {
  name: "", price: "", categoryId: "", category: "", badge: "", order: 0, visible: true, featured: false,
  stock: 25, slug: "", shortDescription: "", description: "", materials: "", ingredients: "",
  directions: "", warranty: "", specs: "", image: "", alt: "",
  stripeProductId: "", stripePriceId: "",
}

function toForm(p: Product): ProductForm {
  return {
    name: p.name || "", price: p.price || "", categoryId: p.categoryId != null ? String(p.categoryId) : "", category: p.category || "", badge: p.badge || "",
    order: typeof p.order === "number" ? p.order : 0, visible: p.visible !== false,
    featured: p.featured === true, stock: typeof p.stock === "number" ? p.stock : null,
    slug: p.slug || "", shortDescription: p.shortDescription || "", description: p.description || "",
    materials: p.materials || "", ingredients: p.ingredients || "", directions: p.directions || "",
    warranty: p.warranty || "", specs: p.specs || "", image: p.image || "", alt: p.alt || "",
    stripeProductId: p.stripeProductId || "", stripePriceId: p.stripePriceId || "",
  }
}

const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const isNew = id === "new"

  const [product, setProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [taxonomy, setTaxonomy] = useState<{ ready: boolean; categories: CategoryNode[]; flat: CategoryNode[] } | null>(null)
  const [taxonomyLoading, setTaxonomyLoading] = useState(true)
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncNote, setSyncNote] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const tasks: Promise<any>[] = [
      fetch("/api/cms/products").then((r) => r.json()).catch(() => null),
    ]
    if (!isNew) {
      tasks.push(
        fetch(`/api/cms/products/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      )
    }
    Promise.all(tasks).then(([all, p]) => {
      if (!alive) return
      setAllProducts(Array.isArray(all) ? all : [])
      if (!isNew && p && p.id) {
        setProduct(p as Product)
        setForm(toForm(p as Product))
      }
    }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id, isNew])

  // Category taxonomy (public endpoint — names, slugs and counts only).
  useEffect(() => {
    let alive = true
    fetch("/api/shop/categories")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setTaxonomy({
          ready: !!d?.ready,
          categories: Array.isArray(d?.categories) ? d.categories : [],
          flat: Array.isArray(d?.flat) ? d.flat : [],
        })
      })
      .catch(() => {})
      .finally(() => { if (alive) setTaxonomyLoading(false) })
    return () => { alive = false }
  }, [])

  const categories = useMemo(
    () => Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean) as string[])).sort(),
    [allProducts],
  )

  // ---- Category taxonomy helpers ----
  const catById = useMemo(() => {
    const m = new Map<number, CategoryNode>()
    for (const c of taxonomy?.flat ?? []) m.set(c.id, c)
    return m
  }, [taxonomy])

  // Full display path, e.g. "Dog Grooming Supplies › Grooming › Shampoos & Conditioners".
  const categoryPath = (id: number): string => {
    const parts: string[] = []
    let cur: CategoryNode | undefined = catById.get(id)
    while (cur) {
      parts.unshift(cur.name)
      cur = cur.parentId != null ? catById.get(cur.parentId) : undefined
    }
    return parts.join(" › ")
  }

  // <optgroup> per root. Every category is assignable: leaves are the target,
  // departments (mids) too — some departments only go two levels deep — and a
  // root works when nothing finer fits.
  const categoryGroups = useMemo(() => {
    if (!taxonomy?.ready) return []
    return taxonomy.categories.map((root) => {
      const options: CategoryNode[] = [root]
      for (const mid of root.children) {
        options.push(mid)
        for (const leaf of mid.children) options.push(leaf)
      }
      return { root, options }
    })
  }, [taxonomy])

  const selectedCategory = form.categoryId ? catById.get(Number(form.categoryId)) || null : null

  // Option label is the path relative to its root (the optgroup already shows
  // the root): "Grooming" for a department, "Grooming › Shampoos & Conditioners"
  // for a leaf. Product count rides along when > 0.
  const optionLabel = (c: CategoryNode): string => {
    const parent = c.parentId != null ? catById.get(c.parentId) : undefined
    const relative = parent && parent.parentId != null ? `${parent.name} › ${c.name}` : c.name
    return c.productCount > 0 ? `${relative} (${c.productCount})` : relative
  }

  // Selecting a category also keeps the legacy `category` text column in sync
  // with the chosen node's name (storefront breadcrumb + text consumers).
  const setCategory = (v: string) => {
    const node = v ? catById.get(Number(v)) : undefined
    setForm((f) => ({ ...f, categoryId: v, category: node?.name || "" }))
  }

  // Slug base must stay unique against every OTHER product's slug.
  const uniqueSlug = (base: string) => {
    const taken = new Set(
      allProducts.filter((p) => p.id !== id).map((p) => p.slug).filter(Boolean) as string[],
    )
    if (!taken.has(base)) return base
    let n = 2
    while (taken.has(`${base}-${n}`)) n++
    return `${base}-${n}`
  }

  // Auto-follow the name while the admin hasn't hand-edited the slug
  // (create mode), or after they've cleared it (edit mode).
  const setName = (v: string) => {
    setForm((f) => ({
      ...f,
      name: v,
      ...(f.slug === "" && !slugTouched ? { slug: v ? uniqueSlug(slugify(v)) : "" } : {}),
    }))
  }
  const setSlug = (v: string) => {
    setSlugTouched(v !== "")
    setForm((f) => ({ ...f, slug: v }))
  }

  if (!isNew && loading) return <div className="py-20 text-center text-zinc-400">Loading product…</div>
  if (!isNew && !product) return notFound()

  // ---- Stripe sync (single product) ----
  const runSync = async (): Promise<{ ok: boolean; error?: string; priceChanged?: boolean }> => {
    const res = await fetch("/api/shop/products/sync", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id }),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d.ok) return { ok: false, error: d.error || "Stripe sync failed" }
    const item = d.synced?.[0]
    if (item) {
      setForm((f) => ({ ...f, stripeProductId: item.stripeProductId, stripePriceId: item.stripePriceId }))
      setProduct((p) => (p ? { ...p, stripeProductId: item.stripeProductId, stripePriceId: item.stripePriceId } : p))
    }
    const failed = d.failed?.[0]
    if (failed) return { ok: false, error: failed.error }
    return { ok: true, priceChanged: item?.priceChanged }
  }

  const manualSync = async () => {
    if (isNew) return
    setSyncing(true); setSyncNote(null); setSyncError(null)
    const r = await runSync()
    setSyncing(false)
    if (!r.ok) setSyncError(r.error || "Stripe sync failed")
    else {
      setSyncNote(r.priceChanged ? "Synced — new Stripe price created (previous price deactivated)." : "Synced — Stripe is up to date.")
      setTimeout(() => setSyncNote(null), 4000)
    }
  }

  const contentPayload = () => ({
    name: form.name, price: form.price,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    category: form.category, badge: form.badge,
    order: Number(form.order) || 0, visible: form.visible, featured: form.featured,
    stock: form.stock === null ? null : Number(form.stock),
    slug: form.slug, shortDescription: form.shortDescription, description: form.description,
    materials: form.materials, ingredients: form.ingredients, directions: form.directions,
    warranty: form.warranty, specs: form.specs, image: form.image, alt: form.alt,
  })

  // ---- CREATE ----
  const create = async () => {
    if (!form.name.trim()) { setError("Product name is required."); return }
    setSaving(true); setError(null)
    try {
      const slug = (slugTouched && form.slug) ? form.slug : uniqueSlug(slugify(form.name))
      const res = await fetch("/api/cms/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contentPayload(), slug }),
      })
      const created = await res.json().catch(() => null)
      if (!res.ok || !created?.id) {
        setError(created?.error || "Could not create the product.")
        setSaving(false)
        return
      }
      // Push the new product to Stripe immediately (non-fatal — the editor
      // page you land on shows linkage + a manual SYNC button).
      await fetch("/api/shop/products/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: created.id }),
      }).catch(() => {})
      router.push(`/admin/products/${created.id}`)
    } catch (e: any) {
      setError(e?.message || "Could not create the product.")
      setSaving(false)
    }
  }

  // ---- SAVE (edit) ----
  const save = async () => {
    if (!product) return
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch(`/api/cms/products/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contentPayload()),
      })
      const updated = await res.json().catch(() => null)
      if (!res.ok) {
        setError(updated?.error || "Could not save the product.")
        setSaving(false)
        return
      }
      // Auto-sync to Stripe when anything Stripe displays changes.
      const stripeRelevantChanged =
        form.price !== (product.price || "") ||
        form.name !== (product.name || "") ||
        form.image !== (product.image || "") ||
        form.shortDescription !== (product.shortDescription || "")
      if (stripeRelevantChanged) {
        const r = await runSync()
        if (!r.ok) setSyncError(r.error || "Stripe sync failed")
      }
      setProduct({ ...product, ...(updated || {}), ...contentPayload() } as Product)
      setSaving(false); setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) {
      setError(e?.message || "Could not save the product.")
      setSaving(false)
    }
  }

  const del = async () => {
    if (!confirm("Delete this product?")) return
    await fetch(`/api/cms/products/${id}`, { method: "DELETE" })
    window.location.href = "/admin/products"
  }

  const stripeLinked = !!(form.stripeProductId && form.stripePriceId)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-zinc-400 hover:text-black">
          <ArrowLeft size={14} weight="bold" /> Products
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Commerce / Product</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">
            {isNew ? "Add Product" : form.name || "Untitled product"}
          </h1>
          <p className="mt-1 text-[12px] text-zinc-400">
            {isNew ? "Create a product, then push it to the shop and Stripe." : `${form.price || "—"} · ${form.category || "Uncategorized"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={del} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-100">
              <Trash size={14} weight="fill" /> Delete
            </button>
          )}
          <button
            onClick={isNew ? create : save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-[11px] font-bold text-white hover:bg-zinc-800 disabled:opacity-40"
          >
            {saving ? "Saving…" : saved ? <><Check size={14} weight="bold" /> Saved</> : isNew ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-medium text-red-700">
          <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Product Information */}
      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
          <Package size={14} weight="fill" className="text-zinc-400" /> Product Information
        </h3>
        <Field label="Name" value={form.name} onChange={setName} placeholder="Pawz Signature Shampoo" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">Category</label>
            {taxonomyLoading ? (
              <Skeleton className="h-[38px] w-full" aria-label="Loading categories" />
            ) : taxonomy?.ready ? (
              <div>
                <select
                  value={form.categoryId}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Product category"
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  <option value="">— Uncategorized —</option>
                  {categoryGroups.map((g) => (
                    <optgroup key={g.root.id} label={g.root.name.toUpperCase()}>
                      {g.options.map((c) => (
                        <option key={c.id} value={String(c.id)}>{optionLabel(c)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {selectedCategory && (
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {categoryPath(selectedCategory.id)} — visible at{" "}
                    <span className="font-medium text-zinc-500">/shop/category/{selectedCategory.slug}</span>
                  </p>
                )}
              </div>
            ) : (
              /* Taxonomy unavailable (ready:false) — fall back to free text. */
              <>
                <input
                  list="product-categories"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="Coat Care, Tools, Accessories…"
                  className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <datalist id="product-categories">
                  {categories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </>
            )}
          </div>
          <Field label="Price" value={form.price} onChange={(v) => setForm({ ...form, price: v })} placeholder="$34.00" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Badge" value={form.badge} onChange={(v) => setForm({ ...form, badge: v })} placeholder="Bestseller" />
          <Field label="Stock" type="number" value={form.stock === null ? "" : String(form.stock)} onChange={(v) => setForm({ ...form, stock: v === "" ? null : Number(v) })} placeholder="25" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order" type="number" value={String(form.order ?? 0)} onChange={(v) => setForm({ ...form, order: Number(v) })} />
          <Field label="Slug" value={form.slug} onChange={setSlug} placeholder={slugify(form.name) || "auto-from-name"} hint={`Product page URL: /shop/${form.slug || "…"}`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle label="Visible on site" checked={form.visible} onChange={(v) => setForm({ ...form, visible: v })} />
          <Toggle label="Featured (hero of shop page)" checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} />
        </div>
      </div>

      {/* Product Story */}
      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
          <Article size={14} weight="fill" className="text-zinc-400" /> Product Story
        </h3>
        <TextareaField label="Short description" rows={2} value={form.shortDescription} onChange={(v) => setForm({ ...form, shortDescription: v })} placeholder="One-sentence pitch shown on cards" hint="One-sentence pitch shown on cards" />
        <TextareaField label="Description" rows={6} value={form.description} onChange={(v) => setForm({ ...form, description: v })} hint="Full marketing copy — “THE DETAILS” section on the product page" />
      </div>

      {/* Product Details */}
      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
          <ClipboardText size={14} weight="fill" className="text-zinc-400" /> Product Details
        </h3>
        <TextareaField label="Materials" rows={3} value={form.materials} onChange={(v) => setForm({ ...form, materials: v })} hint="What it's made of — “MATERIALS & BUILD”" />
        <TextareaField label="Ingredients" rows={3} value={form.ingredients} onChange={(v) => setForm({ ...form, ingredients: v })} hint="Full ingredient list + what it's free of — “INGREDIENTS & SAFETY”" />
        <TextareaField label="Directions" rows={3} value={form.directions} onChange={(v) => setForm({ ...form, directions: v })} hint="How to use" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextareaField label="Warranty" rows={2} value={form.warranty} onChange={(v) => setForm({ ...form, warranty: v })} hint="Guarantee & care" />
          <TextareaField label="Specs" rows={2} value={form.specs} onChange={(v) => setForm({ ...form, specs: v })} hint="Size / dimensions / format" />
        </div>
      </div>

      {/* Media */}
      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
          <ImageIcon size={14} weight="fill" className="text-zinc-400" /> Media
        </h3>
        <ImageAssetPicker value={form.image} onChange={(v) => setForm({ ...form, image: v })} assets={ASSETS} />
        <Field label="Alt text" value={form.alt} onChange={(v) => setForm({ ...form, alt: v })} placeholder="Groomer holding the signature shampoo bottle" />
      </div>

      {/* Stripe Integration */}
      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
            <CreditCard size={14} weight="fill" className="text-zinc-400" /> Stripe Integration
          </h3>
          {stripeLinked ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
              <Check size={12} weight="bold" /> Linked ✓
            </span>
          ) : (
            <span className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500">Not linked</span>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">Stripe Product ID</label>
            <p className="rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-700">{form.stripeProductId || "—"}</p>
          </div>
          <div>
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">Stripe Price ID</label>
            <p className="rounded-md border border-black/10 bg-zinc-50 px-3 py-2 text-[12px] font-medium text-zinc-700">{form.stripePriceId || "—"}</p>
          </div>
        </div>
        {!isNew && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={manualSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ArrowsClockwise size={14} weight="bold" className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing…" : "SYNC TO STRIPE"}
            </button>
            <p className="text-[11px] text-zinc-400">Products are also auto-synced on save.</p>
          </div>
        )}
        {isNew && (
          <p className="text-[11px] text-zinc-400">This product is pushed to Stripe automatically when you create it.</p>
        )}
        {syncNote && <p className="text-[11px] font-medium text-emerald-700">{syncNote}</p>}
        {syncError && (
          <p className="flex items-start gap-1.5 text-[11px] font-medium text-red-600">
            <WarningCircle size={12} weight="fill" className="mt-0.5 shrink-0" /> {syncError}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
      {hint && <p className="mt-1 text-[10px] text-zinc-400">{hint}</p>}
    </div>
  )
}

function TextareaField({ label, value, onChange, rows, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; rows: number; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-900"
      />
      {hint && <p className="mt-1 text-[10px] text-zinc-400">{hint}</p>}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-black/10 px-4 py-3">
      <span className="text-[12px] font-medium text-zinc-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-black" : "bg-zinc-300"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "left-4" : "left-0.5"}`} />
      </button>
    </div>
  )
}
