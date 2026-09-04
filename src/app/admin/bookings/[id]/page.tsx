"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft, Calendar, Dog, User, CreditCard, Scissors, Check, X,
  Play, Clipboard, PawPrint, Phone, Mail, MapPin,
} from "@phosphor-icons/react"

type Booking = {
  id: string; ownerName: string; dogName: string; breed: string | null
  service: string; size: string | null; date: string; time: string
  status: string; paymentStatus: string | null; notes: string | null
  phone: string | null; email: string | null; address: string | null
  groomerId: string | null; customerId: string | null; dogId: string | null
  servicePrice: string | null; depositAmount: string | null
  stripeCheckoutSessionId: string | null; stripePaymentIntentId: string | null
  createdAt: string
}
type Groomer = { id: string; name: string; role: string }
type GroomingRequest = {
  styleId: string | null; bodyLengthId: string | null
  bodyStyleId: string | null; legStyleId: string | null
  faceStyleId: string | null; headStyleId: string | null
  earStyleId: string | null; tailStyleId: string | null; feetStyleId: string | null
  sanitaryService: string | null; nailService: string | null
  pawPadService: string | null; earService: string | null
  teethService: string | null; desheddingService: string | null
  coatTechnique: string | null; specialInstructions: string | null
}

const STATUS_FLOW = [
  "PAYMENT_PENDING", "CONFIRMED", "CHECKED_IN", "IN_SERVICE",
  "COMPLETED", "CANCELLED", "NO_SHOW",
]

