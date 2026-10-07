"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, MapPin, Phone, Mail, ArrowUp, Dog, Cat, Package, LayoutGrid, CalendarDays, ShieldCheck } from "lucide-react"
import { BUSINESS } from "@/lib/business"

// ---------------------------------------------------------------------------
// SiteFooter — EXACT match to owner's reference design. 5-column grid
// with expandable chevron sections, secondary nav bar with dropdowns,
// payment icons + scroll-to-top.
//
// Tier 1: 5-column grid (Brand, Customer Care, Services, Other Site Content, Corporate)
// Tier 2: Horizontal nav bar (Pricing/Services/Contact/Process/Shop | Dog/Cat/Product/Collections | Booking ▾ | Serving ▾ | Policies ▾)
// Tier 3: Copyright + payment icons + scroll-to-top
//
// Expandable sections use chevrons (down=collapsed, up=expanded).
// Client component for interactivity.
// ---------------------------------------------------------------------------

function ExpandableLink({
  label,
  href,
  children,
}: {
  label: string
  href: string
  children?: { label: string; href: string }[]
}) {
  const [expanded, setExpanded] = useState(false)
  if (!children || children.length === 0) {
    return (
      <li>
        <Link href={href} className="text-base text-on-dark-muted hover:text-gold">
          {label}
        </Link>
      </li>
    )
  }
  return (
    <li>
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1 text-base text-on-dark-muted hover:text-gold"
      >
        {label}
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <ul className="mt-2 space-y-2 pl-4 border-l-2 border-gold/10">
          {subItems.map(child => (
            <li key={child.href}>
              <Link href={child.href} className="text-sm text-on-dark-muted/70 hover:text-gold">
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function DropdownBar({
  icon: Icon,
  label,
  items,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>
  label: string
  items: { label: string; href: string }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-semibold text-on-dark-muted hover:text-gold"
      >
        <Icon size={14} className="text-gold" />
        {label}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 rounded border border-gold/20 bg-ink px-4 py-3 shadow-xl">
          <ul className="space-y-2">
            {items.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block whitespace-nowrap text-sm text-on-dark-muted hover:text-gold"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function SiteFooter() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" })

  return (
    <footer className="bg-ink">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">

        {/* ===== TIER 1: 5-COLUMN GRID ===== */}
        <div className="grid grid-cols-2 gap-8 py-14 sm:grid-cols-3 lg:grid-cols-5">

          {/* Column 1: Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <img src="/brand/footer-logo.png" alt="All About Pawz — Luxury Pet Grooming, Memphis, TN" width={1021} height={729} className="h-16 w-auto" />
            <p className="mt-3 text-sm font-bold tracking-[0.15em] text-gold">LUXURY PET GROOMING</p>
            <p className="mt-3 text-sm leading-relaxed text-on-dark-muted">
              Premium grooming, wellness and care for your beloved pets. Because they deserve the very best.
            </p>
            <div className="mt-5 space-y-2 text-sm text-on-dark-muted">
              <p className="flex items-center gap-2"><MapPin size={14} className="text-gold" /> {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-gold" /> <a href={`tel:${BUSINESS.phone}`} className="hover:text-gold">{BUSINESS.phoneDisplay}</a></p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-gold" /> <a href={`mailto:${BUSINESS.email}`} className="hover:text-gold">{BUSINESS.email}</a></p>
            </div>
            <div className="mt-5 flex items-center gap-3">
              {BUSINESS.sameAs.map(url => {
                const platform = url.match(/facebook|instagram|pinterest|tiktok/i)?.[0] || "S"
                return (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" aria-label={`All About Pawz on ${platform}`}
                     className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/30 text-sm font-bold text-cream transition-colors hover:border-gold hover:bg-gold hover:text-ink">
                    {platform[0].toUpperCase()}
                  </a>
                )
              })}
            </div>
          </div>

          {/* Column 2: Customer Care */}
          <div>
            <h3 className="text-sm font-bold tracking-[0.18em] text-gold">CUSTOMER CARE</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/policies/refunds-returns" className="text-base text-on-dark-muted hover:text-gold">Returns</Link></li>
              <li><Link href="/policies/shipping-delivery" className="text-base text-on-dark-muted hover:text-gold">Shipping Info</Link></li>
              <li><Link href="/account" className="text-base text-on-dark-muted hover:text-gold">Order Lookup</Link></li>
              <li><Link href="/faq#recalls" className="text-base text-on-dark-muted hover:text-gold">Recalls</Link></li>
              <li><Link href="/contact" className="text-base text-on-dark-muted hover:text-gold">Store Locator</Link></li>
              <ExpandableLink label="Help" href="/contact" subItems={[{ label: "Contact Us", href: "/contact" }]} />
              <li><Link href="/accessibility" className="text-base text-on-dark-muted hover:text-gold">Website Accessibility Policy</Link></li>
            </ul>
          </div>

          {/* Column 3: Services */}
          <div>
            <h3 className="text-sm font-bold tracking-[0.18em] text-gold">SERVICES</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/pricing" className="text-base text-on-dark-muted hover:text-gold">Subscription Perks</Link></li>
              <li><Link href="/services" className="text-base text-on-dark-muted hover:text-gold">Dog Grooming</Link></li>
              <ExpandableLink label="Learning Academy" href="/learn" subItems={[
                { label: "Animal Behavior Technician", href: "/learn/courses/animal-behavior-technician" },
                { label: "Animal Care Assistant", href: "/learn/courses/animal-care-assistant" },
                { label: "Equine Nursing Technicians", href: "/learn/courses/equine-nursing-technicians" },
                { label: "Felines & Health", href: "/learn/courses/felines-and-health" },
                { label: "Pet Grooming", href: "/learn/courses/pet-grooming" },
                { label: "Grooming Salon Practice Management", href: "/learn/courses/grooming-salon-practice-management" },
                { label: "Professional Trainer", href: "/learn/courses/professional-trainer" },
                { label: "Pre-Veterinary Medicine", href: "/learn/courses/pre-veterinary-medicine" },
                { label: "Veterinary Assistant", href: "/learn/courses/veterinary-assistant" },
                { label: "Veterinary Practice Management", href: "/learn/courses/veterinary-practice-management" },
                { label: "Veterinary Pathology Technician", href: "/learn/courses/veterinary-pathology-technician" },
                { label: "Veterinary Surgical Technician", href: "/learn/courses/veterinary-surgical-technician" },
                { label: "Veterinary Technician", href: "/learn/courses/veterinary-technician" },
                { label: "Veterinary Technology", href: "/learn/courses/veterinary-technology" },
                { label: "Zookeeper Assistant", href: "/learn/courses/zookeeper-assistant" },
                { label: "Positive Dog Training", href: "/learn/courses/positive-dog-training" },
              ]} />
            </ul>
          </div>

          {/* Column 4: Other Site Content */}
          <div>
            <h3 className="text-sm font-bold tracking-[0.18em] text-gold">OTHER SITE CONTENT</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/veterinary-partners" className="text-base text-on-dark-muted hover:text-gold">Veterinary Partners</Link></li>
              <li><Link href="/pet-insurance" className="text-base text-on-dark-muted hover:text-gold">Pet Insurance</Link></li>
              <li><Link href="/pet-adoption" className="text-base text-on-dark-muted hover:text-gold">Pet Adoption</Link></li>
              <ExpandableLink label="Pet Education Center" href="/pet-education" subItems={[
                { label: "Articles By Pets", href: "/pet-education/articles" },
                { label: "Pet Care Sheets", href: "/pet-education/care-sheets" },
              ]} />
              <ExpandableLink label="Product Collections" href="/shop/collections" subItems={[
                { label: "Pets in the Classroom", href: "/shop/collections/pets-in-the-classroom" },
              ]} />
            </ul>
          </div>

          {/* Column 5: Corporate */}
          <div>
            <h3 className="text-sm font-bold tracking-[0.18em] text-gold">CORPORATE</h3>
            <ul className="mt-4 space-y-3">
              <li><Link href="/careers" className="text-base text-on-dark-muted hover:text-gold">Careers</Link></li>
              <ExpandableLink label="About Us" href="/about" subItems={[
                { label: "Code of Ethics", href: "/about#code-of-ethics" },
              ]} />
              <li><Link href="/events" className="text-base text-on-dark-muted hover:text-gold">Event Sponsorships</Link></li>
              <ExpandableLink label="Sellers" href="/seller" subItems={[
                { label: "Seller Program", href: "/seller" },
              ]} />
              <li><Link href="/shop/collections/gift-cards" className="text-base text-on-dark-muted hover:text-gold">Gift Cards</Link></li>
              <li><Link href="/pricing" className="text-base text-on-dark-muted hover:text-gold">Coupons and Promos</Link></li>
              <li><Link href="/contact" className="text-base text-on-dark-muted hover:text-gold">Investors</Link></li>
              <li><Link href="/sustainability" className="text-base text-on-dark-muted hover:text-gold">Sustainability</Link></li>
              <li><Link href="/contact" className="text-base text-on-dark-muted hover:text-gold">Advertise with Us</Link></li>
            </ul>
          </div>
        </div>

        {/* ===== TIER 2: SECONDARY NAV BAR ===== */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-gold/15 py-5">
          {/* Text links */}
          <Link href="/pricing" className="text-sm font-semibold text-on-dark-muted hover:text-gold">Pricing</Link>
          <span className="text-gold/20">|</span>
          <Link href="/services" className="text-sm font-semibold text-on-dark-muted hover:text-gold">Services</Link>
          <span className="text-gold/20">|</span>
          <Link href="/contact" className="text-sm font-semibold text-on-dark-muted hover:text-gold">Contact</Link>
          <span className="text-gold/20">|</span>
          <Link href="/process" className="text-sm font-semibold text-on-dark-muted hover:text-gold">Our Process</Link>
          <span className="text-gold/20">|</span>
          <Link href="/shop" className="text-sm font-semibold text-on-dark-muted hover:text-gold">/shop</Link>
          <span className="text-gold/20">|</span>
          {/* Pet type nav */}
          <Link href="/shop/dog" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-gold"><Dog size={14} className="text-gold" /> Dog</Link>
          <Link href="/shop/cat" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-gold"><Cat size={14} className="text-gold" /> Cat</Link>
          <Link href="/shop" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-gold"><Package size={14} className="text-gold" /> Product</Link>
          <Link href="/shop/collections" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-gold"><LayoutGrid size={14} className="text-gold" /> Collections</Link>
          <span className="text-gold/20">|</span>
          {/* Dropdowns */}
          <DropdownBar icon={CalendarDays} label="Booking" items={[
            { label: "Booking Overview", href: "/book" },
            { label: "Book Appointment", href: "/book/appointment" },
            { label: "Free Consultation", href: "/book/consultation" },
          ]} />
          <DropdownBar icon={MapPin} label="Serving" items={[
            { label: "Dog Grooming in Arlington, TN", href: "/grooming/arlington-tn" },
            { label: "Dog Grooming in Bartlett, TN", href: "/grooming/bartlett-tn" },
            { label: "Dog Grooming in Collierville, TN", href: "/grooming/collierville-tn" },
            { label: "Dog Grooming in Memphis, TN", href: "/grooming/memphis-tn" },
            { label: "Dog Grooming in Millington, TN", href: "/grooming/millington-tn" },
            { label: "Dog Grooming in Shelby County, TN", href: "/grooming/shelby-county-tn" },
          ]} />
          <DropdownBar icon={ShieldCheck} label="Policies" items={[
            { label: "Cancellations", href: "/policies/cancellations" },
            { label: "Late Arrivals", href: "/policies/late-arrivals" },
            { label: "Matted Coats", href: "/policies/matted-coats" },
            { label: "Privacy Policy", href: "/policies/privacy-policy" },
            { label: "Refunds & Returns", href: "/policies/refunds-returns" },
            { label: "Shipping & Delivery", href: "/policies/shipping-delivery" },
            { label: "Terms of Service", href: "/policies/terms-of-service" },
            { label: "Terms of Use", href: "/policies/terms-of-use" },
            { label: "Your Privacy Choices", href: "/policies/privacy-policy#choices" },
            { label: "Vaccinations", href: "/policies/vaccinations" },
          ]} />
        </div>

        {/* ===== TIER 3: COPYRIGHT + PAYMENTS + SCROLL TOP ===== */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gold/15 py-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <p className="text-sm text-on-dark-muted">© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
            <button onClick={() => window.dispatchEvent(new Event("pawz:open-cookie-preferences"))} className="text-sm text-on-dark-muted hover:text-gold">
              🚫 Your Privacy Choices
            </button>
          </div>
          <div className="flex items-center gap-3">
            {/* Payment icons */}
            <span className="rounded bg-cream/10 px-2 py-1 text-xs font-bold text-cream">VISA</span>
            <span className="rounded bg-cream/10 px-2 py-1 text-xs font-bold text-cream">Mastercard</span>
            <span className="rounded bg-cream/10 px-2 py-1 text-xs font-bold text-cream">AMEX</span>
            <span className="rounded bg-cream/10 px-2 py-1 text-xs font-bold text-cream">Apple Pay</span>
            <span className="rounded bg-cream/10 px-2 py-1 text-xs font-bold text-cream">G Pay</span>
            {/* Scroll to top */}
            <button onClick={scrollToTop} aria-label="Scroll to top"
              className="flex h-9 w-9 items-center justify-center rounded border border-gold/30 text-gold hover:border-gold hover:bg-gold hover:text-ink">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
