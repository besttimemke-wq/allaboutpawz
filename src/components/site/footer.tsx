import Link from "next/link"
import { FOOTER_NAV, type FooterLink } from "@/lib/footer-nav"
import { BUSINESS } from "@/lib/business"

// ---------------------------------------------------------------------------
// SiteFooter — national-chain standard (modeled on Petco/Chewy footers).
//
// Design rules (per focus group feedback + national chain comparison):
//   • 4 columns max (not 7 cramped ones) — Customer Care, Services,
//     Corporate, Keep In Touch
//   • Readable fonts: headers 16px bold, links 14px regular, legal 12px
//   • Full-bleed container (max-w-7xl) — uses the full site width
//   • Email signup form in the rightmost column
//   • Social icons + app download badges
//   • Proper legal block with disclaimers below the divider
//   • Left-aligned text within columns for scanability
//
// The footer renders on every page via SiteChrome. NAP block carries
// the local SEO citation signal. Email signup captures leads. Social
// icons + app badges drive engagement.
// ---------------------------------------------------------------------------

function FooterColumn({ heading, links }: { heading: string; links: FooterLink[] }) {
  return (
    <div>
      <h3 className="text-base font-bold tracking-wide text-cream">{heading}</h3>
      <ul className="mt-4 space-y-3">
        {links.map(link => (
          <li key={link.href + link.label}>
            <Link
              href={link.href}
              className="text-sm font-normal text-on-dark-muted transition-colors hover:text-gold"
            >
              {link.label}
            </Link>
            {link.children && link.children.length > 0 && (
              <ul className="mt-2 space-y-2 pl-4 border-l border-gold/10">
                {link.children.map(child => (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      className="text-[13px] font-normal text-on-dark-muted/70 transition-colors hover:text-gold"
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
  // Merge the 7 nav columns into 4 national-chain-standard columns
  const customerCare = FOOTER_NAV.find(c => c.heading === "Customer Care")
  const services = FOOTER_NAV.find(c => c.heading === "Services")
  const corporate = FOOTER_NAV.find(c => c.heading === "Corporate")
  const shop = FOOTER_NAV.find(c => c.heading === "Shop")
  const booking = FOOTER_NAV.find(c => c.heading === "Booking")
  const serving = FOOTER_NAV.find(c => c.heading === "Serving")
  const policies = FOOTER_NAV.find(c => c.heading === "Policies")

  // Merge Services + Shop + Booking into one "Services & Shop" column
  const servicesMerged = services
    ? { heading: "Services & Shop", links: [...services.links, ...(shop?.links || []), ...(booking?.links || [])] }
    : { heading: "Services & Shop", links: [...(shop?.links || []), ...(booking?.links || [])] }

  // Merge Corporate + Serving into one "Company & Locations" column
  const corporateMerged = corporate
    ? { heading: "Company & Locations", links: [...corporate.links, ...(serving?.links || [])] }
    : { heading: "Company & Locations", links: [...(serving?.links || [])] }

  return (
    <footer className="bg-ink">
      {/* Full-bleed container — uses the full site width, not a narrow column */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12">
        {/* Top section: NAP + logo (left) + email signup (right) */}
        <div className="flex flex-col gap-8 border-b border-gold/15 pb-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <img src="/brand/footer-logo.png" alt="All About Pawz — Pet Grooming & Supply, Memphis, TN" width={1021} height={729} className="h-12 w-auto lg:h-14" />
            <div className="mt-4 text-sm leading-relaxed text-on-dark-muted">
              <p className="font-bold text-cream">{BUSINESS.name}</p>
              <p>{BUSINESS.tagline}</p>
              <p className="mt-2">{BUSINESS.address.street}</p>
              <p>{BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}</p>
              <p className="mt-2">
                <a href={`tel:${BUSINESS.phone}`} className="text-gold hover:underline">{BUSINESS.phoneDisplay}</a>
                {" · "}
                <a href={`mailto:${BUSINESS.email}`} className="text-gold hover:underline">{BUSINESS.email}</a>
              </p>
            </div>
            {/* Social icons */}
            <div className="mt-5 flex items-center gap-3">
              {BUSINESS.sameAs.map(url => {
                const platform = url.match(/facebook|instagram|pinterest|tiktok/i)?.[0] || "social"
                return (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`All About Pawz on ${platform}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 text-cream transition-colors hover:border-gold hover:bg-gold hover:text-ink"
                  >
                    <span className="text-xs font-bold uppercase">{platform[0]}</span>
                  </a>
                )
              })}
            </div>
          </div>

          {/* Email signup form */}
          <div className="max-w-sm">
            <h3 className="text-base font-bold text-cream">Keep In Touch</h3>
            <p className="mt-2 text-sm text-on-dark-muted">Get grooming tips, exclusive offers, and Memphis pet news in your inbox.</p>
            <form className="mt-4 flex gap-2" action="/api/newsletter" method="POST">
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                className="flex-1 rounded border border-gold/30 bg-cream/5 px-4 py-2.5 text-sm text-cream placeholder:text-on-dark-muted/50 focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="rounded bg-gold px-5 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-gold-deep hover:text-cream"
              >
                Subscribe →
              </button>
            </form>
            {/* App badges placeholder */}
            <div className="mt-4 flex gap-3">
              <div className="flex items-center gap-2 rounded border border-gold/20 px-3 py-2 text-xs text-on-dark-muted">
                <span>Download on the</span>
                <span className="font-bold text-cream">App Store</span>
              </div>
              <div className="flex items-center gap-2 rounded border border-gold/20 px-3 py-2 text-xs text-on-dark-muted">
                <span>GET IT ON</span>
                <span className="font-bold text-cream">Google Play</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-column navigation grid — national chain standard */}
        <div className="grid grid-cols-2 gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {customerCare && <FooterColumn heading={customerCare.heading} links={customerCare.links} />}
          {servicesMerged && <FooterColumn heading={servicesMerged.heading} links={servicesMerged.links} />}
          {corporateMerged && <FooterColumn heading={corporateMerged.heading} links={corporateMerged.links} />}
          {/* Policies column */}
          {policies && <FooterColumn heading={policies.heading} links={policies.links} />}
        </div>

        {/* Legal row — sub-footer */}
        <div className="border-t border-gold/15 pt-6">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-on-dark-muted">
            <Link href="/policies/privacy-policy" className="hover:text-gold">Privacy Policy</Link>
            <Link href="/policies/terms-of-service" className="hover:text-gold">Terms of Service</Link>
            <Link href="/policies/terms-of-use" className="hover:text-gold">Terms of Use</Link>
            <button
              type="button"
              onClick={() => typeof window !== "undefined" && window.dispatchEvent(new Event("pawz:open-cookie-preferences"))}
              className="hover:text-gold"
            >
              Your Privacy Choices
            </button>
            <Link href="/sitemap" className="hover:text-gold">Site Map</Link>
            <Link href="/accessibility" className="hover:text-gold">Website Accessibility Policy</Link>
          </div>
          <div className="mt-4 text-center text-xs text-on-dark-muted">
            <p className="font-bold">© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
            <p className="mt-2 max-w-4xl mx-auto leading-relaxed">
              All About Pawz is a locally owned pet grooming salon and supply shop in Memphis, TN.
              Serving Shelby County including Memphis, Bartlett, Arlington, Collierville, and Millington.
              Phone: {BUSINESS.phoneDisplay}. {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
