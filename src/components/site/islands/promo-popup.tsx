"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X, Tag, ArrowRight } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// PromoPopup — nav promo popups (owner spec §2).
//
//   const { gate, dialog } = useNavPromoGate()
//   <Link href="/services" onClick={(e) => gate("services", e, "/services")}>…
//   {dialog}
//
// On a nav click for Services / Pricing / Shop / Book, fetch
// GET /api/promos/eligible?placement=… and open a dismissible modal listing
// the eligible PUBLISHED offers for that page (title, description, code,
// CTA). Dismiss: close button, backdrop click, Esc. The same offer set never
// re-shows in the same session (sessionStorage flag per placement). No
// eligible offers → straight through to the page.
// ---------------------------------------------------------------------------

export type PromoPlacement = "services" | "pricing" | "shop" | "book"

type Offer = {
  id: string
  name: string
  code: string
  kind: "standard" | "cause"
  description: string | null
  finePrint: string | null
  ctaLabel: string | null
}

const FLAG = (placement: string) => `aap-promo-seen-${placement}`

export function useNavPromoGate() {
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [open, setOpen] = useState(false)
  const pendingHref = useRef<string | null>(null)

  const navigate = useCallback((href: string) => {
    window.location.assign(href)
  }, [])

  const gate = useCallback(
    (placement: PromoPlacement, e: React.MouseEvent, href: string) => {
      e.preventDefault()
      e.stopPropagation()
      pendingHref.current = href

      if (sessionStorage.getItem(FLAG(placement)) === "1") {
        navigate(href)
        return
      }

      ;(async () => {
        try {
          const res = await fetch(`/api/promos/eligible?placement=${placement}`)
          const data = await res.json().catch(() => ({ offers: [] }))
          const list: Offer[] = Array.isArray(data?.offers) ? data.offers : []
          sessionStorage.setItem(FLAG(placement), "1")
          if (list.length === 0) {
            navigate(href)
            return
          }
          setOffers(list)
          setOpen(true)
        } catch {
          navigate(href)
        }
      })()
    },
    [navigate],
  )

  const closeAndGo = useCallback(() => {
    setOpen(false)
    const href = pendingHref.current
    pendingHref.current = null
    if (href) navigate(href)
  }, [navigate])

  // Esc closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAndGo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, closeAndGo])

  const dialog = open && offers && offers.length > 0 ? (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/60 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Current offers"
      onClick={closeAndGo}
    >
      <div
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold-deep">
              Current offers
            </p>
            <h2 className="type-body mt-1 text-[19px] font-bold leading-tight text-ink">
              Before you go…
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAndGo}
            aria-label="Close offers and continue"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="mt-4 space-y-3">
          {offers.map((o) => (
            <li
              key={o.id}
              className={cn(
                "rounded-lg border p-4",
                o.kind === "cause" ? "border-pink-200 bg-pink-50/60" : "border-neutral-200 bg-neutral-50",
              )}
            >
              <div className="flex items-center gap-2">
                <Tag
                  className={cn("h-4 w-4 shrink-0", o.kind === "cause" ? "text-pink-600" : "text-gold-deep")}
                  aria-hidden="true"
                />
                <p className="type-body text-[14px] font-bold text-ink">{o.name}</p>
              </div>
              {o.description && (
                <p className="mt-1 text-[12.5px] leading-relaxed text-neutral-600">{o.description}</p>
              )}
              <div className="mt-2.5 flex items-center justify-between gap-3">
                <code className="rounded bg-white px-2 py-1 text-[12px] font-bold tracking-[0.08em] text-ink ring-1 ring-neutral-200">
                  {o.code}
                </code>
                {o.finePrint && (
                  <p className="text-right text-[10.5px] leading-tight text-neutral-400">{o.finePrint}</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-3">
          <a
            href="/customer/dashboard"
            className="text-[12px] font-semibold text-gold-deep underline-offset-2 hover:underline"
          >
            View all offers
          </a>
          <button
            type="button"
            onClick={closeAndGo}
            className="flex h-11 items-center gap-2 rounded-md bg-ink px-5 text-[12px] font-bold uppercase tracking-[0.08em] text-cream transition-colors hover:bg-gold-deep"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { gate, dialog }
}
