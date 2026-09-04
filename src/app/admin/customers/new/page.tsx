"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"

export default function NewCustomerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    address: "", addressLine2: "", city: "", state: "", postalCode: "",
  })

  const save = async () => {
    if (!form.firstName || !form.email) { setError("First name and email are required"); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); setError(e.error || "Failed"); setSaving(false); return }
      const data = await res.json()
      router.push(`/admin/customers/${data.id}`)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/customers" className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-black"><ArrowLeft size={14} weight="bold" /> Customers</Link>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-zinc-900">New Customer</h1>
        <p className="mt-1 text-[12px] text-zinc-500">Creates a customer in Supabase + Stripe.</p>
      </div>
      <div className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name *" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
          <Field label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          <Field label="Email *" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <div className="col-span-2"><Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></div>
          <div className="col-span-2"><Field label="Address Line 2" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} /></div>
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
          <Field label="ZIP" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
        </div>
        {error && <p className="text-[12px] text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Link href="/admin/customers" className="rounded-md border border-black/10 px-4 py-2 text-[12px] font-semibold text-zinc-700 hover:bg-zinc-50">Cancel</Link>
          <button onClick={save} disabled={saving} className="rounded-md bg-black px-4 py-2 text-[12px] font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
            {saving ? "Creating…" : "Create Customer"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
    </div>
  )
}
