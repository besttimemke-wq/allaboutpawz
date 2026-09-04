"use client"

import { useState } from "react"
import { useState as useSt } from "react"

export type ShopProduct = {
  id: string
  name: string
  price: string
  stripePriceId?: string | null
  badge?: string | null
  image?: string | null
  alt?: string | null
  description?: string | null
  category?: string | null
}

export function ShopClient({ products, categories }: { products: ShopProduct[]; categories: string[] }) {
  const [category, setCategory] = useState("ALL")
  const [query, setQuery] = useState("")
  const [redirecting, setRedirecting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = products.filter((p) => {
    if (category !== "ALL" && (p.category || "General") !== category) return false
    if (query.trim()) {
      const q = query.toLowerCase()
      if (!p.name.toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) return false
    }
    return true
  })

  const buy = async (p: ShopProduct) => {
    setRedirecting(p.id)
    setToast(null)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: p.id, quantity: 1 }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setToast(data.error || "Checkout failed")
      }
    } catch (e: any) {
      setToast(e.message || "Checkout failed")
    } finally {
      setRedirecting(null)
    }
  }

  return (
    <>
      {/* search + category filter */}
      <div className="mt-8 flex flex-wrap items-center gap-4 border-b border-gold/25 pb-4">
        <div className="relative flex-1 min-w-[180px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            className="w-full border border-gold/35 bg-cream px-3.5 py-2 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory("ALL")}
            className={`pb-1 text-[10px] font-bold tracking-[0.16em] transition-colors ${category === "ALL" ? "text-gold-deep" : "text-ink-soft hover:text-gold-deep"}`}
          >ALL</button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`pb-1 text-[10px] font-bold tracking-[0.16em] transition-colors ${category === c ? "text-gold-deep" : "text-ink-soft hover:text-gold-deep"}`}
            >{c.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {toast && (
        <p className="mt-4 border border-gold/30 bg-cream-deep px-4 py-2 text-[12px] text-gold-deep">{toast}</p>
      )}

      <div className="mt-8 grid grid-cols-2 gap-8 lg:grid-cols-4">
        {filtered.map((p) => (
          <div key={p.id} className="text-center">
            <div className="bg-cream-deep p-4">
              {p.image ? (
                 
                <img src={p.image} alt={p.alt || p.name} width={512} height={640} className="mx-auto h-[150px] w-full object-contain" />
              ) : null}
            </div>
            <h3 className="mt-4 text-[11.5px] leading-[1.5] text-ink">{p.name}</h3>
            {p.description && <p className="mt-1 text-[10.5px] leading-[1.5] text-ink-soft line-clamp-2">{p.description}</p>}
            <p className="mt-1 text-[11.5px] font-bold text-gold-deep">{p.price}</p>
            {p.stripePriceId ? (
              <button
                onClick={() => buy(p)}
                disabled={redirecting === p.id}
                className="btn-gold mt-3 w-full text-[9px]"
              >
                {redirecting === p.id ? "REDIRECTING…" : "BUY NOW"}
              </button>
            ) : (
              <p className="mt-3 text-[9px] font-bold tracking-[0.14em] text-ink-soft">IN STORE ONLY</p>
            )}
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-12 text-center text-[12.5px] text-ink-soft">No products match your search.</p>
      )}
    </>
  )
}

// keep the import live without affecting the bundle
void useSt
