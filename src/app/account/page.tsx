"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { PetCard } from "@/components/dawg/PetCard"
import {
  PawPrint, CalendarCheck, CreditCard, CurrencyDollar,
  ArrowRight, SignOut,
} from "@phosphor-icons/react"

type Customer = {
  id: string; firstName: string; lastName: string; email: string
  stripeCustomerId: string | null
}
type Dog = { id: string; name: string; breedName: string | null; weightLbs: string | null; sex: string | null; birthDate: string | null; color: string | null; markings: string | null; photoUrl: string | null }
type Booking = { id: string; dogName: string; service: string; date: string; time: string; status: string; servicePrice: string | null }
type Payment = { id: string; amount: string; type: string; status: string; createdAt: string }

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [dogs, setDogs] = useState<Dog[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return
      if (!session) { router.push("/admin/login?redirect=/account"); return }
      setUser(session.user)

      // Find customer by email
      fetch("/api/cms/customers").then(r => r.json()).then((all: any[]) => {
        const c = all.find(c => c.email === session.user.email)
        if (!c) { setLoading(false); return }
        setCustomer(c)

        Promise.all([
          fetch("/api/cms/dogs").then(r => r.json()).catch(() => []),
          fetch("/api/cms/bookings").then(r => r.json()).catch(() => []),
          fetch("/api/cms/payments").then(r => r.json()).catch(() => []),
        ]).then(([allDogs, allBookings, allPays]) => {
          if (!alive) return
          setDogs((allDogs as Dog[]).filter(d => d.customerId === c.id))
          setBookings((allBookings as Booking[]).filter((b: any) => b.customerId === c.id))
          setPayments((allPays as Payment[]).filter((p: any) => p.customerId === c.id))
          setLoading(false)
        })
      }).catch(() => { if (alive) setLoading(false) })
    })
    return () => { alive = false }
  }, [])

  const openStripePortal = async () => {
    if (!customer) return
    const res = await fetch("/api/stripe/customer-portal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customer.id }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-cream text-zinc-400">Loading…</div>
  if (!user) return null

  const upcoming = bookings.filter(b => b.status === "CONFIRMED" || b.status === "PAYMENT_PENDING")
  const totalSpent = payments.filter(p => p.status === "paid").reduce((s, p) => s + parseFloat(p.amount?.replace(/[^0-9.]/g, "") || "0"), 0)

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-gold/25 bg-ink">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PawPrint className="h-6 w-6 text-gold" />
            <span className="font-display text-[15px] tracking-[0.14em] text-on-dark">ALL ABOUT PAWZ</span>
          </Link>
          <button onClick={signOut} className="flex items-center gap-1 text-[11px] font-bold text-on-dark-muted hover:text-gold">
            <SignOut size={14} weight="bold" /> Sign Out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Welcome */}
        <h1 className="font-display text-[32px] text-ink">Hello, {customer?.firstName || user.email}</h1>
        <p className="script mt-1 text-[22px]">From Pawz to PAWfection</p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-gold/25 bg-card p-4">
            <CalendarCheck size={18} weight="fill" className="text-gold-deep" />
            <p className="mt-2 text-[10px] font-bold uppercase text-zinc-400">Upcoming</p>
            <p className="text-[20px] font-bold text-ink">{upcoming.length}</p>
          </div>
          <div className="rounded-lg border border-gold/25 bg-card p-4">
            <PawPrint size={18} weight="fill" className="text-gold-deep" />
            <p className="mt-2 text-[10px] font-bold uppercase text-zinc-400">Pets</p>
            <p className="text-[20px] font-bold text-ink">{dogs.length}</p>
          </div>
          <div className="rounded-lg border border-gold/25 bg-card p-4">
            <CurrencyDollar size={18} weight="fill" className="text-gold-deep" />
            <p className="mt-2 text-[10px] font-bold uppercase text-zinc-400">Total Spent</p>
            <p className="text-[20px] font-bold text-ink">${totalSpent.toFixed(0)}</p>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <section className="mt-8">
          <h2 className="font-display text-[20px] text-ink">Upcoming Appointments</h2>
          {upcoming.length === 0 ? (
            <p className="mt-3 rounded-lg border border-gold/25 bg-card p-6 text-center text-[13px] text-ink-soft">No upcoming appointments.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {upcoming.map(b => (
                <Link key={b.id} href="/account" className="flex items-center justify-between rounded-lg border border-gold/25 bg-card p-4 hover:border-gold-deep">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">{b.service}</p>
                    <p className="text-[12px] text-ink-soft">{b.date} at {b.time} · {b.dogName}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${b.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{b.status}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* My Pets */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[20px] text-ink">My Pets</h2>
            {dogs.length > 0 && (
              <Link href="/book" className="text-[11px] font-bold uppercase tracking-wide text-gold-deep hover:underline">+ Add a pet</Link>
            )}
          </div>
          {dogs.length === 0 ? (
            <div className="mt-3 rounded-lg border border-gold/25 bg-card p-6 text-center">
              <p className="text-[13px] text-ink-soft">No pets registered yet.</p>
              <Link href="/book" className="mt-3 inline-block btn-gold text-[11px]">+ Add your first pet</Link>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {dogs.map(d => (
                <PetCard
                  key={d.id}
                  dog={d}
                  variant="customer"
                  onPhotoChange={(url) => {
                    setDogs(prev => prev.map(p => p.id === d.id ? { ...p, photoUrl: url } : p))
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Payment History */}
        <section className="mt-8">
          <h2 className="font-display text-[20px] text-ink">Payment History</h2>
          {payments.length === 0 ? (
            <p className="mt-3 rounded-lg border border-gold/25 bg-card p-6 text-center text-[13px] text-ink-soft">No payments yet.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-gold/25 bg-card">
              <table className="w-full text-[12px]">
                <thead><tr className="border-b border-gold/20 text-[10px] uppercase text-zinc-400">
                  <th className="px-4 py-2 text-left">Date</th><th className="text-left">Amount</th><th className="text-left">Type</th><th className="text-right pr-4">Status</th>
                </tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-gold/10">
                      <td className="px-4 py-2">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="font-semibold">{p.amount}</td>
                      <td>{p.type}</td>
                      <td className="pr-4 text-right"><span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${p.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Billing */}
        <section className="mt-8">
          <h2 className="font-display text-[20px] text-ink">Billing</h2>
          <div className="mt-3 rounded-lg border border-gold/25 bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard size={20} weight="fill" className="text-gold-deep" />
                <div>
                  <p className="text-[13px] font-semibold text-ink">Payment Methods</p>
                  <p className="text-[11px] text-ink-soft">Manage your cards via Stripe</p>
                </div>
              </div>
              <button onClick={openStripePortal} className="btn-gold text-[10px]">
                Manage <ArrowRight size={12} weight="bold" className="inline" />
              </button>
            </div>
          </div>
        </section>

        <div className="mt-12 border-t border-gold/20 pt-6 text-center">
          <Link href="/" className="text-[12px] text-ink-soft hover:text-gold-deep">← Back to website</Link>
        </div>
      </main>
    </div>
  )
}
