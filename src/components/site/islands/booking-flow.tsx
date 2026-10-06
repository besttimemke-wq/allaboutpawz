"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { createClient } from "@/lib/auth/client"
import { useBookingFlow, tierFromWeightLbs, type PayMode, type SizeTier } from "@/lib/booking/flow-store"
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/booking/ics"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ServicePrice, MemberSavingsBadge } from "@/components/site/islands/service-price"
import { PromoCodeBox, type AppliedPromo } from "@/components/site/islands/promo-code-box"
import {
  AlertCircle as AlertIcon,
  Calendar as CalendarIcon,
  Check as CheckIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Loader2 as SpinnerIcon,
  Mail as MailIcon,
  MapPin as MapPinIcon,
  PawPrint as PawPrintIcon,
  Scissors as ScissorsIcon,
  ShieldCheck as ShieldCheckIcon,
  Sparkles as Sparkle,
  Sun as SunIcon,
  Sunrise as SunriseIcon,
} from "lucide-react"

// ---------------------------------------------------------------------------
// The 5-step booking flow — SIGN IN → PET → SERVICE → TIME → REVIEW.
//
// Petco-grade structure: a 5-node stepper up top, completed steps collapse
// into summary cards with Edit links (back-nav with state intact), CONTINUE
// stays disabled until each step is valid, and a blocking vaccination gate
// sits between TIME and REVIEW. White page, Lato type, one narrow column.
// Every API contract is the Task-35 backend: /api/booking/menu,
// /api/customer/pets, /api/availability, /api/bookings/checkout,
// /api/bookings/status, /api/customer/appointments (questionnaire).
// ---------------------------------------------------------------------------

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`

const STEP_LABELS = ["Sign in", "Pet", "Service", "Time", "Review"]
const GOOGLE_HREF = "/api/auth/google?portal=customer&next=%2Fbook%2Fappointment"

// The paw slider — 6 levels, small paw to large paw. Users rarely know
// pounds, so they pick a paw; the level writes the representative weight
// and the size tier the salon prices by.
const PAW_LEVELS: { level: number; tier: SizeTier; weightLbs: string; range: string }[] = [
  { level: 1, tier: "SMALL", weightLbs: "12", range: "0–20 lbs" },
  { level: 2, tier: "MEDIUM", weightLbs: "30", range: "21–40 lbs" },
  { level: 3, tier: "LARGE", weightLbs: "50", range: "41–60 lbs" },
  { level: 4, tier: "XLARGE", weightLbs: "70", range: "61–80 lbs" },
  { level: 5, tier: "XLARGE", weightLbs: "90", range: "81–100 lbs" },
  { level: 6, tier: "XLARGE", weightLbs: "120", range: "100+ lbs" },
]

function pawLevelFromWeight(weightLbs: string): number {
  const w = parseFloat(weightLbs)
  if (!Number.isFinite(w) || w <= 0) return 0
  if (w <= 20) return 1
  if (w <= 40) return 2
  if (w <= 60) return 3
  if (w <= 80) return 4
  if (w <= 100) return 5
  return 6
}

const PKG_DESC: Record<string, string> = {
  "bath & brush": "Bath, blow-dry & brush out",
  "full groom": "Bath, haircut & full style",
  "deluxe spa": "The works — bath, haircut, spa treatments",
}
const pkgDesc = (name: string) => PKG_DESC[String(name).trim().toLowerCase()] || "Full-service grooming, tailored to your dog."

const INCLUDED_IN_EVERY_VISIT = [
  "Deep-cleaning shampoo",
  "Blow-dry",
  "15-min brush out",
  "Ear cleaning",
  "Nail trim",
  "Scented spritz",
]

const HEALTH_OPTIONS = [
  "Heart condition (including murmur)",
  "Kidney disease",
  "Cancer",
  "Epilepsy or seizures",
  "Arthritis / joint injury / lameness",
  "Allergies",
  "Other (please specify)",
]
const NEEDS_OPTIONS = ["Itchy skin", "Shedding", "Routine care", "Fleas", "Anxiety", "Matting"]
const BEHAVIOR_OPTIONS = ["Barking", "Anxiety", "Jumping", "Aggression"]

const BIRTH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// Shared control styles — white bg, neutral borders, gold focus ring.
const INPUT_CLS =
  "w-full rounded-md border border-neutral-300 bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/30"
const SELECT_CLS =
  "w-full rounded-md border border-neutral-300 bg-white px-3.5 py-3 text-[15px] text-ink outline-none transition-colors focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/30"
const TEXTAREA_CLS =
  "w-full rounded-md border border-neutral-300 bg-white px-3.5 py-3 text-[14px] leading-relaxed text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/30"
const LABEL_CLS = "block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500"

const emptySubscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type MenuItem = { id: string; name: string; category: string }
type Pkg = MenuItem & {
  prices: Record<SizeTier, number | null>
  memberPrices: Record<SizeTier, number | null>
}
type Treatment = MenuItem & {
  prices: Record<SizeTier, number | null>
  memberPrices: Record<SizeTier, number | null>
  note: string | null
}
type AddOn = MenuItem & { priceCents: number; priceDisplay: string; memberPriceCents: number | null }
type MenuData = {
  breeds: { id: string; name: string }[]
  packages: Pkg[]
  treatments: Treatment[]
  addons: AddOn[]
  tiers: { tier: SizeTier; label: string; range: string }[]
  taxRatePercent: number
  salon: { name: string; address: string; cityState: string; phone: string }
  depositCents: number
  /** signed-in visitor holds an ACTIVE PAWfection Bath Club membership */
  isMember: boolean
  bathClub: { id: string; sizeTier: string; sizeLabel: string; weightRange: string; monthlyPriceCents: number | null }[]
  perks: { pointsPerDollar: number }
}
type SessionUser = { id: string; name: string; email: string; role: string } | null
type PetOption = {
  id: string
  name: string
  breed: string | null
  breedId: string | null
  birthDate: string | null
  weightLbs: string | null
  size: string | null
}

type StatusBooking = {
  id: string
  signal: string
  signalLabel: string
  date: string
  time: string
  dogName: string
  breed: string | null
  service: string
  items: { name: string; qty: number; unitCents?: number; lineCents?: number }[]
  subtotal: string | null
  tax: string | null
  total: string | null
  paid: string | null
  balanceDue: string | null
  amountDueCents: number
  payMode: string | null
  questionnaireComplete: boolean
}

type Cart = {
  pkg: Pkg
  pkgCents: number
  treatment: Treatment | null
  treatmentCents: number | null
  addons: AddOn[]
  addonCents: number
  subtotal: number
  tax: number
  total: number
}

type FlowStore = ReturnType<typeof useBookingFlow.getState>
type PetModalMode = "add" | "edit" | "second"

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------
function PrimaryAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-cream transition-colors enabled:hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  )
}

function SecondaryAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-6 text-[13px] font-bold uppercase tracking-[0.08em] text-ink transition-colors enabled:hover:border-ink enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  )
}

function RadioCircle({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-gold-deep" : "border-neutral-300 bg-white",
      )}
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-gold-deep" />}
    </span>
  )
}

function CheckSquare({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors",
        selected ? "border-gold-deep bg-gold-deep" : "border-neutral-300 bg-white",
      )}
    >
      {selected && <CheckIcon className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
    </span>
  )
}

function Stepper({
  labels,
  step,
  maxStep,
  onStepSelect,
}: {
  labels: string[]
  step: number
  /** Furthest step reached (ratchet). When provided, EVERY step ≤ maxStep
   *  is one-click travel — back AND forward to where you already were. */
  maxStep?: number
  /** Navigate to a previously reached step (2026 enterprise convenience:
   *  the stepper is a map of where you've been, not a dead infographic —
   *  every finished step is one click away, state intact). */
  onStepSelect?: (step: number) => void
}) {
  const ceiling = typeof maxStep === "number" ? maxStep : step
  return (
    <ol className="flex items-start" aria-label="Booking steps">
      {labels.map((label, i) => {
        const done = i <= ceiling && i !== step
        const now = i === step
        const clickable = done && !!onStepSelect
        const content = (
          <>
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[calc(-50%+22px)] right-[calc(50%+22px)] top-[15px] h-[2px] rounded-full",
                  i <= step ? "bg-ink" : "bg-neutral-200",
                )}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors",
                done && "border-ink bg-ink text-white",
                now && "border-gold-deep bg-gold-deep text-white",
                !done && !now && "border-neutral-300 bg-white text-neutral-400",
                clickable && "cursor-pointer group-hover:border-gold-deep group-hover:bg-gold-deep",
              )}
            >
              {done ? <CheckIcon className="h-4 w-4" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-[10px] font-bold uppercase tracking-[0.12em] sm:block",
                now ? "text-ink" : "text-neutral-400",
                clickable && "group-hover:text-gold-deep",
              )}
            >
              {label}
            </span>
          </>
        )
        return (
          <li
            key={label}
            aria-current={now ? "step" : undefined}
            className="relative flex flex-1 flex-col items-center gap-2"
          >
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepSelect?.(i)}
                aria-label={i < step ? `Go back to step ${i + 1}: ${label}` : `Return to step ${i + 1}: ${label}`}
                className="group flex flex-col items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gold-deep/60"
              >
                {content}
              </button>
            ) : (
              <span className="flex flex-col items-center gap-2">{content}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function SummaryCard({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
        <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-[12px] font-bold uppercase tracking-[0.08em] text-gold-deep hover:underline"
      >
        Edit
      </button>
    </div>
  )
}

function StepHeading({ title, sub, id }: { title: string; sub?: string; id?: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="type-body text-[22px] font-bold leading-tight text-ink">
        {title}
      </h2>
      {sub && <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">{sub}</p>}
    </div>
  )
}

// The step footer. Sticky to the bottom on mobile (thumb zone + safe-area),
// inline on desktop. NEXT stays disabled until the step is valid.
function StepActions({
  first,
  onPrev,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  busy,
  children,
}: {
  first?: boolean
  onPrev?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  busy?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="sticky bottom-0 z-30 mt-6 border-t border-neutral-200 bg-white/95 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm lg:static lg:mt-8 lg:border-t-0 lg:bg-transparent lg:pt-0 lg:pb-0 lg:backdrop-blur-none">
      {children}
      <div className="flex flex-col gap-3 sm:flex-row">
        {!first && onPrev && (
          <SecondaryAction onClick={onPrev} className="sm:w-auto sm:flex-none sm:px-8">
            Previous
          </SecondaryAction>
        )}
        {onNext && (
          <PrimaryAction onClick={onNext} disabled={nextDisabled || busy} className="flex-1">
            {busy && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            {nextLabel}
          </PrimaryAction>
        )}
      </div>
    </div>
  )
}

function NoticeBanner({ tone, children }: { tone: "warn" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-md border p-3.5 text-[13px] leading-relaxed",
        tone === "warn" && "border-gold/40 bg-amber-50/60 text-ink",
        tone === "error" && "border-red-800/30 bg-red-50 text-red-900",
      )}
      role="alert"
    >
      {tone === "warn" ? (
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
      ) : (
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
      )}
      <p>{children}</p>
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-neutral-200" aria-hidden="true" />
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400">{label}</span>
      <span className="h-px flex-1 bg-neutral-200" aria-hidden="true" />
    </div>
  )
}

function CheckRow({
  checked,
  onToggle,
  children,
  bold,
}: {
  checked: boolean
  onToggle: () => void
  children: React.ReactNode
  bold?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex min-h-[48px] w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[14px] transition-colors",
        checked ? "border-gold-deep bg-amber-50/40" : "border-neutral-200 bg-white enabled:hover:border-neutral-400",
      )}
    >
      <CheckSquare selected={checked} />
      <span className={cn("text-ink", bold && "font-bold")}>{children}</span>
    </button>
  )
}

// The paw slider — six paws small to large, clickable and draggable.
function PawSlider({ level, onChange }: { level: number; onChange: (level: number) => void }) {
  const pawSizes = ["h-4 w-4", "h-5 w-5", "h-6 w-6", "h-7 w-7", "h-8 w-8", "h-9 w-9"]
  return (
    <div>
      <div role="radiogroup" aria-label="Pet size" className="flex items-end justify-between px-1">
        {PAW_LEVELS.map((p) => {
          const active = level === p.level
          return (
            <button
              key={p.level}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${p.range} (${p.tier[0]}${p.tier.slice(1).toLowerCase()})`}
              onClick={() => onChange(p.level)}
              className="group flex min-h-[44px] min-w-[38px] flex-1 flex-col items-center justify-end pb-1"
            >
              <PawPrintIcon
                aria-hidden="true"
                className={cn(
                  "transition-colors",
                  pawSizes[p.level - 1],
                  active ? "fill-gold-deep text-gold-deep" : "fill-neutral-300 text-neutral-300 group-hover:fill-gold group-hover:text-gold",
                )}
              />
            </button>
          )
        })}
      </div>
      <input
        type="range"
        min={1}
        max={6}
        step={1}
        value={level || 3}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        aria-label="Pet size level"
        className="mt-3 w-full accent-gold-deep"
      />
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Small paw</span>
        {level > 0 && (
          <span className="text-[12.5px] font-semibold text-ink">{PAW_LEVELS[level - 1].range}</span>
        )}
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">Large paw</span>
      </div>
    </div>
  )
}

