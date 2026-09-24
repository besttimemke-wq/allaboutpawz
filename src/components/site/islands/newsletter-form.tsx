"use client"

export function NewsletterForm() {
  return (
    <form
      className="mt-5 flex"
      onSubmit={async (e) => {
        e.preventDefault()
        const form = e.currentTarget
        const email = (form.elements.namedItem("email") as HTMLInputElement).value
        if (!email) return
        try {
          await fetch("/api/cms/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
          form.reset()
        } catch { /* ignore */ }
      }}
    >
      <input
        name="email"
        type="email"
        required
        placeholder="Enter your email"
        aria-label="Email address"
        className="w-full border border-gold/40 bg-cream px-3 py-2.5 text-[11.5px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep"
      />
      <button type="submit" className="btn-gold px-5 py-2.5">SUBSCRIBE</button>
    </form>
  )
}
