import Link from "next/link"
import { FOOTER_NAV, type FooterLink } from "@/lib/footer-nav"
import { BUSINESS } from "@/lib/business"

// ---------------------------------------------------------------------------
// SiteFooter — the full enterprise footer per owner spec. Renders 7
// columns of navigation (Customer Care, Services, Corporate, Shop, Booking,
// Serving, Policies) + NAP block + legal row. Data-driven from
// src/lib/footer-nav.ts — one change there updates every page.
//
// The footer renders on every page via SiteChrome. The NAP block carries
// the local SEO citation signal (identical wording everywhere). The
// Serving column links to the 6 location landing pages.
// ---------------------------------------------------------------------------

function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <li>
      <Link
        href={link.href}
        className="text-[10px] font-medium tracking-[0.06em] text-on-dark-muted transition-colors hover:text-gold"
      >
        {link.label}
      </Link>
      {link.children && link.children.length > 0 && (
        <ul className="mt-1.5 space-y-1 pl-3 border-l border-gold/10">
          {link.children.map(child => (
            <li key={child.href}>
              <Link
                href={child.href}
                className="text-[9px] font-medium tracking-[0.04em] text-on-dark-muted/70 transition-colors hover:text-gold"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-ink px-6 py-10 lg:ml-[232px] lg:px-12">
      <div className="mx-auto max-w-7xl">
        {/* NAP block — Name / Address / Phone. Identical on every page.
            Local SEO citation consistency + map pack signal. */}
        <div className="flex flex-col items-center gap-6 border-b border-gold/15 pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <img src="/brand/footer-logo.png" alt="All About Pawz" width={1021} height={729} className="h-10 w-auto lg:h-12" />
            </div>
            <p className="mt-3 text-[11px] font-bold tracking-[0.14em] text-cream">{BUSINESS.name}</p>
            <p className="text-[10px] text-on-dark-muted">{BUSINESS.tagline}</p>
          </div>
          <div className="text-center text-[11px] leading-relaxed text-on-dark-muted lg:text-right">
            <p>{BUSINESS.address.street}</p>
            <p>{BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}</p>
            <p className="mt-1.5">
              <a href={`tel:${BUSINESS.phone}`} className="text-gold hover:underline">{BUSINESS.phoneDisplay}</a>
            </p>
            <p>
              <a href={`mailto:${BUSINESS.email}`} className="text-gold hover:underline">{BUSINESS.email}</a>
            </p>
          </div>
        </div>

        {/* 7-column footer navigation — responsive: stacks on mobile,
            flex-wrap on tablet, 7 columns on desktop. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 py-8 sm:grid-cols-3 lg:grid-cols-7">
          {FOOTER_NAV.map(col => (
            <div key={col.heading}>
              <h3 className="text-[9px] font-bold tracking-[0.18em] text-gold/80 uppercase">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map(link => (
                  <FooterLinkItem key={link.href + link.label} link={link} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Legal row */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-gold/15 pt-6 text-[10px] text-on-dark-muted">
          <p>© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
          <Link href="/policies/privacy-policy" className="text-gold hover:underline">Privacy Policy</Link>
          <button
            type="button"
            onClick={() => typeof window !== "undefined" && window.dispatchEvent(new Event("pawz:open-cookie-preferences"))}
            className="text-gold hover:underline"
          >
            Cookie Preferences
          </button>
          <Link href="/policies/terms-of-service" className="text-gold hover:underline">Terms of Service</Link>
          <Link href="/sitemap" className="text-gold hover:underline">Sitemap</Link>
          <Link href="/contact" className="text-gold hover:underline">Investor Information</Link>
        </div>
      </div>
    </footer>
  )
}
