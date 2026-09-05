"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PetCard } from "@/components/dawg/PetCard"
import {
  ArrowLeft, PawPrint, CalendarCheck, PhoneCall, ShoppingBag, CreditCard,
  CurrencyDollar, Dog as DogIcon, Envelope, MapPin, Phone, Sparkle,
  ChatCircle, Note, ListChecks, Plus, SquaresFour, Check, PaperPlaneTilt,
} from "@phosphor-icons/react"

type Customer = {
  id: string; firstName: string; lastName: string; email: string; phone: string
  address: string; addressLine2: string | null; city: string; state: string; postalCode: string
  stripeCustomerId: string | null; createdAt: string
}
type Dog = { id: string; name: string; breedId: string | null; breedName: string | null; sex: string | null; birthDate: string | null; weightLbs: string | null; color: string | null; markings: string | null; photoUrl: string | null; createdAt: string }
type GroomingProfile = { dogId: string; temperament: string | null; nailHandling: string | null; coatConditionId: string | null; currentHaircutStyleId: string | null }
type Booking = { id: string; dogName: string; dogId: string | null; service: string; date: string; time: string; status: string; paymentStatus: string | null; servicePrice: string | null; depositAmount: string | null; groomerId: string | null; createdAt: string }
type Consultation = { id: string; dogName: string | null; preferredTime: string | null; status: string; createdAt: string }
type Order = { id: string; status: string; subtotal: string; paymentStatus: string; createdAt: string }
type Payment = { id: string; amount: string; type: string; status: string; stripePaymentIntentId: string | null; createdAt: string }

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [dogs, setDogs] = useState<Dog[]>([])
  const [profiles, setProfiles] = useState<Record<string, GroomingProfile>>({})
  const [bookings, setBookings] = useState<Booking[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [breeds, setBreeds] = useState<Record<string, any>>({})
  const [haircutStyles, setHaircutStyles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Customer>>({})
  const [showPayForm, setShowPayForm] = useState(false)
  const [payForm, setPayForm] = useState({ amount: "", type: "payment", method: "cash" })
  const [recordingPay, setRecordingPay] = useState(false)
  const [showAddDog, setShowAddDog] = useState(false)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const [dogForm, setDogForm] = useState({ name: "", breedName: "", sex: "", weightLbs: "", color: "" })
  const [savingDog, setSavingDog] = useState(false)
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" })
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([
      fetch(`/api/cms/customers/${id}`).then((r) => r.json()),
      fetch("/api/cms/dogs").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/dog_grooming_profiles").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/bookings").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/consultations").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/orders").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/payments").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/dog_breeds").then((r) => r.json()).catch(() => []),
      fetch("/api/cms/haircut_styles").then((r) => r.json()).catch(() => []),
    ]).then(([c, allDogs, allProfiles, allBookings, allCons, allOrders, allPays, allBreeds, allHaircuts]) => {
      if (!alive) return
      setCustomer(c); setForm(c)
      setDogs((allDogs as Dog[]).filter((d) => d.customerId === id))
      const pm: Record<string, GroomingProfile> = {}
      ;(allProfiles as any[]).forEach((p) => { if (p.dogId) pm[p.dogId] = p })
      setProfiles(pm)
      setBookings((allBookings as Booking[]).filter((b: any) => b.customerId === id))
      setConsultations((allCons as Consultation[]).filter((c: any) => c.customerId === id))
      setOrders((allOrders as Order[]).filter((o: any) => o.customerId === id))
      setPayments((allPays as Payment[]).filter((p: any) => p.customerId === id))
      const bm: Record<string, any> = {}
      ;(allBreeds as any[]).forEach((b) => { bm[b.id] = b })
      setBreeds(bm)
      const hm: Record<string, string> = {}
      ;(allHaircuts as any[]).forEach((h) => { hm[h.id] = h.name })
      setHaircutStyles(hm)
    }).finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [id])

  if (loading) return <div className="py-20 text-center text-zinc-400">Loading customer…</div>
  if (!customer) return notFound()

  const totalPaid = payments.filter((p) => p.status === "paid" || p.status === "succeeded").reduce((s, p) => s + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0)
  const upcomingBookings = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "PAYMENT_PENDING")
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED")
  const openBalance = bookings.filter((b) => b.status === "CONFIRMED" && b.paymentStatus === "DEPOSIT_PAID")
    .reduce((s, b) => {
      const total = parseFloat(b.servicePrice?.replace(/[^0-9.]/g, "") || "0")
      const deposit = parseFloat(b.depositAmount?.replace(/[^0-9.]/g, "") || "25")
      return s + (total - deposit)
    }, 0)
  const depositsPaid = payments.filter((p) => p.type === "deposit" && (p.status === "paid" || p.status === "pending")).reduce((s, p) => s + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0)

  const saveEdit = async () => {
    await fetch(`/api/cms/customers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setCustomer({ ...customer, ...form } as Customer); setEditing(false)
  }

  const recordPayment = async () => {
    setRecordingPay(true)
    try {
      await fetch("/api/customers/pay", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: id, amount: parseFloat(payForm.amount), type: payForm.type, method: payForm.method }),
      })
      // Refresh payments
      const allPays = await fetch("/api/cms/payments").then((r) => r.json())
      setPayments((allPays as Payment[]).filter((p: any) => p.customerId === id))
      setShowPayForm(false)
      setPayForm({ amount: "", type: "payment", method: "cash" })
    } catch { /* ignore */ }
    finally { setRecordingPay(false) }
  }

  const breedName = (dog: Dog) => dog.breedId ? breeds[dog.breedId]?.name : dog.breedName || "—"
  const breedSize = (dog: Dog) => dog.breedId ? breeds[dog.breedId]?.sizeCategory : null

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Link href="/admin/customers" className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-zinc-400 hover:text-black">
        <ArrowLeft size={14} weight="bold" /> All Customers
      </Link>

      {/* Header with action buttons */}
      <div className="flex items-start justify-between border-b border-black/10 pb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">CRM / Customer</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-zinc-900">{customer.firstName} {customer.lastName}</h1>
          <p className="mt-1 text-[12px] text-zinc-400">Customer since {new Date(customer.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-900 hover:bg-zinc-50">{editing ? "Cancel" : "Edit"}</button>
          <button onClick={() => setShowAddDog(true)} className="flex items-center gap-1 rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-900 hover:bg-zinc-50"><Plus size={12} weight="bold" /> Add Dog</button>
          <button onClick={() => setShowSendEmail(true)} className="flex items-center gap-1 rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-900 hover:bg-zinc-50"><PaperPlaneTilt size={12} weight="bold" /> Send Email</button>
          <Link href={`/book?customer=${customer.id}`} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-900 hover:bg-zinc-50">Book Appointment</Link>
          <Link href={`/admin/consultations/new?customer=${customer.id}`} className="rounded-md border border-black/10 bg-white px-3 py-2 text-[11px] font-bold tracking-wide text-zinc-900 hover:bg-zinc-50">New Consultation</Link>
        </div>
      </div>

      {/* Financial + relationship summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <StatCard icon={PawPrint} label="Dogs" value={dogs.length} />
        <StatCard icon={CalendarCheck} label="Upcoming" value={upcomingBookings.length} />
        <StatCard icon={Check} label="Visits" value={completedBookings.length} />
        <StatCard icon={CreditCard} label="Open Balance" value={openBalance > 0 ? `$${openBalance.toFixed(0)}` : "$0"} />
        <StatCard icon={CurrencyDollar} label="Total Spent" value={`$${totalPaid.toFixed(0)}`} />
        <StatCard icon={ShoppingBag} label="Orders" value={orders.length} />
      </div>

      {/* Contact info (or edit form) */}
      {editing ? (
        <div className="rounded-lg border border-black/10 bg-white p-6">
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">Edit Customer</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="First name" value={form.firstName || ""} onChange={(v) => setForm({ ...form, firstName: v })} />
            <Input label="Last name" value={form.lastName || ""} onChange={(v) => setForm({ ...form, lastName: v })} />
            <Input label="Email" value={form.email || ""} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Phone" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} />
            <Input label="Address" value={form.address || ""} onChange={(v) => setForm({ ...form, address: v })} />
            <Input label="Address line 2" value={form.addressLine2 || ""} onChange={(v) => setForm({ ...form, addressLine2: v })} />
            <Input label="City" value={form.city || ""} onChange={(v) => setForm({ ...form, city: v })} />
            <Input label="State" value={form.state || ""} onChange={(v) => setForm({ ...form, state: v })} />
            <Input label="ZIP" value={form.postalCode || ""} onChange={(v) => setForm({ ...form, postalCode: v })} />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={saveEdit} className="rounded-md bg-black px-4 py-2 text-[11px] font-bold text-white hover:bg-zinc-800">Save Changes</button>
            <button onClick={() => { setForm(customer); setEditing(false) }} className="rounded-md border border-black/10 px-4 py-2 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-black/10 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Email</p><p className="mt-0.5 text-[13px] text-zinc-900">{customer.email || "—"}</p></div>
            <div><p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Phone</p><p className="mt-0.5 text-[13px] text-zinc-900">{customer.phone || "—"}</p></div>
            <div><p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Stripe ID</p><p className="mt-0.5 font-mono text-[11px] text-zinc-700">{customer.stripeCustomerId || "Not linked"}</p></div>
            <div className="sm:col-span-3"><p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">Address</p><p className="mt-0.5 text-[13px] text-zinc-900">{[customer.address, customer.addressLine2, `${customer.city}, ${customer.state} ${customer.postalCode}`].filter(Boolean).join(", ") || "—"}</p></div>
          </div>
        </div>
      )}

      {/* DOGS — full detail on the customer record */}
      <Section title="Dogs" count={dogs.length} action={<button className="flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-[11px] font-bold text-white hover:bg-zinc-800"><Plus size={12} weight="bold" /> Add Dog</button>}>
        {dogs.length === 0 ? <Empty text="No dogs registered yet." /> : (
          <div className="space-y-3">
            {dogs.map((dog) => {
              const profile = profiles[dog.id]
              const dogBookings = bookings.filter((b) => b.dogId === dog.id)
              const lastGroom = dogBookings.find((b) => b.status === "COMPLETED")
              const nextAppt = dogBookings.find((b) => b.status === "CONFIRMED" || b.status === "PAYMENT_PENDING")
              return (
                <div key={dog.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <PetCard
                        dog={dog}
                        variant="admin"
                        linkTo={`/admin/dogs/${dog.id}`}
                        onPhotoChange={(url) => {
                          setDogs(prev => prev.map(d => d.id === dog.id ? { ...d, photoUrl: url } : d))
                        }}
                      />
                    </div>
                    {nextAppt && <span className="shrink-0 rounded bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Next: {nextAppt.date}</span>}
                  </div>
                  {profile && (
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-black/5 bg-zinc-50/50 p-3 text-[11px] sm:grid-cols-4">
                      {profile.temperament && <div><span className="text-zinc-400">Temperament:</span> <span className="font-medium text-zinc-700">{profile.temperament}</span></div>}
                      {profile.nailHandling && <div><span className="text-zinc-400">Nails:</span> <span className="font-medium text-zinc-700">{profile.nailHandling}</span></div>}
                      {profile.currentHaircutStyleId && haircutStyles[profile.currentHaircutStyleId] && <div><span className="text-zinc-400">Cut:</span> <span className="font-medium text-zinc-700">{haircutStyles[profile.currentHaircutStyleId]}</span></div>}
                      {lastGroom && <div><span className="text-zinc-400">Last:</span> <span className="font-medium text-zinc-700">{lastGroom.date} · {lastGroom.service}</span></div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* APPOINTMENTS — on the customer record */}
      <Section title="Appointments" count={bookings.length} action={<Link href={`/book?customer=${customer.id}`} className="flex items-center gap-1 rounded-md border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-900 hover:bg-zinc-50"><Plus size={12} weight="bold" /> Book</Link>}>
        {bookings.length === 0 ? <Empty text="No appointments yet." /> : (
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-black/10 text-[9px] uppercase tracking-wide text-zinc-400">
              <th className="py-2 text-left">Date</th><th className="text-left">Dog</th><th className="text-left">Service</th><th className="text-right">Price</th><th className="text-left">Deposit</th><th className="text-right">Status</th>
            </tr></thead>
            <tbody>
              {bookings.slice().reverse().map((b) => (
                <tr key={b.id} className="border-b border-black/5 hover:bg-zinc-50">
                  <td className="py-2">{b.date} {b.time}</td>
                  <td>{b.dogName}</td>
                  <td>{b.service}</td>
                  <td className="text-right font-medium">{b.servicePrice || "—"}</td>
                  <td><span className={b.paymentStatus === "DEPOSIT_PAID" ? "text-emerald-600" : "text-zinc-400"}>{b.depositAmount || "—"}</span></td>
                  <td className="text-right"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${b.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : b.status === "COMPLETED" ? "bg-zinc-800 text-white" : b.status === "PAYMENT_PENDING" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-500"}`}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* CONSULTATIONS — on the customer record */}
      <Section title="Consultations" count={consultations.length} action={<Link href={`/admin/consultations/new?customer=${customer.id}`} className="flex items-center gap-1 rounded-md border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-zinc-900 hover:bg-zinc-50"><Plus size={12} weight="bold" /> New</Link>}>
        {consultations.length === 0 ? <Empty text="No consultations yet." /> : (
          <div className="space-y-2">
            {consultations.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-black/10 p-3">
                <div><p className="text-[12px] font-medium text-zinc-900">{new Date(c.createdAt).toLocaleDateString()} {c.dogName ? `· ${c.dogName}` : ""}</p><p className="text-[10px] text-zinc-400">{c.preferredTime || "—"}</p></div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500">{c.status}</span>
                  {c.status === "PENDING" || c.status === "REQUESTED" ? <button className="rounded bg-black px-2 py-1 text-[9px] font-bold text-white hover:bg-zinc-800">Convert to Appt</button> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* FINANCIAL — financial overview + payment history + record payment */}
      <Section title="Financial Overview" icon={CurrencyDollar} action={
        <button onClick={() => setShowPayForm(!showPayForm)} className="flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-[11px] font-bold text-white hover:bg-zinc-800"><Plus size={12} weight="bold" /> Record Payment</button>
      }>
        {showPayForm && (
          <div className="mb-4 rounded-md border border-black/10 bg-zinc-50 p-4">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-zinc-700">Record Manual Payment</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Amount ($)</label>
                <input type="number" step="0.01" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} placeholder="25.00" className="w-full rounded border border-black/10 bg-white px-2 py-1.5 text-[13px]" />
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Type</label>
                <select value={payForm.type} onChange={(e) => setPayForm({ ...payForm, type: e.target.value })} className="w-full rounded border border-black/10 bg-white px-2 py-1.5 text-[13px]">
                  <option value="payment">Payment</option>
                  <option value="deposit">Deposit</option>
                  <option value="balance">Balance</option>
                  <option value="tip">Tip</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[9px] font-bold uppercase text-zinc-400">Method</label>
                <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className="w-full rounded border border-black/10 bg-white px-2 py-1.5 text-[13px]">
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="card">Card (in-person)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={recordPayment} disabled={!payForm.amount || recordingPay} className="w-full rounded bg-black px-3 py-1.5 text-[11px] font-bold text-white hover:bg-zinc-800 disabled:opacity-40">
                  {recordingPay ? "Recording…" : "Record"}
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-black/10 p-3"><p className="text-[9px] font-bold uppercase text-zinc-400">Lifetime Spend</p><p className="mt-1 text-[18px] font-bold text-zinc-900">${totalPaid.toFixed(2)}</p></div>
          <div className="rounded-md border border-black/10 p-3"><p className="text-[9px] font-bold uppercase text-zinc-400">Open Balance</p><p className={`mt-1 text-[18px] font-bold ${openBalance > 0 ? "text-amber-600" : "text-zinc-900"}`}>${openBalance.toFixed(2)}</p></div>
          <div className="rounded-md border border-black/10 p-3"><p className="text-[9px] font-bold uppercase text-zinc-400">Deposits</p><p className="mt-1 text-[18px] font-bold text-zinc-900">${depositsPaid.toFixed(2)}</p></div>
          <div className="rounded-md border border-black/10 p-3"><p className="text-[9px] font-bold uppercase text-zinc-400">Orders</p><p className="mt-1 text-[18px] font-bold text-zinc-900">{orders.length}</p></div>
        </div>
        {payments.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">Payment History</p>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-black/10 text-[9px] uppercase text-zinc-400"><th className="py-2 text-left">Date</th><th className="text-left">Amount</th><th className="text-left">Type</th><th className="text-left">Stripe Ref</th><th className="text-right">Status</th></tr></thead>
              <tbody>
                {payments.slice().reverse().map((p) => (
                  <tr key={p.id} className="border-b border-black/5">
                    <td className="py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="font-semibold">{p.amount}</td>
                    <td>{p.type}</td>
                    <td className="font-mono text-[10px] text-zinc-400">{p.stripePaymentIntentId ? p.stripePaymentIntentId.slice(0, 20) + "…" : "—"}</td>
                    <td className="text-right"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ORDERS */}
      {orders.length > 0 && (
        <Section title="Orders" count={orders.length}>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-black/10 text-[9px] uppercase text-zinc-400"><th className="py-2 text-left">Date</th><th className="text-left">Total</th><th className="text-right">Status</th></tr></thead>
            <tbody>
              {orders.slice().reverse().map((o) => (
                <tr key={o.id} className="border-b border-black/5"><td className="py-2">{new Date(o.createdAt).toLocaleDateString()}</td><td className="font-semibold">{o.subtotal || "—"}</td><td className="text-right"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${o.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>{o.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Add Dog Modal */}
      {showAddDog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddDog(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-[16px] font-semibold text-zinc-900">Add Dog</h3>
            <div className="space-y-3">
              <input placeholder="Dog name *" value={dogForm.name} onChange={e => setDogForm({ ...dogForm, name: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-[13px]" />
              <input placeholder="Breed" value={dogForm.breedName} onChange={e => setDogForm({ ...dogForm, breedName: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-[13px]" />
              <div className="grid grid-cols-2 gap-3">
                <select value={dogForm.sex} onChange={e => setDogForm({ ...dogForm, sex: e.target.value })} className="rounded-md border border-black/10 px-3 py-2 text-[13px]">
                  <option value="">Sex</option><option>Male</option><option>Female</option>
                </select>
                <input placeholder="Weight (lbs)" type="number" value={dogForm.weightLbs} onChange={e => setDogForm({ ...dogForm, weightLbs: e.target.value })} className="rounded-md border border-black/10 px-3 py-2 text-[13px]" />
              </div>
              <input placeholder="Color" value={dogForm.color} onChange={e => setDogForm({ ...dogForm, color: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-[13px]" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAddDog(false)} className="rounded-md border border-black/10 px-3 py-2 text-[11px] font-bold text-zinc-600">Cancel</button>
              <button onClick={async () => {
                setSavingDog(true)
                await fetch("/api/cms/dogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: id, ...dogForm }) })
                const allDogs = await fetch("/api/cms/dogs").then(r => r.json())
                setDogs((allDogs as Dog[]).filter(d => d.customerId === id))
                setShowAddDog(false); setDogForm({ name: "", breedName: "", sex: "", weightLbs: "", color: "" }); setSavingDog(false)
              }} disabled={savingDog || !dogForm.name} className="rounded-md bg-black px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">{savingDog ? "Saving…" : "Add Dog"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showSendEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowSendEmail(false)}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-[16px] font-semibold text-zinc-900">Send Email to {customer.firstName}</h3>
            <div className="space-y-3">
              <input placeholder="Subject" value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-[13px]" />
              <textarea placeholder="Message body…" rows={6} value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} className="w-full rounded-md border border-black/10 px-3 py-2 text-[13px]" />
              <p className="text-[10px] text-zinc-400">From: notifications@confirmation.aapawz.com → To: {customer.email}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowSendEmail(false)} className="rounded-md border border-black/10 px-3 py-2 text-[11px] font-bold text-zinc-600">Cancel</button>
              <button onClick={async () => {
                setSendingEmail(true)
                await fetch("/api/cms/email_messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: id, toEmail: customer.email, template: "manual", subject: emailForm.subject || "Message from All About Pawz", body: emailForm.body, status: "QUEUED" }) })
                // Also send via Resend
                await fetch("/api/send-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: customer.email, subject: emailForm.subject || "Message from All About Pawz", html: emailForm.body, customerId: id }) }).catch(() => {})
                setShowSendEmail(false); setEmailForm({ subject: "", body: "" }); setSendingEmail(false)
              }} disabled={sendingEmail || !emailForm.body} className="flex items-center gap-1 rounded-md bg-black px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">{sendingEmail ? "Sending…" : <><PaperPlaneTilt size={12} weight="bold" /> Send</>}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-3">
      <div className="flex items-center gap-1.5"><Icon size={13} weight="fill" className="text-zinc-900" /><p className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">{label}</p></div>
      <p className="mt-1.5 text-[18px] font-bold text-zinc-900">{value}</p>
    </div>
  )
}

function Section({ title, count, icon: Icon, action, children }: { title: string; count?: number; icon?: any; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-900">
          {Icon && <Icon size={14} weight="fill" className="text-zinc-900" />}
          {title}{count !== undefined && <span className="text-zinc-400">({count})</span>}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-[13px] text-zinc-400">{text}</p>
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-zinc-400">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900" />
    </div>
  )
}
