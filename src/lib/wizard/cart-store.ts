import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// ---------------------------------------------------------------------------
// Shop Cart & Checkout Store
//   - Single source of truth for the shop cart + multi-step checkout flow
//     (mirrors the booking wizard store pattern).
//   - Persisted to localStorage so the bag survives page refresh.
//   - Prices are stored as display strings ("$22.00") exactly as the catalog
//     shows them — the SERVER re-verifies every price at checkout time and
//     never trusts these values.
// ---------------------------------------------------------------------------

export type DeliveryMethod = "ship" | "pickup"

export type CartItem = {
  productId: string
  name: string
  price: string // display price, e.g. "$22.00" — server re-verifies at checkout
  image?: string | null
  alt?: string | null
  badge?: string | null
  category?: string | null
  quantity: number
}

export type ShopState = {
  // ---- bag ----
  items: CartItem[]
  deliveryMethod: DeliveryMethod

  // ---- checkout navigation (0 = browsing the catalog) ----
  step: number

  // ---- result id (populated by /api/customers during checkout) ----
  customerId: string | null

  // ---- contact (step 2) ----
  firstName: string
  lastName: string
  email: string
  phone: string

  // ---- shipping (step 3, ship orders only) ----
  address: string
  addressLine2: string
  city: string
  state: string
  postalCode: string

  // ---- order notes (step 3) ----
  notes: string

  // ---- actions ----
  add: (p: Omit<CartItem, "quantity">) => void
  remove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  setStep: (n: number) => void
  patch: (p: Partial<Omit<ShopState, "add" | "remove" | "setQty" | "setStep" | "patch" | "clearCart" | "reset">>) => void
  clearCart: () => void
  reset: () => void
}

const MAX_PER_ITEM = 10

export const useCart = create<ShopState>()(
  persist(
    (set) => ({
      items: [],
      deliveryMethod: "ship",
      step: 0,
      customerId: null,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      notes: "",

      add: (p) =>
        set((s) => {
          const found = s.items.find((i) => i.productId === p.productId)
          if (found) {
            return {
              items: s.items.map((i) =>
                i.productId === p.productId
                  ? { ...i, quantity: Math.min(MAX_PER_ITEM, i.quantity + 1) }
                  : i,
              ),
            }
          }
          return { items: [...s.items, { ...p, quantity: 1 }] }
        }),

      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      setQty: (productId, qty) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.max(0, Math.min(MAX_PER_ITEM, qty)) }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),

      setStep: (n) => set({ step: n }),

      patch: (p) => set(p as any),

      clearCart: () => set({ items: [] }),

      reset: () =>
        set({
          items: [],
          deliveryMethod: "ship",
          step: 0,
          customerId: null,
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address: "",
          addressLine2: "",
          city: "",
          state: "",
          postalCode: "",
          notes: "",
        }),
    }),
    {
      name: "aapawz-shop-cart-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

// Parse a display price ("$22.00" / "$1,240.50") into integer cents.
// Returns null when the string can't be parsed.
export function parsePriceToCents(p: string | null | undefined): number | null {
  if (!p) return null
  const cleaned = String(p).replace(/[^0-9.]/g, "")
  const v = parseFloat(cleaned)
  if (!isFinite(v) || v <= 0) return null
  return Math.round(v * 100)
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })
}
