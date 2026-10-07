"use client"

// ============================================================================
// LandingAppointmentModal — the owner's exact ruling: "in the very top when
// a user lands should be the large modal confirm with pre check, cancel or
// reschedule".
//
// When a SIGNED-IN CUSTOMER with an upcoming appointment lands on the
// marketing home page, a LARGE modal opens immediately with their next visit
// and three actions:
//   CONFIRM   → the 5-step Pre Check-In questionnaire runs INSIDE this dialog
//   RESCHEDULE→ hands off to the portal's full slot-picker
//   CANCEL    → inline confirmation, then the server's cancellation emails
//
// Anonymous visitors (GET /api/customer/appointments 401s) render nothing —
// the landing page stays a landing page. Self-contained on purpose: the
// 3152-line booking-flow island is NOT imported; the question set and the
// answers shape (POST { action: "questionnaire", bookingId, answers }) are
// mirrored here 1:1.
// ============================================================================

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PawPrint,
  XCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// ---------------------------------------------------------------------------
// Types + tiny helpers
// ---------------------------------------------------------------------------

interface LandingBooking {
  id: string
  signal: "pending" | "booked" | "paid"
  signalLabel: string | null
  date: string // the bookings table stores YYYY-MM-DD
  time: string
  dogName: string
  breed: string | null
  photoUrl: string | null
  service: string | null
  questionnaireComplete: boolean
}

interface PreCheckAnswers {
  vaccinationsCurrent: "" | "yes" | "no"
  sameDayShots: "" | "yes" | "no"
  muzzle: "" | "yes" | "no"
  sedation: "" | "yes" | "no"
  healthNotes: string
  groomingGoals: string
  behaviorNotes: string
  emergencyName: string
  emergencyPhone: string
  vetName: string
  vetPhone: string
  authorize: boolean
}

const displayFont = { fontFamily: "var(--font-display)" } as const

const DISMISS_PREFIX = "landing-modal-dismissed:"

function isDismissed(id: string): boolean {
  try {
    return window.sessionStorage.getItem(DISMISS_PREFIX + id) === "1"
  } catch {
    return false // blocked storage — err on showing the modal
  }
}

function markDismissed(id: string): void {
  try {
    window.sessionStorage.setItem(DISMISS_PREFIX + id, "1")
  } catch {
    /* private mode — nothing to remember */
  }
}

// The API's upcoming bucket already dropped cancelled/abandoned signals and
// (for ISO dates) anything before today. This guard is the pragmatic second
// line of defense for rows with odd date strings.
function dateIsPast(date: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date < today
  const t = Date.parse(date)
  return Number.isFinite(t) && t < Date.parse(`${today}T00:00:00`)
}

