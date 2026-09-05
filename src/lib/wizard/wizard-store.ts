import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// ---------------------------------------------------------------------------
// Booking Wizard Store
//   - Single source of truth for the multi-step booking wizard.
//   - Persisted to localStorage so the wizard survives page refresh.
//   - The wizard component calls `set` with patches as the user advances;
//     API-created resources (customerId / dogId / bookingId) are written
//     back here so the next step can rely on them.
// ---------------------------------------------------------------------------

export type BookingType = "appointment" | "consultation"

export type WizardState = {
  // navigation
  bookingType: BookingType | null
  step: number

  // result IDs (populated by API calls along the way)
  customerId: string | null
  dogId: string | null
  bookingId: string | null

  // ---- customer (step 1-2) ----
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  addressLine2: string
  city: string
  state: string
  postalCode: string

  // ---- dog (step 3) ----
  dogName: string
  breedId: string
  breedName: string
  sex: string // "Male" | "Female" | ""
  birthDate: string // YYYY-MM-DD
  weightLbs: string
  color: string
  markings: string
  photoUrl: string // public URL of the uploaded pet photo

  // ---- coat & grooming profile (step 4) ----
  coatTypeId: string
  coatTextureId: string
  coatLengthId: string
  coatConditionId: string
  sheddingLevelId: string
  currentHaircutStyleId: string
  currentBodyLengthId: string
  temperament: string
  nailHandling: string
  faceHandling: string
  feetHandling: string
  earHandling: string
  dryerHandling: string
  clipperHandling: string
  handlingNotes: string
  groomingNotes: string
  ownerNotes: string

  // ---- grooming request (step 5) ----
  styleId: string
  bodyLengthId: string
  bodyStyleId: string
  legStyleId: string
  faceStyleId: string
  headStyleId: string
  earStyleId: string
  tailStyleId: string
  feetStyleId: string
  sanitaryService: string
  nailService: string
  pawPadService: string
  earService: string
  teethService: string
  desheddingService: string
  coatTechnique: string
  specialInstructions: string

  // ---- appointment (step 6-7) ----
  serviceId: string
  serviceName: string
  servicePrice: string
  date: string // YYYY-MM-DD
  time: string // "9:00 AM"
  groomerId: string

  // ---- consultation (step 6-7 alt) ----
  consultationReason: string

  // ---- general notes (step 8) ----
  notes: string

  // actions
  patch: (p: Partial<WizardState>) => void
  setStep: (s: number) => void
  reset: () => void
}

const INITIAL: Omit<WizardState, "patch" | "setStep" | "reset"> = {
  bookingType: null,
  step: 0,
  customerId: null,
  dogId: null,
  bookingId: null,
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  dogName: "",
  breedId: "",
  breedName: "",
  sex: "",
  birthDate: "",
  weightLbs: "",
  color: "",
  markings: "",
  photoUrl: "",
  coatTypeId: "",
  coatTextureId: "",
  coatLengthId: "",
  coatConditionId: "",
  sheddingLevelId: "",
  currentHaircutStyleId: "",
  currentBodyLengthId: "",
  temperament: "",
  nailHandling: "",
  faceHandling: "",
  feetHandling: "",
  earHandling: "",
  dryerHandling: "",
  clipperHandling: "",
  handlingNotes: "",
  groomingNotes: "",
  ownerNotes: "",
  styleId: "",
  bodyLengthId: "",
  bodyStyleId: "",
  legStyleId: "",
  faceStyleId: "",
  headStyleId: "",
  earStyleId: "",
  tailStyleId: "",
  feetStyleId: "",
  sanitaryService: "",
  nailService: "",
  pawPadService: "",
  earService: "",
  teethService: "",
  desheddingService: "",
  coatTechnique: "",
  specialInstructions: "",
  serviceId: "",
  serviceName: "",
  servicePrice: "",
  date: "",
  time: "",
  groomerId: "",
  consultationReason: "",
  notes: "",
}

export const useWizard = create<WizardState>()(
  persist(
    (set) => ({
      ...INITIAL,
      patch: (p) => set(p),
      setStep: (s) => set({ step: s }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: "aap-wizard-v2",
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR-safe noop
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return window.localStorage
      }),
      // Don't persist transient flags like submitting — only the form state.
      partialize: (s) => {
        const { patch, setStep, reset, ...rest } = s
        return rest as WizardState
      },
    },
  ),
)
