import Link from "next/link"
import { FOOTER_NAV, type FooterLink } from "@/lib/footer-nav"
import { BUSINESS } from "@/lib/business"

// ---------------------------------------------------------------------------
// SiteFooter — matched to owner's reference design. Large readable fonts,
// clean 4-column layout (not a run-on list), proper GDPR compliance.
//
// Font sizes (increased 10px per owner directive):
//   • Column headers: 20px (text-xl) bold
//   • Links: 16px (text-base)
//   • Body / NAP: 16px (text-base)
//   • Legal: 14px (text-sm)
//
// GDPR compliance:
//   • Cookie consent button (opens Consent Management Center)
//   • "Your Privacy Choices" link
//   • Privacy Policy link
//   • Terms of Use link
//   • Website Accessibility Policy link
//   • Data subject rights info in the legal block
// ---------------------------------------------------------------------------

function FooterColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-xl font-bold tracking-wide text-cream">{heading}</h3>
      <ul className="mt-5 space-y-4">
        {links.slice(0, 8).map(link => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-base text-on-dark-muted transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
            {link.children && link.children.length > 0 && (
              <ul className="mt-3 space-y-2.5 pl-4 border-l-2 border-gold/10">
                {link.children.slice(0, 6).map(child => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="text-sm text-on-dark-muted/70 transition-colors hover:text-gold"
                    >
                      {child.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SiteFooter() {
  const customerCare = FOOTER_NAV.find(c => c.heading === "Customer Care")
  const services = FOOTER_NAV.find(c => c.heading === "Services")
  const corporate = FOOTER_NAV.find(c => c.heading === "Corporate")
  const policies = FOOTER_NAV.find(c => c.heading === "Policies")
  const serving = FOOTER_NAV.find(c => c.heading === "Serving")
  const booking = FOOTER_NAV.find(c => c.heading === "Booking")

  return (
    <footer className="bg-ink">
      {/* Full-bleed container */}
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-12">

        {/* Top: Brand + NAP (left) + Email signup (right) */}
        <div className="flex flex-col gap-10 border-b border-gold/15 pb-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md">
            <img src="/brand/footer-logo.png" alt="All About Pawz — Pet Grooming & Supply, Memphis, TN" width={1021} height={729} className="h-14 w-auto lg:h-16" />
            <div className="mt-5 text-base leading-relaxed text-on-dark-muted">
              <p className="font-bold text-cream">{BUSINESS.name}</p>
              <p>{BUSINESS.tagline}</p>
              <p className="mt-3">{BUSINESS.address.street}</p>
              <p>{BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}</p>
              <p className="mt-3">
                <a href={`tel:${BUSINESS.phone}`} className="text-gold hover:underline">{BUSINESS.phoneDisplay}</a>
                {" · "}
                <a href={`mailto:${BUSINESS.email}`} className="text-gold hover:underline">{BUSINESS.email}</a>
              </p>
            </div>
            {/* Social icons — 44px touch targets */}
            <div className="mt-6 flex items-center gap-4">
              {BUSINESS.sameAs.map(url => {
                const platform = url.match(/facebook|instagram|pinterest|tiktok/i)?.[0] || "social"
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`All About Pawz on ${platform}`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 text-base font-bold text-cream transition-colors hover:border-gold hover:bg-gold hover:text-ink"
                  >
                    {platform[0].toUpperCase()}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Email signup */}
          <div className="max-w-sm">
            <h3 className="text-xl font-bold text-cream">Keep In Touch</h3>
            <p className="mt-3 text-base text-on-dark-muted">Get grooming tips, exclusive offers, and Memphis pet news.</p>
            <form className="mt-4 flex gap-2" action="/api/newsletter" method="POST">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                className="flex-1 rounded border border-gold/30 bg-cream/5 px-4 py-3 text-base text-cream placeholder:text-on-dark-muted/50 focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="rounded bg-gold px-6 py-3 text-base font-bold text-ink transition-colors hover:bg-gold-deep hover:text-cream"
              >
                Subscribe →
              </button>
            </form>
            <div className="mt-5 flex gap-3">
              <div className="flex items-center gap-2 rounded border border-gold/20 px-4 py-2.5 text-sm text-on-dark-muted">
                <span>Download on the</span>
                <span className="font-bold text-cream">App Store</span>
              </div>
              <div className="flex items-center gap-2 rounded border border-gold/20 px-4 py-2.5 text-sm text-on-dark-muted">
                <span>GET IT ON</span>
                <span className="font-bold text-cream">Google Play</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column nav grid — short lists, not run-on */}
        <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {customerCare && <FooterColumn heading={customerCare.heading} links={customerCare.links} />}
          {services && <FooterColumn heading={services.heading} links={services.links} />}
          {corporate && <FooterColumn heading={corporate.heading} links={corporate.links} />}
          {policies && <FooterColumn heading={policies.heading} links={policies.links} />}
        </div>

        {/* Serving locations — horizontal, not a long vertical list */}
        {serving && (
          <div className="border-t border-gold/15 py-6">
            <h3 className="text-base font-bold text-gold/80">Serving Shelby County</h3>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {serving.links.map(link => (
                <Link key={link.href} href={link.href} className="text-sm text-on-dark-muted hover:text-gold">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* GDPR legal row — privacy choices, cookie consent, accessibility */}
        <div className="border-t border-gold/15 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-on-dark-muted">
            <Link href="/policies/privacy-policy" className="hover:text-gold">Privacy Policy</Link>
            <Link href="/policies/terms-of-service" className="hover:text-gold">Terms of Service</Link>
            <Link href="/policies/terms-of-use" className="hover:text-gold">Terms of Use</Link>
            <button
              type="button"
              onClick={() => typeof window !== "undefined" && window.dispatchEvent(new Event("pawz:open-cookie-preferences"))}
              className="flex items-center gap-1.5 hover:text-gold"
            >
              <span className="text-base">🚫</span>
              Your Privacy Choices
            </button>
            <Link href="/sitemap" className="hover:text-gold">Site Map</Link>
            <Link href="/accessibility" className="hover:text-gold">Website Accessibility Policy</Link>
          </div>
          <div className="mt-5 text-center text-sm text-on-dark-muted">
            <p className="font-bold">© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
            <p className="mt-3 max-w-4xl mx-auto leading-relaxed">
              All About Pawz is a locally owned pet grooming salon and supply shop in Memphis, TN.
              Serving Memphis, Bartlett, Arlington, Collierville, and Millington — Shelby County, TN.
              {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}. {BUSINESS.phoneDisplay}.
              We respect your privacy — see our Privacy Policy for your rights under GDPR and CCPA,
              including the right to access, delete, or restrict processing of your personal data.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
