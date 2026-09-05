"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"

// Premium black message card — the counterpart to the details column on the
// contact page. Reveals on scroll; form fields stagger in; the success state
// swaps in with a spring-pop check.
export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const field = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 },
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setSending(true)
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
    } catch {
      setSending(false)
    }
  }

  const inputCls =
    "w-full border border-gold/30 bg-ink-soft/40 px-3.5 py-3 text-[12px] text-on-dark placeholder:text-on-dark-muted/70 transition-colors focus:border-gold-deep focus:outline-none focus:ring-1 focus:ring-gold-deep/50"

  return (
    <motion.div
      id="message"
      initial={{ opacity: 0, y: 44 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="border border-gold/30 bg-ink p-8 lg:p-10"
    >
      <p className="eyebrow-dark">SEND US A MESSAGE</p>
      <h3 className="mt-3 font-display text-[26px] leading-[1.15] text-on-dark">
        We&apos;d Love to<br />Hear From You.
      </h3>
      <p className="mt-3 text-[12px] leading-[1.75] text-on-dark-muted">
        Fill out the form and a member of our team will get back to you personally.
      </p>

      <AnimatePresence mode="wait" initial={false}>
        {sent ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center py-9 text-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.12 }}
            >
              <CheckCircle2 className="h-11 w-11 text-gold" strokeWidth={1.3} />
            </motion.div>
            <p className="mt-4 max-w-[300px] text-[12.5px] leading-[1.85] text-on-dark">
              Thank you — your message has been received.<br />We&apos;ll be in touch personally.
            </p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="mt-7 space-y-4"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            onSubmit={onSubmit}
          >
            <motion.div variants={field} className="grid gap-4 lg:grid-cols-2">
              <input name="name" required placeholder="Your Name" aria-label="Your Name" className={inputCls} />
              <input name="email" type="email" required placeholder="Email Address" aria-label="Email Address" className={inputCls} />
            </motion.div>
            <motion.div variants={field}>
              <input name="subject" placeholder="Subject" aria-label="Subject" className={inputCls} />
            </motion.div>
            <motion.div variants={field}>
              <textarea name="message" required rows={4} placeholder="Your message" aria-label="Your message" className={`${inputCls} resize-none`} />
            </motion.div>
            <motion.div variants={field}>
              <motion.button
                type="submit"
                disabled={sending}
                whileHover={{ scale: sending ? 1 : 1.015 }}
                whileTap={{ scale: sending ? 1 : 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="btn-gold w-full disabled:cursor-wait disabled:opacity-70"
              >
                {sending ? "SENDING…" : "SEND MESSAGE"}
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
