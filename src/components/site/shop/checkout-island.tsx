"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Check, ArrowLeft, ArrowRight, ShoppingBag, Plus, Minus, X, Trash,
  Truck, Storefront, LockKey, PawPrint, CreditCard, Sparkle,
} from "@phosphor-icons/react"
import { useCart, parsePriceToCents, formatCents } from "@/lib/wizard/cart-store"

// ---------------------------------------------------------------------------
// CheckoutIsland — the shop checkout flow, mounted on the SSR shop page.
//
// Flow (mirrors the booking wizard):
//   Catalog → BAG (step 1) → CONTACT (step 2) → SHIPPING/PICKUP (step 3)
//   → REVIEW & PAY (step 4) → Stripe Checkout redirect → success screen.
//
// Activation is URL-driven (the bag page hands off with ?checkout=1; Stripe
// returns with ?checkout=success|cancel), so the SSR product grid stays the
// default view and the wizard takes over only when a checkout is in flight.
// ---------------------------------------------------------------------------

export function CheckoutIsland() {
  const s = useCart()
  // Activation is URL-driven and derived during render (no effect state):
  // the bag page hands off with ?checkout=1; Stripe returns with
  // ?checkout=success|cancel. The wizard takes over only when in flight.
  const searchParams = useSearchParams()
  const checkoutParam = searchParams.get("checkout")
  const [view, setView] = useState<"catalog" | "checkout" | "success">(
    checkoutParam === "success" ? "success" : checkoutParam === "1" ? "checkout" : "catalog",
  )
  const [notice, setNotice] = useState<string | null>(
    checkoutParam === "cancel"
      ? "Checkout cancelled — your bag is saved whenever you're ready."
      : null,
  )
  const [verify, setVerify] = useState<"checking" | "paid" | "pending" | null>(
    checkoutParam === "success" ? (searchParams.get("session_id") ? "checking" : "paid") : null,
  )

  // Side effects only: verify payment with Stripe + scrub the URL so a
  // refresh doesn't re-trigger the flow.
  useEffect(() => {
    if (typeof window === "undefined" || !checkoutParam) return
    if (checkoutParam === "success") {
      s.patch({ step: 0 })
      const sessionId = searchParams.get("session_id")
      if (sessionId) {
        fetch(`/api/shop/verify?session_id=${encodeURIComponent(sessionId)}`)
          .then((r) => r.json())
          .then((d) => setVerify(d.paid ? "paid" : "pending"))
          .catch(() => setVerify("pending"))
      }
    } else if (checkoutParam === "1") {
      s.setStep(1)
    }
    window.history.replaceState({}, "", "/shop")
    // Activation params are read once on mount.
     
  }, [])

  if (view === "success") {
    return (
      <div className="border border-gold/30 bg-card p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-deep">
          <Check size={32} weight="bold" className="text-cream" />
        </div>
        <h2 className="mt-4 font-display text-[28px] text-ink">Order Received</h2>
        <p className="script mt-2 text-[24px]">From Pawz to PAWfection</p>
        <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-ink-soft">
          {verify === "paid"
            ? "Thank you — your payment was received and your order is confirmed. A receipt email is on its way."
            : verify === "checking"
              ? "Confirming your payment with Stripe…"
              : "We've received your order and are confirming your payment. You'll get a receipt by email shortly."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a href="/shop" className="btn-gold" onClick={() => { s.reset(); setView("catalog") }}>CONTINUE SHOPPING</a>
          <a href="/book" className="btn-ghost">BOOK A GROOM</a>
        </div>
      </div>
    )
  }

  if (view === "checkout") {
    return (
      <div>
        {notice && (
          <p className="mb-4 border border-gold/30 bg-cream-deep px-4 py-2 text-[12px] text-gold-deep">{notice}</p>
        )}
        <CheckoutWizard onExit={() => { s.setStep(0); setView("catalog") }} />
      </div>
    )
  }

  return notice ? (
    <p className="mb-4 border border-gold/30 bg-cream-deep px-4 py-2 text-[12px] text-gold-deep">{notice}</p>
  ) : null
}

// ===========================================================================
// Checkout wizard — 4 steps, same chrome as the booking wizard
// ===========================================================================

function CheckoutWizard({ onExit }: { onExit: () => void }) {
  const s = useCart()
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const subtotalCents = useMemo(
    () => s.items.reduce((sum, i) => sum + (parsePriceToCents(i.price) || 0) * i.quantity, 0),
    [s.items],
  )

  const stepLabels = ["Bag", "Contact", "Delivery", "Review"]

  const canNext = useMemo(() => {
    switch (s.step) {
      case 1: return s.items.length > 0
      case 2:
        return !!s.firstName.trim() && !!s.lastName.trim()
          && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())
          && s.phone.trim().length >= 7
      case 3:
        return s.deliveryMethod === "pickup"
          ? true
          : !!s.address.trim() && !!s.city.trim() && !!s.state.trim() && s.postalCode.trim().length >= 5
      case 4: return true
      default: return false
    }
  }, [s.step, s.items.length, s.firstName, s.lastName, s.email, s.phone,
      s.deliveryMethod, s.address, s.city, s.state, s.postalCode])

  const onContinue = async () => {
    setApiError(null)
    if (!canNext) return

    // No customer record is created here — checkout proceeds as a guest.
    // The salon-side (customers) record is only created by the booking
    // wizard or an admin walk-in; a product-only buyer exists solely in
    // Orders CRM (identified by the order's own email), and the Stripe
    // webhook enrolls the login after payment actually clears.

    s.setStep(s.step + 1)
  }

  // ----- Final submit → Stripe Checkout -----
  const submit = async () => {
    setApiError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: s.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          deliveryMethod: s.deliveryMethod,
          email: s.email, phone: s.phone,
          address: s.address, addressLine2: s.addressLine2,
          city: s.city, state: s.state, postalCode: s.postalCode,
          notes: s.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.error || "Checkout failed")
        setSubmitting(false)
        return
      }
      if (data.url) {
        setRedirecting(true)
        window.location.href = data.url
        return
      }
      setApiError("Checkout session could not be created.")
    } catch (e: unknown) {
      setApiError((e as Error).message || "Network error")
    } finally {
      setSubmitting(false)
    }
  }

  const goBack = () => {
    setApiError(null)
    if (s.step === 1) {
      onExit()
    } else {
      s.setStep(s.step - 1)
    }
  }

  return (
    <div className="space-y-6">
      <Stepper step={s.step} labels={stepLabels} onJump={(i) => i < s.step && s.setStep(i)} />

      {apiError && (
        <div className="border border-red-300 bg-red-50 px-4 py-3 text-[12px] text-red-700">{apiError}</div>
      )}

      <div className="min-h-[340px]">
        {s.step === 1 && <StepBag />}
        {s.step === 2 && <StepContact />}
        {s.step === 3 && <StepDelivery />}
        {s.step === 4 && (
          <StepReview subtotalCents={subtotalCents} submitting={submitting} redirecting={redirecting} onSubmit={submit} />
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between border-t border-gold/25 pt-5">
        <button type="button" onClick={goBack} className="btn-ghost">
          <ArrowLeft size={14} weight="bold" /> {s.step === 1 ? "Keep Shopping" : "Back"}
        </button>
        {s.step < 4 ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={!canNext || submitting}
            className={`btn-gold ${!canNext || submitting ? "cursor-not-allowed opacity-40" : ""}`}
          >
            {submitting ? "Saving…" : "Continue"} <ArrowRight size={14} weight="bold" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ===========================================================================
// Step 1 — BAG
// ===========================================================================

function StepBag() {
  const s = useCart()
  if (s.items.length === 0) {
    return (
      <div className={`${stepWrapCls} space-y-4 text-center`}>
        <ShoppingBag size={40} className="mx-auto text-gold/50" />
        <h2 className="font-display text-[22px] text-ink">Your bag is empty</h2>
        <p className="text-[12px] text-ink-soft">Add a few pawfection favorites to continue.</p>
      </div>
    )
  }
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 1 — YOUR BAG</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">Review your bag</h2>
        <p className="mt-1 text-[12px] text-ink-soft">Adjust quantities or remove items before continuing.</p>
      </div>

      <ul className="divide-y divide-gold/20 border-y border-gold/20">
        {s.items.map((i) => (
          <li key={i.productId} className="flex items-center gap-4 py-4">
            <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden border border-gold/25 bg-cream-deep">
              {i.image ? (
                <img src={i.image} alt={i.alt || i.name} width={128} height={160} className="h-full w-full object-contain p-1" />
              ) : (
                <PawPrint size={20} className="text-gold/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-ink">{i.name}</p>
              <p className="mt-0.5 text-[12px] text-gold-deep">{i.price}</p>
              <div className="mt-2 inline-flex items-center border border-gold/35 bg-cream">
                <QtyBtn onClick={() => s.setQty(i.productId, i.quantity - 1)} label="Decrease quantity">
                  {i.quantity <= 1 ? <Trash size={12} /> : <Minus size={12} weight="bold" />}
                </QtyBtn>
                <span className="w-8 text-center text-[12px] font-bold text-ink">{i.quantity}</span>
                <QtyBtn onClick={() => s.setQty(i.productId, i.quantity + 1)} label="Increase quantity" disabled={i.quantity >= 10}>
                  <Plus size={12} weight="bold" />
                </QtyBtn>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-bold text-ink">
                {formatCents((parsePriceToCents(i.price) || 0) * i.quantity)}
              </p>
              <button
                type="button"
                onClick={() => s.remove(i.productId)}
                className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.1em] text-ink-soft hover:text-red-600"
              >
                <X size={10} weight="bold" /> REMOVE
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-soft">
          <Truck size={12} weight="fill" className="mr-1 inline text-gold-deep" />
          Complimentary standard shipping on every order.
        </p>
        <p className="text-[14px] font-bold text-ink">
          Subtotal <span className="text-gold-deep">{formatCents(s.items.reduce((sum, i) => sum + (parsePriceToCents(i.price) || 0) * i.quantity, 0))}</span>
        </p>
      </div>
    </div>
  )
}

function QtyBtn({ children, onClick, label, disabled }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center text-ink transition-colors hover:bg-cream-deep hover:text-gold-deep disabled:opacity-30"
    >
      {children}
    </button>
  )
}

// ===========================================================================
// Step 2 — CONTACT
// ===========================================================================

function StepContact() {
  const s = useCart()
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 2 — CONTACT</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">What is your name and contact?</h2>
        <p className="mt-1 text-[12px] text-ink-soft">We&apos;ll use this for your order confirmation and receipt.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="FIRST NAME" required>
          <input value={s.firstName} onChange={(e) => s.patch({ firstName: e.target.value })} placeholder="Jane" className={inputCls} autoComplete="given-name" />
        </Field>
        <Field label="LAST NAME" required>
          <input value={s.lastName} onChange={(e) => s.patch({ lastName: e.target.value })} placeholder="Smith" className={inputCls} autoComplete="family-name" />
        </Field>
        <Field label="EMAIL" required>
          <input type="email" value={s.email} onChange={(e) => s.patch({ email: e.target.value })} placeholder="jane@email.com" className={inputCls} autoComplete="email" />
        </Field>
        <Field label="PHONE" required>
          <input type="tel" value={s.phone} onChange={(e) => s.patch({ phone: e.target.value })} placeholder="901-800-7182" className={inputCls} autoComplete="tel" />
        </Field>
      </div>
    </div>
  )
}

// ===========================================================================
// Step 3 — DELIVERY (shipping or pickup)
// ===========================================================================

function StepDelivery() {
  const s = useCart()
  const options: { value: "ship" | "pickup"; icon: typeof Truck; title: string; body: string }[] = [
    { value: "ship", icon: Truck, title: "Ship to me", body: "Complimentary standard shipping — 5–7 business days." },
    { value: "pickup", icon: Storefront, title: "Pick up in salon", body: "Ready for pickup at our Memphis salon — we'll call you when it's bagged." },
  ]
  return (
    <div className={`${stepWrapCls} space-y-5`}>
      <div>
        <p className="eyebrow">STEP 3 — DELIVERY</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">How would you like your order?</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {options.map(({ value, icon: Icon, title, body }) => (
          <button
            key={value}
            type="button"
            onClick={() => s.patch({ deliveryMethod: value })}
            className={`flex items-start gap-4 border px-5 py-4 text-left transition-colors ${s.deliveryMethod === value ? "border-gold-deep bg-cream-deep" : "border-gold/35 bg-cream hover:border-gold-deep"}`}
          >
            <Icon size={24} weight="fill" className="mt-0.5 shrink-0 text-gold-deep" />
            <div>
              <p className="text-[13px] font-bold text-ink">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">{body}</p>
            </div>
            {s.deliveryMethod === value && <Check size={16} weight="bold" className="ml-auto shrink-0 text-gold-deep" />}
          </button>
        ))}
      </div>

      {s.deliveryMethod === "ship" ? (
        <section className="space-y-4">
          <h3 className={sectionHeaderCls}>Shipping Address</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="STREET ADDRESS" required>
                <input value={s.address} onChange={(e) => s.patch({ address: e.target.value })} placeholder="123 Maple Grove Ave" className={inputCls} autoComplete="street-address" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="APT, SUITE, UNIT">
                <input value={s.addressLine2} onChange={(e) => s.patch({ addressLine2: e.target.value })} placeholder="Apt, Suite, Unit" className={inputCls} autoComplete="address-line2" />
              </Field>
            </div>
            <Field label="CITY" required>
              <input value={s.city} onChange={(e) => s.patch({ city: e.target.value })} placeholder="Riverbend" className={inputCls} autoComplete="address-level2" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="STATE" required>
                <input value={s.state} onChange={(e) => s.patch({ state: e.target.value })} placeholder="IL" maxLength={2} className={`${inputCls} uppercase`} autoComplete="address-level1" />
              </Field>
              <Field label="ZIP CODE" required>
                <input value={s.postalCode} onChange={(e) => s.patch({ postalCode: e.target.value })} placeholder="60614" inputMode="numeric" className={inputCls} autoComplete="postal-code" />
              </Field>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          <h3 className={sectionHeaderCls}>Pickup Details</h3>
          <div className="border border-gold/30 bg-cream-deep p-5">
            <p className="text-[13px] font-bold text-ink">All About Pawz — Memphis Salon</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              5515 Quince Rd, Memphis, TN 38119 · Open Tue–Sat 9am–6pm, Sun 10am–4pm
            </p>
            <p className="mt-3 text-[11.5px] text-ink-soft">
              <PawPrint size={12} weight="fill" className="mr-1 inline text-gold-deep" />
              No payment needed now for pickup scheduling — just complete checkout and we&apos;ll have it bagged within one business day.
            </p>
          </div>
        </section>
      )}

      <Field label="ORDER NOTES (OPTIONAL)">
        <textarea value={s.notes} onChange={(e) => s.patch({ notes: e.target.value })} rows={3} placeholder="Anything we should know about your order…" className={inputCls} />
      </Field>
    </div>
  )
}

// ===========================================================================
// Step 4 — REVIEW & PAY
// ===========================================================================

function StepReview({ subtotalCents, submitting, redirecting, onSubmit }: {
  subtotalCents: number
  submitting: boolean
  redirecting: boolean
  onSubmit: () => void
}) {
  const s = useCart()
  const total = subtotalCents
  return (
    <div className={`${stepWrapCls} space-y-6`}>
      <div>
        <p className="eyebrow">STEP 4 — REVIEW &amp; PAY</p>
        <h2 className="mt-2 font-display text-[24px] text-ink">One last look</h2>
        <p className="mt-1 text-[12px] text-ink-soft">You&apos;ll complete payment on Stripe&apos;s secure checkout page.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Items */}
        <section className="space-y-3">
          <h3 className={sectionHeaderCls}>Your Items</h3>
          <ul className="divide-y divide-gold/20 border-y border-gold/20">
            {s.items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 py-3">
                <div className="h-14 w-12 shrink-0 overflow-hidden border border-gold/25 bg-cream-deep">
                  {i.image ? (
                    <img src={i.image} alt={i.alt || i.name} width={96} height={112} className="h-full w-full object-contain p-0.5" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-ink">{i.name}</p>
                  <p className="text-[11px] text-ink-soft">Qty {i.quantity} × {i.price}</p>
                </div>
                <p className="text-[12.5px] font-bold text-gold-deep">
                  {formatCents((parsePriceToCents(i.price) || 0) * i.quantity)}
                </p>
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 border-b border-gold/20 pb-3 text-[12px]">
            <div className="flex justify-between text-ink-soft"><span>Subtotal</span><span className="text-ink">{formatCents(subtotalCents)}</span></div>
            <div className="flex justify-between text-ink-soft">
              <span>{s.deliveryMethod === "ship" ? "Standard shipping" : "Pickup in salon"}</span>
              <span className="text-gold-deep">{s.deliveryMethod === "ship" ? "FREE" : "—"}</span>
            </div>
            <div className="flex justify-between border-t border-gold/20 pt-2 text-[14px] font-bold text-ink">
              <span>Total</span><span className="text-gold-deep">{formatCents(total)}</span>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className="space-y-3">
          <h3 className={sectionHeaderCls}>Your Details</h3>
          <div className="space-y-2 border border-gold/20 bg-cream-deep p-4 text-[12px]">
            <p className="text-ink-soft"><span className="font-bold text-ink">Name:</span> {s.firstName} {s.lastName}</p>
            <p className="text-ink-soft"><span className="font-bold text-ink">Email:</span> {s.email}</p>
            <p className="text-ink-soft"><span className="font-bold text-ink">Phone:</span> {s.phone}</p>
            <p className="text-ink-soft">
              <span className="font-bold text-ink">{s.deliveryMethod === "ship" ? "Ship to:" : "Pickup:"}</span>{" "}
              {s.deliveryMethod === "ship"
                ? `${s.address}${s.addressLine2 ? `, ${s.addressLine2}` : ""}, ${s.city}, ${s.state} ${s.postalCode}`
                : "All About Pawz — Memphis Salon"}
            </p>
            {s.notes && <p className="text-ink-soft"><span className="font-bold text-ink">Notes:</span> {s.notes}</p>}
          </div>
          <div className="flex items-center gap-2 border border-gold/25 bg-cream p-4 text-[11px] text-ink-soft">
            <LockKey size={16} weight="fill" className="shrink-0 text-gold-deep" />
            <p>Payments are processed securely by Stripe. Your card details never touch our servers.</p>
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || redirecting}
        className={`btn-gold w-full text-[11px] ${submitting || redirecting ? "cursor-wait opacity-70" : ""}`}
      >
        <CreditCard size={14} weight="fill" />
        {redirecting ? "REDIRECTING TO STRIPE…" : submitting ? "CREATING SECURE ORDER…" : `PAY SECURELY — ${formatCents(total)}`}
      </button>
      <p className="text-center text-[10.5px] text-ink-soft">
        <Sparkle size={10} weight="fill" className="mr-1 inline text-gold-deep" />
        By completing checkout you&apos;ll receive an email receipt for this order.
      </p>
    </div>
  )
}

// ===========================================================================
// Stepper bar (same design as the booking wizard)
// ===========================================================================

function Stepper({ step, labels, onJump }: { step: number; labels: string[]; onJump: (i: number) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-gold/25 pb-5">
      {labels.map((label, idx) => {
        const stepNumber = idx + 1
        const isActive = step === stepNumber
        const isDone = step > stepNumber
        const canJump = step > stepNumber
        return (
          <div key={label} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => canJump && onJump(stepNumber)}
              disabled={!canJump}
              className={`flex flex-col items-center gap-1.5 ${canJump ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[12px] font-bold transition-colors ${isActive ? "border-gold-deep bg-gold-deep text-cream" : isDone ? "border-gold-deep bg-gold-deep text-cream" : "border-gold/30 bg-cream text-gold-deep"}`}>
                {isDone ? <Check size={14} weight="bold" /> : stepNumber}
              </span>
              <span className={`hidden text-[8px] font-bold tracking-[0.08em] sm:block ${isActive ? "text-gold-deep" : "text-ink-soft"}`}>
                {label.toUpperCase()}
              </span>
            </button>
            {idx < labels.length - 1 && (
              <span className={`mx-1 h-px flex-1 ${step > stepNumber ? "bg-gold-deep" : "bg-gold/25"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===========================================================================
// Shared field primitives (same design as the booking wizard)
// ===========================================================================

const inputCls = "w-full border border-gold/35 bg-cream px-3.5 py-3 text-[14px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep"
const sectionHeaderCls = "text-[10px] font-bold tracking-[0.18em] text-gold-deep uppercase"
const stepWrapCls = "border border-gold/30 bg-card p-7 lg:p-10"

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && <span className="text-gold-deep"> *</span>}</label>
      {children}
    </div>
  )
}
const labelCls = "mb-1.5 block text-[9px] font-bold tracking-[0.16em] text-gold-deep"
