"use client"

import { useState, useMemo, useSyncExternalStore, Fragment } from "react"
import Link from "next/link"
import {
  ShoppingBag, Trash, Minus, Plus, PawPrint, ArrowRight, Check,
} from "@phosphor-icons/react"
import { useCart, parsePriceToCents, formatCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// Bag island — /shop/bag
//   The full bag view BEFORE checkout: line items with qty steppers, a
//   side-by-side COMPARE table (materials, ingredients, warranty, specs),
//   subtotal, and CTAs. Items persist in localStorage (abandonment-proof):
//   "shop now, check out whenever you're ready."
// ---------------------------------------------------------------------------

export type BagProduct = {
  id: string
  slug?: string | null
  name: string
  price: string
  image?: string | null
  alt?: string | null
  badge?: string | null
  category?: string | null
  materials?: string | null
  ingredients?: string | null
  warranty?: string | null
  specs?: string | null
  description?: string | null
  shortDescription?: string | null
}

export type BagRating = { avg: number; count: number }

const MAX_PER_ITEM = 10
const stepWrapCls = "border border-gold/30 bg-card p-7 lg:p-10"
const labelCls = "text-[9px] font-bold tracking-[0.16em] text-gold-deep"

// Client-hydration gate without a setState-in-effect: false on the server
// snapshot, true once read on the client.
const emptySubscribe = () => () => {}
const useHydrated = () => useSyncExternalStore(emptySubscribe, () => true, () => false)

// First sentence, capped at ~120 chars.
function excerpt(text: string | null | undefined, cap = 120): string {
  if (!text) return "—"
  const sentence = text.split(/(?<=[.!?])\s/)[0] || text
  return sentence.length > cap ? sentence.slice(0, cap - 1).trimEnd() + "…" : sentence
}

export function BagClient({
  products,
  ratings,
}: {
  products: BagProduct[]
  ratings: Record<string, BagRating>
}) {
  const s = useCart()
  const hydrated = useHydrated()
  const [removedNote, setRemovedNote] = useState<string | null>(null)

  const byId = useMemo(() => {
    const map: Record<string, BagProduct> = {}
    for (const p of products) map[p.id] = p
    return map
  }, [products])

  const count = s.items.reduce((n, i) => n + i.quantity, 0)
  const subtotalCents = useMemo(
    () => s.items.reduce((sum, i) => sum + (parsePriceToCents(i.price) || 0) * i.quantity, 0),
    [s.items],
  )

  if (!hydrated) {
    return (
      <div className="min-h-[320px] animate-pulse">
        <div className="h-8 w-56 rounded bg-cream-deep" />
        <div className="mt-6 space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-24 w-full rounded bg-cream-deep" />)}
        </div>
      </div>
    )
  }

  // ----- Empty state -----
  if (s.items.length === 0) {
    return (
      <div className={`${stepWrapCls} flex flex-col items-center gap-4 py-14 text-center`}>
        <ShoppingBag size={40} className="text-gold/50" />
        <h2 className="font-display text-[26px] text-ink">Your bag is empty</h2>
        <p className="max-w-sm text-[12px] leading-[1.7] text-ink-soft">
          Fill it with groomer-approved favorites — coats, noses, and paws will thank you.
        </p>
        <Link href="/shop" className="btn-gold mt-2">BROWSE THE COLLECTION</Link>
      </div>
    )
  }

  const removeProduct = (id: string, name: string) => {
    s.remove(id)
    setRemovedNote(`Removed ${name} from your bag.`)
  }

  // Distinct products in the bag, in bag order, with their live records.
  const distinct = s.items.map((i) => ({ item: i, product: byId[i.productId] }))

  return (
    <div className="space-y-8">
      {/* Bag lines */}
      <div className={stepWrapCls}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">YOUR BAG</p>
            <h2 className="mt-2 font-display text-[24px] text-ink">
              Review your bag
              <span className="ml-2 align-middle text-[12px] font-normal text-ink-soft">
                {count} {count === 1 ? "item" : "items"}
              </span>
            </h2>
          </div>
          <p className="flex items-center gap-1.5 text-[10.5px] text-ink-soft">
            <PawPrint size={11} weight="fill" className="text-gold-deep" />
            Your bag is saved on this device — shop now, check out whenever you&apos;re ready.
          </p>
        </div>

        {removedNote && (
          <p className="mt-4 border border-gold/30 bg-cream-deep px-4 py-2 text-[11.5px] text-gold-deep">
            {removedNote}
          </p>
        )}

        <ul className="mt-6 divide-y divide-gold/20 border-y border-gold/20">
          {distinct.map(({ item, product }) => (
            <li key={item.productId} className="flex items-center gap-4 py-5">
              <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden border border-gold/25 bg-cream-deep">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.alt || item.name}
                    width={128}
                    height={160}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <PawPrint size={20} className="text-gold/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {product?.slug ? (
                  <Link
                    href={`/shop/${product.slug}`}
                    className="truncate text-[13px] font-bold text-ink transition-colors hover:text-gold-deep"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <p className="truncate text-[13px] font-bold text-ink">{item.name}</p>
                )}
                <p className="mt-0.5 text-[12px] text-gold-deep">{item.price} each</p>
                <div className="mt-2 inline-flex items-center border border-gold/35 bg-cream">
                  <QtyBtn
                    onClick={() => s.setQty(item.productId, item.quantity - 1)}
                    label="Decrease quantity"
                    disabled={item.quantity <= 1}
                  >
                    <Minus size={12} weight="bold" />
                  </QtyBtn>
                  <span className="w-8 text-center text-[12px] font-bold text-ink">{item.quantity}</span>
                  <QtyBtn
                    onClick={() => s.setQty(item.productId, item.quantity + 1)}
                    label="Increase quantity"
                    disabled={item.quantity >= MAX_PER_ITEM}
                  >
                    <Plus size={12} weight="bold" />
                  </QtyBtn>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[13px] font-bold text-ink">
                  {formatCents((parsePriceToCents(item.price) || 0) * item.quantity)}
                </p>
                <button
                  onClick={() => removeProduct(item.productId, item.name)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.12em] text-ink-soft transition-colors hover:text-gold-deep"
                  aria-label={`Remove ${item.name} from bag`}
                >
                  <Trash size={11} /> REMOVE
                </button>
              </div>
            </li>
          ))}
        </ul>

        {/* Subtotal */}
        <div className="mt-6 space-y-1.5 border-t border-gold/20 pt-4 text-[12px]">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="font-bold text-ink">{formatCents(subtotalCents)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Standard shipping</span>
            <span className="font-bold text-gold-deep">COMPLIMENTARY</span>
          </div>
          <div className="flex justify-between border-t border-gold/20 pt-2 text-[14px] font-bold text-ink">
            <span>Total</span>
            <span className="text-gold-deep">{formatCents(subtotalCents)}</span>
          </div>
          <p className="pt-1 text-[10.5px] text-ink-soft">
            Taxes calculated at checkout. Pickup in salon is also available at checkout.
          </p>
        </div>
      </div>

      {/* Compare (only with 2+ distinct products) */}
      {distinct.length >= 2 && (
        <div className={stepWrapCls}>
          <p className="eyebrow">COMPARE SIDE BY SIDE</p>
          <h2 className="mt-2 font-display text-[24px] text-ink">Which one is right for your pup?</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            Materials, ingredients, warranties, and specs — all in one view.
          </p>

          <div className="mt-6 overflow-x-auto pb-2">
            <div
              className="min-w-[760px]"
              style={{
                display: "grid",
                gridTemplateColumns: `110px repeat(${distinct.length}, minmax(180px, 1fr))`,
              }}
            >
              {/* Header row — product identity */}
              <div className="border-b border-gold/20 py-4 pr-3">
                <span className={labelCls}>PRODUCT</span>
              </div>
              {distinct.map(({ item, product }) => {
                const rating = product ? ratings[product.id] : undefined
                return (
                  <div key={item.productId} className="border-b border-gold/20 border-l border-gold/15 px-4 py-4">
                    <div className="flex h-24 items-center justify-center overflow-hidden border border-gold/25 bg-cream-deep">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.alt || item.name}
                          width={160}
                          height={200}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <PawPrint size={22} className="text-gold/40" />
                      )}
                    </div>
                    {product?.slug ? (
                      <Link
                        href={`/shop/${product.slug}`}
                        className="mt-3 block text-[12px] font-bold leading-[1.4] text-ink transition-colors hover:text-gold-deep"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <p className="mt-3 text-[12px] font-bold leading-[1.4] text-ink">{item.name}</p>
                    )}
                    {rating && rating.count > 0 && (
                      <p className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="font-display text-[13px] leading-none text-gold-deep">{rating.avg.toFixed(1)}</span>
                        <span className="text-[10px] text-ink-soft">({rating.count} {rating.count === 1 ? "review" : "reviews"})</span>
                      </p>
                    )}
                  </div>
                )
              })}

              {/* Data rows */}
              {(
                [
                  ["PRICE", (p: BagProduct) => <span className="text-[12.5px] font-bold text-gold-deep">{p.price}</span>],
                  ["MATERIALS", (p: BagProduct) => excerpt(p.materials)],
                  ["INGREDIENTS", (p: BagProduct) => excerpt(p.ingredients)],
                  ["WARRANTY", (p: BagProduct) => excerpt(p.warranty, 100)],
                  ["SPECS", (p: BagProduct) => excerpt(p.specs)],
                ] as const
              ).map(([rowLabel, render]) => (
                <Fragment key={rowLabel}>
                  <div className="border-b border-gold/15 py-3.5 pr-3">
                    <span className={labelCls}>{rowLabel}</span>
                  </div>
                  {distinct.map(({ item, product }) => (
                    <div key={rowLabel + item.productId} className="border-b border-gold/15 border-l border-gold/15 px-4 py-3.5 text-[11.5px] leading-[1.6] text-ink-soft">
                      {product ? render(product) : "—"}
                    </div>
                  ))}
                </Fragment>
              ))}

              {/* Footer row — remove */}
              <div className="py-4 pr-3" />
              {distinct.map(({ item, product }) => (
                <div key={item.productId} className="border-l border-gold/15 px-4 py-4">
                  <button
                    onClick={() => removeProduct(item.productId, item.name)}
                    className="inline-flex items-center gap-1 text-[9.5px] font-bold tracking-[0.14em] text-ink-soft transition-colors hover:text-gold-deep"
                    aria-label={`Remove ${item.name} from bag`}
                  >
                    <Trash size={10} /> REMOVE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link href="/shop" className="btn-ghost">CONTINUE SHOPPING</Link>
        <Link href="/shop?checkout=1" className="btn-gold">
          PROCEED TO CHECKOUT <ArrowRight size={13} weight="bold" />
        </Link>
      </div>

      <p className="flex items-center justify-center gap-1.5 pb-1 text-center text-[10.5px] text-ink-soft">
        <Check size={11} weight="bold" className="text-gold-deep" />
        Complimentary standard shipping on every order · secure payment by Stripe
      </p>
    </div>
  )
}

function QtyBtn({
  children, onClick, label, disabled,
}: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center text-ink transition-colors hover:text-gold-deep disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}
