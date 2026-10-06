"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// ---------------------------------------------------------------------------
// Booking Flow Store — the 5-step flow's single source of truth.
//
//   Step 0 — Sign in   (session lives in cookies, not here)
//   Step 1 — Your pup  (name, breed, birthday, size by pounds)
//   Step 2 — Services  (one package + add-ons — the cart)
//   Step 3 — Time      (date + slot)
//   Step 4 — Review    (pay in full or deposit → checkout)
//
// Persisted to localStorage so the customer can step away — sign-in email
// link round trips included — and land right back where they left off.
// Result IDs (bookingId) are written back so the confirmation panel can
// verify payment without any client-side guesswork.
// ---------------------------------------------------------------------------

export type PayMode = "FULL" | "DEPOSIT"

export type SizeTier = "SMALL" | "MEDIUM" | "LARGE" | "XLARGE"

export type FlowState = {
  step: number
  /** The furthest step this visitor has REACHED (ratchets up, never down).
   *  The stepper offers one-click travel to any step ≤ maxStep — you can
   *  always get back to where you were without re-clicking CONTINUE. */
  maxStep: number

  // ---- step 0: auth (the session itself lives in cookies) ----
  signupEmail: string
  signupSent: boolean

  // ---- step 1: the pet ----
  dogId: string | null
  dogName: string
  breedId: string
  breedName: string
  birthDate: string // YYYY-MM-DD
  weightLbs: string // the pounds menu value ("10", "30", …)

  // ---- step 2: the cart ----
  packageId: string
  addonIds: string[]

  // ---- step 3: the slot ----
  date: string // YYYY-MM-DD
  time: string // "9:30 AM"

  // ---- step 4: payment ----
  payMode: PayMode
  notes: string

  // ---- the vaccination gate (TIME → REVIEW) ----
  // Must be explicitly acknowledged before Review renders; re-acknowledged
  // whenever the appointment date changes.
  vaccinationAcknowledged: boolean

  // ---- the second-pet pattern (spec §2) ----
  // BOOK A SECOND PET persists a new pet to the registry mid-flow; after the
  // first dog's appointment is booked, the confirmation offers to restart the
  // flow at the PET step with this pet pre-selected.
  secondPetId: string | null
  secondPetName: string

  // ---- post-checkout ----
  bookingId: string | null

  // actions
  patch: (p: Partial<FlowState>) => void
  setStep: (s: number) => void
  toggleAddon: (id: string) => void
  reset: () => void
}

const INITIAL: Omit<FlowState, "patch" | "setStep" | "toggleAddon" | "reset"> = {
  step: 0,
  maxStep: 0,
  signupEmail: "",
  signupSent: false,
  dogId: null,
  dogName: "",
  breedId: "",
  breedName: "",
  birthDate: "",
  weightLbs: "",
  packageId: "",
  addonIds: [],
  date: "",
  time: "",
  payMode: "DEPOSIT",
  notes: "",
  vaccinationAcknowledged: false,
  secondPetId: null,
  secondPetName: "",
  bookingId: null,
}

export const useBookingFlow = create<FlowState>()(
  persist(
    (set) => ({
      ...INITIAL,
      patch: (p) =>
        set((s) => {
          const next = { ...s, ...p }
          return {
            ...p,
            maxStep: Math.max(s.maxStep, next.step ?? s.step, p.maxStep ?? 0),
          } as Partial<FlowState>
        }),
      setStep: (s) => set((st) => ({ step: s, maxStep: Math.max(st.maxStep, s) })),
      toggleAddon: (id) =>
        set((s) => ({
          addonIds: s.addonIds.includes(id) ? s.addonIds.filter((a) => a !== id) : [...s.addonIds, id],
        })),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: "aap-booking-flow-v1",
      version: 2,
      migrate: (persisted: any, _version: number) => {
        // v1 → v2: maxStep joins the persisted shape. A returning visitor
        // mid-flow keeps every answer; the furthest step they reached
        // becomes their ratchet ceiling (at least their current step).
        const step = typeof persisted?.step === "number" ? persisted.step : 0
        return { ...persisted, maxStep: Math.max(step, typeof persisted?.maxStep === "number" ? persisted.maxStep : step) }
      },
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} }
        }
        return window.localStorage
      }),
      partialize: (s) => {
        const { patch, setStep, toggleAddon, reset, ...rest } = s
        return rest as FlowState
      },
    },
  ),
)

// Pounds menu — the sizes the salon actually prices by. Values are the
// representative weights the pricing tiers key off.
export const POUNDS_MENU: { value: string; label: string; tier: SizeTier }[] = [
  { value: "10", label: "0–20 lbs", tier: "SMALL" },
  { value: "30", label: "21–40 lbs", tier: "MEDIUM" },
  { value: "50", label: "41–60 lbs", tier: "LARGE" },
  { value: "70", label: "61–80 lbs", tier: "XLARGE" },
  { value: "90", label: "Over 80 lbs", tier: "XLARGE" },
]

export function tierFromWeightLbs(weightLbs: string): SizeTier | null {
  const w = parseFloat(weightLbs)
  if (!Number.isFinite(w) || w <= 0) return null
  if (w <= 20) return "SMALL"
  if (w <= 40) return "MEDIUM"
  if (w <= 60) return "LARGE"
  return "XLARGE"
}
