"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Check, CaretLeft, CaretRight, CaretDown, PawPrint,
  Scissors, Dog, CreditCard, Sparkle, Camera, Spinner,
} from "@phosphor-icons/react"
import { useWizard, type BookingType } from "@/lib/wizard/wizard-store"

// ---------------------------------------------------------------------------
// Types — everything the wizard needs comes from server-side props.
// ---------------------------------------------------------------------------

type Breed = { id: string; name: string; sizeCategory?: string; coatType?: string; akcGroup?: string }
type Service = { id: string; name: string; price: string; durationMinutes?: number; description?: string }
type Groomer = { id: string; name: string; role: string; bio?: string }

type LookupItem = { id: string; name: string; [k: string]: any }

export type WizardLookups = {
  coatTypes: LookupItem[]
  coatTextures: LookupItem[]
  coatLengths: LookupItem[]
  coatConditions: LookupItem[]
  sheddingLevels: LookupItem[]
  haircutStyles: LookupItem[]
  clipLengths: LookupItem[]
  bodyStyles: LookupItem[]
  legStyles: LookupItem[]
  faceStyles: LookupItem[]
  headStyles: LookupItem[]
  earStyles: LookupItem[]
  tailStyles: LookupItem[]
  feetStyles: LookupItem[]
  sanitaryOptions: LookupItem[]
  nailServices: LookupItem[]
  pawPadServices: LookupItem[]
  earServices: LookupItem[]
  teethServices: LookupItem[]
  desheddingServices: LookupItem[]
  coatTechniques: LookupItem[]
}