// The post-discount total — promo first, then points against what's left,
// tax on the discounted subtotal (mirrors the server's register math).
function finalTotal(
  cart: Cart,
  menu: MenuData,
  appliedPromo: AppliedPromo | null,
  validPoints: number,
  pointsDiscountCents: number,
): number {
  const promoDiscount = appliedPromo?.discountCents ?? 0
  const subtotal = Math.max(0, cart.subtotal - promoDiscount - pointsDiscountCents)
  const tax = Math.round((subtotal * menu.taxRatePercent) / 100)
  return subtotal + tax
}

function CartSummaryCard({
  cart,
  menu,
  pawRange,
  appliedPromo,
  pointsRedeemed,
  pointsDiscount,
}: {
  cart: Cart
  menu: MenuData
  pawRange: string
  appliedPromo?: AppliedPromo | null
  pointsRedeemed?: number
  pointsDiscount?: number
}) {
  const promoDiscount = appliedPromo?.discountCents ?? 0
  const subtotalAfterDiscounts = Math.max(0, cart.subtotal - promoDiscount - (pointsDiscount ?? 0))
  const tax = Math.round((subtotalAfterDiscounts * menu.taxRatePercent) / 100)
  const total = subtotalAfterDiscounts + tax
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="space-y-2 text-[13.5px]">
        <div className="flex justify-between">
          <span className="font-semibold text-ink">
            {cart.pkg.name}
            {pawRange && <span className="font-normal text-neutral-500"> · {pawRange}</span>}
          </span>
          <span className="font-semibold tabular-nums text-ink">{fmt(cart.pkgCents)}</span>
        </div>
        {cart.treatment && (
          <div className="flex justify-between">
            <span className="text-neutral-600">
              {cart.treatment.name}
              <span className="text-neutral-400"> · treatment</span>
            </span>
            <span className="tabular-nums text-neutral-600">
              {cart.treatmentCents == null ? "Custom quote" : fmt(cart.treatmentCents)}
            </span>
          </div>
        )}
        {cart.addons.map((a) => (
          <div key={a.id} className="flex justify-between">
            <span className="text-neutral-600">{a.name}</span>
            <span className="tabular-nums text-neutral-600">
              {fmt(menu.isMember && a.memberPriceCents != null ? a.memberPriceCents : a.priceCents)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-[13px]">
        <div className="flex justify-between text-neutral-500">
          <span>Subtotal</span>
          <span className="tabular-nums">{fmt(cart.subtotal)}</span>
        </div>
        {promoDiscount > 0 && appliedPromo && (
          <div className="flex justify-between font-semibold text-gold-deep">
            <span>Promo {appliedPromo.code}</span>
            <span className="tabular-nums">−{fmt(promoDiscount)}</span>
          </div>
        )}
        {(pointsDiscount ?? 0) > 0 && (
          <div className="flex justify-between font-semibold text-gold-deep">
            <span>Perks points ({pointsRedeemed} pts)</span>
            <span className="tabular-nums">−{fmt(pointsDiscount ?? 0)}</span>
          </div>
        )}
        <div className="flex justify-between text-neutral-500">
          <span>Tax ({menu.taxRatePercent}%)</span>
          <span className="tabular-nums">{fmt(tax)}</span>
        </div>
        <div className="flex justify-between pt-1 text-[17px] font-bold text-ink">
          <span>Total</span>
          <span className="tabular-nums">{fmt(total)}</span>
        </div>
        {cart.treatment && cart.treatmentCents == null && (
          <p className="pt-1 text-[11.5px] leading-snug text-neutral-400">
            The treatment is priced at the salon — it isn’t part of today’s online total.
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------
export function BookingFlow() {
  const flow = useBookingFlow()
  const mounted = useMounted()

  const [menu, setMenu] = useState<MenuData | null>(null)
  const [session, setSession] = useState<SessionUser>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [pets, setPets] = useState<PetOption[] | null>(null)

  // URL modes: Stripe success return / cancelled checkout / deep-linked
  // offer code (?promo=CODE from an Offers card CTA)
  const [confirmBookingId, setConfirmBookingId] = useState<string | null>(null)
  const [cancelledNotice, setCancelledNotice] = useState(false)
  const [initialPromoCode, setInitialPromoCode] = useState<string | null>(null)

  // The vaccination gate — blocking modal between TIME and REVIEW
  const [gateOpen, setGateOpen] = useState(false)

  // The pet modal (add / edit / second pet)
  const [petModal, setPetModal] = useState<{ mode: PetModalMode; pet?: PetOption; seq: number } | null>(null)

  // hash-token finalization (magic-link return) — once per mount
  const finalized = useRef(false)

  const loadSession = useCallback(async (): Promise<SessionUser> => {
    try {
      const res = await fetch("/api/auth/portal-session", { cache: "no-store" })
      const data = await res.json()
      const user = data?.user || null
      setSession(user)
      setSessionChecked(true)
      return user
    } catch {
      setSessionChecked(true)
      return null
    }
  }, [])

  const reloadPets = useCallback(async (): Promise<PetOption[]> => {
    try {
      const res = await fetch("/api/customer/pets", { cache: "no-store" })
      if (!res.ok) {
        setPets([])
        return []
      }
      const d = await res.json()
      const list = Array.isArray(d?.pets) ? (d.pets as PetOption[]) : []
      setPets(list)
      return list
    } catch {
      setPets([])
      return []
    }
  }, [])

  const selectPet = useCallback((p: PetOption) => {
    useBookingFlow.getState().patch({
      dogId: p.id,
      dogName: p.name,
      breedId: p.breedId || "",
      breedName: p.breed || "",
      birthDate: p.birthDate || "",
      weightLbs: p.weightLbs || "",
    })
  }, [])

  // The magic-link return: Supabase dropped tokens in the hash — install the
  // session client-side, ask the server to finalize, then the flow resumes.
  useEffect(() => {
    if (finalized.current) return
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : ""
    if (!hash) return
    const params = new URLSearchParams(hash)
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")
    if (!accessToken || !refreshToken) return
    finalized.current = true
    ;(async () => {
      try {
        const supabase = createClient()
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        window.history.replaceState(null, "", window.location.pathname)
        await fetch("/api/auth/email-link", { method: "POST" }).catch(() => {})
        await loadSession()
      } catch {
        /* the customer can still use Google or request a new link */
      }
    })()
  }, [loadSession])

  // Load the menu + session + URL mode on mount
  useEffect(() => {
    fetch("/api/booking/menu")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d === "object") setMenu(d as MenuData)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount: session bootstrap + URL mode detection (repo convention).
    loadSession()

    const sp = new URLSearchParams(window.location.search)
    const promoParam = sp.get("promo")
    if (promoParam) {
      setInitialPromoCode(promoParam.toUpperCase())
      window.history.replaceState(null, "", window.location.pathname)
    }
    if (sp.get("success") === "booking") {
      const bid = sp.get("booking_id")
      if (bid) {
        setConfirmBookingId(bid)
        useBookingFlow.getState().patch({ bookingId: bid })
        // Clean the URL so a refresh doesn't re-enter confirmation forever
        window.history.replaceState(null, "", window.location.pathname)
      }
    } else if (sp.get("cancelled")) {
      setCancelledNotice(true)
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [loadSession])

  // Signed-in customers see their pet registry; pre-select the first pet
  // when nothing is selected yet.
  useEffect(() => {
    if (!session) return
    let alive = true
    ;(async () => {
      const list = await reloadPets()
      if (!alive || list.length === 0) return
      const s = useBookingFlow.getState()
      if (!list.some((p) => p.id === s.dogId) && !s.dogName.trim()) {
        selectPet(list[0])
      }
    })()
    return () => {
      alive = false
    }
  }, [session, reloadPets, selectPet])

  const tier: SizeTier | null = tierFromWeightLbs(flow.weightLbs)
  const pawLevel = pawLevelFromWeight(flow.weightLbs)
  const pawRange = pawLevel > 0 ? PAW_LEVELS[pawLevel - 1].range : ""

  const cart = useMemo(() => {
    if (!menu || !tier) return null
    const pkg = menu.packages.find((p) => p.id === flow.packageId) || null
    // Bath Club members price at the member ladder (the server re-prices
    // at checkout — this preview mirrors it).
    const priceOf = (p: Pkg | Treatment) => {
      if (menu.isMember) return p.memberPrices?.[tier] ?? p.prices?.[tier] ?? null
      return p.prices?.[tier] ?? null
    }
    const pkgCents = pkg ? priceOf(pkg) : null
    const treatment = menu.treatments.find((t) => t.id === flow.treatmentId) || null
    // XL treatments carry no online price — custom quote at the salon.
    const treatmentCents = treatment ? priceOf(treatment) : null
    const addons = menu.addons.filter((a) => flow.addonIds.includes(a.id))
    const addonCents = addons.reduce(
      (s, a) => s + (menu.isMember && a.memberPriceCents != null ? a.memberPriceCents : a.priceCents),
      0,
    )
    if (!pkg || pkgCents == null) return null
    const subtotal = pkgCents + (treatmentCents ?? 0) + addonCents
    const tax = Math.round((subtotal * menu.taxRatePercent) / 100)
    return {
      pkg, pkgCents, treatment,
      treatmentCents: treatment ? treatmentCents : null,
      addons, addonCents, subtotal, tax, total: subtotal + tax,
    }
  }, [menu, tier, flow.packageId, flow.treatmentId, flow.addonIds])

  // Leaving TIME for REVIEW without acknowledgment → the gate opens first.
  const requestReview = useCallback(() => {
    if (useBookingFlow.getState().vaccinationAcknowledged) {
      useBookingFlow.getState().setStep(4)
    } else {
      setGateOpen(true)
    }
  }, [])

  const acknowledgeVaccination = useCallback(() => {
    setGateOpen(false)
    useBookingFlow.getState().patch({ vaccinationAcknowledged: true })
    useBookingFlow.getState().setStep(4)
  }, [])

  const handlePetSaved = useCallback(
    (pet: PetOption, mode: PetModalMode) => {
      setPetModal(null)
      reloadPets()
      if (mode === "second") {
        // The appointment books one dog at a time — queue this pet for after
        // the current dog's booking completes.
        const s = useBookingFlow.getState()
        if (!s.secondPetId) useBookingFlow.getState().patch({ secondPetId: pet.id, secondPetName: pet.name })
      } else {
        selectPet(pet)
      }
    },
    [reloadPets, selectPet],
  )

  // "Book another pet" from the confirmation — restart at the PET step with
  // the queued pet pre-selected; the service carries over, the slot resets
  // (the first dog just took it).
  const bookSecondPet = useCallback(async () => {
    const s = useBookingFlow.getState()
    const id = s.secondPetId
    if (!id) return
    let pet: PetOption | null = null
    try {
      const res = await fetch("/api/customer/pets", { cache: "no-store" })
      if (res.ok) {
        const d = await res.json()
        pet = (Array.isArray(d?.pets) ? (d.pets as PetOption[]) : []).find((p) => p.id === id) || null
      }
    } catch {
      /* fall through with the remembered name */
    }
    setConfirmBookingId(null)
    useBookingFlow.getState().patch({
      dogId: pet?.id ?? null,
      dogName: pet?.name ?? s.secondPetName,
      breedId: pet?.breedId ?? "",
      breedName: pet?.breed ?? "",
      birthDate: pet?.birthDate ?? "",
      weightLbs: pet?.weightLbs ?? "",
      date: "",
      time: "",
      vaccinationAcknowledged: false,
      secondPetId: null,
      secondPetName: "",
      bookingId: null,
      step: 1,
    })
  }, [])

  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-2xl" aria-busy="true">
        <Stepper labels={STEP_LABELS} step={0} />
        <div className="mt-8 space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    )
  }

  if (confirmBookingId) {
    return (
      <Confirmation
        bookingId={confirmBookingId}
        salon={menu?.salon || null}
        secondPetName={flow.secondPetName}
        onBookSecondPet={bookSecondPet}
      />
    )
  }

  // Completed steps collapse into summary cards (spec §1 back-nav pattern).
  const summaries: { label: string; value: string; edit: number }[] = []
  if (flow.step > 0 && flow.step < 4 && session) {
    summaries.push({ label: "Sign in", value: session.name || session.email, edit: 0 })
  }
  if (flow.step > 1 && flow.step < 4 && flow.dogName) {
    summaries.push({
      label: "Your pet",
      value: `${flow.dogName} — ${flow.breedName || "Breed TBD"}${pawRange ? ` · ${pawRange}` : ""}`,
      edit: 1,
    })
  }
  if (flow.step > 2 && flow.step < 4 && cart?.pkg) {
    summaries.push({
      label: "Grooming service",
      value:
        cart.pkg.name + (cart.addons.length > 0 ? ` · +${cart.addons.length} add-on${cart.addons.length > 1 ? "s" : ""}` : ""),
      edit: 2,
    })
  }
  if (flow.step > 3 && flow.step < 4 && flow.date) {
    summaries.push({
      label: "Your time",
      value: `${dateLabel(flow.date)} at ${flow.time}`,
      edit: 3,
    })
  }

  return (
    <div
      className={cn(
        "mx-auto w-full",
        // The TIME step opens into the two-column calendar + times layout —
        // it USES the page's white space instead of scrolling forever.
        flow.step === 3 ? "max-w-2xl lg:max-w-4xl" : "max-w-2xl",
      )}
    >
      <Stepper labels={STEP_LABELS} step={flow.step} maxStep={flow.maxStep} onStepSelect={(i) => flow.setStep(i)} />

      {cancelledNotice && (
        <div className="mt-6">
          <NoticeBanner tone="warn">
            Checkout was cancelled — everything you picked is still saved. Continue below when you’re ready.
          </NoticeBanner>
        </div>
      )}

      {summaries.length > 0 && (
        <div className="mt-6 space-y-3">
          {summaries.map((s) => (
            <SummaryCard key={s.label} label={s.label} value={s.value} onEdit={() => flow.setStep(s.edit)} />
          ))}
        </div>
      )}

      <div className={cn(flow.step === 0 ? "mt-8" : "mt-6")}>
        {flow.step === 0 && (
          <StepSignin flow={flow} session={session} sessionChecked={sessionChecked} reloadSession={loadSession} />
        )}
        {flow.step === 1 && (
          <StepPet
            flow={flow}
            menu={menu}
            pets={pets}
            selectPet={selectPet}
            openPetModal={(mode, pet) => setPetModal((m) => ({ mode, pet, seq: (m?.seq ?? 0) + 1 }))}
          />
        )}
        {flow.step === 2 && (
          <StepService flow={flow} menu={menu} cart={cart} tier={tier} pawRange={pawRange} />
        )}
        {flow.step === 3 && <StepTime flow={flow} menu={menu} requestReview={requestReview} />}
        {flow.step === 4 && (
          <StepReview flow={flow} menu={menu} cart={cart} session={session} pawRange={pawRange} initialPromoCode={initialPromoCode} />
        )}
      </div>

      <VaccinationGate
        open={gateOpen}
        petName={flow.dogName}
        onAcknowledge={acknowledgeVaccination}
        onChangeDate={() => setGateOpen(false)}
      />

      {petModal && (
        <PetModal
          key={petModal.seq}
          mode={petModal.mode}
          pet={petModal.pet}
          menu={menu}
          onClose={() => setPetModal(null)}
          onSaved={handlePetSaved}
        />
      )}
    </div>
  )
}

function dateLabel(iso: string): string {
  try {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Sign in: Google or an email link. Nothing else.
// ---------------------------------------------------------------------------
function StepSignin({
  flow,
  session,
  sessionChecked,
  reloadSession,
}: {
  flow: FlowStore
  session: SessionUser
  sessionChecked: boolean
  reloadSession: () => Promise<SessionUser>
}) {
  const [email, setEmail] = useState(flow.signupEmail)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(flow.signupSent)
  const [error, setError] = useState("")

  const submitEmail = async () => {
    setError("")
    setSending(true)
    try {
      const res = await fetch("/api/auth/booking-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Something went wrong — please try again.")
        return
      }
      setSent(true)
      flow.patch({ signupEmail: email, signupSent: true })
    } catch {
      setError("Network problem — please try again.")
    } finally {
      setSending(false)
    }
  }

  if (session && sessionChecked) {
    const first = (session.name || session.email || "friend").split(" ")[0]
    return (
      <section aria-labelledby="signin-heading">
        <StepHeading
          id="signin-heading"
          title="Tell us who you are"
          sub="You’re signed in — your details carry through the whole booking."
        />
        <div className="flex items-center gap-3.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
          <span className="type-body flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[16px] font-bold text-cream">
            {(session.name || session.email || "?").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="type-body truncate text-[15px] font-bold text-ink">Hi, {first}</p>
            <p className="truncate text-[13px] text-neutral-500">{session.email}</p>
          </div>
          <ShieldCheckIcon className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
        </div>
        <StepActions first onNext={() => flow.setStep(1)} nextLabel="Continue" />
      </section>
    )
  }

  if (sent) {
    return (
      <section aria-labelledby="signin-heading">
        <StepHeading
          id="signin-heading"
          title="Tell us who you are"
          sub="Almost there — confirm your email and you’re in."
        />
        <div className="flex flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center sm:p-8">
          <MailIcon className="h-9 w-9 text-gold-deep" aria-hidden="true" />
          <div>
            <p className="type-body text-[16px] font-bold text-ink">Check your email — we sent a sign-in link</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-500">
              We sent it to <strong className="font-semibold text-ink">{flow.signupEmail || email}</strong>. The link opens
              right back here and your booking picks up where you left off.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const user = await reloadSession()
              if (user) flow.setStep(1)
            }}
            className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-gold-deep hover:underline"
          >
            I clicked the link — refresh my session
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setSent(false)
            flow.patch({ signupSent: false })
          }}
          className="mt-4 w-full text-center text-[13px] font-semibold text-neutral-500 underline underline-offset-2 hover:text-gold-deep"
        >
          Use a different email
        </button>
        <StepActions first nextDisabled />
      </section>
    )
  }

  return (
    <section aria-labelledby="signin-heading">
      <StepHeading
        id="signin-heading"
        title="Tell us who you are"
        sub="Sign in with Google or your email — your appointments stay manageable in your portal."
      />
      {sessionChecked ? (
        <>
          <GoogleFlowButton />
          <Divider label="or" />
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (/.+@.+\..+/.test(email)) submitEmail()
            }}
          >
            <label htmlFor="signup-email" className={LABEL_CLS}>
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(INPUT_CLS, "mt-2")}
            />
            {error && (
              <p className="mt-2.5 text-[13px] font-medium text-red-700" role="alert">
                {error}
              </p>
            )}
            <PrimaryAction type="submit" disabled={sending || !/.+@.+\..+/.test(email)} className="mt-3">
              {sending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
              Email me a sign-in link
            </PrimaryAction>
          </form>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-neutral-400">
            No password to remember — the link signs you straight in.
          </p>
        </>
      ) : (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      <StepActions first nextDisabled={!session} />
    </section>
  )
}

// Google sign-in — ?next= rides the OAuth state and returns the customer
// STRAIGHT back to this flow signed in.
const GOOGLE_SVG = (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
)

function GoogleFlowButton() {
  const [leaving, setLeaving] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        setLeaving(true)
        window.location.href = GOOGLE_HREF
      }}
      disabled={leaving}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white text-[15px] font-semibold text-ink transition-colors enabled:hover:bg-neutral-50 disabled:opacity-60"
    >
      {leaving ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : GOOGLE_SVG}
      <span>Continue with Google</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Pet: saved-pet dropdown, the "Tell Us About Your Pet" modal,
// and the second-pet pattern.
// ---------------------------------------------------------------------------
function StepPet({
  flow,
  menu,
  pets,
  selectPet,
  openPetModal,
}: {
  flow: FlowStore
  menu: MenuData | null
  pets: PetOption[] | null
  selectPet: (p: PetOption) => void
  openPetModal: (mode: PetModalMode, pet?: PetOption) => void
}) {
  const selectedPet = pets?.find((p) => p.id === flow.dogId) || null
  const pawLevel = pawLevelFromWeight(flow.weightLbs)
  const pawRange = pawLevel > 0 ? PAW_LEVELS[pawLevel - 1].range : ""
  const valid = !!flow.dogId && flow.dogName.trim().length > 0

  return (
    <section aria-labelledby="pet-heading">
      <StepHeading
        id="pet-heading"
        title="Appointment For"
        sub="Your pet info saves to your account — size sets the price."
      />

      {pets === null || !menu ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : pets.length > 0 ? (
        <>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
            <label htmlFor="pet-select" className={LABEL_CLS}>
              Your pets
            </label>
            <select
              id="pet-select"
              value={flow.dogId || ""}
              onChange={(e) => {
                const p = pets.find((x) => x.id === e.target.value)
                if (p) selectPet(p)
              }}
              className={cn(SELECT_CLS, "mt-2")}
            >
              {!selectedPet && (
                <option value="" disabled>
                  Choose your pet
                </option>
              )}
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.breed ? ` — ${p.breed}` : ""}
                </option>
              ))}
            </select>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => openPetModal("edit", selectedPet || undefined)}
                disabled={!selectedPet}
                className="inline-flex min-h-[44px] items-center text-[12px] font-bold uppercase tracking-[0.08em] text-gold-deep hover:underline disabled:cursor-not-allowed disabled:opacity-40"
              >
                Edit Pet Info
              </button>
            </div>
          </div>

          {valid && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-gold-deep">
                <PawPrintIcon className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="type-body truncate text-[14.5px] font-bold text-ink">{flow.dogName}</p>
                <p className="truncate text-[12.5px] text-neutral-500">
                  {flow.breedName}
                  {pawRange ? ` · ${pawRange}` : ""}
                </p>
              </div>
            </div>
          )}

          <SecondaryAction onClick={() => openPetModal("second")} className="mt-4">
            Book a second pet
          </SecondaryAction>
        </>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5">
          <p className="type-body text-[15px] font-bold text-ink">Tell us about your pet</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-500">
            Add your dog once — breed, birthday, and size set the price. It saves to your account for next time.
          </p>
          <PrimaryAction onClick={() => openPetModal("add")} className="mt-4">
            Add your dog
          </PrimaryAction>
        </div>
      )}

      <StepActions
        onPrev={() => flow.setStep(0)}
        onNext={() => flow.setStep(2)}
        nextLabel="Continue"
        nextDisabled={!valid}
      />
    </section>
  )
}

