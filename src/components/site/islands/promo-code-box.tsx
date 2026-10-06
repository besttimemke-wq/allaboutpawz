"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { X, Tag, Spinner } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// PromoCodeBox — promo code entry (owner spec §1).
//
// Renders on the booking review step, cart/checkout, and subscription
// signup. UI states: idle → validating → applied (removable chip) → error.
// The SERVER is the only discount authority — this box previews what
// /api/promos/validate returns and the parent recomputes its total from
// the returned discountCents. One code per flow: applying a second code
// while one is applied is rejected server-side (already_applied).
// ---------------------------------------------------------------------------

export type AppliedPromo = {
  code: string
  name: string
  discountCents: number
  newSubtotalCents: number
}

export type PromoCodeBoxProps = {
  context: {
    serviceIds?: string[]
    subscriptionPlanId?: string | null
    productIds?: string[]
    subtotalCents: number
    dogId?: string | null
    dogBirthDate?: string | null
  }
  onApplied: (discount: AppliedPromo) => void
  onRemoved?: () => void
  /** A code arriving from an offer CTA (?promo=CODE) — auto-applied once. */
  initialCode?: string | null
  className?: string
}

export function PromoCodeBox({ context, onApplied, onRemoved, initialCode, className }: PromoCodeBoxProps) {
  const [state, setState] = useState<"idle" | "validating" | "applied" | "error">("idle")
  const [code, setCode] = useState("")
  const [applied, setApplied] = useState<AppliedPromo | null>(null)
  const [error, setError] = useState("")

  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const apply = useCallback(
    async (raw?: string) => {
      const trimmed = (raw ?? code).trim().toUpperCase()
      if (!trimmed || state === "validating") return
      setState("validating")
      setError("")
      try {
        const res = await fetch("/api/promos/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: trimmed,
            context: {
              ...context,
              currentPromoCode: applied?.code ?? null,
            },
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?.valid) {
          const promo: AppliedPromo = {
            code: String(data.code),
            name: String(data.name || data.code),
            discountCents: Number(data.discountCents) || 0,
            newSubtotalCents: Number(data.newSubtotalCents) || context.subtotalCents,
          }
          setApplied(promo)
          setState("applied")
          setCode("")
          onApplied(promo)
        } else {
          setState("idle")
          setError(String(data?.message || "That code didn't work."))
        }
      } catch {
        setState("idle")
        setError("Couldn't check that code — try again.")
      }
    },
    [code, state, context, applied, onApplied],
  )

  // A deep-linked offer code (?promo=CODE) applies once on mount — the
  // customer still sees the removable chip and the server still validates.
  const autoTried = useRef(false)
  useEffect(() => {
    if (autoTried.current || !initialCode) return
    autoTried.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount: deep-linked offer auto-apply (repo convention).
    apply(initialCode)
  }, [initialCode, apply])

  const remove = () => {
    setApplied(null)
    setState("idle")
    setError("")
    onRemoved?.()
  }

  // ---- applied: the removable chip ----
  if (state === "applied" && applied) {
    return (
      <div className={cn("rounded-lg border border-gold-deep/40 bg-amber-50/40 p-4", className)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Tag className="h-5 w-5 shrink-0 text-gold-deep" aria-hidden="true" />
            <div className="min-w-0">
              <p className="type-body truncate text-[13.5px] font-bold text-ink">
                {applied.code}
                <span className="ml-2 font-normal text-neutral-500">{applied.name}</span>
              </p>
              <p className="mt-0.5 text-[12px] leading-tight text-neutral-600">
                {applied.discountCents > 0 ? (
                  <>
                    You save <span className="font-bold text-gold-deep">{money(applied.discountCents)}</span>
                    {" · "}new subtotal {money(applied.newSubtotalCents)}
                  </>
                ) : (
                  <>Applied — the offer rides on your booking.</>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label={`Remove promo code ${applied.code}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  // ---- idle / validating / error ----
  return (
    <div className={className}>
      <label htmlFor="promo-code-input" className="block text-[11px] font-bold uppercase tracking-[0.1em] text-neutral-500">
        Promo code
      </label>
      <div className="mt-2 flex gap-2.5">
        <input
          id="promo-code-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          disabled={state === "validating"}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            setError("")
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              apply()
            }
          }}
          placeholder="Enter a code"
          aria-invalid={!!error}
          aria-describedby={error ? "promo-code-error" : undefined}
          className="h-12 w-full rounded-md border border-neutral-300 bg-white px-3.5 text-[14px] font-semibold uppercase tracking-[0.04em] text-ink outline-none transition-colors placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/30 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => apply()}
          disabled={state === "validating" || !code.trim()}
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink transition-colors enabled:hover:border-ink enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state === "validating" ? (
            <>
              <Spinner className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span className="sr-only">Checking code</span>
            </>
          ) : (
            "Apply"
          )}
        </button>
      </div>
      {state === "error" && error && (
        <p id="promo-code-error" role="alert" className="mt-2 text-[12.5px] font-medium text-red-600">
          {error}
        </p>
      )}
      {state === "idle" && !error && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-neutral-400">
          One code per booking. Codes don't stack with each other or with cause discounts.
        </p>
      )}
    </div>
  )
}
