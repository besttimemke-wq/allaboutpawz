"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

// ---------------------------------------------------------------------------
// Wishlist — client-side saved products (zustand, persisted). Presentation
// feature on product cards per the reference design; the bag/cart remains
// the single source of truth for checkout.
// ---------------------------------------------------------------------------

type WishlistState = {
  ids: string[]
  has: (id: string) => boolean
  toggle: (id: string) => void
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      has: (id) => get().ids.includes(id),
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
    }),
    {
      name: "pawz-wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
