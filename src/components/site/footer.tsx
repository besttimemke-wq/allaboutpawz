"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronUp, MapPin, Phone, Mail, ArrowUp, Dog, Cat, Package, LayoutGrid, CalendarDays, ShieldCheck } from "lucide-react"
import { BUSINESS } from "@/lib/business"

// Real social media SVG icons
function FacebookIcon() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>) }
function InstagramIcon() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.39C1.35 2.69.94 3.36.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13.67.67 1.34 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.39.67-.67 1.08-1.34 1.39-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.39-2.13C20.31 1.35 19.64.94 18.86.63 18.1.33 17.22.13 15.95.07 14.67.01 14.26 0 12 0z"/><path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/><circle cx="18.41" cy="5.59" r="1.44"/></svg>) }
function TikTokIcon() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.83 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 1 0 15.73 16v-3.66a8.16 8.16 0 0 0 4.82 1.55V8.45a4.85 4.85 0 0 1-.96-.1v.34z"/></svg>) }
function PinterestIcon() { return (<svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.18-.11-.95-.2-2.4.04-3.44.22-.93 1.4-5.94 1.4-5.94s-.36-.72-.36-1.78c0-1.67.97-2.92 2.18-2.92 1.03 0 1.53.77 1.53 1.7 0 1.04-.66 2.59-1 4.03-.28 1.2.6 2.18 1.78 2.18 2.14 0 3.78-2.26 3.78-5.52 0-2.88-2.07-4.9-5.03-4.9-3.43 0-5.44 2.57-5.44 5.23 0 1.04.4 2.15.9 2.75.1.12.11.22.08.34l-.33 1.37c-.05.22-.17.27-.4.16-1.5-.7-2.44-2.88-2.44-4.65 0-3.78 2.75-7.26 7.93-7.26 4.16 0 7.4 2.97 7.4 6.93 0 4.14-2.6 7.47-6.21 7.47-1.21 0-2.35-.63-2.74-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15A12 12 0 1 0 12 0z"/></svg>) }

// Real payment SVG logos
function VisaLogo() { return (<svg viewBox="0 0 80 26" className="h-6 w-auto"><rect width="80" height="26" rx="4" fill="#1A1F71"/><text x="40" y="18" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="Arial">VISA</text></svg>) }
function MastercardLogo() { return (<svg viewBox="0 0 80 26" className="h-6 w-auto"><rect width="80" height="26" rx="4" fill="#16161D"/><circle cx="32" cy="13" r="9" fill="#EB001B"/><circle cx="48" cy="13" r="9" fill="#F79E1B"/><path d="M40 6.5a9 9 0 0 0 0 13 9 9 0 0 0 0-13" fill="#FF5F00"/></svg>) }
function AmexLogo() { return (<svg viewBox="0 0 80 26" className="h-6 w-auto"><rect width="80" height="26" rx="4" fill="#2E77BB"/><text x="40" y="18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold" fontFamily="Arial">AMEX</text></svg>) }
function ApplePayLogo() { return (<svg viewBox="0 0 80 26" className="h-6 w-auto"><rect width="80" height="26" rx="4" fill="#16161D"/><text x="40" y="18" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="600" fontFamily="Arial">Pay</text></svg>) }
function GooglePayLogo() { return (<svg viewBox="0 0 80 26" className="h-6 w-auto"><rect width="80" height="26" rx="4" fill="#16161D"/><text x="40" y="18" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="600" fontFamily="Arial">G Pay</text></svg>) }

// Pipe divider between groups in secondary nav
function Pipe() { return <span className="text-black/20 mx-2">|</span> }

// Expandable — FLAT on black canvas, no box/border/container. Pushes content DOWN inline.
function Expandable({ label, href, subItems }: { label: string; href: string; subItems: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-base text-on-dark-muted hover:text-black">
        {label}
        {open ? <ChevronUp size={14} className="text-black" /> : <ChevronDown size={14} className="text-black" />}
      </button>
      {open && (
        <div className="mt-2">
          {subItems.map(s => (
            <div key={s.href} className="py-1">
              <Link href={s.href} className="text-sm text-on-dark-muted/70 hover:text-black">› {s.label}</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// DropdownBar — INLINE ACCORDION (push down), NOT popup/overlay. No box, no border.
// Flat text on black canvas, just like the Expandable component.
function DropdownBar({ icon: Icon, label, items }: { icon: React.ComponentType<{ className?: string; size?: number }>; label: string; items: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-sm font-semibold text-on-dark-muted hover:text-black">
        <Icon size={14} className="text-black" /> {label}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2">
          {items.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block py-1 text-sm text-on-dark-muted/70 hover:text-black whitespace-nowrap">
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-ink">
      <div className="w-full px-8 lg:px-12">

        {/* ===== TIER 1: 5-COLUMN GRID WITH VERTICAL DIVIDING LINES BETWEEN COLUMNS ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-5 items-start gap-0 py-16">
          {/* Column 1: Brand */}
          <div className="px-6 border-r border-gold/10">
            <img src="/brand/footer-logo.png" alt="All About Pawz — Luxury Pet Grooming, Memphis, TN" width={1021} height={729} className="h-16 w-auto" />
            <p className="mt-3 text-sm font-bold tracking-[0.15em] text-black">LUXURY PET GROOMING</p>
            <p className="mt-3 text-sm leading-relaxed text-on-dark-muted">Premium grooming, wellness and care for your beloved pets. Because they deserve the very best.</p>
            <div className="mt-5 space-y-2 text-sm text-on-dark-muted">
              <p className="flex items-center gap-2"><MapPin size={14} className="text-black" /> {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-black" /> <a href={`tel:${BUSINESS.phone}`} className="hover:text-black">{BUSINESS.phoneDisplay}</a></p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-black" /> <a href={`mailto:${BUSINESS.email}`} className="hover:text-black">{BUSINESS.email}</a></p>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <a href="https://www.facebook.com/allaboutpawz" target="_blank" rel="noopener noreferrer" aria-label="All About Pawz on Facebook" className="text-on-dark-muted hover:text-black"><FacebookIcon /></a>
              <a href="https://www.instagram.com/allaboutpawz" target="_blank" rel="noopener noreferrer" aria-label="All About Pawz on Instagram" className="text-on-dark-muted hover:text-black"><InstagramIcon /></a>
              <a href="https://www.tiktok.com/@allaboutpawz" target="_blank" rel="noopener noreferrer" aria-label="All About Pawz on TikTok" className="text-on-dark-muted hover:text-black"><TikTokIcon /></a>
              <a href="https://www.pinterest.com/allaboutpawz" target="_blank" rel="noopener noreferrer" aria-label="All About Pawz on Pinterest" className="text-on-dark-muted hover:text-black"><PinterestIcon /></a>
            </div>
          </div>

          {/* Column 2: Customer Care */}
          <div className="px-6 border-r border-gold/10">
            <h3 className="text-sm font-bold tracking-[0.18em] text-black">CUSTOMER CARE</h3>
            <div className="mt-4 space-y-3">
              <Link href="/policies/refunds-returns" className="block text-base text-on-dark-muted hover:text-black">Returns</Link>
              <Link href="/policies/shipping-delivery" className="block text-base text-on-dark-muted hover:text-black">Shipping Info</Link>
              <Link href="/account" className="block text-base text-on-dark-muted hover:text-black">Order Lookup</Link>
              <Link href="/faq#recalls" className="block text-base text-on-dark-muted hover:text-black">Recalls</Link>
              <Link href="/contact" className="block text-base text-on-dark-muted hover:text-black">Store Locator</Link>
              <Expandable label="Help" href="/contact" subItems={[
                { label: "Contact Us", href: "/contact" },
                { label: "Website Accessibility Policy", href: "/accessibility" },
              ]} />
            </div>
          </div>

          {/* Column 3: Services */}
          <div className="px-6 border-r border-gold/10">
            <h3 className="text-sm font-bold tracking-[0.18em] text-black">SERVICES</h3>
            <div className="mt-4 space-y-3">
              <Link href="/pricing" className="block text-base text-on-dark-muted hover:text-black">Subscription Perks</Link>
              <Link href="/services" className="block text-base text-on-dark-muted hover:text-black">Dog Grooming</Link>
              <Expandable label="Learning Academy" href="/learn" subItems={[
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
            </div>
          </div>

          {/* Column 4: Other Site Content */}
          <div className="px-6 border-r border-gold/10">
            <h3 className="text-sm font-bold tracking-[0.18em] text-black">OTHER SITE CONTENT</h3>
            <div className="mt-4 space-y-3">
              <Link href="/veterinary-partners" className="block text-base text-on-dark-muted hover:text-black">Veterinary Partners</Link>
              <Link href="/pet-insurance" className="block text-base text-on-dark-muted hover:text-black">Pet Insurance</Link>
              <Link href="/pet-adoption" className="block text-base text-on-dark-muted hover:text-black">Pet Adoption</Link>
              <Expandable label="Pet Education Center" href="/pet-education" subItems={[
                { label: "Articles By Pets", href: "/pet-education/articles" },
                { label: "Pet Care Sheets", href: "/pet-education/care-sheets" },
              ]} />
              <Expandable label="Product Collections" href="/shop/collections" subItems={[
                { label: "Pets in the Classroom", href: "/shop/collections/pets-in-the-classroom" },
              ]} />
            </div>
          </div>

          {/* Column 5: Corporate — no right border */}
          <div className="px-6">
            <h3 className="text-sm font-bold tracking-[0.18em] text-black">CORPORATE</h3>
            <div className="mt-4 space-y-3">
              <Link href="/careers" className="block text-base text-on-dark-muted hover:text-black">Careers</Link>
              <Expandable label="About Us" href="/about" subItems={[
                { label: "Code of Ethics", href: "/about#code-of-ethics" },
              ]} />
              <Link href="/events" className="block text-base text-on-dark-muted hover:text-black">Event Sponsorships</Link>
              <Expandable label="Sellers" href="/seller" subItems={[
                { label: "Seller Program", href: "/seller" },
              ]} />
              <Link href="/shop/collections/gift-cards" className="block text-base text-on-dark-muted hover:text-black">Gift Cards</Link>
              <Link href="/pricing" className="block text-base text-on-dark-muted hover:text-black">Coupons and Promos</Link>
              <Link href="/contact" className="block text-base text-on-dark-muted hover:text-black">Investors</Link>
              <Link href="/sustainability" className="block text-base text-on-dark-muted hover:text-black">Sustainability</Link>
              <Link href="/contact" className="block text-base text-on-dark-muted hover:text-black">Advertise with Us</Link>
            </div>
          </div>
        </div>

        {/* ===== TIER 2: SECONDARY NAV BAR =====
            Distributed edge-to-edge (justify-between). Groups separated by
            TALL VERTICAL LINES (border-l border-gold/30 — visible). Within
            the text links group, short | pipes separate individual links.
            Expandable sections push DOWN within their column. No box/border
            around expanded content — flat on black canvas. */}
        <div className="mt-10 flex items-start justify-evenly border-t border-gold/15 pt-8 pb-10">
          {/* Group 1: Text links (short pipes between items, no tall line) */}
          <div className="flex items-center gap-2">
            <Link href="/pricing" className="text-sm font-semibold text-on-dark-muted hover:text-black">Pricing</Link>
            <Pipe />
            <Link href="/services" className="text-sm font-semibold text-on-dark-muted hover:text-black">Services</Link>
            <Pipe />
            <Link href="/contact" className="text-sm font-semibold text-on-dark-muted hover:text-black">Contact</Link>
            <Pipe />
            <Link href="/process" className="text-sm font-semibold text-on-dark-muted hover:text-black">Our Process</Link>
            <Pipe />
            <Link href="/shop" className="text-sm font-semibold text-on-dark-muted hover:text-black">/shop</Link>
          </div>
          {/* Group 2: Pet type nav — tall vertical line on left */}
          <div className="flex items-center gap-3 border-l border-gold/30 pl-6">
            <Link href="/shop/dog" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-black"><Dog size={14} className="text-black" /> Dog</Link>
            <Link href="/shop/cat" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-black"><Cat size={14} className="text-black" /> Cat</Link>
            <Link href="/shop" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-black"><Package size={14} className="text-black" /> Product</Link>
            <Link href="/shop/collections" className="flex items-center gap-1 text-sm font-semibold text-on-dark-muted hover:text-black"><LayoutGrid size={14} className="text-black" /> Collections</Link>
          </div>
          {/* Group 3: Booking — tall vertical line on left, expands DOWN */}
          <div className="border-l border-gold/30 pl-6">
            <DropdownBar icon={CalendarDays} label="Booking" items={[
              { label: "Booking Overview", href: "/book" },
              { label: "Book Appointment", href: "/book/appointment" },
              { label: "Free Consultation", href: "/book/consultation" },
            ]} />
          </div>
          {/* Group 4: Serving — tall vertical line on left, expands DOWN */}
          <div className="border-l border-gold/30 pl-6">
            <DropdownBar icon={MapPin} label="Serving" items={[
              { label: "Dog Grooming in Arlington, TN", href: "/grooming/arlington-tn" },
              { label: "Dog Grooming in Bartlett, TN", href: "/grooming/bartlett-tn" },
              { label: "Dog Grooming in Collierville, TN", href: "/grooming/collierville-tn" },
              { label: "Dog Grooming in Memphis, TN", href: "/grooming/memphis-tn" },
              { label: "Dog Grooming in Millington, TN", href: "/grooming/millington-tn" },
              { label: "Dog Grooming in Shelby County, TN", href: "/grooming/shelby-county-tn" },
            ]} />
          </div>
          {/* Group 5: Policies — tall vertical line on left, expands DOWN */}
          <div className="border-l border-gold/30 pl-6">
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
        </div>

        {/* ===== TIER 3: COPYRIGHT + REAL PAYMENT LOGOS + SCROLL TOP =====
              Horizontal dividing line ABOVE this row. */}
        <div className="flex flex-col items-center justify-between gap-6 border-t border-gold/15 py-10 sm:flex-row">
          <div className="flex items-center gap-3">
            <p className="text-sm text-on-dark-muted">© {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
            <span className="text-black/20">|</span>
            <Link href="/sitemap" className="text-sm text-on-dark-muted hover:text-black">Sitemap</Link>
          </div>
          <div className="flex items-center gap-3">
            <VisaLogo />
            <MastercardLogo />
            <AmexLogo />
            <ApplePayLogo />
            <GooglePayLogo />
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll to top"
              className="flex h-9 w-9 items-center justify-center rounded border border-gold/30 text-black hover:border-gold hover:bg-gold hover:text-ink">
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