function PetModal({
  mode,
  pet,
  menu,
  onClose,
  onSaved,
}: {
  mode: PetModalMode
  pet?: PetOption
  menu: MenuData | null
  onClose: () => void
  onSaved: (pet: PetOption, mode: PetModalMode) => void
}) {
  const [name, setName] = useState(pet?.name || "")
  const [breedId, setBreedId] = useState(() => {
    if (pet?.breedId) return pet.breedId
    if (pet?.breed && menu) return menu.breeds.find((b) => b.name === pet.breed)?.id || ""
    return ""
  })
  const [birthMonth, setBirthMonth] = useState(() => (pet?.birthDate ? pet.birthDate.slice(5, 7) : ""))
  const [birthYear, setBirthYear] = useState(() => (pet?.birthDate ? pet.birthDate.slice(0, 4) : ""))
  const [paw, setPaw] = useState(pet ? pawLevelFromWeight(pet.weightLbs || "") : 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const breeds = menu?.breeds || []
  const breedName = breeds.find((b) => b.id === breedId)?.name || ""
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 26 }, (_, i) => String(thisYear - i))
  const valid = name.trim().length > 0 && !!breedId && paw > 0

  const save = async () => {
    setError("")
    if (!valid) return
    setBusy(true)
    try {
      const weightLbs = PAW_LEVELS[paw - 1].weightLbs
      const birthDate = birthMonth && birthYear ? `${birthYear}-${birthMonth}-01` : ""
      const body = {
        name: name.trim(),
        breedName,
        breedId,
        birthDate,
        weightLbs,
        ...(mode === "edit" && pet ? { id: pet.id } : {}),
      }
      const res = await fetch("/api/customer/pets", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.pet) {
        setError(data?.error || "Could not save — please try again.")
        return
      }
      onSaved(data.pet as PetOption, mode)
    } catch {
      setError("Network problem — please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="type-body max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-left text-[20px] font-bold leading-snug text-ink">
            {mode === "edit" ? "Edit Pet Info" : "Tell Us About Your Pet"}
          </DialogTitle>
          <DialogDescription className="text-left text-[13px] leading-relaxed text-neutral-500">
            {mode === "second"
              ? "Add another dog to your family — you can book them right after this appointment."
              : "Size sets your price — pick the paw that best matches your dog."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label htmlFor="pet-name" className={LABEL_CLS}>
              Dog Name <span className="text-gold-deep">*</span>
            </label>
            <input
              id="pet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Biscuit"
              maxLength={50}
              className={cn(INPUT_CLS, "mt-2")}
            />
          </div>

          <div>
            <label htmlFor="pet-breed" className={LABEL_CLS}>
              Breed <span className="text-gold-deep">*</span>
            </label>
            <select
              id="pet-breed"
              value={breedId}
              onChange={(e) => setBreedId(e.target.value)}
              className={cn(SELECT_CLS, "mt-2")}
            >
              <option value="" disabled>
                Select breed
              </option>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pet-birth-month" className={LABEL_CLS}>
                Birthday
              </label>
              <select
                id="pet-birth-month"
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className={cn(SELECT_CLS, "mt-2")}
              >
                <option value="">Month</option>
                {BIRTH_MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="pet-birth-year" className={LABEL_CLS}>
                <span className="sr-only">Birth year — </span>Year
              </label>
              <select
                id="pet-birth-year"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className={cn(SELECT_CLS, "mt-2")}
              >
                <option value="">Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <p className="col-span-2 -mt-2 text-[12px] text-neutral-400">Estimate if you’re not sure.</p>
          </div>

          <div>
            <p className={LABEL_CLS}>
              Size <span className="text-gold-deep">*</span>
            </p>
            <div className="mt-3">
              <PawSlider level={paw} onChange={setPaw} />
            </div>
          </div>

          <p className="rounded-md bg-neutral-50 p-3 text-[12.5px] leading-relaxed text-neutral-500">
            Please call for cat grooming — (901) 722-1114.
          </p>

          {error && (
            <p className="text-[13px] font-medium text-red-700" role="alert">
              {error}
            </p>
          )}

          <PrimaryAction onClick={save} disabled={!valid || busy}>
            {busy && <SpinnerIcon className="h-4 w-4 animate-spin" />}
            Save
          </PrimaryAction>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Service: single-select package cards, add-on chips, live cart.
// ---------------------------------------------------------------------------
function StepService({
  flow,
  menu,
  cart,
  tier,
  pawRange,
}: {
  flow: FlowStore
  menu: MenuData | null
  cart: Cart | null
  tier: SizeTier | null
  pawRange: string
}) {
  if (!menu) {
    return (
      <section aria-busy="true">
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="service-heading">
      <StepHeading
        id="service-heading"
        title="Select Service"
        sub={
          flow.dogName
            ? `Prices for ${flow.dogName}${pawRange ? `’s size — ${pawRange}` : ""}.`
            : "Prices for your dog’s size."
        }
      />

      <div role="radiogroup" aria-label="Grooming package" className="space-y-3">
        {menu.packages.map((p) => {
          const price = tier ? p.prices[tier] : null
          const memberPrice = tier ? p.memberPrices?.[tier] ?? null : null
          const selected = flow.packageId === p.id
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => flow.patch({ packageId: p.id })}
              className={cn(
                "flex w-full items-center gap-4 rounded-lg border bg-white p-4 text-left transition-colors sm:p-5",
                selected ? "border-gold-deep bg-amber-50/40" : "border-neutral-200 enabled:hover:border-neutral-400",
              )}
            >
              <RadioCircle selected={selected} />
              <span className="min-w-0 flex-1">
                <span className="type-body block text-[15px] font-bold text-ink">{p.name}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-neutral-500">{pkgDesc(p.name)}</span>
                {price != null && (
                  <MemberSavingsBadge
                    priceCents={price}
                    memberPriceCents={memberPrice}
                    className="mt-1.5"
                  />
                )}
              </span>
              <ServicePrice
                priceCents={price}
                memberPriceCents={memberPrice}
                isMember={menu.isMember}
              />
            </button>
          )
        })}
      </div>

      {/* PAWfection Bath Club member notice — the member line resolves per
          the visitor's membership; non-members see it as the upsell. */}
      {!menu.isMember && menu.bathClub.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-gold-deep/30 bg-amber-50/30 p-4">
          <Sparkle className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            <a href="/pricing#bath-club" className="font-bold text-gold-deep underline underline-offset-2">
              Join the PAWfection Bath Club
            </a>{" "}
            and every service drops to the member price — up to 4 baths a month on your membership.
          </p>
        </div>
      )}
      {menu.isMember && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-gold-deep/40 bg-amber-50/40 p-4">
          <Sparkle className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            <span className="font-bold text-gold-deep">Bath Club member pricing is on.</span>{" "}
            Your membership price applies to every service, add-on, and treatment — automatically.
          </p>
        </div>
      )}

      <div className="mt-5 rounded-lg bg-neutral-50 p-4 sm:p-5">
        <p className={LABEL_CLS}>All services include</p>
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {INCLUDED_IN_EVERY_VISIT.map((item) => (
            <li key={item} className="flex items-center gap-2 text-[13px] text-ink">
              <CheckIcon className="h-4 w-4 shrink-0 text-gold-deep" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Premium Treatments — targeted upgrades, at most ONE per booking.
          Size-tiered from the tenant catalog; XL = custom quote (no online
          price — priced and confirmed at the salon). */}
      {menu.treatments.length > 0 && (
        <div className="mt-6">
          <p className={LABEL_CLS}>
            Premium Treatments{" "}
            <span className="font-normal normal-case tracking-normal text-neutral-400">
              (optional upgrade · select 1 max)
            </span>
          </p>
          <div role="radiogroup" aria-label="Premium treatment (optional, max one)" className="mt-3 space-y-3">
            {menu.treatments.map((t) => {
              const price = tier ? t.prices[tier] : null
              const memberPrice = tier ? t.memberPrices?.[tier] ?? null : null
              const selected = flow.treatmentId === t.id
              const customQuote = price == null
              return (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-lg border bg-white p-4 transition-colors sm:p-5",
                    selected ? "border-gold-deep bg-amber-50/40" : "border-neutral-200",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${t.name}${customQuote ? " — custom quote" : ""}`}
                      onClick={() => flow.patch({ treatmentId: selected ? "" : t.id })}
                      className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    >
                      <RadioCircle selected={selected} />
                      <span className="min-w-0 flex-1">
                        <span className="type-body block text-[15px] font-bold text-ink">{t.name}</span>
                        {!customQuote && (
                          <MemberSavingsBadge
                            priceCents={price}
                            memberPriceCents={memberPrice}
                            className="mt-1.5"
                          />
                        )}
                      </span>
                      <ServicePrice
                        priceCents={price}
                        memberPriceCents={memberPrice}
                        isMember={menu.isMember}
                        customQuote={customQuote}
                      />
                    </button>
                  </div>
                  {t.note && (
                    <p className="mt-2.5 border-t border-neutral-100 pt-2.5 text-[12px] leading-relaxed text-neutral-500">
                      {t.note}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Groomer's tip — the salon's walk-in nail service. */}
      <div className="mt-5 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">Groomer’s tip</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
          Nails clicking on the floor? Walk into any salon for nail trim services without an
          appointment! <span className="text-neutral-400">Subject to salon availability.</span>
        </p>
      </div>

      <div className="mt-6">
        <p className={LABEL_CLS}>
          Add-ons <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {menu.addons.map((a) => {
            const selected = flow.addonIds.includes(a.id)
            const displayCents =
              menu.isMember && a.memberPriceCents != null ? a.memberPriceCents : a.priceCents
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={selected}
                onClick={() => flow.toggleAddon(a.id)}
                className={cn(
                  "flex min-h-[44px] items-center gap-2.5 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors",
                  selected
                    ? "border-gold-deep bg-amber-50/40 text-ink"
                    : "border-neutral-300 bg-white text-ink enabled:hover:border-neutral-400",
                )}
              >
                <CheckSquare selected={selected} />
                {a.name}
                <span
                  className={cn(
                    "text-[12px] font-bold tabular-nums",
                    selected ? "text-gold-deep" : "text-neutral-400",
                  )}
                >
                  +{fmt(displayCents)}
                  {menu.isMember && a.memberPriceCents != null && a.memberPriceCents < a.priceCents && (
                    <span className="ml-1 font-normal text-neutral-400 line-through">{fmt(a.priceCents)}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cart — inline card on desktop */}
      {cart && (
        <div className="mt-6 hidden lg:block">
          <CartSummaryCard cart={cart} menu={menu} pawRange={pawRange} />
        </div>
      )}

      <StepActions onPrev={() => flow.setStep(1)} onNext={() => flow.setStep(3)} nextLabel="Continue" nextDisabled={!cart}>
        {/* Cart — compact sticky line on mobile */}
        {cart && (
          <div className="mb-3 flex items-baseline justify-between lg:hidden">
            <p className="type-body truncate text-[12.5px] font-semibold text-ink">
              {cart.pkg.name}
              {cart.treatment ? ` · ${cart.treatment.name}` : ""}
              {cart.addons.length > 0 ? ` · +${cart.addons.length} add-on${cart.addons.length > 1 ? "s" : ""}` : ""}
            </p>
            <p className="type-body shrink-0 pl-3 text-[16px] font-bold tabular-nums text-ink">{fmt(cart.total)}</p>
          </div>
        )}
      </StepActions>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Time: salon card, the big calendar, morning/afternoon slots.
// ---------------------------------------------------------------------------
function StepTime({
  flow,
  menu,
  requestReview,
}: {
  flow: FlowStore
  menu: MenuData | null
  requestReview: () => void
}) {
  const [slots, setSlots] = useState<string[]>([])
  // `loadingSlots` is DERIVED (date vs resolvedDate) — never set
  // synchronously inside the effect (React 19 rule).
  const [resolvedDate, setResolvedDate] = useState("")
  const loadingSlots = !!flow.date && flow.date !== resolvedDate

  useEffect(() => {
    if (!flow.date) return
    let alive = true
    fetch(`/api/availability?date=${flow.date}&duration=120`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        setSlots(Array.isArray(d?.times) ? d.times : [])
        setResolvedDate(flow.date)
        if (d?.closed && useBookingFlow.getState().time) useBookingFlow.getState().patch({ time: "" })
      })
      .catch(() => {
        if (alive) {
          setSlots([])
          setResolvedDate(flow.date)
        }
      })
    return () => {
      alive = false
    }
  }, [flow.date])

  const morning = (slots || []).filter((t) => /AM$/i.test(t))
  const afternoon = (slots || []).filter((t) => /PM$/i.test(t))
  const noSlots = !!flow.date && flow.date === resolvedDate && slots.length === 0

  // The collapsible sections (reference design): Morning starts expanded,
  // Afternoon collapsed; the section holding the SELECTED time is always
  // open (you can never collapse away your own selection). Pure derivation —
  // no state-sync effect.
  const [collapsed, setCollapsed] = useState<Record<"morning" | "afternoon", boolean>>({
    morning: false,
    afternoon: true,
  })
  const openSections = {
    morning: !collapsed.morning || /AM$/i.test(flow.time),
    afternoon: !collapsed.afternoon || /PM$/i.test(flow.time),
  }
  const toggleSection = (k: "morning" | "afternoon") =>
    setCollapsed((prev) => ({ ...prev, [k]: !prev[k] }))

  const salon = menu?.salon
  const phone = salon?.phone || "(901) 722-1114"
  const telHref = `tel:${phone.replace(/[^\d+]/g, "")}`

  // Picking a day resets the slot AND the vaccination acknowledgment —
  // the proof rule is tied to the appointment date.
  const pickDay = (iso: string) => {
    if (iso === flow.date) return
    flow.patch({ date: iso, time: "", vaccinationAcknowledged: false })
  }

  // The right panel's date headline — "Wednesday, October 7th".
  const dateHeadline = flow.date
    ? new Date(`${flow.date}T00:00:00`).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : ""

  return (
    <section aria-labelledby="time-heading">
      <StepHeading
        id="time-heading"
        title="Select your time"
        sub="Pick a day, then a morning or afternoon time. We’re closed Mondays."
      />

      <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
        <p className="text-[13.5px] leading-relaxed text-ink">
          <strong className="font-bold">
            {salon?.name || "All About Pawz"}
          </strong>{" "}
          — {salon?.address || "699 Waring Rd"}, {salon?.cityState || "Memphis, TN 38122"} ·{" "}
          <a href={telHref} className="font-semibold text-gold-deep hover:underline">
            {phone}
          </a>
        </p>
      </div>

      {/* CALENDAR LEFT · TIMES RIGHT (the reference layout — side by side on
          desktop, the two panels fill the page's white space; no endless
          scrolling, the accordions collapse and open). Mobile stacks them. */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        {/* LEFT — the month calendar + legend */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
          <MonthCalendar selectedISO={flow.date} onSelect={pickDay} />
          <div className="mt-4 flex items-center gap-5 border-t border-neutral-100 pt-3 text-[11px] font-semibold text-neutral-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-ink" aria-hidden="true" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border border-neutral-300 bg-white" aria-hidden="true" />
              Closed (Mondays)
            </span>
          </div>
        </div>

        {/* RIGHT — available times for the picked day */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5 lg:sticky lg:top-4">
          {!flow.date ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-center">
              <CalendarIcon className="h-8 w-8 text-neutral-300" aria-hidden="true" />
              <p className="text-[13.5px] font-semibold text-ink">Pick a day to see times</p>
              <p className="max-w-[240px] text-[12.5px] leading-relaxed text-neutral-400">
                Choose a date on the calendar — morning and afternoon times open up right here.
              </p>
            </div>
          ) : (
            <>
              <p className="type-body text-[17px] font-bold leading-snug text-ink" aria-live="polite">
                {dateHeadline}
              </p>

              {loadingSlots ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : noSlots ? (
                <div className="mt-4 rounded-lg border border-gold/40 bg-amber-50/60 p-4 text-[13.5px] text-ink">
                  That day is fully booked — pick another day on the calendar.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <TimeAccordion
                    icon={<SunriseIcon className="h-5 w-5" aria-hidden="true" />}
                    title="Morning"
                    count={morning.length}
                    open={openSections.morning}
                    onToggle={() => toggleSection("morning")}
                    times={morning}
                    selected={flow.time}
                    onPick={(t) => flow.patch({ time: t })}
                  />
                  <TimeAccordion
                    icon={<SunIcon className="h-5 w-5" aria-hidden="true" />}
                    title="Afternoon"
                    count={afternoon.length}
                    open={openSections.afternoon}
                    onToggle={() => toggleSection("afternoon")}
                    times={afternoon}
                    selected={flow.time}
                    onPick={(t) => flow.patch({ time: t })}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <StepActions
        onPrev={() => flow.setStep(2)}
        onNext={requestReview}
        nextLabel="Continue"
        nextDisabled={!flow.date || !flow.time}
      />
    </section>
  )
}

// A collapsible Morning/Afternoon section (the reference design): header row
// with icon + title + "N available" + chevron; expanded shows the slot chips
// WRAPPED — never an inner scroll region.
function TimeAccordion({
  icon,
  title,
  count,
  open,
  onToggle,
  times,
  selected,
  onPick,
}: {
  icon: React.ReactNode
  title: string
  count: number
  open: boolean
  onToggle: () => void
  times: string[]
  selected: string
  onPick: (t: string) => void
}) {
  const panelId = `slots-${title.toLowerCase()}`
  const disabled = count === 0
  return (
    <div className={cn("rounded-lg border transition-colors", open ? "border-neutral-300" : "border-neutral-200")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={open && !disabled}
        aria-controls={panelId}
        className={cn(
          "flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          disabled ? "cursor-not-allowed opacity-60" : "hover:bg-neutral-50",
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink">
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-[14.5px] font-bold text-ink">{title}</span>
          <span className="block text-[12px] font-semibold text-emerald-600">
            {disabled ? `No ${title.toLowerCase()} times` : `${count} available`}
          </span>
        </span>
        <ChevronDownIcon
          className={cn("h-4 w-4 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {open && !disabled && (
        <div id={panelId} className="flex flex-wrap gap-2 border-t border-neutral-100 px-4 py-3.5">
          {times.map((t) => {
            const active = selected === t
            return (
              <button
                key={t}
                type="button"
                aria-pressed={active}
                onClick={() => onPick(t)}
                className={cn(
                  "flex min-h-[44px] items-center rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors",
                  active
                    ? "border-ink bg-ink text-cream"
                    : "border-neutral-300 bg-white text-ink enabled:hover:border-neutral-400",
                )}
              >
                {t}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// The big calendar — a real month grid, 44px day cells, Monday + past days
// disabled, selectable window: today … +3 months.
function MonthCalendar({ selectedISO, onSelect }: { selectedISO: string; onSelect: (iso: string) => void }) {
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const minMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])
  const maxMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth() + 3, 1), [today])

  const [view, setView] = useState(() => {
    if (selectedISO) {
      const d = new Date(`${selectedISO}T00:00:00`)
      if (!Number.isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() }
    }
    return { y: minMonth.getFullYear(), m: minMonth.getMonth() }
  })

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const firstWeekday = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (number | null)[] = [...Array<null>(firstWeekday), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  const isoOf = (day: number) => `${view.y}-${String(view.m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const canPrev = view.y > minMonth.getFullYear() || view.m > minMonth.getMonth()
  const canNext = view.y < maxMonth.getFullYear() || view.m < maxMonth.getMonth()

  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  return (
    <div className="min-w-0" role="group" aria-label={`Appointment calendar, ${monthLabel}`}>
      <div className="flex items-center justify-between px-1 pb-4">
        <p className="type-body text-[16px] font-bold text-ink">{monthLabel}</p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}
            disabled={!canPrev}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-ink transition-colors enabled:hover:border-ink disabled:opacity-30"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}
            disabled={!canNext}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-ink transition-colors enabled:hover:border-ink disabled:opacity-30"
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 justify-items-center gap-y-1">
        {weekDays.map((d) => (
          <div
            key={d}
            className="flex h-11 w-11 items-center justify-center text-[11px] font-bold uppercase tracking-wide text-neutral-400"
            aria-hidden="true"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <span key={`empty-${i}`} className="h-11 w-11" aria-hidden="true" />
          const date = new Date(view.y, view.m, day)
          const isMonday = date.getDay() === 1
          const isPast = date < today
          const isToday = date.getTime() === today.getTime()
          const disabled = isPast || isMonday
          const selected = selectedISO === isoOf(day)
          const ariaLabel = `${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${isMonday ? ", closed" : ""}`
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={ariaLabel}
              onClick={() => onSelect(isoOf(day))}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold transition-colors",
                selected
                  ? "bg-ink text-cream"
                  : disabled
                    ? "cursor-not-allowed text-neutral-300"
                    : "text-ink enabled:hover:bg-neutral-100",
                isToday && !selected && "ring-1 ring-gold-deep",
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// The vaccination gate — blocking modal between TIME and REVIEW.
// ---------------------------------------------------------------------------
function VaccinationGate({
  open,
  petName,
  onAcknowledge,
  onChangeDate,
}: {
  open: boolean
  petName: string
  onAcknowledge: () => void
  onChangeDate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) return }}>
      <DialogContent
        showCloseButton={false}
        className="type-body w-[calc(100vw-2rem)] max-w-md bg-white"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-left text-[19px] font-bold leading-snug text-ink">
            We require proof of current vaccination(s) for {petName || "your dog"}.
          </DialogTitle>
          <DialogDescription className="sr-only">
            Vaccination requirements for grooming appointments.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          <li className="flex gap-2.5">
            <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <p className="text-[13.5px] leading-relaxed text-ink">
              Dogs over 16 weeks of age must have a current rabies vaccination — the rabies tag alone is not proof.
            </p>
          </li>
          <li className="flex gap-2.5">
            <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <p className="text-[13.5px] leading-relaxed text-ink">
              Vaccines must be given at least 24 hours before the appointment.
            </p>
          </li>
          <li className="flex gap-2.5">
            <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <p className="text-[13.5px] leading-relaxed text-ink">Please bring proof of vaccination to your appointment.</p>
          </li>
        </ul>
        <div className="mt-6 space-y-3">
          <PrimaryAction onClick={onAcknowledge}>I will bring vaccination proof</PrimaryAction>
          <SecondaryAction onClick={onChangeDate}>Change Appointment Date</SecondaryAction>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Review: summary cards, price breakdown, payment choice, book.
// ---------------------------------------------------------------------------
function StepReview({
  flow,
  menu,
  cart,
  session,
  pawRange,
  initialPromoCode,
}: {
  flow: FlowStore
  menu: MenuData | null
  cart: Cart | null
  session: SessionUser
  pawRange: string
  initialPromoCode?: string | null
}) {
  const [payMode, setPayMode] = useState<PayMode>(flow.payMode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [needSignin, setNeedSignin] = useState(false)

  // ---- the promo (one code, server-validated) ----
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null)

  // ---- the perks points redemption ----
  const [pointsBalance, setPointsBalance] = useState<number | null>(null)
  const [pointsToRedeem, setPointsToRedeem] = useState("")
  const pointsPerDollar = menu?.perks?.pointsPerDollar ?? 100

  useEffect(() => {
    if (!session) {
      setPointsBalance(null)
      return
    }
    let alive = true
    fetch("/api/perks/balance", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.points === "number") setPointsBalance(d.points)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [session])

  // Recompute the redeemable points when the promo changes (the cap is the
  // post-promo subtotal).
  const promoDiscount = appliedPromo?.discountCents ?? 0
  const subtotalAfterPromo = cart ? Math.max(0, cart.subtotal - promoDiscount) : 0
  const maxRedeemablePoints =
    pointsBalance != null ? Math.floor(subtotalAfterPromo / 100 * pointsPerDollar) : 0
  const parsedPoints = parseInt(pointsToRedeem, 10)
  const validPoints =
    Number.isFinite(parsedPoints) && parsedPoints > 0 && pointsBalance != null
      ? Math.min(parsedPoints, pointsBalance, Math.max(0, maxRedeemablePoints))
      : 0
  const pointsDiscountCents = Math.floor((validPoints / pointsPerDollar) * 100)

  const pickPayMode = (m: PayMode) => {
    setPayMode(m)
    flow.patch({ payMode: m })
  }

  const depositCents = menu?.depositCents || 2500

  const book = async () => {
    setError("")
    setNeedSignin(false)
    setBusy(true)
    try {
      const res = await fetch("/api/bookings/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dogId: flow.dogId,
          dogName: flow.dogName.trim(),
          breedId: flow.breedId,
          breedName: flow.breedName,
          birthDate: flow.birthDate,
          weightLbs: flow.weightLbs,
          date: flow.date,
          time: flow.time,
          items: [
            ...(flow.packageId ? [{ id: flow.packageId, qty: 1 }] : []),
            ...(flow.treatmentId ? [{ id: flow.treatmentId, qty: 1 }] : []),
            ...flow.addonIds.map((id) => ({ id, qty: 1 })),
          ],
          payMode,
          notes: flow.notes,
          promoCode: appliedPromo?.code ?? "",
          pointsToRedeem: validPoints > 0 ? validPoints : 0,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 || data?.code === "NO_SESSION") {
        setNeedSignin(true)
        flow.setStep(0)
        return
      }
      if (res.status === 409 || data?.code === "SLOT_TAKEN") {
        setError(data?.error || "That time was just taken — pick another.")
        flow.setStep(3)
        return
      }
      if (res.status === 422 && (data?.code === "PROMO_REJECTED" || data?.code === "POINTS")) {
        setError(data?.error || "That promo no longer applies — remove it and try again.")
        if (data?.code === "PROMO_REJECTED") setAppliedPromo(null)
        if (data?.code === "POINTS") setPointsToRedeem("")
        return
      }
      if (!res.ok || !data?.url) {
        setError(data?.error || "Booking failed — please try again.")
        return
      }
      if (data.bookingId) flow.patch({ bookingId: data.bookingId, payMode })
      window.location.href = data.url
    } catch {
      setError("Network problem — please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="review-heading">
      <StepHeading
        id="review-heading"
        title="Review & Book"
        sub="One look, then book — anything wrong, tap Edit. Nothing is charged until you confirm."
      />

      {needSignin && (
        <NoticeBanner tone="warn">
          Your sign-in expired — sign back in (step 1) and your booking is still here.
        </NoticeBanner>
      )}
      {error && <NoticeBanner tone="error">{error}</NoticeBanner>}

      <div className="space-y-3">
        <SummaryCard
          label="Your Pet"
          value={`${flow.dogName} — ${flow.breedName || "Breed TBD"}${pawRange ? ` · ${pawRange}` : ""}`}
          onEdit={() => flow.setStep(1)}
        />
        <SummaryCard
          label="Grooming Service"
          value={
            cart
              ? cart.pkg.name
                + (cart.treatment ? ` · ${cart.treatment.name}` : "")
                + (cart.addons.length > 0 ? ` · +${cart.addons.length} add-on${cart.addons.length > 1 ? "s" : ""}` : "")
              : "No services selected"
          }
          onEdit={() => flow.setStep(2)}
        />
        <SummaryCard
          label="Your Time"
          value={flow.date ? `${dateLabel(flow.date)} at ${flow.time}` : "No time selected"}
          onEdit={() => flow.setStep(3)}
        />
      </div>

      {cart && menu && (
        <div className="mt-5">
          <CartSummaryCard
            cart={cart}
            menu={menu}
            pawRange={pawRange}
            appliedPromo={appliedPromo}
            pointsRedeemed={validPoints > 0 ? validPoints : undefined}
            pointsDiscount={validPoints > 0 ? pointsDiscountCents : undefined}
          />
        </div>
      )}

      {/* PROMO + PERKS — the offer rails. One code (server-validated),
          then points against what's left. The checkout recomputes both
          server-side; these are the previews. */}
      {cart && menu && (
        <div className="mt-5 space-y-5">
          <PromoCodeBox
            initialCode={initialPromoCode}
            context={{
              serviceIds: [
                ...(flow.packageId ? [flow.packageId] : []),
                ...(flow.treatmentId ? [flow.treatmentId] : []),
                ...flow.addonIds,
              ],
              subtotalCents: cart.subtotal,
              dogId: flow.dogId || null,
              dogBirthDate: flow.birthDate || null,
            }}
            onApplied={(p) => setAppliedPromo(p)}
            onRemoved={() => setAppliedPromo(null)}
          />

          {session && pointsBalance != null && pointsBalance >= pointsPerDollar && (
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className={LABEL_CLS}>Perks points</p>
                <p className="text-[12px] font-semibold text-neutral-500">
                  {pointsBalance.toLocaleString()} pts · {pointsPerDollar} pts = $1
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2.5">
                <input
                  id="points-input"
                  type="number"
                  min={0}
                  max={Math.min(pointsBalance, maxRedeemablePoints)}
                  inputMode="numeric"
                  value={pointsToRedeem}
                  onChange={(e) => setPointsToRedeem(e.target.value)}
                  disabled={maxRedeemablePoints < pointsPerDollar}
                  aria-label="Points to apply to this booking"
                  className="h-12 w-32 rounded-md border border-neutral-300 bg-white px-3.5 text-[14px] font-semibold tabular-nums text-ink outline-none transition-colors focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/30 disabled:opacity-40"
                />
                {maxRedeemablePoints >= pointsPerDollar && (
                  <button
                    type="button"
                    onClick={() =>
                      setPointsToRedeem(String(Math.min(pointsBalance, maxRedeemablePoints)))
                    }
                    className="h-12 rounded-md border border-neutral-300 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink hover:bg-neutral-50"
                  >
                    Use max
                  </button>
                )}
                <p className="min-w-0 flex-1 text-[12px] leading-snug text-neutral-500">
                  {validPoints > 0
                    ? `−${fmt(pointsDiscountCents)} off this booking`
                    : maxRedeemablePoints >= pointsPerDollar
                      ? `Up to ${maxRedeemablePoints.toLocaleString()} pts apply here.`
                      : "Not enough on this total to apply points."}{" "}
                  <a href="/customer/orders/perks" className="font-semibold text-gold-deep">
                    Perks Dashboard
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <p className={LABEL_CLS}>Payment</p>
        <div role="radiogroup" aria-label="Payment choice" className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            role="radio"
            aria-checked={payMode === "FULL"}
            onClick={() => pickPayMode("FULL")}
            className={cn(
              "flex w-full items-start gap-3.5 rounded-lg border p-4 text-left transition-colors",
              payMode === "FULL" ? "border-gold-deep bg-amber-50/40" : "border-neutral-200 bg-white enabled:hover:border-neutral-400",
            )}
          >
            <RadioCircle selected={payMode === "FULL"} />
            <span className="min-w-0">
              <span className="type-body block text-[14.5px] font-bold text-ink">
                Pay in full{cart && menu ? ` — ${fmt(finalTotal(cart, menu, appliedPromo, validPoints, pointsDiscountCents))}` : ""}
              </span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-neutral-500">
                Everything settled today, tax included. Nothing owed at the visit.
              </span>
            </span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={payMode === "DEPOSIT"}
            onClick={() => pickPayMode("DEPOSIT")}
            className={cn(
              "flex w-full items-start gap-3.5 rounded-lg border p-4 text-left transition-colors",
              payMode === "DEPOSIT" ? "border-gold-deep bg-amber-50/40" : "border-neutral-200 bg-white enabled:hover:border-neutral-400",
            )}
          >
            <RadioCircle selected={payMode === "DEPOSIT"} />
            <span className="min-w-0">
              <span className="type-body block text-[14.5px] font-bold text-ink">
                Hold with deposit — {fmt(depositCents)}
              </span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-neutral-500">
                Hold your slot today{cart ? ` — the remaining ${fmt(Math.max(0, cart.total - depositCents))}` : " — the rest"} is
                due at the salon.
              </span>
            </span>
          </button>
        </div>
      </div>

      <StepActions
        onPrev={() => flow.setStep(3)}
        onNext={book}
        nextLabel="Book Now"
        nextDisabled={!cart || !flow.date || !flow.time}
        busy={busy}
      />

      <p className="mt-4 text-center text-[12px] leading-relaxed text-neutral-500">
        By booking you agree to our{" "}
        <Link href="/policies/terms-of-service" className="font-semibold text-gold-deep hover:underline">
          Terms of Use
        </Link>{" "}
        and{" "}
        <Link href="/policies/privacy-policy" className="font-semibold text-gold-deep hover:underline">
          Privacy Policy
        </Link>
        .
        {session && (
          <>
            {" "}
            Booking as <span className="font-semibold text-ink">{session.email}</span>.
          </>
        )}
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Confirmation — verifies payment against Stripe, then hands over the keys.
// ---------------------------------------------------------------------------
function Confirmation({
  bookingId,
  salon,
  secondPetName,
  onBookSecondPet,
}: {
  bookingId: string
  salon: MenuData["salon"] | null
  secondPetName: string
  onBookSecondPet: () => void
}) {
  const [booking, setBooking] = useState<StatusBooking | null>(null)
  const [polling, setPolling] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const polls = useRef(0)

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const res = await fetch(`/api/bookings/status?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" })
        if (res.status === 401) {
          if (alive) {
            setPolling(false)
            setBooking(null)
          }
          return
        }
        const data = await res.json().catch(() => null)
        const b = data?.booking
        if (alive && b) {
          setBooking(b)
          if (b.signal !== "pending" || polls.current > 5) setPolling(false)
        }
      } catch {
        /* keep polling */
      }
      polls.current += 1
    }
    check()
    const timer = setInterval(() => {
      if (polls.current > 8) {
        clearInterval(timer)
        setPolling(false)
        return
      }
      check()
    }, 3000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [bookingId])

  if (!booking && polling) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-lg border border-neutral-200 bg-white p-10 text-center">
        <SpinnerIcon className="h-7 w-7 animate-spin text-gold-deep" aria-hidden="true" />
        <div>
          <h2 className="type-body text-[22px] font-bold text-ink">Verifying your payment…</h2>
          <p className="mt-2 text-[13.5px] text-neutral-500">This usually takes a moment. Leave this page open.</p>
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <h2 className="type-body text-[22px] font-bold text-ink">Your booking is saved.</h2>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-neutral-500">
          We couldn’t verify the payment from this browser — sign in to your portal to see its live status and manage it.
        </p>
        <Link
          href="/customer/appointments"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-ink px-8 text-[13px] font-bold uppercase tracking-[0.08em] text-cream transition-colors hover:bg-gold-deep"
        >
          Manage my appointments
        </Link>
      </div>
    )
  }

  const confirmed = booking.signal === "booked" || booking.signal === "paid"
  const when = dateLabel(booking.date)
  const addons = (booking.items || []).slice(1).map((it) => it.name)
  const phone = salon?.phone || "(901) 722-1114"
  const balance = booking.balanceDue ? parseFloat(booking.balanceDue.replace(/[^0-9.]/g, "")) : 0

  // Add-to-calendar targets — the SAME event (UTC math in lib/booking/ics)
  // the confirmation email carries as an .ics attachment. Computed inline
  // (after the early returns) — cheap, and hook order stays stable.
  const names = (booking.items || []).map((it) => it.name).filter(Boolean)
  const calendarLinks = (() => {
    const input = {
      bookingId: booking.id,
      dogName: booking.dogName,
      serviceNames: names.length > 0 ? names : [booking.service || "Grooming"],
      date: booking.date,
      time: booking.time,
      durationMinutes: 120,
      totalDisplay: booking.total,
    }
    return {
      google: googleCalendarUrl(input),
      outlook: outlookCalendarUrl(input),
      ics: `/api/bookings/ics?bookingId=${encodeURIComponent(booking.id)}`,
    }
  })()

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-7">
        <span
          className={cn(
            "type-body inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em]",
            confirmed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gold/40 bg-amber-50/60 text-gold-deep",
          )}
        >
          {confirmed ? (
            <>
              <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> Confirmed
            </>
          ) : (
            <>
              <SpinnerIcon className={cn("h-3.5 w-3.5", polling && "animate-spin")} aria-hidden="true" /> Pending
            </>
          )}
        </span>

        <h2 className="type-body mt-3 text-[26px] font-bold leading-tight text-ink">
          {confirmed ? "Grooming Appointment Booked!" : "Payment is processing…"}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
          {booking.dogName}’s {String(booking.service || "grooming").toLowerCase()} is set for{" "}
          <strong className="font-semibold text-ink">
            {when} at {booking.time}
          </strong>
          . {confirmed ? "A confirmation email is on its way." : "This page updates the second it clears."}
        </p>

        {/* Appointment details */}
        <div className="mt-6 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
          <DetailRow
            icon={<CalendarIcon className="h-4.5 w-4.5" aria-hidden="true" />}
            label="Date & Time"
            value={`${when} · ${booking.time}`}
          />
          <DetailRow
            icon={<ScissorsIcon className="h-4.5 w-4.5" aria-hidden="true" />}
            label="Service"
            value={booking.service + (addons.length > 0 ? ` + ${addons.join(", ")}` : "")}
          />
          <DetailRow
            icon={<MapPinIcon className="h-4.5 w-4.5" aria-hidden="true" />}
            label="Salon"
            value={`${salon?.name || "All About Pawz"} — ${salon?.address || "699 Waring Rd"}, ${salon?.cityState || "Memphis, TN 38122"} · ${phone}`}
          />
          {/* Add to calendar — the same event the confirmation email carries
              as an .ics attachment (Google | iCal | Outlook). */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-4 py-3 text-[12.5px]">
            <span className="font-semibold text-neutral-500">Add to calendar:</span>
            {[
              { label: "Google", href: calendarLinks.google },
              { label: "iCal", href: calendarLinks.ics },
              { label: "Outlook", href: calendarLinks.outlook },
            ]
              .filter((l) => !!l.href)
              .map((l, i) => (
                <span key={l.label} className="flex items-center gap-2">
                  {i > 0 && <span className="text-neutral-300" aria-hidden="true">|</span>}
                  <a
                    href={l.href}
                    className="font-semibold text-gold-deep hover:underline"
                    {...(l.href.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                  >
                    {l.label}
                  </a>
                </span>
              ))}
          </div>
        </div>

        {/* Payment status */}
        <div className="mt-5 rounded-lg bg-neutral-50 p-4 sm:p-5">
          <div className="space-y-2 text-[13px]">
            {(booking.items || []).map((it, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-ink">
                  {it.name}
                  {it.qty > 1 ? ` ×${it.qty}` : ""}
                </span>
                {typeof it.lineCents === "number" && (
                  <span className="tabular-nums text-neutral-600">{fmt(it.lineCents)}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-neutral-200 pt-3 text-[13px]">
            {booking.subtotal && (
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{booking.subtotal}</span>
              </div>
            )}
            {booking.tax && (
              <div className="flex justify-between text-neutral-500">
                <span>Tax</span>
                <span className="tabular-nums">{booking.tax}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-[16px] font-bold text-ink">
              <span>Total</span>
              <span className="tabular-nums">{booking.total}</span>
            </div>
            {booking.paid && (
              <div className="flex justify-between text-[13px] font-semibold text-gold-deep">
                <span>Paid now</span>
                <span className="tabular-nums">{booking.paid}</span>
              </div>
            )}
            {balance > 0 && (
              <div className="flex justify-between text-[13px] text-neutral-500">
                <span>Balance due at the salon</span>
                <span className="tabular-nums">{booking.balanceDue}</span>
              </div>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/customer/appointments"
            className="flex h-12 items-center justify-center rounded-md bg-ink text-[13px] font-bold uppercase tracking-[0.08em] text-cream transition-colors hover:bg-gold-deep"
          >
            Manage my appointments
          </Link>
          <SecondaryAction onClick={() => setWizardOpen(true)} disabled={booking.questionnaireComplete}>
            {booking.questionnaireComplete ? "Pre check-in complete" : "Complete Pre Check-In"}
          </SecondaryAction>
        </div>

        {booking.questionnaireComplete && (
          <p className="mt-4 rounded-md border border-gold/30 bg-amber-50/50 p-3 text-center text-[12.5px] text-ink">
            Thank you — your pre check-in is in. We’ll be ready for {booking.dogName}.
          </p>
        )}

        {secondPetName && (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-gold/40 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13.5px] leading-relaxed text-ink">
              You have another appointment to book for <strong className="font-bold">{secondPetName}</strong>.
            </p>
            <button
              type="button"
              onClick={onBookSecondPet}
              className="inline-flex min-h-[44px] shrink-0 items-center text-[12px] font-bold uppercase tracking-[0.08em] text-gold-deep hover:underline"
            >
              Book {secondPetName} now
            </button>
          </div>
        )}
      </div>

      {wizardOpen && (
        <PreCheckInWizard
          bookingId={bookingId}
          petName={booking.dogName}
          onClose={() => setWizardOpen(false)}
          onSaved={() => {
            setBooking({ ...booking, questionnaireComplete: true })
            setWizardOpen(false)
          }}
        />
      )}
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3.5 p-4">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</p>
        <p className="type-body mt-0.5 text-[14px] font-semibold leading-relaxed text-ink">{value}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pre Check-In — the 5-step safety wizard (spec §9), in a modal.
// Posts the SAME answers shape the server already accepts.
// ---------------------------------------------------------------------------
const WIZARD_LABELS = ["Matting", "Health", "Needs", "Behavior", "Contact"]

function PreCheckInWizard({
  bookingId,
  petName,
  onClose,
  onSaved,
}: {
  bookingId: string
  petName: string
  onClose: () => void
  onSaved: () => void
}) {
  const [step, setStep] = useState(0) // 0-4 steps + 5 = disclosures
  const [matted, setMatted] = useState<"" | "yes" | "no">("")
  const [health, setHealth] = useState<string[]>([])
  const [noHealth, setNoHealth] = useState(false)
  const [healthOther, setHealthOther] = useState("")
  const [needs, setNeeds] = useState<string[]>([])
  const [needsNotes, setNeedsNotes] = useState("")
  const [behavior, setBehavior] = useState<string[]>([])
  const [behaviorOther, setBehaviorOther] = useState("")
  const [ecName, setEcName] = useState("")
  const [ecPhone, setEcPhone] = useState("")
  const [vetName, setVetName] = useState("")
  const [vetPhone, setVetPhone] = useState("")
  const [authorize, setAuthorize] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const toggleFrom = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  }

  const phoneOk = ecPhone.replace(/\D/g, "").length >= 7
  const valid =
    step === 0
      ? matted !== ""
      : step === 1
        ? noHealth || health.length > 0
        : step === 2 || step === 3
          ? true
          : step === 4
            ? ecName.trim().length > 0 && phoneOk
            : authorize

  const submit = async () => {
    setError("")
    if (!authorize) {
      setError("Please accept the disclosures to complete pre check-in.")
      return
    }
    setBusy(true)
    try {
      // The exact answers shape the questionnaire endpoint has always
      // received — the wizard's answers mapped into it.
      const answers = {
        vaccinationsCurrent: "yes",
        sameDayShots: "no",
        muzzle: behavior.includes("Aggression") ? "yes" : "no",
        sedation: "",
        healthNotes: [
          matted === "yes" ? "Will be matted on the day of service" : matted === "no" ? "Not matted" : "",
          noHealth ? `${petName} has no known health issues` : health.filter((h) => h !== "Other (please specify)").join(", "),
          health.includes("Other (please specify)") && healthOther.trim() ? `Other: ${healthOther.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        groomingGoals: [...needs, needsNotes.trim()].filter(Boolean).join(" · "),
        behaviorNotes: [...behavior, behaviorOther.trim()].filter(Boolean).join(" · "),
        emergencyName: ecName.trim(),
        emergencyPhone: ecPhone.trim(),
        vetName: vetName.trim(),
        vetPhone: vetPhone.trim(),
        authorize,
      }
      const res = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "questionnaire", bookingId, answers }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || "Could not save — please try again.")
        return
      }
      onSaved()
    } catch {
      setError("Network problem — please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="type-body max-h-[92vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-left text-[20px] font-bold leading-snug text-ink">Pre Check-In</DialogTitle>
          <DialogDescription className="text-left text-[13px] leading-relaxed text-neutral-500">
            A few safety questions for {petName}’s stylist — takes about two minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <Stepper labels={WIZARD_LABELS} step={step} onStepSelect={setStep} />
        </div>

        <div className="mt-6">
          {step === 0 && (
            <div>
              <p className="type-body text-[16px] font-bold leading-snug text-ink">
                On the day of the service will {petName} be matted?
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Will your pet be matted">
                {(["yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={matted === v}
                    onClick={() => setMatted(v)}
                    className={cn(
                      "flex min-h-[64px] items-center gap-3 rounded-lg border p-4 transition-colors",
                      matted === v ? "border-gold-deep bg-amber-50/40" : "border-neutral-200 bg-white enabled:hover:border-neutral-400",
                    )}
                  >
                    <RadioCircle selected={matted === v} />
                    <span className="type-body text-[15px] font-bold text-ink">{v === "yes" ? "Yes" : "No"}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-neutral-500">
                If yes, we will remove mats by shaving or brushing.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="type-body text-[16px] font-bold leading-snug text-ink">
                Does {petName} have any known health issues? Please select those that apply.
              </p>
              <div className="mt-4 space-y-2.5">
                {HEALTH_OPTIONS.map((h) => (
                  <CheckRow
                    key={h}
                    checked={health.includes(h)}
                    onToggle={() => {
                      if (noHealth) setNoHealth(false)
                      toggleFrom(health, setHealth, h)
                    }}
                  >
                    {h}
                  </CheckRow>
                ))}
                {health.includes("Other (please specify)") && (
                  <input
                    value={healthOther}
                    onChange={(e) => setHealthOther(e.target.value)}
                    placeholder="Please specify"
                    aria-label="Other health issues"
                    className={INPUT_CLS}
                  />
                )}
                <CheckRow
                  checked={noHealth}
                  onToggle={() => {
                    setNoHealth(!noHealth)
                    if (!noHealth) setHealth([])
                  }}
                  bold
                >
                  {petName} has no known health issues
                </CheckRow>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="type-body text-[16px] font-bold leading-snug text-ink">
                What are {petName}’s top grooming needs? <span className="font-normal text-neutral-400">(Optional)</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {NEEDS_OPTIONS.map((n) => {
                  const active = needs.includes(n)
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleFrom(needs, setNeeds, n)}
                      className={cn(
                        "flex min-h-[44px] items-center gap-2.5 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors",
                        active ? "border-gold-deep bg-amber-50/40 text-ink" : "border-neutral-300 bg-white text-ink enabled:hover:border-neutral-400",
                      )}
                    >
                      <CheckSquare selected={active} />
                      {n}
                    </button>
                  )
                })}
              </div>
              <label htmlFor="needs-notes" className={cn(LABEL_CLS, "mt-5")}>
                Anything else our stylists should know for {petName}’s safety and health?
              </label>
              <textarea
                id="needs-notes"
                value={needsNotes}
                onChange={(e) => setNeedsNotes(e.target.value)}
                rows={3}
                className={cn(TEXTAREA_CLS, "mt-2")}
              />
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="type-body text-[16px] font-bold leading-snug text-ink">
                Does {petName} display any behavioral conditions towards other animals or humans?{" "}
                <span className="font-normal text-neutral-400">(Optional)</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {BEHAVIOR_OPTIONS.map((b) => {
                  const active = behavior.includes(b)
                  return (
                    <button
                      key={b}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleFrom(behavior, setBehavior, b)}
                      className={cn(
                        "flex min-h-[44px] items-center gap-2.5 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition-colors",
                        active ? "border-gold-deep bg-amber-50/40 text-ink" : "border-neutral-300 bg-white text-ink enabled:hover:border-neutral-400",
                      )}
                    >
                      <CheckSquare selected={active} />
                      {b}
                    </button>
                  )
                })}
              </div>
              <label htmlFor="behavior-notes" className={cn(LABEL_CLS, "mt-5")}>
                Other (please specify)
              </label>
              <textarea
                id="behavior-notes"
                value={behaviorOther}
                onChange={(e) => setBehaviorOther(e.target.value)}
                rows={2}
                className={cn(TEXTAREA_CLS, "mt-2")}
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <p className="type-body text-[16px] font-bold leading-snug text-ink">
                In case of emergency, please provide contact name and phone number.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="ec-name" className={LABEL_CLS}>
                    Contact Name <span className="text-gold-deep">*</span>
                  </label>
                  <input
                    id="ec-name"
                    value={ecName}
                    onChange={(e) => setEcName(e.target.value)}
                    className={cn(INPUT_CLS, "mt-2")}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="ec-phone" className={LABEL_CLS}>
                    Phone <span className="text-gold-deep">*</span>
                  </label>
                  <input
                    id="ec-phone"
                    type="tel"
                    value={ecPhone}
                    onChange={(e) => setEcPhone(e.target.value)}
                    placeholder="(901) 555-0100"
                    className={cn(INPUT_CLS, "mt-2")}
                    autoComplete="tel"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="vet-name" className={LABEL_CLS}>
                      Vet Name <span className="font-normal normal-case tracking-normal text-neutral-400">(optional)</span>
                    </label>
                    <input
                      id="vet-name"
                      value={vetName}
                      onChange={(e) => setVetName(e.target.value)}
                      className={cn(INPUT_CLS, "mt-2")}
                    />
                  </div>
                  <div>
                    <label htmlFor="vet-phone" className={LABEL_CLS}>
                      Vet Phone
                    </label>
                    <input
                      id="vet-phone"
                      type="tel"
                      value={vetPhone}
                      onChange={(e) => setVetPhone(e.target.value)}
                      placeholder="(901) 555-0100"
                      className={cn(INPUT_CLS, "mt-2")}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <p className="type-body text-[16px] font-bold leading-snug text-ink">IMPORTANT! Please read and accept the disclosures.</p>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border border-neutral-200 bg-white p-4">
                <input
                  type="checkbox"
                  checked={authorize}
                  onChange={(e) => setAuthorize(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-gold-deep"
                />
                <span className="text-[13.5px] leading-relaxed text-ink">
                  I authorize All About Pawz to seek medical attention for my pet during the grooming appointment in case
                  of an emergency. I will not hold All About Pawz responsible for any pre-existing health problems my
                  pet might have.
                </span>
              </label>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 text-[13px] font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {step > 0 && (
            <SecondaryAction onClick={() => setStep((s) => s - 1)} className="sm:w-auto sm:flex-none sm:px-8">
              Previous
            </SecondaryAction>
          )}
          {step < 5 ? (
            <PrimaryAction onClick={() => setStep((s) => s + 1)} disabled={!valid} className="flex-1">
              Next
            </PrimaryAction>
          ) : (
            <PrimaryAction onClick={submit} disabled={!authorize || busy} className="flex-1">
              {busy && <SpinnerIcon className="h-4 w-4 animate-spin" />}
              Complete Pre Check-In
            </PrimaryAction>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