export function BookingWizardV2({
  breeds, services, groomers, lookups,
}: {
  breeds: Breed[]
  services: Service[]
  groomers: Groomer[]
  lookups: WizardLookups
}) {
  const s = useWizard()
  const [hydrated, setHydrated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [success, setSuccess] = useState<"booking" | "consultation" | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  // Hydrate from localStorage (avoid SSR mismatch)
  useEffect(() => setHydrated(true), [])

  // Check URL for success param (return from Stripe)
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("success") === "booking") setSuccess("booking")
    if (params.get("success") === "consultation") setSuccess("consultation")
  }, [])

  // ----- Derived lookups -----
  const selectedBreed = breeds.find((b) => b.id === s.breedId)
  const selectedService = services.find((svc) => svc.id === s.serviceId)
  const selectedGroomer = groomers.find((g) => g.id === s.groomerId)

  const dogSize = useMemo(() => {
    const sz = selectedBreed?.sizeCategory || ""
    const map: Record<string, string> = {
      Small: "SMALL", Medium: "MEDIUM", Large: "LARGE", "X-Large": "X-LARGE",
    }
    return map[sz] || "MEDIUM"
  }, [selectedBreed])

  // ----- Stepper labels (steps 1..9) -----
  const stepLabels = useMemo(() => {
    if (s.bookingType === "consultation") {
      return ["Name", "Contact", "Dog", "Coat", "Grooming", "Preferred", "Groomer", "Notes", "Review"]
    }
    return ["Name", "Contact", "Dog", "Coat", "Grooming", "Schedule", "Groomer", "Notes", "Review"]
  }, [s.bookingType])

  // ----- Validation per step -----
  const canNext = useMemo(() => {
    switch (s.step) {
      case 1: return !!s.firstName.trim() && !!s.lastName.trim()
      case 2:
        return !!s.phone.trim() && !!s.email.trim() && !!s.address.trim()
          && !!s.city.trim() && !!s.state.trim() && !!s.postalCode.trim()
      case 3: return !!s.dogName.trim() && !!s.breedId && !!s.weightLbs.trim()
      case 4: return true
      case 5: return s.bookingType === "consultation" ? true : !!s.serviceId
      case 6: return !!s.date && !!s.time
      case 7: return true
      case 8: return true
      case 9: return true
      default: return false
    }
  }, [s.step, s.firstName, s.lastName, s.phone, s.email, s.address, s.city, s.state,
      s.postalCode, s.dogName, s.breedId, s.weightLbs, s.date, s.time, s.serviceId, s.bookingType])

  // ----- Continue handler (per-step side-effects) -----
  const onContinue = async () => {
    setApiError(null)
    if (!canNext) return

    // Step 2 → create customer
    if (s.step === 2) {
      try {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone,
            address: s.address, addressLine2: s.addressLine2,
            city: s.city, state: s.state, postalCode: s.postalCode,
          }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: "Failed to create customer" }))
          setApiError(e.error || "Failed to create customer")
          return
        }
        const data = await res.json()
        s.patch({ customerId: data.id })
      } catch (e: any) {
        setApiError(e.message || "Network error")
        return
      }
    }

    // Step 3 → create dog
    if (s.step === 3) {
      try {
        const res = await fetch("/api/cms/dogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: s.customerId,
            name: s.dogName,
            breedId: s.breedId,
            breedName: selectedBreed?.name || "",
            sex: s.sex || null,
            birthDate: s.birthDate || null,
            weightLbs: s.weightLbs ? parseFloat(s.weightLbs) : null,
            color: s.color || null,
            markings: s.markings || null,
          }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: "Failed to save dog" }))
          setApiError(e.error || "Failed to save dog")
          return
        }
        const data = await res.json()
        s.patch({ dogId: data.id, breedName: selectedBreed?.name || s.breedName })

        // If the customer uploaded a photo before creating the dog, link it
        // to the now-known dogId via the photo endpoint. Non-fatal — if the
        // photoUrl column hasn't been migrated yet, the photo is still in
        // Supabase Storage and can be linked later.
        if (s.photoUrl && data.id) {
          await fetch(`/api/dogs/${data.id}/photo`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: s.photoUrl }),
          }).catch(() => {/* non-fatal */})
        }
      } catch (e: any) {
        setApiError(e.message || "Network error")
        return
      }
    }

    s.setStep(s.step + 1)
  }

  // ----- Final checkout submit -----
  const submit = async () => {
    setApiError(null)
    setSubmitting(true)
    try {
      if (s.bookingType === "consultation") {
        const res = await fetch("/api/cms/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: s.customerId,
            dogId: s.dogId,
            name: `${s.firstName} ${s.lastName}`.trim(),
            dogName: s.dogName,
            breed: selectedBreed?.name || s.breedName,
            phone: s.phone,
            email: s.email,
            preferredTime: s.time,
            preferredDate: s.date,
            concerns: s.consultationReason || s.notes || "",
            notes: s.notes,
            status: "PENDING",
          }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: "Failed to submit" }))
          setApiError(e.error || "Failed to submit consultation")
          setSubmitting(false)
          return
        }
        const data = await res.json()
        s.patch({ bookingId: data.id })
        setSuccess("consultation")
      } else {
        // Appointment → Stripe checkout for $25 deposit
        const ownerName = `${s.firstName} ${s.lastName}`.trim()
        const res = await fetch("/api/bookings/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingType: "BOOKING",
            customerId: s.customerId,
            dogId: s.dogId,
            ownerName,
            phone: s.phone, email: s.email, address: s.address,
            dogName: s.dogName, breedId: s.breedId, breedName: selectedBreed?.name || s.breedName,
            size: dogSize,
            date: s.date, time: s.time,
            serviceId: s.serviceId, service: s.serviceName, serviceName: s.serviceName,
            servicePrice: s.servicePrice,
            notes: s.notes,
            groomerId: s.groomerId, groomerName: selectedGroomer?.name || "",
            // Pass the grooming profile + request data along so the backend can persist them.
            groomingProfile: {
              coatTypeId: s.coatTypeId, coatTextureId: s.coatTextureId,
              coatLengthId: s.coatLengthId, coatConditionId: s.coatConditionId,
              sheddingLevelId: s.sheddingLevelId,
              currentHaircutStyleId: s.currentHaircutStyleId,
              currentBodyLengthId: s.currentBodyLengthId,
              temperament: s.temperament,
              nailHandling: s.nailHandling, faceHandling: s.faceHandling,
              feetHandling: s.feetHandling, earHandling: s.earHandling,
              dryerHandling: s.dryerHandling, clipperHandling: s.clipperHandling,
              handlingNotes: s.handlingNotes, groomingNotes: s.groomingNotes, ownerNotes: s.ownerNotes,
            },
            groomingRequest: {
              styleId: s.styleId, bodyLengthId: s.bodyLengthId, bodyStyleId: s.bodyStyleId,
              legStyleId: s.legStyleId, faceStyleId: s.faceStyleId, headStyleId: s.headStyleId,
              earStyleId: s.earStyleId, tailStyleId: s.tailStyleId, feetStyleId: s.feetStyleId,
              sanitaryService: s.sanitaryService, nailService: s.nailService,
              pawPadService: s.pawPadService, earService: s.earService,
              teethService: s.teethService, desheddingService: s.desheddingService,
              coatTechnique: s.coatTechnique, specialInstructions: s.specialInstructions,
            },
          }),
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({ error: "Checkout failed" }))
          setApiError(e.error || "Checkout failed")
          setSubmitting(false)
          return
        }
        const data = await res.json()
        if (data.url) {
          setRedirecting(true)
          window.location.href = data.url
          return
        }
        if (data.bookingId) {
          s.patch({ bookingId: data.bookingId })
          setSuccess("booking")
        }
      }
    } catch (e: any) {
      setApiError(e.message || "Network error")
    } finally {
      setSubmitting(false)
    }
  }

  // ----- Success screen -----
  if (success) {
    return (
      <div className="border border-gold/30 bg-card p-10 text-center">
        {/* Pet photo (if uploaded) */}
        {s.photoUrl && (
          <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-gold/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.photoUrl} alt={s.dogName || "Your pup"} className="h-full w-full object-cover" />
          </div>
        )}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-deep">
          <Check size={32} weight="bold" className="text-cream" />
        </div>
        <h2 className="mt-4 font-display text-[28px] text-ink">
          {success === "booking" ? "Booking Confirmed" : "Consultation Requested"}
        </h2>
        <p className="script mt-2 text-[24px]">From Pawz to PAWfection</p>
        <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-ink-soft">
          {success === "booking"
            ? `Your $25 deposit has been received and your appointment is confirmed. A confirmation email is on its way to ${s.email || "your inbox"}.`
            : "We received your consultation request. Our team will reach out personally to schedule your visit."}
        </p>
        {/* Booking summary with pet name + photo reference */}
        {success === "booking" && (s.dogName || s.serviceName || s.date) && (
          <div className="mx-auto mt-6 max-w-sm rounded-lg border border-gold/20 bg-cream-deep p-4 text-left">
            {s.dogName && (
              <p className="text-[12px] text-ink-soft">
                <span className="font-bold text-ink">Pup:</span> {s.dogName}
              </p>
            )}
            {s.serviceName && (
              <p className="text-[12px] text-ink-soft">
                <span className="font-bold text-ink">Service:</span> {s.serviceName}
              </p>
            )}
            {s.date && (
              <p className="text-[12px] text-ink-soft">
                <span className="font-bold text-ink">Date:</span> {s.date} at {s.time}
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <a href="/" className="btn-gold">RETURN HOME</a>
          <button
            type="button"
            onClick={() => { s.reset(); setSuccess(null) }}
            className="btn-ghost"
          >BOOK ANOTHER</button>
        </div>
      </div>
    )
  }

  // SSR-safe placeholder before hydration (persist rehydration)
  if (!hydrated) {
    return (
      <div className="min-h-[420px] animate-pulse">
        <div className="h-8 w-48 rounded bg-cream-deep" />
        <div className="mt-4 h-4 w-72 rounded bg-cream-deep" />
        <div className="mt-8 grid gap-3">
          <div className="h-12 w-full rounded bg-cream-deep" />
          <div className="h-12 w-full rounded bg-cream-deep" />
        </div>
      </div>
    )
  }

  // ----- Step 0: type selection (no stepper) -----
  if (!s.bookingType) {
    // Detect if there's any persisted progress to offer "Start over".
    const hasProgress = s.step > 0 || !!s.firstName || !!s.dogName || !!s.customerId
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="eyebrow">RESERVE YOUR VISIT</p>
          <h2 className="mt-2 font-display text-[28px] text-ink">What would you like to do?</h2>
          <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed text-ink-soft">
            Book a grooming appointment or schedule a free consultation with our team. You can change your choice at any time.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => s.patch({ bookingType: "appointment", step: 1 })}
              className="group border border-gold/35 bg-cream p-8 text-center transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              <Scissors size={32} weight="fill" className="mx-auto text-gold-deep" />
              <h3 className="mt-3 font-display text-[20px] text-ink">Book an Appointment</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">$25 deposit secures your appointment.</p>
              <span className="mt-4 inline-block text-[10px] font-bold tracking-[0.18em] text-gold-deep">CONTINUE →</span>
            </button>
            <button
              type="button"
              onClick={() => s.patch({ bookingType: "consultation", step: 1 })}
              className="group border border-gold/35 bg-cream p-8 text-center transition-colors hover:border-gold-deep hover:bg-cream-deep"
            >
              <PawPrint size={32} weight="fill" className="mx-auto text-gold-deep" />
              <h3 className="mt-3 font-display text-[20px] text-ink">Schedule a Consultation</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">Free — meet with our team.</p>
              <span className="mt-4 inline-block text-[10px] font-bold tracking-[0.18em] text-gold-deep">CONTINUE →</span>
            </button>
          </div>
        </div>
        {hasProgress && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => { if (confirm("Clear all wizard data and start fresh?")) s.reset() }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-soft hover:text-gold-deep"
            >
              <CaretLeft size={12} weight="bold" /> Start over
            </button>
          </div>
        )}
      </div>
    )
  }

  // ----- Main wizard (steps 1..9) -----
  const goBack = () => {
    if (s.step === 1) {
      // From step 1, Back returns to the type-selection screen.
      s.patch({ bookingType: null, step: 0 })
    } else {
      s.setStep(s.step - 1)
    }
  }

  return (
    <div className="space-y-6">
      <Stepper step={s.step} labels={stepLabels} onJump={(i) => i < s.step && s.setStep(i)} />

      {apiError && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-[12px] text-red-700">
          {apiError}
        </div>
      )}

      <div className="min-h-[340px]">
        {s.step === 1 && <StepName />}
        {s.step === 2 && <StepContact submitting={submitting} />}
        {s.step === 3 && <StepDog breeds={breeds} submitting={submitting} />}
        {s.step === 4 && <StepCoat lookups={lookups} />}
        {s.step === 5 && <StepGroomingRequest lookups={lookups} services={services} bookingType={s.bookingType!} />}
        {s.step === 6 && <StepSchedule bookingType={s.bookingType!} durationMinutes={selectedService?.durationMinutes || 120} />}
        {s.step === 7 && <StepGroomer groomers={groomers} />}
        {s.step === 8 && <StepNotes />}
        {s.step === 9 && (
          <StepReview
            bookingType={s.bookingType!}
            selectedBreed={selectedBreed}
            selectedService={selectedService}
            selectedGroomer={selectedGroomer}
            dogSize={dogSize}
            lookups={lookups}
            submitting={submitting}
            redirecting={redirecting}
            onSubmit={submit}
          />
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between border-t border-gold/25 pt-5">
        <button type="button" onClick={goBack} className="btn-ghost">
          <CaretLeft size={14} weight="bold" /> Back
        </button>
        {s.step < 9 ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={!canNext || submitting}
            className={`btn-gold ${!canNext || submitting ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {submitting ? "Saving…" : "Continue"} <CaretRight size={14} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ===========================================================================
// Stepper bar
// ===========================================================================
function Stepper({ step, labels, onJump }: { step: number; labels: string[]; onJump: (i: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-gold/25 pb-5">
      {labels.map((label, idx) => {
        const stepNumber = idx + 1
        const isActive = step === stepNumber
        const isDone = step > stepNumber
        const canJump = step > stepNumber
        return (
          <div key={label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => canJump && onJump(stepNumber)}
              disabled={!canJump}
              className={`flex flex-col items-center gap-1.5 ${canJump ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors ${isActive ? "border-gold-deep bg-gold-deep text-cream" : isDone ? "border-gold-deep bg-gold-deep text-cream" : "border-gold/30 bg-cream text-gold-deep"}`}>
                {isDone ? <Check size={14} weight="bold" /> : stepNumber}
              </span>
              <span className={`hidden text-[8px] font-bold tracking-[0.08em] sm:block ${isActive ? "text-gold-deep" : "text-ink-soft"}`}>
                {label.toUpperCase()}
              </span>
            </button>
            {idx < labels.length - 1 && (
              <span className={`mx-1 h-px flex-1 ${step > stepNumber ? "bg-gold-deep" : "bg-gold/25"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===========================================================================
// Shared field primitives
// ===========================================================================

const inputCls = "w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep"
const labelCls = "mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep"
const sectionHeaderCls = "text-[10px] font-bold tracking-[0.18em] text-gold-deep uppercase"
const stepWrapCls = "border border-gold/30 bg-card p-7 lg:p-10"

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-gold-deep"> *</span>}</label>
      {children}
    </div>
  )
}

// Generic lookup dropdown — custom (button + absolute panel), not native select.
function LookupDropdown({
  items, value, onChange, placeholder = "Select…", searchPlaceholder,
}: {
  items: LookupItem[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  searchPlaceholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const selected = items.find((i) => i.id === value)
  const filtered = query
    ? items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : items

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between border bg-cream px-3.5 py-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gold-deep ${open ? "border-gold-deep" : "border-gold/35"}`}
      >
        <span className={selected ? "text-ink" : "text-muted-foreground"}>{selected ? selected.name : placeholder}</span>
        <CaretDown size={14} weight="bold" className={`text-gold-deep transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full border border-gold/35 bg-cream shadow-lg">
          {searchPlaceholder !== undefined && (
            <div className="border-b border-gold/25 px-3 py-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-cream text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-ink-soft">No options found.</p>
            )}
            {filtered.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => { onChange(i.id); setOpen(false); setQuery("") }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] hover:bg-cream-deep ${value === i.id ? "bg-cream-deep font-semibold text-gold-deep" : "text-ink"}`}
              >
                <span>{i.name}</span>
                {value === i.id && <Check size={12} weight="bold" className="text-gold-deep" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Breed dropdown — searchable, shows AKC group + size category
function BreedDropdown({ breeds, value, onChange }: { breeds: Breed[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const selected = breeds.find((b) => b.id === value)
  const filtered = breeds.filter((b) =>
    b.name.toLowerCase().includes(query.toLowerCase()) ||
    (b.akcGroup || "").toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between border bg-cream px-3.5 py-3 text-[14px] focus:outline-none focus:ring-1 focus:ring-gold-deep ${open ? "border-gold-deep" : "border-gold/35"}`}
      >
        <span className={selected ? "text-ink" : "text-muted-foreground"}>
          {selected ? selected.name : "Select breed…"}
        </span>
        <CaretDown size={14} weight="bold" className={`text-gold-deep transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-40 mt-1 w-full border border-gold/35 bg-cream shadow-lg">
          <div className="border-b border-gold/25 px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search breeds…"
              className="w-full bg-cream text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-ink-soft">Not found. Try &ldquo;Other / Breed Not Listed&rdquo;.</p>
            )}
            {filtered.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { onChange(b.id); setOpen(false); setQuery("") }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-cream-deep ${value === b.id ? "bg-cream-deep font-semibold text-gold-deep" : "text-ink"}`}
              >
                <span className="text-[12px]">{b.name}</span>
                {(b.sizeCategory || b.akcGroup) && (
                  <span className="text-[9px] uppercase tracking-[0.08em] text-ink-soft">
                    {b.sizeCategory ? `${b.sizeCategory}` : ""}{b.sizeCategory && b.akcGroup ? " · " : ""}{b.akcGroup || ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// Steps
// ===========================================================================

function StepName() {
  const s = useWizard()
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 1 — YOUR NAME</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">What is your name?</h2>
        <p className="mt-1 text-[12px] text-ink-soft">So we know who to welcome.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="FIRST NAME" required>
          <input value={s.firstName} onChange={(e) => s.patch({ firstName: e.target.value })} placeholder="Jane" autoFocus className={inputCls} />
        </Field>
        <Field label="LAST NAME" required>
          <input value={s.lastName} onChange={(e) => s.patch({ lastName: e.target.value })} placeholder="Smith" className={inputCls} />
        </Field>
      </div>
    </div>
  )
}

function StepContact({ submitting }: { submitting: boolean }) {
  const s = useWizard()
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 2 — CONTACT</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">What is your phone number and address?</h2>
        <p className="mt-1 text-[12px] text-ink-soft">We&apos;ll send your confirmation here.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PHONE" required>
          <input value={s.phone} onChange={(e) => s.patch({ phone: e.target.value })} type="tel" placeholder="(312) 555-0142" className={inputCls} />
        </Field>
        <Field label="EMAIL" required>
          <input value={s.email} onChange={(e) => s.patch({ email: e.target.value })} type="email" placeholder="jane@email.com" className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="ADDRESS" required>
            <input value={s.address} onChange={(e) => s.patch({ address: e.target.value })} placeholder="123 Maple Grove Ave" className={inputCls} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="ADDRESS LINE 2 (OPTIONAL)">
            <input value={s.addressLine2} onChange={(e) => s.patch({ addressLine2: e.target.value })} placeholder="Apt, Suite, Unit" className={inputCls} />
          </Field>
        </div>
        <Field label="CITY" required>
          <input value={s.city} onChange={(e) => s.patch({ city: e.target.value })} placeholder="Riverbend" className={inputCls} />
        </Field>
        <Field label="STATE" required>
          <input value={s.state} onChange={(e) => s.patch({ state: e.target.value })} placeholder="IL" className={inputCls} />
        </Field>
        <Field label="POSTAL CODE" required>
          <input value={s.postalCode} onChange={(e) => s.patch({ postalCode: e.target.value })} placeholder="60614" className={inputCls} />
        </Field>
      </div>
      {submitting && <p className="text-[11px] text-gold-deep">Saving your details…</p>}
    </div>
  )
}

function StepDog({ breeds, submitting }: { breeds: Breed[]; submitting: boolean }) {
  const s = useWizard()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/^image\//.test(f.type)) {
      setUploadError("Please choose an image file")
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setUploadError("Image is too large (5 MB max)")
      return
    }
    setUploading(true)
    setUploadError("")
    try {
      const fd = new FormData()
      fd.append("file", f)
      const res = await fetch("/api/cms/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Upload failed")
      }
      const data = await res.json()
      s.patch({ photoUrl: data.url })
    } catch (err: any) {
      setUploadError(err.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 3 — YOUR DOG</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">Tell us about your dog</h2>
        <p className="mt-1 text-[12px] text-ink-soft">Every dog is special. We tailor the experience to their breed.</p>
      </div>

      {/* Photo uploader */}
      <div className="rounded-xl border border-gold/25 bg-card p-4">
        <p className="eyebrow mb-3">PET PHOTO</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Upload pet photo"
            title="Upload pet photo"
            className="relative group flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/40 bg-cream-deep transition hover:border-gold-deep disabled:opacity-60"
          >
            {s.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photoUrl} alt="Pet photo" className="h-full w-full object-cover" />
            ) : (
              <PawPrint size={28} weight="fill" className="text-gold-deep" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-ink/60 opacity-0 transition group-hover:opacity-100">
              <Camera size={20} weight="fill" className="text-on-dark" />
            </span>
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink/70">
                <Spinner size={20} className="animate-spin text-gold" />
              </span>
            )}
          </button>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-ink">{s.photoUrl ? "Photo added!" : "Add a photo of your pup"}</p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              {s.photoUrl
                ? "We'll display this on your profile so your groomer knows who's coming in."
                : "A friendly photo helps our groomers recognize your dog. JPG/PNG up to 5 MB."}
            </p>
            {uploadError && <p className="mt-1 text-[10px] text-red-600">{uploadError}</p>}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="btn-gold text-[10px]"
              >
                {s.photoUrl ? "Replace photo" : "Upload photo"}
              </button>
              {s.photoUrl && (
                <button
                  type="button"
                  onClick={() => s.patch({ photoUrl: "" })}
                  className="rounded-md border border-gold/30 px-2 py-1 text-[10px] font-bold text-ink-soft hover:bg-cream-deep"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="DOG NAME" required>
          <input value={s.dogName} onChange={(e) => s.patch({ dogName: e.target.value })} placeholder="Cooper" className={inputCls} />
        </Field>
        <Field label="BREED" required>
          <BreedDropdown breeds={breeds} value={s.breedId} onChange={(id) => {
            const b = breeds.find((x) => x.id === id)
            s.patch({ breedId: id, breedName: b?.name || "" })
          }} />
        </Field>
        <Field label="WEIGHT (LBS)" required>
          <input value={s.weightLbs} onChange={(e) => s.patch({ weightLbs: e.target.value })} type="number" min="0" step="0.5" placeholder="42" className={inputCls} />
        </Field>
        <Field label="SEX">
          <LookupDropdown
            items={[{ id: "Male", name: "Male" }, { id: "Female", name: "Female" }]}
            value={s.sex}
            onChange={(v) => s.patch({ sex: v })}
            placeholder="Select…"
          />
        </Field>
        <Field label="BIRTH DATE">
          <input value={s.birthDate} onChange={(e) => s.patch({ birthDate: e.target.value })} type="date" className={inputCls} />
        </Field>
        <Field label="COLOR">
          <input value={s.color} onChange={(e) => s.patch({ color: e.target.value })} placeholder="Cream" className={inputCls} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="MARKINGS">
            <input value={s.markings} onChange={(e) => s.patch({ markings: e.target.value })} placeholder="White chest, black mask" className={inputCls} />
          </Field>
        </div>
      </div>
      {submitting && <p className="text-[11px] text-gold-deep">Saving your dog&apos;s profile…</p>}
    </div>
  )
}

function StepCoat({ lookups }: { lookups: WizardLookups }) {
  const s = useWizard()
  return (
    <div className={`${stepWrapCls} space-y-6`}>
      <div>
        <p className="eyebrow">STEP 4 — COAT &amp; GROOMING PROFILE</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">Tell us about your dog&apos;s coat and grooming needs</h2>
        <p className="mt-1 text-[12px] text-ink-soft">The more we know, the better we can care for your pup.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* COAT */}
        <section className="space-y-4">
          <h3 className={sectionHeaderCls}>Coat</h3>
          <Field label="COAT TYPE">
            <LookupDropdown items={lookups.coatTypes} value={s.coatTypeId} onChange={(v) => s.patch({ coatTypeId: v })} placeholder="Select coat type…" />
          </Field>
          <Field label="COAT TEXTURE">
            <LookupDropdown items={lookups.coatTextures} value={s.coatTextureId} onChange={(v) => s.patch({ coatTextureId: v })} placeholder="Select coat texture…" />
          </Field>
          <Field label="COAT LENGTH">
            <LookupDropdown items={lookups.coatLengths} value={s.coatLengthId} onChange={(v) => s.patch({ coatLengthId: v })} placeholder="Select coat length…" />
          </Field>
          <Field label="COAT CONDITION">
            <LookupDropdown items={lookups.coatConditions} value={s.coatConditionId} onChange={(v) => s.patch({ coatConditionId: v })} placeholder="Select coat condition…" />
          </Field>
          <Field label="SHEDDING LEVEL">
            <LookupDropdown items={lookups.sheddingLevels} value={s.sheddingLevelId} onChange={(v) => s.patch({ sheddingLevelId: v })} placeholder="Select shedding level…" />
          </Field>
        </section>

        {/* CURRENT GROOMING */}
        <section className="space-y-4">
          <h3 className={sectionHeaderCls}>Current Grooming</h3>
          <Field label="CURRENT HAIRCUT STYLE">
            <LookupDropdown items={lookups.haircutStyles} value={s.currentHaircutStyleId} onChange={(v) => s.patch({ currentHaircutStyleId: v })} placeholder="Select current style…" />
          </Field>
          <Field label="CURRENT BODY LENGTH">
            <LookupDropdown items={lookups.clipLengths} value={s.currentBodyLengthId} onChange={(v) => s.patch({ currentBodyLengthId: v })} placeholder="Select current length…" />
          </Field>
        </section>
      </div>

      {/* HANDLING */}
      <section className="space-y-4">
        <h3 className={sectionHeaderCls}>Handling</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="TEMPERAMENT">
            <LookupDropdown
              items={["Calm", "Anxious", "Excitable", "Aggressive", "Friendly"].map((x) => ({ id: x, name: x }))}
              value={s.temperament}
              onChange={(v) => s.patch({ temperament: v })}
              placeholder="Select temperament…"
            />
          </Field>
          <Field label="NAIL HANDLING">
            <LookupDropdown
              items={["Easy", "Moderate", "Difficult"].map((x) => ({ id: x, name: x }))}
              value={s.nailHandling}
              onChange={(v) => s.patch({ nailHandling: v })}
              placeholder="Select…"
            />
          </Field>
          <Field label="FACE HANDLING">
            <LookupDropdown
              items={["Easy", "Moderate", "Difficult"].map((x) => ({ id: x, name: x }))}
              value={s.faceHandling}
              onChange={(v) => s.patch({ faceHandling: v })}
              placeholder="Select…"
            />
          </Field>
          <Field label="FEET HANDLING">
            <LookupDropdown
              items={["Easy", "Moderate", "Difficult"].map((x) => ({ id: x, name: x }))}
              value={s.feetHandling}
              onChange={(v) => s.patch({ feetHandling: v })}
              placeholder="Select…"
            />
          </Field>
          <Field label="EAR HANDLING">
            <LookupDropdown
              items={["Easy", "Moderate", "Difficult"].map((x) => ({ id: x, name: x }))}
              value={s.earHandling}
              onChange={(v) => s.patch({ earHandling: v })}
              placeholder="Select…"
            />
          </Field>
          <Field label="DRYER HANDLING">
            <LookupDropdown
              items={["Tolerates", "Sensitive", "Avoid"].map((x) => ({ id: x, name: x }))}
              value={s.dryerHandling}
              onChange={(v) => s.patch({ dryerHandling: v })}
              placeholder="Select…"
            />
          </Field>
          <Field label="CLIPPER HANDLING">
            <LookupDropdown
              items={["Tolerates", "Sensitive", "Avoid"].map((x) => ({ id: x, name: x }))}
              value={s.clipperHandling}
              onChange={(v) => s.patch({ clipperHandling: v })}
              placeholder="Select…"
            />
          </Field>
        </div>
      </section>

      {/* NOTES */}
      <section className="space-y-4">
        <h3 className={sectionHeaderCls}>Notes</h3>
        <div className="grid gap-4">
          <Field label="HANDLING NOTES">
            <textarea value={s.handlingNotes} onChange={(e) => s.patch({ handlingNotes: e.target.value })} rows={3} placeholder="Anything that helps us handle your dog safely…" className={inputCls} />
          </Field>
          <Field label="GROOMING NOTES">
            <textarea value={s.groomingNotes} onChange={(e) => s.patch({ groomingNotes: e.target.value })} rows={3} placeholder="Past grooming experiences, sensitivities, allergies…" className={inputCls} />
          </Field>
          <Field label="OWNER NOTES">
            <textarea value={s.ownerNotes} onChange={(e) => s.patch({ ownerNotes: e.target.value })} rows={3} placeholder="Anything else you&apos;d like us to know…" className={inputCls} />
          </Field>
        </div>
      </section>
    </div>
  )
}

function StepGroomingRequest({ lookups, services, bookingType }: { lookups: WizardLookups; services: Service[]; bookingType: BookingType }) {
  const s = useWizard()
  const isAppointment = bookingType === "appointment"
  return (
    <div className={`${stepWrapCls} space-y-6`}>
      <div>
        <p className="eyebrow">STEP 5 — GROOMING REQUEST</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">How would you like your dog groomed?</h2>
        <p className="mt-1 text-[12px] text-ink-soft">Pick the styles and services you&apos;d like for this visit.</p>
      </div>

      {/* SERVICE PACKAGE (appointment only) */}
      {isAppointment && services.length > 0 && (
        <section className="space-y-3">
          <h3 className={sectionHeaderCls}>Service Package</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => s.patch({ serviceId: svc.id, serviceName: svc.name, servicePrice: svc.price })}
                className={`flex flex-col items-start border px-4 py-3 text-left transition-colors ${s.serviceId === svc.id ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-[12.5px] font-bold text-ink">{svc.name}</span>
                  <span className="text-[13px] font-bold text-gold-deep">{svc.price}</span>
                </div>
                {svc.description && (
                  <p className="mt-1 text-[11px] leading-snug text-ink-soft">{svc.description}</p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* HAIRCUT */}
      <section className="space-y-4">
        <h3 className={sectionHeaderCls}>Haircut</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="STYLE">
            <LookupDropdown items={lookups.haircutStyles} value={s.styleId} onChange={(v) => s.patch({ styleId: v })} placeholder="Select style…" />
          </Field>
          <Field label="BODY LENGTH">
            <LookupDropdown items={lookups.clipLengths} value={s.bodyLengthId} onChange={(v) => s.patch({ bodyLengthId: v })} placeholder="Select length…" />
          </Field>
          <Field label="BODY STYLE">
            <LookupDropdown items={lookups.bodyStyles} value={s.bodyStyleId} onChange={(v) => s.patch({ bodyStyleId: v })} placeholder="Select body style…" />
          </Field>
          <Field label="LEG STYLE">
            <LookupDropdown items={lookups.legStyles} value={s.legStyleId} onChange={(v) => s.patch({ legStyleId: v })} placeholder="Select leg style…" />
          </Field>
          <Field label="FACE STYLE">
            <LookupDropdown items={lookups.faceStyles} value={s.faceStyleId} onChange={(v) => s.patch({ faceStyleId: v })} placeholder="Select face style…" />
          </Field>
          <Field label="HEAD STYLE">
            <LookupDropdown items={lookups.headStyles} value={s.headStyleId} onChange={(v) => s.patch({ headStyleId: v })} placeholder="Select head style…" />
          </Field>
          <Field label="EAR STYLE">
            <LookupDropdown items={lookups.earStyles} value={s.earStyleId} onChange={(v) => s.patch({ earStyleId: v })} placeholder="Select ear style…" />
          </Field>
          <Field label="TAIL STYLE">
            <LookupDropdown items={lookups.tailStyles} value={s.tailStyleId} onChange={(v) => s.patch({ tailStyleId: v })} placeholder="Select tail style…" />
          </Field>
          <Field label="FEET STYLE">
            <LookupDropdown items={lookups.feetStyles} value={s.feetStyleId} onChange={(v) => s.patch({ feetStyleId: v })} placeholder="Select feet style…" />
          </Field>
        </div>
      </section>

      {/* ADDITIONAL SERVICES */}
      <section className="space-y-4">
        <h3 className={sectionHeaderCls}>Additional Services</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="SANITARY SERVICE">
            <LookupDropdown items={lookups.sanitaryOptions} value={s.sanitaryService} onChange={(v) => s.patch({ sanitaryService: v })} placeholder="Select…" />
          </Field>
          <Field label="NAIL SERVICE">
            <LookupDropdown items={lookups.nailServices} value={s.nailService} onChange={(v) => s.patch({ nailService: v })} placeholder="Select…" />
          </Field>
          <Field label="PAW PAD SERVICE">
            <LookupDropdown items={lookups.pawPadServices} value={s.pawPadService} onChange={(v) => s.patch({ pawPadService: v })} placeholder="Select…" />
          </Field>
          <Field label="EAR SERVICE">
            <LookupDropdown items={lookups.earServices} value={s.earService} onChange={(v) => s.patch({ earService: v })} placeholder="Select…" />
          </Field>
          <Field label="TEETH SERVICE">
            <LookupDropdown items={lookups.teethServices} value={s.teethService} onChange={(v) => s.patch({ teethService: v })} placeholder="Select…" />
          </Field>
          <Field label="DESHEDDING SERVICE">
            <LookupDropdown items={lookups.desheddingServices} value={s.desheddingService} onChange={(v) => s.patch({ desheddingService: v })} placeholder="Select…" />
          </Field>
          <Field label="COAT TECHNIQUE">
            <LookupDropdown items={lookups.coatTechniques} value={s.coatTechnique} onChange={(v) => s.patch({ coatTechnique: v })} placeholder="Select…" />
          </Field>
        </div>
      </section>

      <Field label="SPECIAL INSTRUCTIONS">
        <textarea value={s.specialInstructions} onChange={(e) => s.patch({ specialInstructions: e.target.value })} rows={4} placeholder="Any specific instructions for your groomer…" className={inputCls} />
      </Field>
    </div>
  )
}

function StepSchedule({ bookingType, durationMinutes }: { bookingType: BookingType; durationMinutes: number }) {
  const s = useWizard()
  // Track the date whose slots have already been fetched + loaded.
  // `loadingSlots` is DERIVED from comparing s.date to resolvedDate — we never
  // call setLoadingSlots(true) synchronously inside the effect (React 19 rule).
  const [slots, setSlots] = useState<string[]>([])
  const [closed, setClosed] = useState(false)
  const [resolvedDate, setResolvedDate] = useState<string>("")
  const loadingSlots = !!s.date && s.date !== resolvedDate

  useEffect(() => {
    if (!s.date) return
    let cancelled = false
    fetch(`/api/availability?date=${s.date}&duration=${durationMinutes}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setSlots(d.times || [])
        setClosed(!!d.closed)
        setResolvedDate(s.date)
        if (s.time) s.patch({ time: "" })
      })
      .catch(() => {
        if (cancelled) return
        setSlots([])
        setClosed(false)
        setResolvedDate(s.date)
      })
    return () => { cancelled = true }
  }, [s.date, durationMinutes])

  const isConsultation = bookingType === "consultation"

  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">{isConsultation ? "STEP 6 — PREFERRED DATE" : "STEP 6 — DATE & TIME"}</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">
          {isConsultation ? "When would you prefer to come in?" : "When would you like to book?"}
        </h2>
        <p className="mt-1 text-[12px] text-ink-soft">Open Tue–Sat 9am–6pm, Sun 10am–4pm. Closed Mondays.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <CalendarGrid value={s.date} onChange={(v) => s.patch({ date: v })} />
        <div>
          {s.date ? (
            <>
              <p className="mb-3 text-[11px] font-bold tracking-[0.12em] text-gold-deep">
                {isConsultation ? "PREFERRED TIMES — " : "AVAILABLE TIMES — "}
                {new Date(s.date + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </p>
              {loadingSlots ? (
                <p className="text-[13px] text-ink-soft">Loading…</p>
              ) : closed ? (
                <p className="text-[13px] text-ink-soft">We&apos;re closed on Mondays. Please pick another date.</p>
              ) : slots.length === 0 ? (
                <p className="text-[13px] text-ink-soft">All slots are taken. Please try another day.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => s.patch({ time: t })}
                      className={`border px-3 py-2.5 text-[12px] font-semibold transition-colors ${s.time === t ? "border-gold-deep bg-gold-deep text-cream" : "border-gold/35 bg-cream text-ink hover:border-gold-deep hover:bg-cream-deep"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] text-ink-soft">Pick a date on the calendar to see available times.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StepGroomer({ groomers }: { groomers: Groomer[] }) {
  const s = useWizard()
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 7 — GROOMER</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">Do you have a preferred groomer?</h2>
        <p className="mt-1 text-[12px] text-ink-soft">Have a favorite? Or let us assign the best fit.</p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => s.patch({ groomerId: "" })}
          className={`flex w-full items-center gap-4 border px-5 py-4 text-left transition-colors ${s.groomerId === "" ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}
        >
          <PawPrint size={24} weight="fill" className="text-gold-deep" />
          <div>
            <p className="text-[13px] font-bold text-ink">Any Available Groomer</p>
            <p className="text-[11px] text-ink-soft">Assign the best available groomer</p>
          </div>
        </button>
        {groomers.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => s.patch({ groomerId: g.id })}
            className={`flex w-full items-center gap-4 border px-5 py-4 text-left transition-colors ${s.groomerId === g.id ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-deep/15 font-display text-[16px] font-bold text-gold-deep">
              {g.name.charAt(0)}
            </div>
            <div>
              <p className="text-[13px] font-bold text-ink">{g.name}</p>
              <p className="text-[11px] text-ink-soft">{g.role}{g.bio ? ` — ${g.bio}` : ""}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepNotes() {
  const s = useWizard()
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 8 — NOTES</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">Is there anything else your groomer should know?</h2>
        <p className="mt-1 text-[12px] text-ink-soft">Temperament, sensitivities, matting, vet info, etc.</p>
      </div>
      <textarea
        value={s.notes}
        onChange={(e) => s.patch({ notes: e.target.value })}
        rows={7}
        placeholder="e.g. Cooper is nervous around loud noises. He may need breaks during the groom. Sensitive paws."
        className={inputCls}
      />
    </div>
  )
}

// ----- Review step -----
function StepReview({
  bookingType, selectedBreed, selectedService, selectedGroomer, dogSize, lookups,
  submitting, redirecting, onSubmit,
}: {
  bookingType: BookingType
  selectedBreed?: Breed
  selectedService?: Service
  selectedGroomer?: Groomer
  dogSize: string
  lookups: WizardLookups
  submitting: boolean
  redirecting: boolean
  onSubmit: () => void
}) {
  const s = useWizard()
  const isConsultation = bookingType === "consultation"

  // Lookup name helper for add-on rows
  const lookupName = (group: LookupItem[], id: string) => group.find((x) => x.id === id)?.name

  // Build add-on rows from selected additional services
  const addons = [
    { label: lookupName(lookups.sanitaryOptions, s.sanitaryService), enabled: !!s.sanitaryService },
    { label: lookupName(lookups.nailServices, s.nailService), enabled: !!s.nailService },
    { label: lookupName(lookups.pawPadServices, s.pawPadService), enabled: !!s.pawPadService },
    { label: lookupName(lookups.earServices, s.earService), enabled: !!s.earService },
    { label: lookupName(lookups.teethServices, s.teethService), enabled: !!s.teethService },
    { label: lookupName(lookups.desheddingServices, s.desheddingService), enabled: !!s.desheddingService },
  ].filter((a) => a.enabled && a.label)

  // Price parsing
  const servicePriceNum = parseFloat((s.servicePrice || "").replace(/[^0-9.]/g, "")) || 0
  const estimatedTotal = servicePriceNum
  const deposit = 25
  const remaining = Math.max(0, estimatedTotal - deposit)

  if (isConsultation) {
    return (
      <div className={`${stepWrapCls} space-y-5`}>
        <div className="text-center">
          <p className="eyebrow">STEP 9 — REVIEW</p>
          <h2 className="mt-2 font-display text-[24px] text-ink">Confirm your consultation request</h2>
          <p className="mt-1 text-[12px] text-ink-soft">No charge — our team will reach out to schedule your visit.</p>
        </div>
        <div className="border border-gold/30 bg-cream-deep p-6">
          <p className="text-[10px] font-bold tracking-[0.18em] text-gold-deep">CONSULTATION REQUEST</p>
          <div className="mt-4 grid grid-cols-1 gap-y-2 text-[12px] sm:grid-cols-2">
            <SummaryRow label="Owner" value={`${s.firstName} ${s.lastName}`.trim()} />
            <SummaryRow label="Dog" value={s.dogName} />
            <SummaryRow label="Breed" value={selectedBreed?.name || s.breedName || "—"} />
            <SummaryRow label="Phone" value={s.phone} />
            <SummaryRow label="Email" value={s.email} />
            <SummaryRow label="Preferred date" value={s.date} />
            <SummaryRow label="Preferred time" value={s.time} />
            <SummaryRow label="Groomer" value={selectedGroomer?.name || "Any available"} />
          </div>
          {(s.consultationReason || s.notes) && (
            <p className="mt-3 border-t border-gold/20 pt-3 text-[11px] italic text-ink-soft">
              &ldquo;{s.consultationReason || s.notes}&rdquo;
            </p>
          )}
        </div>
        <button type="button" onClick={onSubmit} disabled={submitting} className="btn-dark w-full">
          {submitting ? "Submitting…" : "Submit Consultation Request"}
        </button>
      </div>
    )
  }

  // ----- Appointment invoice -----
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div className="text-center">
        <p className="eyebrow">STEP 9 — REVIEW &amp; CHECKOUT</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">Review your booking</h2>
        <p className="mt-1 text-[12px] text-ink-soft">A $25 deposit secures your appointment; the balance is due at pickup.</p>
      </div>

      <div className="border border-gold/30 bg-card p-8">
        <div className="text-center">
          <p className="font-display text-[11px] tracking-[0.32em] text-gold-deep">ALL ABOUT PAWZ</p>
          <p className="text-[9px] font-bold tracking-[0.28em] text-ink-soft">BOOKING SUMMARY</p>
        </div>

        <div className="mt-6 flex flex-col items-center border-y border-gold/20 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-deep/10">
            <Dog size={28} weight="fill" className="text-gold-deep" />
          </div>
          <p className="mt-3 font-display text-[22px] text-ink">{s.dogName || "Your Dog"}</p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-ink-soft">
            {selectedBreed?.name || s.breedName || "—"}{s.weightLbs ? ` · ${s.weightLbs} lbs` : ""}
          </p>
        </div>

        {/* Service line items */}
        <div className="mt-5 space-y-2 font-mono text-[12.5px] text-ink">
          <InvoiceLine
            label={`${s.serviceName || selectedService?.name || "Grooming Service"} — ${dogSize}`}
            value={s.servicePrice || selectedService?.price || "—"}
          />
          {addons.length > 0 && (
            <div className="pt-2">
              <p className="mb-1 text-[9px] font-bold tracking-[0.16em] text-gold-deep">ADD-ONS</p>
              {addons.map((a, i) => (
                <InvoiceLine key={i} label={a.label || ""} value="—" muted />
              ))}
            </div>
          )}
          {s.date && s.time && (
            <div className="pt-2">
              <InvoiceLine label={`Appointment: ${new Date(s.date + "T00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} @ ${s.time}`} value="" />
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="mt-5 border-t border-gold/30 pt-4 font-mono text-[12.5px]">
          <InvoiceLine label="Estimated Service Total" value={estimatedTotal ? `$${estimatedTotal.toFixed(2)}` : "—"} strong />
          <InvoiceLine label="Deposit Due Today" value="$25.00" strong />
          <InvoiceLine label="Remaining Balance" value={estimatedTotal ? `$${remaining.toFixed(2)}` : "—"} strong />
        </div>

        <div className="mt-5 border-t border-gold/20 pt-4 text-center text-[11px] text-ink-soft">
          <p>Owner: <span className="font-semibold text-ink">{s.firstName} {s.lastName}</span></p>
          <p>Groomer: <span className="font-semibold text-ink">{selectedGroomer?.name || "Any Available Groomer"}</span></p>
          {s.email && <p>Email: <span className="font-semibold text-ink">{s.email}</span></p>}
        </div>
      </div>

      {redirecting ? (
        <p className="text-center text-[13px] text-gold-deep">Redirecting to secure checkout…</p>
      ) : (
        <button type="button" onClick={onSubmit} disabled={submitting} className="btn-dark w-full">
          {submitting ? "Processing…" : "PAY $25 DEPOSIT"}
          {!submitting && <CreditCard size={16} weight="fill" className="ml-2" />}
        </button>
      )}
      <p className="text-center text-[10px] tracking-[0.1em] text-ink-soft">
        <Sparkle size={11} weight="fill" className="mr-1 inline text-gold-deep" />
        Secure payment via Stripe. Your booking is held once the deposit is received.
      </p>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-ink-soft">{label}:</span> <span className="font-semibold text-ink">{value || "—"}</span>
    </div>
  )
}

function InvoiceLine({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`${muted ? "text-ink-soft" : "text-ink"} ${strong ? "font-bold" : ""}`}>{label}</span>
      <span className={`whitespace-nowrap ${strong ? "font-bold text-gold-deep" : muted ? "text-ink-soft" : "text-ink"}`}>{value}</span>
    </div>
  )
}

// ===========================================================================
// CalendarGrid — reused from v1 wizard pattern
// ===========================================================================
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
        <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className="flex h-7 w-7 items-center justify-center text-gold-deep hover:bg-cream-deep">
          <CaretLeft size={14} weight="bold" />
        </button>
        <span className="font-display text-[16px] text-ink">{viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button type="button" onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className="flex h-7 w-7 items-center justify-center text-gold-deep hover:bg-cream-deep">
          <CaretRight size={14} weight="bold" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-center text-[9px] font-bold text-ink-soft">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const ds = fmt(d)
          const disabled = isPast(d) || isMonday(d)
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(ds)}
              className={`aspect-square text-[11px] font-semibold transition-colors ${ds === value ? "bg-gold-deep text-cream" : disabled ? "cursor-not-allowed text-ink-soft/30" : "text-ink hover:bg-cream-deep"}`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
