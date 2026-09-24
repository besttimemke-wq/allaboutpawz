"use client"

import { useSyncExternalStore } from "react"
import { Heart } from "lucide-react"
import { useWishlist } from "@/lib/wishlist-store"

// ---------------------------------------------------------------------------
// WishlistButton — client island inside the server-rendered product card.
// Works independently from the card's product-page navigation. The store
// subscription uses useSyncExternalStore with a false server snapshot, so
// hydration is mismatch-free and no effect state is needed.
// ---------------------------------------------------------------------------

export function WishlistButton({ productId, name }: { productId: string; name: string }) {
  const active = useSyncExternalStore(
    useWishlist.subscribe,
    () => useWishlist.getState().ids.includes(productId),
    () => false,
  )
  const toggle = useWishlist.getState().toggle

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      title={active ? "Remove from wishlist" : "Save to wishlist"}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(productId)
      }}
      className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-white/95 shadow-sm transition-all hover:border-gold-deep/50 hover:shadow"
    >
      <Heart
        className={`h-4 w-4 transition-colors ${active ? "fill-gold-deep text-gold-deep" : "text-ink-soft"}`}
        strokeWidth={1.8}
        aria-hidden="true"
      />
    </button>
  )
}
