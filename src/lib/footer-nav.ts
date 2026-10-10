// ---------------------------------------------------------------------------
// Footer navigation data — the full footer structure per owner spec.
// Drives the SiteFooter component. Data-driven: one change here updates
// every page's footer (the footer renders on every route via SiteChrome).
// ---------------------------------------------------------------------------

export type FooterLink = {
  label: string
  href: string
  children?: FooterLink[]
}

export type FooterColumn = {
  heading: string
  links: FooterLink[]
}

export const FOOTER_NAV: FooterColumn[] = [
  {
    heading: "Customer Care",
    links: [
      { label: "Returns", href: "/policies/refunds-returns" },
      { label: "Shipping Info", href: "/policies/shipping-delivery" },
      { label: "Order Lookup", href: "/account" },
      { label: "Recalls", href: "/faq#recalls" },
      { label: "Store Locator", href: "/contact" },
      { label: "Help", href: "/contact", children: [
        { label: "Contact Us", href: "/contact" },
      ]},
    ],
  },
  {
    heading: "Services",
    links: [
      { label: "Subscription Perks", href: "/pricing" },
      { label: "Dog Grooming", href: "/services" },
      { label: "Learning Academy", href: "/learn", children: [
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
      ]},
      { label: "Veterinary Partners", href: "/veterinary-partners" },
      { label: "Pet Insurance", href: "/pet-insurance" },
      { label: "Pawzsly U", href: "/pawzsly-u/memphis" },
    ],
  },
  {
    heading: "Corporate",
    links: [
      { label: "Careers", href: "/careers" },
      { label: "About Us", href: "/about", children: [
        { label: "Code of Ethics", href: "/about#code-of-ethics" },
      ]},
      { label: "Sellers", href: "/seller", children: [
        { label: "Seller Program", href: "/seller" },
      ]},
      { label: "Gift Cards", href: "/gift-cards" },
      { label: "Coupons and Promos", href: "/pricing" },
      { label: "Investors", href: "/contact" },
      { label: "Sustainability", href: "/sustainability" },
      { label: "Advertise with Us", href: "/contact" },
      { label: "Pricing", href: "/pricing" },
      { label: "Services", href: "/services" },
      { label: "Contact", href: "/contact" },
      { label: "Our Process", href: "/process" },
    ],
  },
  {
    heading: "Shop",
    links: [
      { label: "Shop All", href: "/shop" },
      { label: "Dog Supplies", href: "/shop/dog" },
      { label: "Cat Supplies", href: "/shop/cat" },
      { label: "Products", href: "/shop" },
      { label: "Collections", href: "/shop/collections" },
      { label: "View Bag", href: "/shop/bag" },
    ],
  },
  {
    heading: "Booking",
    links: [
      { label: "Booking Overview", href: "/book" },
      { label: "Book Appointment", href: "/book/appointment" },
      { label: "Free Consultation", href: "/book/consultation" },
    ],
  },
  {
    heading: "Serving",
    links: [
      { label: "Dog Grooming in Arlington, TN", href: "/grooming/arlington-tn" },
      { label: "Dog Grooming in Bartlett, TN", href: "/grooming/bartlett-tn" },
      { label: "Dog Grooming in Collierville, TN", href: "/grooming/collierville-tn" },
      { label: "Dog Grooming in Memphis, TN", href: "/grooming/memphis-tn" },
      { label: "Dog Grooming in Millington, TN", href: "/grooming/millington-tn" },
      { label: "Dog Grooming in Shelby County, TN", href: "/grooming/shelby-county-tn" },
    ],
  },
  {
    heading: "Policies",
    links: [
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
    ],
  },
]
