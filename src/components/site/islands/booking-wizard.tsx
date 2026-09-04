"use client"

import { useState, useMemo, useEffect } from "react"
import { Check, CaretLeft, CaretRight, PawPrint, Calendar, Clock, Scissors, Dog, User, Note, CheckCircle, CreditCard } from "@phosphor-icons/react"

type Breed = { id: string; name: string; sizeCategory: string; coatType: string; akcGroup?: string }
type Service = { id: string; name: string; price: string; description?: string }
type Groomer = { id: string; name: string; role: string; bio?: string }

const SIZES = ["SMALL (0-20 lbs)", "MEDIUM (20-50 lbs)", "LARGE (50-90 lbs)", "X-LARGE (90+ lbs)"]

export function BookingWizard({
  breeds, services, groomers,
}: {
  breeds: Breed[]
  services: Service[]
  groomers: Groomer[]
}) {
  const [bookingType, setBookingType] = useState<"BOOKING" | "CONSULTATION" | "">("")
  const [step, setStep] = useState(0)
  const [ownerName, setOwnerName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [dogName, setDogName] = useState("")
  const [breedId, setBreedId] = useState("")
  const [size, setSize] = useState(SIZES[0])
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [closed, setClosed] = useState(false)
  const [serviceId, setServiceId] = useState("")
  const [consultationReason, setConsultationReason] = useState("")
  const [notes, setNotes] = useState("")
  const [groomerId, setGroomerId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [success, setSuccess] = useState<"booking" | "consultation" | null>(null)

  const selectedBreed = breeds.find((b) => b.id === breedId)
  const selectedService = services.find((s) => s.id === serviceId)
  const selectedGroomer = groomers.find((g) => g.id === groomerId)

  useEffect(() => {
    if (selectedBreed) {
      const map: Record<string, string> = { "Small": SIZES[0], "Medium": SIZES[1], "Large": SIZES[2], "X-Large": SIZES[3] }
      if (map[selectedBreed.sizeCategory]) setSize(map[selectedBreed.sizeCategory])
    }
  }, [breedId])

  useEffect(() => {
    if (!date) return
    setLoadingSlots(true); setClosed(false)
    fetch(`/api/availability?date=${date}`).then((r) => r.json()).then((d) => { setSlots(d.times || []); setClosed(!!d.closed); setTime("") }).catch(() => setSlots([])).finally(() => setLoadingSlots(false))
  }, [date])

  // Check URL for success param (return from Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "booking") setSuccess("booking")
    if (params.get("success") === "consultation") setSuccess("consultation")
  }, [])

  const steps = bookingType === "CONSULTATION"
    ? ["Your Name", "Contact", "Your Dog", "Date & Time", "Reason", "Notes", "Groomer", "Confirm"]
    : ["Your Name", "Contact", "Your Dog", "Date & Time", "Service", "Notes", "Groomer", "Deposit"]

  const canNext = useMemo(() => {
    if (bookingType === "") return false
    switch (step) {
      case 0: return !!ownerName.trim()
      case 1: return !!phone.trim() && !!email.trim()
      case 2: return !!dogName.trim() && !!breedId
      case 3: return !!date && !!time
      case 4: return bookingType === "CONSULTATION" ? !!consultationReason.trim() : !!serviceId
      case 5: return true
      case 6: return true
      case 7: return true
      default: return false
    }
  }, [step, ownerName, phone, email, dogName, breedId, date, time, serviceId, consultationReason, bookingType])

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingType, ownerName, phone, email, address,
          dogName, breedId, breedName: selectedBreed?.name || "", size,
          date, time, serviceId, serviceName: selectedService?.name || "",
          consultationReason, notes, groomerId, groomerName: selectedGroomer?.name || "",
          servicePrice: selectedService?.price || "",
        }),
      })
      const data = await res.json()
      if (data.url) {
        setRedirecting(true)
        window.location.href = data.url
      } else if (data.type === "consultation") {
        setSuccess("consultation")
      }
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  if (success) {
    return (
      <div className="border border-gold/30 bg-card p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-deep">
          <Check size={32} weight="bold" className="text-cream" />
        </div>
        <h2 className="mt-4 font-display text-[28px] text-ink">
          {success === "booking" ? "Booking Confirmed" : "Consultation Requested"}
        </h2>
        <p className="script mt-2 text-[24px]">From Pawz to PAWfection</p>
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
          {success === "booking"
            ? <>Your $25 deposit has been received and your appointment is confirmed. A confirmation email is on its way to {email}.</>
            : <>We received your consultation request. Our team will reach out personally to schedule your visit.</>}
        </p>
        <a href="/" className="btn-gold mt-6 inline-flex">RETURN HOME</a>
      </div>
    )
  }

  // Step 0: Choose booking type
  if (bookingType === "") {
    return (
      <div className="text-center">
        <h2 className="font-display text-[28px] text-ink">How can we help your pup today?</h2>
        <p className="mt-2 text-[12.5px] text-ink-soft">Choose an option to get started.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button onClick={() => { setBookingType("BOOKING"); setStep(0) }} className="group border border-gold/35 bg-cream p-8 text-center transition-colors hover:border-gold-deep hover:bg-cream-deep">
            <Scissors size={32} weight="fill" className="mx-auto text-gold-deep" />
            <h3 className="mt-3 font-display text-[20px] text-ink">Book Appointment</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">Schedule a grooming service. A $25 deposit secures your appointment.</p>
          </button>
          <button onClick={() => { setBookingType("CONSULTATION"); setStep(0) }} className="group border border-gold/35 bg-cream p-8 text-center transition-colors hover:border-gold-deep hover:bg-cream-deep">
            <PawPrint size={32} weight="fill" className="mx-auto text-gold-deep" />
            <h3 className="mt-3 font-display text-[20px] text-ink">Free Consultation</h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">Meet with our team to discuss your pup&apos;s needs. No charge, no obligation.</p>
          </button>
        </div>
      </div>
    )
  }

  const stepIcons = [User, User, Dog, Calendar, Scissors, Note, PawPrint, bookingType === "CONSULTATION" ? Check : CreditCard]

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="flex items-center justify-between border-b border-gold/25 pb-5">
        {steps.map((s, i) => {
          const isActive = step === i
          const isDone = step > i
          const Icon = stepIcons[i]
          return (
            <div key={s} className="flex flex-1 items-center">
              <button onClick={() => { if (i < step) setStep(i) }} disabled={i > step} className={`flex flex-col items-center gap-1.5 ${i < step ? "cursor-pointer" : "cursor-default"}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors ${isActive ? "border-gold-deep bg-gold-deep text-cream" : isDone ? "border-gold-deep bg-gold-deep text-cream" : "border-gold/30 bg-cream text-gold-deep"}`}>
                  {isDone ? <Check size={14} weight="bold" /> : <Icon size={14} weight="fill" />}
                </span>
                <span className={`text-[8px] font-bold tracking-[0.08em] ${isActive ? "text-gold-deep" : "text-ink-soft"}`}>{s.toUpperCase()}</span>
              </button>
              {i < steps.length - 1 && <span className={`mx-1 h-px flex-1 ${step > i ? "bg-gold-deep" : "bg-gold/25"}`} />}
            </div>
          )
        })}
      </div>

      <div className="min-h-[300px]">
        {/* Step 0: Name */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">What is your name?</h2>
              <p className="mt-1 text-[12px] text-ink-soft">So we know who to welcome.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">FULL NAME</label>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Jane Smith" autoFocus className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            </div>
          </div>
        )}

        {/* Step 1: Phone + email + address */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">Contact details</h2>
              <p className="mt-1 text-[12px] text-ink-soft">We&apos;ll send your confirmation here.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">PHONE</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="(312) 555-0142" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">EMAIL</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="jane@email.com" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">ADDRESS</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Maple Grove Ave, Riverbend, IL 60614" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Dog */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">Tell us about your pup</h2>
              <p className="mt-1 text-[12px] text-ink-soft">Every dog is special. We tailor the experience to their breed.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">DOG NAME</label>
                <input value={dogName} onChange={(e) => setDogName(e.target.value)} placeholder="Cooper" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              </div>
              <div>
                <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">BREED</label>
                <BreedDropdown breeds={breeds} value={breedId} onChange={setBreedId} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep">SIZE</label>
                <div className="flex flex-wrap gap-3">
                  {SIZES.map((sz) => (
                    <button key={sz} type="button" onClick={() => setSize(sz)} className={`border px-4 py-2.5 text-[11px] font-bold tracking-[0.1em] transition-colors ${size === sz ? "border-gold-deep bg-gold-deep text-cream" : "border-gold/35 bg-cream text-ink-soft hover:border-gold-deep"}`}>{sz}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Date + Time */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">When would you like to come in?</h2>
              <p className="mt-1 text-[12px] text-ink-soft">Open Tue–Sat 9am–6pm, Sun 10am–4pm. Closed Mondays.</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <CalendarGrid value={date} onChange={setDate} />
              <div>
                {date ? (
                  <>
                    <p className="mb-3 text-[11px] font-bold tracking-[0.12em] text-gold-deep">AVAILABLE TIMES — {new Date(date + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                    {loadingSlots ? <p className="text-[13px] text-ink-soft">Loading…</p> : closed ? <p className="text-[13px] text-ink-soft">We&apos;re closed on Mondays. Please pick another date.</p> : slots.length === 0 ? <p className="text-[13px] text-ink-soft">All slots are taken. Please try another day.</p> : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {slots.map((t) => <button key={t} onClick={() => setTime(t)} className={`border px-3 py-2.5 text-[12px] font-semibold transition-colors ${time === t ? "border-gold-deep bg-gold-deep text-cream" : "border-gold/35 bg-cream text-ink hover:border-gold-deep hover:bg-cream-deep"}`}>{t}</button>)}
                      </div>
                    )}
                  </>
                ) : <p className="text-[13px] text-ink-soft">Pick a date on the calendar to see available times.</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Service (booking) or Reason (consultation) */}
        {step === 4 && bookingType === "BOOKING" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">Choose your service</h2>
              <p className="mt-1 text-[12px] text-ink-soft">Select what your pup needs today.</p>
            </div>
            <div className="space-y-3">
              {services.map((s) => (
                <button key={s.id} onClick={() => setServiceId(s.id)} className={`flex w-full items-center justify-between border px-5 py-4 text-left transition-colors ${serviceId === s.id ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}>
                  <div><p className="text-[13px] font-bold text-ink">{s.name}</p>{s.description && <p className="mt-0.5 text-[11px] text-ink-soft">{s.description}</p>}</div>
                  <span className="text-[14px] font-bold text-gold-deep">{s.price}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 4 && bookingType === "CONSULTATION" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">What brings you in?</h2>
              <p className="mt-1 text-[12px] text-ink-soft">Tell us what you&apos;d like to discuss.</p>
            </div>
            <div className="space-y-2">
              {["First visit / new puppy", "Coat or matting concerns", "Special needs or anxiety", "Breed recommendation", "Pricing question", "Product recommendation", "Other"].map((r) => (
                <button key={r} onClick={() => setConsultationReason(r)} className={`flex w-full items-center border px-5 py-3 text-left text-[13px] transition-colors ${consultationReason === r ? "border-gold-deep bg-cream-deep font-semibold text-gold-deep" : "border-gold/35 bg-cream text-ink hover:border-gold-deep"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Notes */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">Special notes</h2>
              <p className="mt-1 text-[12px] text-ink-soft">Anything we should know about your pup? Temperament, sensitivities, matting, etc.</p>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="e.g. Cooper is nervous around loud noises. He may need breaks during the groom. Sensitive paws." className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
          </div>
        )}

        {/* Step 6: Groomer */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">Preferred groomer</h2>
              <p className="mt-1 text-[12px] text-ink-soft">Have a favorite? Or let us assign the best fit.</p>
            </div>
            <div className="space-y-3">
              <button onClick={() => setGroomerId("")} className={`flex w-full items-center gap-4 border px-5 py-4 text-left transition-colors ${groomerId === "" ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}>
                <PawPrint size={24} weight="fill" className="text-gold-deep" />
                <div><p className="text-[13px] font-bold text-ink">No preference</p><p className="text-[11px] text-ink-soft">Assign the best available groomer</p></div>
              </button>
              {groomers.map((g) => (
                <button key={g.id} onClick={() => setGroomerId(g.id)} className={`flex w-full items-center gap-4 border px-5 py-4 text-left transition-colors ${groomerId === g.id ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-deep/15 font-display text-[16px] font-bold text-gold-deep">{g.name.charAt(0)}</div>
                  <div><p className="text-[13px] font-bold text-ink">{g.name}</p><p className="text-[11px] text-ink-soft">{g.role}{g.bio ? ` — ${g.bio}` : ""}</p></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Review + Checkout */}
        {step === 7 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-display text-[24px] text-ink">{bookingType === "CONSULTATION" ? "Confirm your consultation" : "Review & pay deposit"}</h2>
              <p className="mt-1 text-[12px] text-ink-soft">{bookingType === "CONSULTATION" ? "Submit your consultation request — no charge." : "A $25 deposit secures your appointment."}</p>
            </div>
            <div className="border border-gold/30 bg-cream-deep p-5">
              <p className="text-[10px] font-bold tracking-[0.18em] text-gold-deep">BOOKING SUMMARY</p>
              <div className="mt-3 grid grid-cols-1 gap-y-2 text-[12px] sm:grid-cols-2">
                <div><span className="text-ink-soft">Owner:</span> <span className="font-semibold text-ink">{ownerName}</span></div>
                <div><span className="text-ink-soft">Dog:</span> <span className="font-semibold text-ink">{dogName}</span></div>
                <div><span className="text-ink-soft">Breed:</span> <span className="font-semibold text-ink">{selectedBreed?.name || "—"}</span></div>
                <div><span className="text-ink-soft">Size:</span> <span className="font-semibold text-ink">{size.split(" ")[0]}</span></div>
                <div><span className="text-ink-soft">Date:</span> <span className="font-semibold text-ink">{date}</span></div>
                <div><span className="text-ink-soft">Time:</span> <span className="font-semibold text-ink">{time}</span></div>
                <div><span className="text-ink-soft">Service:</span> <span className="font-semibold text-ink">{bookingType === "CONSULTATION" ? consultationReason : selectedService?.name}</span></div>
                <div><span className="text-ink-soft">Groomer:</span> <span className="font-semibold text-ink">{selectedGroomer?.name || "No preference"}</span></div>
              </div>
              {notes && <p className="mt-3 border-t border-gold/20 pt-3 text-[11px] italic text-ink-soft">&ldquo;{notes}&rdquo;</p>}
              {bookingType === "BOOKING" && selectedService && (
                <div className="mt-3 border-t border-gold/20 pt-3">
                  <div className="flex justify-between text-[13px]"><span className="text-ink-soft">Service price</span><span className="font-semibold text-ink">{selectedService.price}</span></div>
                  <div className="mt-1 flex justify-between text-[13px]"><span className="text-ink-soft">Deposit due now</span><span className="font-bold text-gold-deep">$25.00</span></div>
                </div>
              )}
            </div>
            {redirecting ? (
              <p className="text-center text-[13px] text-gold-deep">Redirecting to Stripe…</p>
            ) : (
              <button onClick={submit} disabled={submitting} className="btn-dark w-full">
                {submitting ? "Processing…" : bookingType === "CONSULTATION" ? "Submit Consultation Request" : "Pay $25 Deposit & Confirm"}
                {bookingType === "BOOKING" && <CreditCard size={16} weight="fill" className="ml-2" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between border-t border-gold/25 pt-5">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} className="btn-ghost"><CaretLeft size={14} weight="bold" /> Back</button>
        ) : (
          <button onClick={() => { setBookingType(""); setStep(0) }} className="text-[11px] font-bold tracking-[0.1em] text-ink-soft hover:text-gold-deep"><CaretLeft size={12} weight="bold" /> Start over</button>
        )}
        {step < 7 ? (
          <button onClick={() => canNext && setStep(step + 1)} disabled={!canNext} className={`btn-gold ${!canNext ? "opacity-40 cursor-not-allowed" : ""}`}>
            Continue <CaretRight size={14} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function BreedDropdown({ breeds, value, onChange }: { breeds: Breed[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selected = breeds.find((b) => b.id === value)
  const filtered = breeds.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={`flex w-full items-center justify-between border bg-cream px-3.5 py-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gold-deep ${open ? "border-gold-deep" : "border-gold/35"}`}>
        <span className={selected ? "text-ink" : "text-muted-foreground"}>{selected ? `${selected.name}` : "Select breed…"}</span>
        <CaretRight size={12} weight="bold" className={`text-gold-deep transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full border border-gold/35 bg-cream shadow-lg">
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search 232 breeds…" className="w-full border-b border-gold/25 bg-cream px-3 py-2 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none" />
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((b) => (
              <button key={b.id} type="button" onClick={() => { onChange(b.id); setOpen(false); setQuery("") }} className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-cream-deep ${value === b.id ? "bg-cream-deep font-semibold text-gold-deep" : "text-ink"}`}>
                {b.name}
                {b.akcGroup && <span className="text-[9px] uppercase text-ink-soft">{b.akcGroup}</span>}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-[12px] text-ink-soft">Not found. Try &ldquo;Other / Breed Not Listed&rdquo;.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function CalendarGrid({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const days = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const last = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    const cells: (Date | null)[] = []
    for (let i = 0; i < first.getDay(); i++) cells.push(null)
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
    return cells
  }, [viewMonth])
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const isPast = (d: Date) => { const t = new Date(); t.setHours(0, 0, 0, 0); return d < t }
  const isMonday = (d: Date) => d.getDay() === 1
  return (
    <div className="border border-gold/30 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center text-gold-deep hover:bg-cream-deep"><CaretLeft size={14} weight="bold" /></button>
        <span className="font-display text-[16px] text-ink">{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center text-gold-deep hover:bg-cream-deep"><CaretRight size={14} weight="bold" /></button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">{["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-ink-soft">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = fmt(d)
          const disabled = isPast(d) || isMonday(d)
          return <button key={i} disabled={disabled} onClick={() => onChange(ds)} className={`aspect-square text-[11px] font-semibold transition-colors ${ds === value ? "bg-gold-deep text-cream" : disabled ? "text-ink-soft/30 cursor-not-allowed" : "text-ink hover:bg-cream-deep"}`}>{d.getDate()}</button>
        })}
      </div>
    </div>
  )
}
