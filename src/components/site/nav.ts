// Client-side nav model — mirrors the source site's 11 pages + an admin view.
export const NAV = [
  { n: "01", label: "HOME", to: "/" },
  { n: "02", label: "ABOUT US", to: "/about" },
  { n: "03", label: "SERVICES", to: "/services" },
  { n: "04", label: "OUR PROCESS", to: "/process" },
  { n: "05", label: "PRICING", to: "/pricing" },
  { n: "06", label: "SHOP", to: "/shop" },
  { n: "07", label: "GALLERY", to: "/gallery" },
  { n: "08", label: "BOOK", to: "/book" },
  { n: "09", label: "CONTACT", to: "/contact" },
  { n: "10", label: "FAQ / POLICIES", to: "/faq" },
] as const

export type Route = (typeof NAV)[number]["to"] | "/admin"
