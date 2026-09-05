"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import { PawGlyph } from "@/components/site/brand"

const SIZES = ["Small (0-20 lbs)", "Medium (20-50 lbs)", "Large (50-90 lbs)", "X-Large (90+ lbs)"]
const SIZE_TO_CODE: Record<string, string> = {
  "Small (0-20 lbs)": "SMALL",
  "Medium (20-50 lbs)": "MEDIUM",
  "Large (50-90 lbs)": "LARGE",
  "X-Large (90+ lbs)": "X-LARGE",
}

export function BookingForm({ packages, phone }: { packages: { name: string }[]; phone?: string }) {
  const [size, setSize] = useState(SIZES[0])
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ ownerName: "", dogName: "", breed: "", phone: "", email: "", notes: "" })
  const serviceOptions = packages.map((p) => p.name)
  return (
    <section className="marble bg-cream px-8 pb-14 lg:px-12">
      <ol className="relative flex items-start justify-between">
        <span className="absolute left-[8%] right-[8%] top-[22px] h-px bg-gold/30" />
        {["CHOOSE SERVICE", "PICK DATE & TIME", "YOUR DETAILS", "CONFIRM"].map((step) => (
          <li key={step} className="relative z-10 flex-1 text-center">
            <span className="mx-auto flex h-[44px] w-[44px] items-center justify-center rounded-full border border-gold/45 bg-cream">
              <PawGlyph className="h-5 w-5 text-gold-deep" />
            </span>
            <span className="mt-3 block text-[9px] font-bold tracking-[0.13em] text-ink-soft">{step}</span>
          </li>
        ))}
      </ol>
      {done ? (
        <div className="mt-10 border border-gold/30 bg-card p-10 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-gold-deep" />
          <h2 className="mt-4 font-display text-[24px] text-ink">Request Received!</h2>
          <p className="mt-3 text-[12.5px] leading-[1.8] text-ink-soft">Thank you — your appointment request has been sent. Our team will confirm your booking personally.</p>
          <a href="/" className="btn-gold mt-6 inline-flex">BACK TO HOME</a>
        </div>
      ) : (
        <form className="mt-10 border border-gold/30 bg-card p-7" onSubmit={async (e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          try {
            await fetch("/api/cms/bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ownerName: form.ownerName, dogName: form.dogName, breed: form.breed,
                service: fd.get("service"), size: SIZE_TO_CODE[size] || "SMALL",
                date: fd.get("date"), time: fd.get("time"),
                phone: form.phone, email: form.email, notes: form.notes, status: "PENDING",
              }),
            })
            setDone(true)
          } catch { /* ignore */ }
        }}>
          <span className="text-[9.5px] font-bold tracking-[0.16em] text-gold-deep">SELECT A SERVICE</span>
          <select name="service" aria-label="Select a service" className="mt-2 w-full appearance-none border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-gold-deep">
            {serviceOptions.length > 0 ? serviceOptions.map((o) => <option key={o}>{o}</option>) : (
              <><option>Full Groom</option><option>Bath &amp; Brush</option><option>Deluxe Spa</option></>
            )}
          </select>
          <div className="mt-7">
            <span className="text-[9.5px] font-bold tracking-[0.16em] text-gold-deep">SELECT YOUR PUP&apos;S SIZE</span>
            <div className="mt-3 flex flex-wrap gap-6">
              {SIZES.map((sz) => (
                <label key={sz} className="flex items-center gap-2 text-[11.5px] text-ink-soft">
                  <input type="radio" name="size" checked={size === sz} onChange={() => setSize(sz)} className="h-3 w-3 accent-[oklch(0.6_0.093_62)]" />
                  {sz}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-7">
            <span className="text-[9.5px] font-bold tracking-[0.16em] text-gold-deep">SELECT DATE &amp; TIME</span>
            <div className="mt-2 grid gap-4 lg:grid-cols-2">
              <select name="date" aria-label="Select date" className="w-full appearance-none border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-gold-deep">
                <option>Tomorrow</option><option>In 2 days</option><option>In 3 days</option>
              </select>
              <select name="time" aria-label="Select time" className="w-full appearance-none border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-gold-deep">
                <option>10:00 AM</option><option>11:30 AM</option><option>1:00 PM</option><option>3:00 PM</option>
              </select>
            </div>
          </div>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required placeholder="Your Name" aria-label="Your Name" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <input value={form.dogName} onChange={(e) => setForm({ ...form, dogName: e.target.value })} required placeholder="Your Pup's Name" aria-label="Dog's name" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Breed (optional)" aria-label="Breed" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" aria-label="Phone" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" aria-label="Email" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes (temperament, sensitivities)" aria-label="Notes" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
          </div>
          <button type="submit" className="btn-dark mt-8 w-full">REQUEST APPOINTMENT <PawGlyph className="h-3.5 w-3.5 text-gold" /></button>
        </form>
      )}
      <p className="mt-6 text-center text-[11.5px] text-ink-soft">Need help? Call or text us at {phone || "(555) 123-PAWZ"}</p>
    </section>
  )
}
