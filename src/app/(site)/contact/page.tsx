import { Facebook, Instagram, MapPin, Phone, Mail, Clock } from "lucide-react"
import { Divider } from "@/components/site/brand"
import { PageHeader } from "@/components/site/site-chrome"
import { HeroCtas } from "@/components/site/hero-ctas"
import { ContactForm } from "@/components/site/islands/contact-form"
import { Reveal } from "@/components/site/islands/reveal"
import { getSiteContent } from "@/lib/site-data"

// Black band under the hero — exact copy of the homepage services band
// structure: left title column + 4 centered items with numbered gold
// circles (the site's numbers language) and gold hairline dividers.
const CONTACT_POINTS = [
  {
    title: "PERSONAL REPLIES",
    body: "A real member of our\nteam answers every message.",
  },
  {
    title: "FAST RESPONSES",
    body: "We typically reply within\none business day.",
  },
  {
    title: "VISIT ANYTIME",
    body: "Meet the team and see\nwhere the magic happens.",
  },
  {
    title: "FOLLOW THE FUN",
    body: "Fresh cuts and pup dates\non Instagram & Facebook.",
  },
]

export const metadata = {
  title: "Contact Us | All About Pawz",
  description: "Questions about services, packages, or your pup's coat? Reach All About Pawz by phone, email, or a visit to the salon — we respond personally.",
}

export default async function ContactPage() {
  const { settings: s } = await getSiteContent()
  const details = [
    { icon: MapPin, label: "VISIT US", lines: [s.addressLine1 || "1428 Maple Grove Avenue", s.addressLine2 || "Suite 4, Riverbend, IL 60614"] },
    { icon: Phone, label: "CALL US", lines: [s.phone || "901-800-7182"] },
    { icon: Mail, label: "EMAIL US", lines: [s.email || "help@aapawz.com"] },
    { icon: Clock, label: "HOURS", lines: [`Tuesday – Saturday  ${s.hoursTueSat || "9am – 6pm"}`, `Sunday  ${s.hoursSun || "10am – 4pm"}`, `Monday  ${s.hoursMon || "Closed"}`] },
  ]
  return (
    <>
      <PageHeader n="10" label="CONTACT" />

      {/* HERO — site standard: centered text left, photo right filling the column. */}
      <section className="grid grid-cols-1 lg:min-h-[520px] lg:grid-cols-[1fr_1.25fr]">
        <div className="marble flex flex-col justify-center bg-cream px-8 py-16 lg:px-12">
          <h1 className="font-display text-[42px] leading-[1.08] text-ink lg:text-[52px]">Come Say<br />Hello.</h1>
          <div className="mt-6"><Divider /></div>
          <p className="mt-6 max-w-[330px] text-[12.5px] leading-[1.85] text-ink-soft">
            Questions about a service, a coat type, or which package suits your pup best? We would love to hear from you. Reach out and a member of our team will respond personally.
          </p>
          <HeroCtas />
        </div>
        <div className="relative min-h-[300px]">
          <img
            src="/Contact/contacthero-v2.jpeg"
            alt="Seven dogs of different breeds posing together in the All About Pawz dog grooming salon beneath the shop sign"
            width={1217}
            height={679}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </section>

      {/* SECOND SECTION — black band copied from the homepage services band. */}
      <section className="bg-ink px-8 py-12 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_2.4fr]">
          <div className="lg:border-r lg:border-gold/25 lg:pr-10">
            <p className="eyebrow-dark">GET IN TOUCH</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-on-dark">Every Pup.<br />Every Question.<br />Every Detail.</h2>
            <p className="mt-4 max-w-[290px] text-[12px] leading-[1.75] text-on-dark-muted">
              However you reach out — a call, a note, or a visit — you&apos;ll always get a real person who knows pups and loves what they do.
            </p>
            <a href="#message" className="btn-gold mt-6 inline-flex">SEND A MESSAGE</a>
          </div>
          <div className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
            {CONTACT_POINTS.map(({ title, body }, i) => (
              <div key={title} className={`px-6 text-center ${i > 0 ? "lg:border-l lg:border-gold/25" : ""}`}>
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-[12px] font-bold tracking-[0.08em] text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-[11.5px] font-bold tracking-[0.15em] text-gold">{title}</h3>
                <p className="mt-3 whitespace-pre-line text-[12px] leading-[1.7] text-on-dark-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THIRD SECTION — two columns: the essentials (address, phone, email,
          hours) share the row with the animated Send Us a Message card. */}
      <section className="marble bg-cream px-8 py-14 lg:px-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <Reveal>
            <p className="eyebrow">THE ESSENTIALS</p>
            <h2 className="mt-3 font-display text-[30px] leading-[1.18] text-ink">Find Us.<br />Call Us.<br />Write Us.</h2>
            <div className="mt-8 divide-y divide-gold/20">
              {details.map((d) => (
                <div key={d.label} className="flex gap-5 py-5 first:pt-0 last:pb-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-cream-deep/40">
                    <d.icon className="h-4 w-4 text-gold-deep" strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] text-gold-deep">{d.label}</p>
                    {d.lines.map((l) => <p key={l} className="mt-1 text-[12.5px] leading-[1.8] text-ink-soft">{l}</p>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-4">
              <a href={s.instagram || "#"} aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-deep transition-colors hover:bg-gold/10"><Instagram className="h-4 w-4" /></a>
              <a href={s.facebook || "#"} aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold-deep transition-colors hover:bg-gold/10"><Facebook className="h-4 w-4" /></a>
            </div>
          </Reveal>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
