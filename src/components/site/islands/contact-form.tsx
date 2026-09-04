"use client"

import { useState } from "react"

export function ContactForm() {
  const [sent, setSent] = useState(false)
  return (
    <section className="marble bg-cream px-8 py-14 lg:px-12">
      <div className="border border-gold/30 bg-card p-8">
        <h2 className="text-center text-[10.5px] font-bold tracking-[0.2em] text-ink">SEND US A MESSAGE</h2>
        {sent ? (
          <p className="mt-6 text-center text-[12.5px] text-gold-deep">Thank you — your message has been received. We&apos;ll be in touch personally.</p>
        ) : (
          <form className="mt-7 space-y-4" onSubmit={async (e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            try {
              await fetch("/api/cms/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: fd.get("name"), email: fd.get("email"),
                  subject: fd.get("subject"), message: fd.get("message"), status: "UNREAD",
                }),
              })
              setSent(true)
            } catch { /* ignore */ }
          }}>
            <div className="grid gap-4 lg:grid-cols-2">
              <input name="name" required placeholder="Your Name" aria-label="Your Name" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
              <input name="email" type="email" required placeholder="Email Address" aria-label="Email Address" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            </div>
            <input name="subject" placeholder="Subject" aria-label="Subject" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <textarea name="message" required rows={4} placeholder="Your message" aria-label="Your message" className="w-full border border-gold/35 bg-cream px-3.5 py-3 text-[12px] text-ink placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold-deep" />
            <button type="submit" className="btn-dark w-full">SEND MESSAGE</button>
          </form>
        )}
      </div>
    </section>
  )
}