const STATUS_BADGE: Record<string, string> = {
  PAYMENT_PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-sky-100 text-sky-700",
  IN_SERVICE: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-zinc-800 text-white",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  NO_SHOW: "bg-red-100 text-red-700",
  PAYMENT_FAILED: "bg-red-100 text-red-700",
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [groomers, setGroomers] = useState<Groomer[]>([])
  const [groomingRequest, setGroomingRequest] = useState<GroomingRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([
      fetch(`/api/cms/bookings/${id}`).then(r => r.json()),
      fetch("/api/cms/staff").then(r => r.json()).catch(() => []),
      fetch("/api/cms/appointment_grooming_requests").then(r => r.json()).catch(() => []),
    ]).then(([b, g, gr]) => {
      if (!alive) return
      setBooking(b)
      setGroomers(g || [])
      const req = (gr as GroomingRequest[]).find(r => r.bookingId === id || (b as any)?.groomingRequestId === r.id)
      setGroomingRequest(req || null)
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id])

  if (loading) return <div className="py-20 text-center text-zinc-400">Loading booking…</div>
  if (!booking) return notFound()

  const updateStatus = async (status: string) => {
    setUpdating(true)
    await fetch(`/api/cms/bookings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    setBooking({ ...booking, status })
    setUpdating(false)
  }

  const assignGroomer = async (groomerId: string) => {
    setUpdating(true)
    await fetch(`/api/cms/bookings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groomerId }) })
    setBooking({ ...booking, groomerId })
    setUpdating(false)
  }

  const recordPayment = async (method: string) => {
    const amount = booking.servicePrice?.replace(/[^0-9.]/g, "") || "0"
    const deposit = parseFloat(booking.depositAmount?.replace(/[^0-9.]/g, "") || "25")
    const balance = parseFloat(amount) - deposit
    setUpdating(true)
    await fetch("/api/customers/pay", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: booking.customerId, bookingId: id,
        amount: balance > 0 ? balance : parseFloat(amount),
        type: "balance", method,
      }),
    })
    await fetch(`/api/cms/bookings/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentStatus: "PAID" }) })
    setBooking({ ...booking, paymentStatus: "PAID" })
    setUpdating(false)
  }

  const selectedGroomer = groomers.find(g => g.id === booking.groomerId)
  const serviceTotal = parseFloat(booking.servicePrice?.replace(/[^0-9.]/g, "") || "0")
  const depositPaid = booking.paymentStatus === "DEPOSIT_PAID" || booking.paymentStatus === "PAID"
  const balance = depositPaid ? serviceTotal - 25 : serviceTotal

  return (
    <div className="space-y-5">
      <Link href="/admin/bookings" className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-black">
        <ArrowLeft size={14} weight="bold" /> All Bookings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between border-b border-black/10 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Operations / Booking</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-zinc-900">BOOKING #{id.slice(0, 8).toUpperCase()}</h1>
          <p className="mt-1 text-[12px] text-zinc-400">{booking.date} at {booking.time} · {booking.service}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${STATUS_BADGE[booking.status] || "bg-zinc-100 text-zinc-500"}`}>
          {booking.status}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left: Main content */}
        <div className="space-y-5 lg:col-span-2">
          {/* Status actions */}
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Status Actions</h3>
            <div className="flex flex-wrap gap-2">
              {booking.status === "PAYMENT_PENDING" && (
                <button onClick={() => updateStatus("CONFIRMED")} disabled={updating} className="rounded-md bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
                  <Check size={12} weight="bold" className="mr-1 inline" /> Confirm
                </button>
              )}
              {booking.status === "CONFIRMED" && (
                <button onClick={() => updateStatus("CHECKED_IN")} disabled={updating} className="rounded-md bg-sky-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-sky-700 disabled:opacity-40">
                  <Clipboard size={12} weight="bold" className="mr-1 inline" /> Check In
                </button>
              )}
              {booking.status === "CHECKED_IN" && (
                <button onClick={() => updateStatus("IN_SERVICE")} disabled={updating} className="rounded-md bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40">
                  <Play size={12} weight="bold" className="mr-1 inline" /> Start Service
                </button>
              )}
              {booking.status === "IN_SERVICE" && (
                <button onClick={() => updateStatus("COMPLETED")} disabled={updating} className="rounded-md bg-zinc-800 px-3 py-2 text-[11px] font-bold text-white hover:bg-black disabled:opacity-40">
                  <Check size={12} weight="bold" className="mr-1 inline" /> Complete Service
                </button>
              )}
              {!["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status) && (
                <>
                  <button onClick={() => updateStatus("NO_SHOW")} disabled={updating} className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600 hover:bg-red-100 disabled:opacity-40">
                    No Show
                  </button>
                  <button onClick={() => updateStatus("CANCELLED")} disabled={updating} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Customer & Pet */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-lg border border-black/10 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
                <User size={14} weight="fill" /> Customer
              </h3>
              <dl className="space-y-2 text-[13px]">
                <div><dt className="text-[10px] text-zinc-400">Name</dt><dd className="font-medium">{booking.ownerName}</dd></div>
                <div><dt className="text-[10px] text-zinc-400">Email</dt><dd>{booking.email || "—"}</dd></div>
                <div><dt className="text-[10px] text-zinc-400">Phone</dt><dd>{booking.phone || "—"}</dd></div>
                <div><dt className="text-[10px] text-zinc-400">Address</dt><dd>{booking.address || "—"}</dd></div>
              </dl>
              {booking.customerId && (
                <Link href={`/admin/customers/${booking.customerId}`} className="mt-3 inline-block text-[11px] font-bold text-blue-500 hover:underline">
                  Open Customer 360 →
                </Link>
              )}
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
                <PawPrint size={14} weight="fill" /> Pet
              </h3>
              <dl className="space-y-2 text-[13px]">
                <div><dt className="text-[10px] text-zinc-400">Name</dt><dd className="font-medium">{booking.dogName}</dd></div>
                <div><dt className="text-[10px] text-zinc-400">Breed</dt><dd>{booking.breed || "—"}</dd></div>
                <div><dt className="text-[10px] text-zinc-400">Size</dt><dd>{booking.size || "—"}</dd></div>
              </dl>
              {booking.dogId && (
                <Link href={`/admin/dogs/${booking.dogId}`} className="mt-3 inline-block text-[11px] font-bold text-blue-500 hover:underline">
                  View Dog Profile →
                </Link>
              )}
            </div>
          </div>

          {/* Grooming Request */}
          {groomingRequest && (
            <div className="rounded-lg border border-black/10 bg-white p-5">
              <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
                <Scissors size={14} weight="fill" /> Grooming Request
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-3">
                {groomingRequest.styleId && <Field label="Style" value={groomingRequest.styleId} />}
                {groomingRequest.bodyLengthId && <Field label="Body Length" value={groomingRequest.bodyLengthId} />}
                {groomingRequest.bodyStyleId && <Field label="Body Style" value={groomingRequest.bodyStyleId} />}
                {groomingRequest.legStyleId && <Field label="Legs" value={groomingRequest.legStyleId} />}
                {groomingRequest.faceStyleId && <Field label="Face" value={groomingRequest.faceStyleId} />}
                {groomingRequest.headStyleId && <Field label="Head" value={groomingRequest.headStyleId} />}
                {groomingRequest.earStyleId && <Field label="Ears" value={groomingRequest.earStyleId} />}
                {groomingRequest.tailStyleId && <Field label="Tail" value={groomingRequest.tailStyleId} />}
                {groomingRequest.feetStyleId && <Field label="Feet" value={groomingRequest.feetStyleId} />}
                {groomingRequest.sanitaryService && <Field label="Sanitary" value={groomingRequest.sanitaryService} />}
                {groomingRequest.nailService && <Field label="Nails" value={groomingRequest.nailService} />}
                {groomingRequest.pawPadService && <Field label="Paw Pads" value={groomingRequest.pawPadService} />}
                {groomingRequest.earService && <Field label="Ear Care" value={groomingRequest.earService} />}
                {groomingRequest.teethService && <Field label="Teeth" value={groomingRequest.teethService} />}
                {groomingRequest.desheddingService && <Field label="Deshedding" value={groomingRequest.desheddingService} />}
                {groomingRequest.coatTechnique && <Field label="Coat Technique" value={groomingRequest.coatTechnique} />}
              </div>
              {groomingRequest.specialInstructions && (
                <div className="mt-3 border-t border-black/5 pt-3">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Special Instructions</p>
                  <p className="mt-1 text-[12px] italic text-zinc-700">"{groomingRequest.specialInstructions}"</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="rounded-lg border border-black/10 bg-white p-5">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Customer Notes</h3>
              <p className="text-[12px] italic text-zinc-700">"{booking.notes}"</p>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Appointment info */}
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Appointment</h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between"><dt className="text-zinc-400">Service</dt><dd className="font-medium">{booking.service}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Date</dt><dd className="font-medium">{booking.date}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Time</dt><dd className="font-medium">{booking.time}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Size</dt><dd>{booking.size || "—"}</dd></div>
            </dl>
          </div>

          {/* Groomer Assignment */}
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Groomer</h3>
            <select
              value={booking.groomerId || ""}
              onChange={(e) => assignGroomer(e.target.value)}
              disabled={updating}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="">Any available</option>
              {groomers.map(g => (
                <option key={g.id} value={g.id}>{g.name} — {g.role}</option>
              ))}
            </select>
            {selectedGroomer && (
              <p className="mt-2 text-[11px] text-zinc-400">Assigned to: <span className="font-medium text-zinc-700">{selectedGroomer.name}</span></p>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
              <CreditCard size={14} weight="fill" /> Payment
            </h3>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between"><dt className="text-zinc-400">Service Total</dt><dd className="font-medium">{booking.servicePrice || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Deposit</dt><dd>{booking.depositAmount || "$25.00"}</dd></div>
              <div className="flex justify-between border-t border-black/5 pt-2"><dt className="text-zinc-400">Balance Due</dt><dd className="font-bold text-amber-600">${balance.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Payment Status</dt><dd><span className={`rounded px-2 py-0.5 text-[9px] font-bold ${booking.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" : booking.paymentStatus === "DEPOSIT_PAID" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>{booking.paymentStatus || "UNPAID"}</span></dd></div>
            </dl>
            {booking.stripePaymentIntentId && (
              <p className="mt-2 font-mono text-[9px] text-zinc-400">Stripe: {booking.stripePaymentIntentId.slice(0, 25)}…</p>
            )}

            {/* Payment actions */}
            {balance > 0 && booking.paymentStatus !== "PAID" && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase text-zinc-400">Collect Payment</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => recordPayment("cash")} disabled={updating} className="rounded-md bg-black px-3 py-2 text-[10px] font-bold text-white hover:bg-zinc-800 disabled:opacity-40">Cash</button>
                  <button onClick={() => recordPayment("card")} disabled={updating} className="rounded-md bg-black px-3 py-2 text-[10px] font-bold text-white hover:bg-zinc-800 disabled:opacity-40">Card</button>
                  <button onClick={() => recordPayment("check")} disabled={updating} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">Check</button>
                  <button onClick={() => recordPayment("other")} disabled={updating} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[10px] font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40">Other</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[9px] font-bold uppercase text-zinc-400">{label}</dt>
      <dd className="text-zinc-900">{value}</dd>
    </div>
  )
}
