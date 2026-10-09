"use client"

import { useState } from "react"
import { Send } from "lucide-react"

// ---------------------------------------------------------------------------
// NewCustomerSignup — the "10% off for new customers" email capture on the
// homepage's final offer banner. Reuses the newsletter endpoint: joining the
// list IS the 10%-off-for-new-customers mechanic.
// ---------------------------------------------------------------------------

export function NewCustomerSignup() {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="mt-5 flex w-full max-w-[440px] flex-col gap-2.5 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const email = (form.elements.namedItem("email") as HTMLInputElement).value
        if (!email || busy) return
        setBusy(true)
        try {
          await fetch("/api/cms/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
          setDone(true)
          form.reset()
        } catch {
          /* keep the form usable on a blip */
        } finally {
          setBusy(false)
        }
      }}
    >
      {done ? (
        <p className="flex items-center gap-2 text-[13px] font-semibold text-[#F2C500]">
          You&apos;re in — check your inbox for your 10% code.
        </p>
      ) : (
        <>
          <input
            name="email"
            type="email"
            required
            placeholder="Enter your email"
            aria-label="Email address for 10% off"
            className="min-h-[44px] w-full border border-white/25 bg-white px-4 py-2.5 text-[13px] text-ink placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#F2C500]"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 bg-[#F2C500] px-6 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] text-[#1a1a1a] transition-colors hover:bg-white disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {busy ? "Sending…" : "Get My 10% Off"}
          </button>
        </>
      )}
    </form>
  )
}
