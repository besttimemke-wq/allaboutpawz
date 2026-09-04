"use client"

import { useState } from "react"
import { Check, CheckCircle2 } from "lucide-react"

const POINTS = ["Tell us about your pup", "Get expert recommendations", "Find the perfect products", "Order with confidence"]

export function ConsultationForm() {
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", email: "", dogName: "", concerns: "" })
  return (
    <section className="marble bg-cream px-8 pb-14 lg:px-12">
      <div className="border border-gold/30 bg-card p-8">
        <h2 className="text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">SCHEDULE YOUR FREE CONSULTATION</h2>
        {done ? (
          <div className="mt-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold-deep" />
            <p className="mt-4 text-[12.5px] leading-[1.8] text-ink-soft">Thank you — your consultation request has been received. We&apos;ll reach out personally to schedule your visit.</p>
          </div>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={async (e) => {
            e.preventDefault()
            try {
              await fetch("/api/cms/consultations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...form, status: "PENDING" }),
              })
              setDone(true)
            } catch { /* ignore */ }
          }}>
            <div className="grid gap-4 lg:grid-cols-2">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Your Name" aria-label="Your Name" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} type="tel" placeholder="Phone Number" aria-label="Phone Number" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email Address" aria-label="Email Address" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              <input value={form.dogName} onChange={(e) => setForm({ ...form, dogName: e.target.value })} placeholder="Your Pup's Name" aria-label="Dog's name" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            </div>
            <textarea value={form.concerns} onChange={(e) => setForm({ ...form, concerns: e.target.value })} rows={4} aria-label="Tell us about your pup" placeholder="Tell us about your pup (breed, age, coat, any concerns)" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <button type="submit" className="btn-dark w-full">BOOK MY FREE CONSULTATION</button>
          </form>
        )}
      </div>
      <p className="mt-6 text-center text-[11.5px] text-ink-soft">No obligation. Just expert advice and happy tails.</p>
      <ul className="mt-7 space-y-3">
        {POINTS.map((p) => (
          <li key={p} className="flex items-center gap-3 text-[12.5px] text-ink-soft">
            <span className="flex h-4 w-4 items-center justify-center rounded-full border border-gold-deep"><Check className="h-2.5 w-2.5 text-gold-deep" strokeWidth={3} /></span>
            {p}
          </li>
        ))}
      </ul>
    </section>
  )
}

export { Check }