function prettyDate(date: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : null
  if (!d || Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

function normalizeBooking(b: unknown): LandingBooking | null {
  if (!b || typeof b !== "object") return null
  const o = b as Record<string, unknown>
  if (o.signal !== "pending" && o.signal !== "booked" && o.signal !== "paid") return null
  if (typeof o.id !== "string" || typeof o.date !== "string" || typeof o.time !== "string" || typeof o.dogName !== "string") {
    return null
  }
  return {
    id: o.id,
    signal: o.signal,
    signalLabel: typeof o.signalLabel === "string" ? o.signalLabel : null,
    date: o.date,
    time: o.time,
    dogName: o.dogName,
    breed: typeof o.breed === "string" ? o.breed : null,
    photoUrl: typeof o.photoUrl === "string" ? o.photoUrl : null,
    service: typeof o.service === "string" ? o.service : null,
    questionnaireComplete: o.questionnaireComplete === true,
  }
}

// ---------------------------------------------------------------------------
// Shared salon-token classes (touch targets ≥ 44px everywhere)
// ---------------------------------------------------------------------------

const LABEL_CLS = "text-[11px] font-bold uppercase tracking-[0.1em] text-ink-soft"
const INPUT_CLS = "h-11 rounded-md border-ink/15 bg-white text-[13.5px] text-ink placeholder:text-ink-soft/40 focus-visible:ring-gold-deep"
const TEXTAREA_CLS = "rounded-md border-ink/15 bg-white text-[13.5px] leading-relaxed text-ink placeholder:text-ink-soft/40 focus-visible:ring-gold-deep"

const BTN_PRIMARY =
  "flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold-deep text-[12px] font-bold uppercase tracking-[0.14em] text-on-dark transition-colors hover:bg-ink disabled:pointer-events-none disabled:opacity-50"
const BTN_SECONDARY =
  "flex h-12 w-full items-center justify-center gap-2 rounded-md border border-gold-deep/70 bg-white text-[12px] font-bold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-gold-light/20 disabled:pointer-events-none disabled:opacity-50"
const BTN_CANCEL =
  "flex h-12 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-white text-[12px] font-semibold uppercase tracking-[0.12em] text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
const BTN_PREV =
  "flex h-12 items-center justify-center rounded-md border border-ink/20 bg-white px-6 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink/40 disabled:pointer-events-none disabled:opacity-50"
const BTN_NEXT =
  "flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-gold-deep text-[12px] font-bold uppercase tracking-[0.14em] text-on-dark transition-colors hover:bg-ink disabled:pointer-events-none disabled:opacity-40"

// ---------------------------------------------------------------------------
// The island
// ---------------------------------------------------------------------------

type ModalMode = "actions" | "precheck" | "cancel" | "cancelled" | "done"

export function LandingAppointmentModal() {
  const [booking, setBooking] = useState<LandingBooking | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<ModalMode>("actions")
  const [busy, setBusy] = useState(false)
  const [cancelError, setCancelError] = useState("")

  // On mount: ask the customer gate for this visitor's registry. 401 (or an
  // empty upcoming list) means the landing page renders exactly as before.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/customer/appointments", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json().catch(() => null)) as { upcoming?: unknown } | null
        if (!data || !Array.isArray(data.upcoming)) return
        // upcoming is date-sorted by the API — the first actionable row wins.
        const next = (data.upcoming as unknown[])
          .map(normalizeBooking)
          .filter((b): b is LandingBooking => b !== null)
          .find((b) => !dateIsPast(b.date) && !isDismissed(b.id))
        if (!cancelled && next) {
          setBooking(next)
          setOpen(true)
        }
      } catch {
        /* network hiccup — never block the landing page */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!booking) return null

  const dogName = booking.dogName || "your pup"
  const service = booking.service || "Grooming"

  const dismiss = () => {
    markDismissed(booking.id)
    setOpen(false)
  }

  const submitCancel = async () => {
    setCancelError("")
    setBusy(true)
    try {
      const res = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", bookingId: booking.id }),
      })
      const d = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setCancelError(d.error || "Could not cancel — please try again, or call the salon.")
        return
      }
      setMode("cancelled") // the server already sent the cancellation emails
    } catch {
      setCancelError("Network problem — please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setOpen(true)
          return
        }
        if (busy) return // mid-action — the controlled dialog stays open
        dismiss()
      }}
    >
      <DialogContent className="type-body max-h-[92vh] overflow-y-auto border-ink/10 bg-cream p-6 sm:max-w-2xl sm:p-8">
        {/* ---------------- ACTIONS (the landing view) ---------------- */}
        {mode === "actions" && (
          <>
            <DialogHeader className="text-left sm:text-left">
              <p className="eyebrow">Pre Check-In</p>
              <DialogTitle style={displayFont} className="text-left text-[26px] leading-[1.15] text-ink">
                Your appointment is coming up
              </DialogTitle>
              <DialogDescription className="text-left text-[13px] leading-relaxed text-ink-soft">
                Confirm your visit, finish your pre check-in, or make a change — two minutes now saves ten at the counter.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 flex items-start gap-4 rounded-lg border border-ink/10 bg-white p-4 sm:p-5">
              {booking.photoUrl ? (
                <img
                  src={booking.photoUrl}
                  alt={`${dogName}${booking.breed ? `, a ${booking.breed}` : ""}`}
                  width={72}
                  height={72}
                  className="h-[72px] w-[72px] shrink-0 rounded-md border border-ink/10 object-cover"
                />
              ) : (
                <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-md border border-ink/10 bg-cream-deep">
                  <PawPrint className="h-8 w-8 text-gold-deep" strokeWidth={1.4} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p style={displayFont} className="text-[20px] leading-tight text-ink">
                    {dogName}
                  </p>
                  {booking.signalLabel && (
                    <span className="rounded-full border border-gold-deep/70 px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-gold-deep">
                      {booking.signalLabel}
                    </span>
                  )}
                </div>
                {booking.breed && <p className="mt-0.5 text-[12.5px] text-ink-soft">{booking.breed}</p>}
                <p className="mt-2 text-[13px] font-semibold text-ink">{service}</p>
                <p className="mt-1 flex items-center gap-2 text-[12.5px] text-ink-soft">
                  <CalendarDays className="h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.5} />
                  {prettyDate(booking.date)} at {booking.time}
                </p>
              </div>
            </div>

            {booking.questionnaireComplete && (
              <div className="mt-3 flex items-start gap-2.5 rounded-md border border-gold/40 bg-gold-light/20 p-3.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.8} />
                <p className="text-[12.5px] leading-relaxed text-ink">
                  You&apos;re all set — your pre check-in is already in. We&apos;ll be ready for {dogName}.
                </p>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => setMode("precheck")}
                disabled={booking.questionnaireComplete}
                aria-label={`Confirm the appointment and start pre check-in for ${dogName}`}
                className={BTN_PRIMARY}
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                {booking.questionnaireComplete ? "Pre check-in complete" : "Confirm + Pre Check-In"}
              </button>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/customer/appointments"
                  aria-label="Reschedule this appointment in the customer portal"
                  className={BTN_SECONDARY}
                >
                  <CalendarDays className="h-4 w-4" strokeWidth={1.8} />
                  Reschedule
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCancelError("")
                    setMode("cancel")
                  }}
                  aria-label={`Cancel the appointment for ${dogName}`}
                  className={BTN_CANCEL}
                >
                  <XCircle className="h-4 w-4" strokeWidth={1.8} />
                  Cancel
                </button>
              </div>
              <p className="pt-1 text-center text-[11.5px] leading-relaxed text-ink-soft/70">
                You can also manage this visit anytime in{" "}
                <Link
                  href="/customer/appointments"
                  className="font-semibold text-gold-deep underline underline-offset-2"
                >
                  your appointments
                </Link>
                .
              </p>
            </div>
          </>
        )}

        {/* ---------------- PRE CHECK-IN (the 5-step wizard) ---------------- */}
        {mode === "precheck" && (
          <PreCheckFlow
            booking={booking}
            onDone={() => setMode("done")}
            onBack={() => setMode("actions")}
            onBusyChange={setBusy}
          />
        )}

        {/* ---------------- CANCEL (inline confirmation) ---------------- */}
        {mode === "cancel" && (
          <>
            <DialogHeader className="text-left sm:text-left">
              <DialogTitle style={displayFont} className="text-left text-[22px] leading-tight text-ink">
                Cancel this appointment?
              </DialogTitle>
              <DialogDescription className="text-left text-[12.5px] leading-relaxed text-ink-soft">
                {dogName} · {service} · {prettyDate(booking.date)} at {booking.time}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50/60 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" strokeWidth={1.8} />
              <p className="text-[12.5px] leading-relaxed text-ink">
                Are you sure? Your slot opens up to other pups immediately. Deposit refunds are handled by the salon —
                call us at (901) 722-1114 with any questions.
              </p>
            </div>

            {cancelError && (
              <p role="alert" className="mt-3 text-[12.5px] font-medium text-red-700">
                {cancelError}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setCancelError("")
                  setMode("actions")
                }}
                disabled={busy}
                aria-label="Keep the appointment and go back"
                className={cn(BTN_PREV, "flex-1")}
              >
                Keep my appointment
              </button>
              <button
                type="button"
                onClick={submitCancel}
                disabled={busy}
                aria-label={`Confirm cancellation for ${dogName}`}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-red-700 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-red-800 disabled:pointer-events-none disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Cancel appointment
              </button>
            </div>
          </>
        )}

        {/* ---------------- CANCELLED (success state) ---------------- */}
        {mode === "cancelled" && (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-light/25">
              <PawPrint className="h-7 w-7 text-gold-deep" strokeWidth={1.4} />
            </span>
            <DialogTitle style={displayFont} className="mt-4 text-[24px] leading-tight text-ink">
              Your appointment is cancelled
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
              A confirmation is on its way to your email. We hope to see {dogName} again soon — rebook anytime.
            </DialogDescription>
            <button type="button" onClick={dismiss} className={cn(BTN_PRIMARY, "mt-6 sm:w-auto sm:px-10")}>
              Close
            </button>
            <Link
              href="/book/appointment"
              className="mt-3 flex min-h-[44px] items-center text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70 transition-colors hover:text-gold-deep"
            >
              Book a new appointment
            </Link>
          </div>
        )}

        {/* ---------------- DONE (pre check-in success) ---------------- */}
        {mode === "done" && (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-light/25">
              <CheckCircle2 className="h-7 w-7 text-gold-deep" strokeWidth={1.6} />
            </span>
            <DialogTitle style={displayFont} className="mt-4 text-[24px] leading-tight text-ink">
              You&apos;re all set — see you {prettyDate(booking.date)}!
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-soft">
              Your pre check-in answers are with the salon. {dogName}&apos;s stylist will have everything ready.
            </DialogDescription>
            <button type="button" onClick={dismiss} className={cn(BTN_PRIMARY, "mt-6 sm:w-auto sm:px-10")}>
              Close
            </button>
            <Link
              href="/customer/appointments"
              className="mt-3 flex min-h-[44px] items-center text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70 transition-colors hover:text-gold-deep"
            >
              View my appointments
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// PreCheckFlow — the pre check-in questions, INSIDE the same dialog.
// Step 1 Vaccinations · Step 2 Comfort & Safety · Step 3 Health & Coat ·
// Step 4 Emergency & Vet · Step 5 Disclosures.
// Posts the exact answers shape the questionnaire action accepts.
// ---------------------------------------------------------------------------

const STEP_LABELS = ["Vaccinations", "Comfort & Safety", "Health & Coat", "Emergency & Vet", "Disclosures"]

function PreCheckFlow({
  booking,
  onDone,
  onBack,
  onBusyChange,
}: {
  booking: LandingBooking
  onDone: () => void
  onBack: () => void
  onBusyChange: (busy: boolean) => void
}) {
  const dogName = booking.dogName || "your pup"
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<PreCheckAnswers>({
    vaccinationsCurrent: "",
    sameDayShots: "",
    muzzle: "",
    sedation: "",
    healthNotes: "",
    groomingGoals: "",
    behaviorNotes: "",
    emergencyName: "",
    emergencyPhone: "",
    vetName: "",
    vetPhone: "",
    authorize: false,
  })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const set = (p: Partial<PreCheckAnswers>) => setAnswers((a) => ({ ...a, ...p }))

  const phoneOk = answers.emergencyPhone.replace(/\D/g, "").length >= 7
  const stepValid = [
    answers.vaccinationsCurrent !== "" && answers.sameDayShots !== "",
    answers.muzzle !== "" && answers.sedation !== "",
    true, // notes are optional
    answers.emergencyName.trim().length > 0 && phoneOk,
    answers.authorize,
  ][step]

  const submit = async () => {
    if (!answers.authorize) {
      setError("Please accept the disclosures to complete pre check-in.")
      return
    }
    setError("")
    setBusy(true)
    onBusyChange(true)
    try {
      const res = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "questionnaire",
          bookingId: booking.id,
          answers: {
            vaccinationsCurrent: answers.vaccinationsCurrent,
            sameDayShots: answers.sameDayShots,
            muzzle: answers.muzzle,
            sedation: answers.sedation,
            healthNotes: answers.healthNotes,
            groomingGoals: answers.groomingGoals,
            behaviorNotes: answers.behaviorNotes,
            emergencyName: answers.emergencyName.trim(),
            emergencyPhone: answers.emergencyPhone.trim(),
            vetName: answers.vetName.trim(),
            vetPhone: answers.vetPhone.trim(),
            authorize: answers.authorize,
          },
        }),
      })
      const d = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(d.error || "Could not save — please try again.")
        return
      }
      onDone()
    } catch {
      setError("Network problem — please try again.")
    } finally {
      setBusy(false)
      onBusyChange(false)
    }
  }

  return (
    <>
      <DialogHeader className="text-left sm:text-left">
        <p className="eyebrow">Pre Check-In</p>
        <DialogTitle style={displayFont} className="text-left text-[22px] leading-tight text-ink">
          Confirm {dogName}&apos;s visit
        </DialogTitle>
        <DialogDescription className="text-left text-[12.5px] leading-relaxed text-ink-soft">
          A few safety questions for {dogName}&apos;s stylist — takes about two minutes.
        </DialogDescription>
      </DialogHeader>

      {/* Stepper with progress */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
          <span className="text-gold-deep">
            Step {step + 1} of 5 · {STEP_LABELS[step]}
          </span>
          <span className="text-ink-soft/60">{prettyDate(booking.date)}</span>
        </div>
        <div
          className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-label="Pre check-in progress"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={step + 1}
        >
          <div
            className="h-full rounded-full bg-gold-deep transition-all duration-300"
            style={{ width: `${((step + 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {/* Step 1 — Vaccinations */}
        {step === 0 && (
          <>
            <YesNoQuestion
              label="Vaccinations current? (rabies, DHPP, bordetella)"
              value={answers.vaccinationsCurrent}
              onChange={(v) => set({ vaccinationsCurrent: v })}
              yesLabel="Yes — up to date"
              noLabel="Not yet"
              hint="We verify vaccine records at check-in — they keep every pup in our care safe."
            />
            <YesNoQuestion
              label="Any vaccines in the last 24 hours?"
              value={answers.sameDayShots}
              onChange={(v) => set({ sameDayShots: v })}
              hint="Recent shots can make skin sensitive to bathing."
            />
          </>
        )}

        {/* Step 2 — Comfort & Safety */}
        {step === 1 && (
          <>
            <YesNoQuestion
              label={`Has ${dogName} ever needed a muzzle?`}
              value={answers.muzzle}
              onChange={(v) => set({ muzzle: v })}
              hint="Knowing beforehand keeps everyone relaxed — it&apos;s never a judgment."
            />
            <YesNoQuestion
              label={`Has ${dogName} ever been sedated for grooming?`}
              value={answers.sedation}
              onChange={(v) => set({ sedation: v })}
            />
            {answers.sedation === "yes" && (
              <div className="flex items-start gap-2.5 rounded-md border border-gold/40 bg-gold-light/20 p-3.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" strokeWidth={1.8} />
                <p className="text-[12px] leading-relaxed text-ink">
                  Please call us before your visit — medicated pets can&apos;t be groomed the same day. (901) 722-1114.
                </p>
              </div>
            )}
          </>
        )}

        {/* Step 3 — Health & Coat */}
        {step === 2 && (
          <>
            <div>
              <Label htmlFor="pc-health" className={LABEL_CLS}>
                Health notes <span className="font-normal normal-case tracking-normal text-ink-soft/50">(include any matting)</span>
              </Label>
              <Textarea
                id="pc-health"
                rows={3}
                value={answers.healthNotes}
                onChange={(e) => set({ healthNotes: e.target.value })}
                placeholder="Skin conditions, allergies, recent surgery, hip issues… Is the coat matted?"
                className={cn(TEXTAREA_CLS, "mt-2")}
              />
              <p className="mt-2 text-[12px] leading-relaxed text-ink-soft/80">
                If {dogName} will be matted on the day of service, we will remove mats by shaving or brushing.
              </p>
            </div>
            <div>
              <Label htmlFor="pc-goals" className={LABEL_CLS}>
                Grooming goals
              </Label>
              <Textarea
                id="pc-goals"
                rows={2}
                value={answers.groomingGoals}
                onChange={(e) => set({ groomingGoals: e.target.value })}
                placeholder="The look you want, length preferences, anything to keep long…"
                className={cn(TEXTAREA_CLS, "mt-2")}
              />
            </div>
            <div>
              <Label htmlFor="pc-behavior" className={LABEL_CLS}>
                Behavior notes
              </Label>
              <Textarea
                id="pc-behavior"
                rows={2}
                value={answers.behaviorNotes}
                onChange={(e) => set({ behaviorNotes: e.target.value })}
                placeholder="Nervous with dryers, sensitive paws, loves treats…"
                className={cn(TEXTAREA_CLS, "mt-2")}
              />
            </div>
          </>
        )}

        {/* Step 4 — Emergency & Vet */}
        {step === 3 && (
          <>
            <p className="type-body text-[15px] font-bold leading-snug text-ink">
              In case of emergency, please provide contact name and phone number.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pc-em-name" className={LABEL_CLS}>
                  Contact Name <span className="text-gold-deep">*</span>
                </Label>
                <Input
                  id="pc-em-name"
                  value={answers.emergencyName}
                  onChange={(e) => set({ emergencyName: e.target.value })}
                  autoComplete="name"
                  className={cn(INPUT_CLS, "mt-2")}
                />
              </div>
              <div>
                <Label htmlFor="pc-em-phone" className={LABEL_CLS}>
                  Phone <span className="text-gold-deep">*</span>
                </Label>
                <Input
                  id="pc-em-phone"
                  type="tel"
                  value={answers.emergencyPhone}
                  onChange={(e) => set({ emergencyPhone: e.target.value })}
                  placeholder="(901) 555-0100"
                  autoComplete="tel"
                  className={cn(INPUT_CLS, "mt-2")}
                />
              </div>
              <div>
                <Label htmlFor="pc-vet-name" className={LABEL_CLS}>
                  Vet Name{" "}
                  <span className="font-normal normal-case tracking-normal text-ink-soft/50">(optional)</span>
                </Label>
                <Input
                  id="pc-vet-name"
                  value={answers.vetName}
                  onChange={(e) => set({ vetName: e.target.value })}
                  autoComplete="off"
                  className={cn(INPUT_CLS, "mt-2")}
                />
              </div>
              <div>
                <Label htmlFor="pc-vet-phone" className={LABEL_CLS}>
                  Vet Phone
                </Label>
                <Input
                  id="pc-vet-phone"
                  type="tel"
                  value={answers.vetPhone}
                  onChange={(e) => set({ vetPhone: e.target.value })}
                  placeholder="(901) 555-0100"
                  autoComplete="off"
                  className={cn(INPUT_CLS, "mt-2")}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 5 — Disclosures */}
        {step === 4 && (
          <>
            <p className="type-body text-[15px] font-bold leading-snug text-ink">
              IMPORTANT! Please read and accept the disclosures.
            </p>
            <div className="rounded-lg border border-ink/10 bg-white p-4">
              <p className={LABEL_CLS}>Matting policy</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                If {dogName} is matted on the day of service, we will remove mats by shaving or brushing.
              </p>
            </div>
            <label
              htmlFor="pc-authorize"
              className="flex cursor-pointer items-start gap-3 rounded-md border border-gold/40 bg-gold-light/20 p-4"
            >
              <Checkbox
                id="pc-authorize"
                checked={answers.authorize}
                onCheckedChange={(c) => set({ authorize: c === true })}
                className="mt-0.5 data-[state=checked]:border-gold-deep data-[state=checked]:bg-gold-deep"
              />
              <span className="text-[13px] leading-relaxed text-ink">
                I authorize All About Pawz to seek medical attention for my pet during the grooming appointment in case
                of an emergency. I will not hold All About Pawz responsible for any pre-existing health problems my
                pet might have.
              </span>
            </label>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} disabled={busy} className={BTN_PREV}>
            Previous
          </button>
        )}
        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            aria-label={`Continue to step ${step + 2}: ${STEP_LABELS[step + 1]}`}
            className={BTN_NEXT}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!answers.authorize || busy}
            aria-label="Submit the pre check-in answers"
            className={BTN_NEXT}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Complete Pre Check-In
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-soft/70 transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my appointment
      </button>
    </>
  )
}

// ---------------------------------------------------------------------------
// YesNoQuestion — a big touch-friendly yes/no radio pair (shadcn RadioGroup,
// gold salon styling).
// ---------------------------------------------------------------------------

function YesNoQuestion({
  label,
  value,
  onChange,
  yesLabel = "Yes",
  noLabel = "No",
  hint,
}: {
  label: string
  value: "" | "yes" | "no"
  onChange: (v: "yes" | "no") => void
  yesLabel?: string
  noLabel?: string
  hint?: string
}) {
  return (
    <fieldset>
      <legend className={LABEL_CLS}>{label}</legend>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v === "yes" ? "yes" : "no")}
        className="mt-2 grid grid-cols-2 gap-3"
        aria-label={label}
      >
        {(["yes", "no"] as const).map((v) => (
          <label
            key={v}
            className={cn(
              "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
              value === v ? "border-gold-deep bg-gold-light/20" : "border-ink/15 bg-white hover:border-gold-deep/60",
            )}
          >
            <RadioGroupItem
              value={v}
              aria-label={v === "yes" ? yesLabel : noLabel}
              className="border-ink/30 data-[state=checked]:border-gold-deep [&_svg]:fill-gold-deep"
            />
            <span className="type-body text-[14px] font-bold text-ink">{v === "yes" ? yesLabel : noLabel}</span>
          </label>
        ))}
      </RadioGroup>
      {hint && <p className="mt-2 text-[12px] leading-relaxed text-ink-soft/80">{hint}</p>}
    </fieldset>
  )
}
