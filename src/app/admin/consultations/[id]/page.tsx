"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, PhoneCall, Check, CalendarCheck, X } from "@phosphor-icons/react"

type Consultation = {
  id: string; name: string; dogName: string | null; breed: string | null
  concerns: string | null; preferredTime: string | null; preferredDate: string | null
  phone: string | null; email: string | null; status: string
  customerId: string | null; dogId: string | null; createdAt: string
}
type Service = { id: string; name: string }
type Groomer = { id: string; name: string }

export default function ConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [groomers, setGroomers] = useState<Groomer[]>([])
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState(false)
  const [converted, setConverted] = useState(false)
  const [convertForm, setConvertForm] = useState({ service: "", date: "", time: "", groomerId: "" })

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([
      fetch(`/api/cms/consultations/${id}`).then((r) => r.json()),
      fetch("/api/cms/packages").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/staff").then((r) => r.json()).catch(() => []),
    ]).then(([c, svcs, grmrs]) => {
      if (!alive) return
      setConsultation(c)
      setServices(svcs || [])
      setGroomers(grmrs || [])
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id])

  if (loading) return <div className="py-20 text-center text-zinc-400">Loading…</div>
  if (!consultation) return notFound()

  const doConvert = async () => {
    setConverting(true)
    try {
      const res = await fetch("/api/consultations/convert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: id,
          service: convertForm.service,
          date: convertForm.date,
          time: convertForm.time,
          groomerId: convertForm.groomerId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setConverted(true)
        setConsultation({ ...consultation, status: "CONVERTED", customerId: data.customerId })
      }
    } catch { /* ignore */ }
    finally { setConverting(false) }
  }

  const updateStatus = async (status: string) => {
    await fetch(`/api/cms/consultations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    setConsultation({ ...consultation, status })
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/consultations" className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-zinc-400 hover:text-black">
        <ArrowLeft size={14} weight="bold" /> Consultations
      </Link>

      <div className="border-b border-black/10 pb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Operations / Consultation</p>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">{consultation.name}</h1>
        <p className="mt-1 text-[12px] text-zinc-400">Requested {new Date(consultation.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
        <div className="mt-2">
          <span className={`rounded px-2 py-1 text-[10px] font-bold ${consultation.status === "CONVERTED" ? "bg-emerald-100 text-emerald-700" : consultation.status === "PENDING" || consultation.status === "REQUESTED" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>
            {consultation.status}
          </span>
        </div>
      </div>

      {/* Consultation details */}
      <div className="rounded-lg border border-black/10 bg-white p-5">
        <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Consultation Details</h3>
        <dl className="grid grid-cols-2 gap-3 text-[13px]">
          <div><dt className="text-[9px] font-bold uppercase text-zinc-400">Email</dt><dd className="text-zinc-900">{consultation.email || "—"}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-zinc-400">Phone</dt><dd className="text-zinc-900">{consultation.phone || "—"}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-zinc-400">Dog</dt><dd className="text-zinc-900">{consultation.dogName || "—"}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-zinc-400">Breed</dt><dd className="text-zinc-900">{consultation.breed || "—"}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-zinc-400">Preferred Date</dt><dd className="text-zinc-900">{consultation.preferredDate || "—"}</dd></div>
          <div><dt className="text-[9px] font-bold uppercase text-zinc-400">Preferred Time</dt><dd className="text-zinc-900">{consultation.preferredTime || "—"}</dd></div>
        </dl>
        {consultation.concerns && (
          <div className="mt-3 border-t border-black/5 pt-3">
            <dt className="text-[9px] font-bold uppercase text-zinc-400">Concerns / Notes</dt>
            <dd className="mt-1 text-[13px] text-zinc-700">{consultation.concerns}</dd>
          </div>
        )}
      </div>

      {/* Customer link */}
      {consultation.customerId ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[12px] font-semibold text-emerald-800">Customer record linked</p>
          <Link href={`/admin/customers/${consultation.customerId}`} className="mt-1 inline-block text-[11px] font-bold text-emerald-700 hover:underline">
            View customer profile →
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-[12px] font-semibold text-amber-800">No customer record yet</p>
          <p className="mt-1 text-[11px] text-amber-700">Converting this consultation will automatically create a customer + dog in Supabase and link Stripe.</p>
        </div>
      )}

      {/* Convert to Appointment */}
      {consultation.status !== "CONVERTED" && !converted && (
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
            <Check size={14} weight="fill" /> Convert to Appointment
          </h3>
          <p className="mb-3 text-[12px] text-zinc-500">This will create a customer (if needed), create a dog (if needed), create a confirmed appointment, and mark the consultation as converted. No re-entry required.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Service</label>
              <select value={convertForm.service} onChange={(e) => setConvertForm({ ...convertForm, service: e.target.value })} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900">
                <option value="">Select service…</option>
                {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Groomer</label>
              <select value={convertForm.groomerId} onChange={(e) => setConvertForm({ ...convertForm, groomerId: e.target.value })} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900">
                <option value="">Any available</option>
                {groomers.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Date</label>
              <input type="date" value={convertForm.date} onChange={(e) => setConvertForm({ ...convertForm, date: e.target.value })} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
            </div>
            <div>
              <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Time</label>
              <input type="time" value={convertForm.time} onChange={(e) => setConvertForm({ ...convertForm, time: e.target.value })} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
            </div>
          </div>
          <button onClick={doConvert} disabled={converting || !convertForm.date || !convertForm.time} className="mt-4 flex items-center gap-2 rounded-md bg-black px-4 py-2 text-[12px] font-bold text-white hover:bg-zinc-800 disabled:opacity-40">
            {converting ? "Converting…" : <><Check size={14} weight="bold" /> Convert to Appointment</>}
          </button>
        </div>
      )}

      {converted && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-center">
          <Check size={32} weight="bold" className="mx-auto text-emerald-600" />
          <p className="mt-2 text-[14px] font-semibold text-emerald-800">Consultation converted to appointment!</p>
          <p className="mt-1 text-[12px] text-emerald-700">Customer and dog records have been created/linked.</p>
          {consultation.customerId && (
            <Link href={`/admin/customers/${consultation.customerId}`} className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-emerald-700">
              View Customer Profile
            </Link>
          )}
        </div>
      )}

      {/* Status actions */}
      {!converted && consultation.status !== "CONVERTED" && (
        <div className="flex items-center gap-2">
          {(consultation.status === "PENDING" || consultation.status === "REQUESTED") && (
            <button onClick={() => updateStatus("CONTACTED")} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50">Mark as Contacted</button>
          )}
          {consultation.status === "CONTACTED" && (
            <button onClick={() => updateStatus("SCHEDULED")} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50">Mark as Scheduled</button>
          )}
          <button onClick={() => updateStatus("CANCELLED")} className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-100">
            <X size={12} weight="bold" /> Cancel
          </button>
        </div>
      )}
    </div>
  )
}
