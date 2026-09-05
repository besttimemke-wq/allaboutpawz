"use client"

import { MapPin, Phone, Mail, Clock, Facebook, Instagram } from "lucide-react"
import { useCmsSettings } from "./use-cms"

// Contact page social links — CSR with "#" fallbacks until the
// admin-published URLs arrive.
export function SocialLinks() {
  const { settings: s } = useCmsSettings()
  return (
    <>
      <a href={s.instagram || "#"} aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-deep transition-colors hover:bg-gold/10"><Instagram className="h-4 w-4" /></a>
      <a href={s.facebook || "#"} aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-deep transition-colors hover:bg-gold/10"><Facebook className="h-4 w-4" /></a>
    </>
  )
}

// Contact page essentials — CSR: renders instantly with the built-in fallback
// values, swaps in the admin-published salon details when they arrive.
export function ContactDetails() {
  const { settings: s } = useCmsSettings()
  const details = [
    { icon: MapPin, label: "VISIT US", lines: [s.addressLine1 || "1428 Maple Grove Avenue", s.addressLine2 || "Suite 4, Riverbend, IL 60614"] },
    { icon: Phone, label: "CALL US", lines: [s.phone || "901-800-7182"] },
    { icon: Mail, label: "EMAIL US", lines: [s.email || "help@aapawz.com"] },
    { icon: Clock, label: "HOURS", lines: [`Tuesday – Saturday  ${s.hoursTueSat || "9am – 6pm"}`, `Sunday  ${s.hoursSun || "10am – 4pm"}`, `Monday  ${s.hoursMon || "Closed"}`] },
  ]
  return (
    <div className="mt-8 divide-y divide-gold/20">
      {details.map(({ icon: Icon, label, lines }) => (
        <div key={label} className="flex gap-5 py-5 first:pt-0 last:pb-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream-deep/40">
            <Icon className="h-4 w-4 text-gold-deep" strokeWidth={1.6} />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-gold-deep">{label}</p>
            {lines.map((l) => <p key={l} className="mt-1 text-[12.5px] leading-[1.8] text-ink-soft">{l}</p>)}
          </div>
        </div>
      ))}
    </div>
  )
}
