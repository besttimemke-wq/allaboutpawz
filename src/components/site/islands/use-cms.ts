"use client"

import { useState, useEffect } from "react"

// ---------------------------------------------------------------------------
// CMS data architecture — render from local state, update via push.
//
// RENDER: Components render immediately from baked-in defaults. No fetch,
// no loading spinner, no layout shift, no white flash. The data IS the
// component on first paint.
//
// UPDATE: When an admin pushes a change to Supabase, Supabase fires a
// webhook to /api/revalidate which calls revalidatePath. Optionally, a
// Supabase real-time subscription updates local state in-place for
// instant updates without a page reload.
// ---------------------------------------------------------------------------

// ─── Settings ───────────────────────────────────────────────────────────────

export interface CmsSettings {
  brandName: string
  tagline: string
  heroTitle: string
  heroSubtitle: string
  addressLine1: string
  addressLine2: string
  phone: string
  email: string
  hoursTueSat: string
  hoursSun: string
  hoursMon: string
  instagram: string
  footerNote: string
  [key: string]: string
}

const DEFAULT_SETTINGS: CmsSettings = {
  brandName: "All About Pawz",
  tagline: "From Pawz to PAWfection",
  heroTitle: "Luxury Grooming. Exceptional Care.",
  heroSubtitle: "We deliver a spa-level grooming experience where every detail is designed for your pup's comfort, style, and happiness.",
  addressLine1: "1428 Maple Grove Avenue",
  addressLine2: "Memphis, TN 38104",
  phone: "901-800-7182",
  email: "help@aapawz.com",
  hoursTueSat: "9am – 6pm",
  hoursSun: "10am – 4pm",
  hoursMon: "Closed",
  instagram: "https://instagram.com/aapawz",
  footerNote: "© 2024 All About Pawz LLC. All rights reserved.",
}

// ─── Services ───────────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  { id: "srv-1", icon: "Scissors", title: "GROOMING", description: "Haircuts, styling,\nand full grooms", visible: true, order: 0 },
  { id: "srv-2", icon: "Bath", title: "BATH & SPA", description: "De-shedding, deep\ncleanse, and more", visible: true, order: 1 },
  { id: "srv-3", icon: "PawPrint", title: "NAIL & PAW CARE", description: "Nail trims, paw balm,\nand pawdicures", visible: true, order: 2 },
  { id: "srv-4", icon: "Droplets", title: "ADD-ON SERVICES", description: "Teeth brushing, de-tangling,\nfragrance & more", visible: true, order: 3 },
]

// ─── Testimonials ───────────────────────────────────────────────────────────

const DEFAULT_TESTIMONIALS = [
  { id: "t-1", quote: "The best grooming experience we've ever had! My dog always comes home happy and handsome.", author: "Jessica M. & Cooper", rating: 5, visible: true, order: 0 },
  { id: "t-2", quote: "From the moment you walk in, you feel the love they put into every detail.", author: "Daniel R. & Olive", rating: 5, visible: true, order: 1 },
  { id: "t-3", quote: "Booked the Deluxe Spa for our doodle and the results were stunning.", author: "Priya S. & Maple", rating: 5, visible: true, order: 2 },
]

// ─── FAQs ───────────────────────────────────────────────────────────────────

const DEFAULT_FAQS = [
  { id: "faq-1", question: "How often should my dog be groomed?", answer: "Most coats do best on a four to six week schedule. Doodles, poodles, and other curly coats benefit from every four weeks to prevent matting, while short smooth coats can comfortably stretch to eight weeks.", visible: true, order: 0 },
  { id: "faq-2", question: "How long does an appointment take?", answer: "A full groom typically takes two to three hours depending on size, coat condition, and the services selected. We groom one dog at a time so your pup is never left in a kennel waiting.", visible: true, order: 1 },
  { id: "faq-3", question: "Do you use cage dryers?", answer: "Never. Every dog is hand dried and hand finished by their groomer from start to finish.", visible: true, order: 2 },
  { id: "faq-4", question: "What products do you use?", answer: "Salon exclusive, sulphate free, plant based shampoos and conditioners selected for each coat and skin type.", visible: true, order: 3 },
  { id: "faq-5", question: "Can I stay with my dog during the groom?", answer: "We ask parents to wait in the reception area so the groomer can maintain a calm, focused environment for your pup.", visible: true, order: 4 },
  { id: "faq-6", question: "Do you offer any guarantees?", answer: "If anything isn't right, let us know within 48 hours and we'll fix it free of charge.", visible: true, order: 5 },
]

// ─── Policies ───────────────────────────────────────────────────────────────

const DEFAULT_POLICIES = [
  { id: "pol-1", title: "CANCELLATIONS", body: "Please give 24 hours notice to cancel or reschedule. Cancellations inside 24 hours are subject to a 50% service fee.", visible: true, order: 0 },
  { id: "pol-2", title: "LATE ARRIVALS", body: "Arrivals more than 15 minutes late may need to be rescheduled so we can honour the appointments that follow.", visible: true, order: 1 },
  { id: "pol-3", title: "VACCINATIONS", body: "Current rabies and distemper records are required for every dog on their first visit.", visible: true, order: 2 },
  { id: "pol-4", title: "MATTED COATS", body: "Humanity before vanity. Severely matted coats may require a short clip, and de-matting is charged in 15 minute increments.", visible: true, order: 3 },
]

// ─── Gallery ────────────────────────────────────────────────────────────────

const DEFAULT_GALLERY = [
  { id: "g-1", caption: "Cream cockapoo with a bow tie", category: "GROOMING", src: "/assets/g1.jpg", visible: true, order: 0 },
  { id: "g-2", caption: "Apricot cockapoo portrait", category: "TRANSFORMATIONS", src: "/assets/g2.jpg", visible: true, order: 1 },
  { id: "g-3", caption: "Smiling corgi", category: "BATH & SPA", src: "/assets/g3.jpg", visible: true, order: 2 },
  { id: "g-4", caption: "Golden retriever with tongue out", category: "GROOMING", src: "/assets/g4.jpg", visible: true, order: 3 },
  { id: "g-5", caption: "Black poodle mix portrait", category: "TRANSFORMATIONS", src: "/assets/g5.jpg", visible: true, order: 4 },
  { id: "g-6", caption: "Apricot labradoodle sitting", category: "GROOMING", src: "/assets/g6.jpg", visible: true, order: 5 },
  { id: "g-7", caption: "Salt and pepper schnauzer", category: "BATH & SPA", src: "/assets/g7.jpg", visible: true, order: 6 },
  { id: "g-8", caption: "Cream goldendoodle puppy", category: "TRANSFORMATIONS", src: "/assets/g8.jpg", visible: true, order: 7 },
]

// ─── Add-ons (pricing) ──────────────────────────────────────────────────────

const DEFAULT_ADDONS = [
  { id: "add-1", title: "Teeth Brushing", price: "$15", icon: "Sparkles", visible: true, order: 0 },
  { id: "add-2", title: "De-shedding", price: "$15 - $35", icon: "Scissors", visible: true, order: 1 },
  { id: "add-3", title: "Paw Treatment", price: "$15", icon: "PawPrint", visible: true, order: 2 },
  { id: "add-4", title: "Nail Trim", price: "$15", icon: "Droplets", visible: true, order: 3 },
  { id: "add-5", title: "Flea Bath", price: "$10", icon: "Bug", visible: true, order: 4 },
]

// ─── Packages (pricing) ─────────────────────────────────────────────────────

const DEFAULT_PACKAGES = [
  { id: "pkg-1", name: "Bath & Brush", small: "$75", medium: "$95", large: "$115", xlarge: "$135", featured: false, visible: true, order: 0 },
  { id: "pkg-2", name: "Full Groom", small: "$95", medium: "$115", large: "$135", xlarge: "$155", featured: true, visible: true, order: 1 },
  { id: "pkg-3", name: "Deluxe Spa", small: "$125", medium: "$145", large: "$165", xlarge: "$185", featured: false, visible: true, order: 2 },
]

// ─── Service Items (services page accordion) ────────────────────────────────

const DEFAULT_SERVICE_ITEMS = [
  { id: "si-1", category: "GROOMING", name: "Full Groom", price: "$95 – $155", visible: true, order: 0 },
  { id: "si-2", category: "GROOMING", name: "Haircuts", price: null, visible: true, order: 1 },
  { id: "si-3", category: "GROOMING", name: "Styling", price: null, visible: true, order: 2 },
  { id: "si-4", category: "GROOMING", name: "Bath & Brush", price: "$75 – $135", visible: true, order: 3 },
  { id: "si-5", category: "BATH & SPA", name: "Bath & Brush", price: "$75 – $135", visible: true, order: 0 },
  { id: "si-6", category: "BATH & SPA", name: "Deluxe Spa", price: "$125 – $185", visible: true, order: 1 },
  { id: "si-7", category: "BATH & SPA", name: "De-shedding", price: "$15 – $35", visible: true, order: 2 },
  { id: "si-8", category: "BATH & SPA", name: "Flea Bath", price: "$10", visible: true, order: 3 },
  { id: "si-9", category: "NAIL & PAW CARE", name: "Nail Trim", price: "$15", visible: true, order: 0 },
  { id: "si-10", category: "NAIL & PAW CARE", name: "Paw Treatment", price: "$15", visible: true, order: 1 },
  { id: "si-11", category: "ADD-ON SERVICES", name: "Teeth Brushing", price: "$15", visible: true, order: 0 },
]

// ─── Default registry ───────────────────────────────────────────────────────

const DEFAULTS: Record<string, any[]> = {
  services: DEFAULT_SERVICES,
  testimonials: DEFAULT_TESTIMONIALS,
  faqs: DEFAULT_FAQS,
  policies: DEFAULT_POLICIES,
  gallery: DEFAULT_GALLERY,
  addons: DEFAULT_ADDONS,
  packages: DEFAULT_PACKAGES,
  serviceItems: DEFAULT_SERVICE_ITEMS,
}

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useCmsSettings(initialData: CmsSettings = DEFAULT_SETTINGS) {
  const [settings, setSettings] = useState<CmsSettings>(initialData)

  useEffect(() => {
    // Supabase real-time subscription — optional push model.
    // Only activates when Supabase is configured. The admin changes
    // data → Supabase pushes → we update local state silently.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("your-")) return

    let channel: any = null
    import("@supabase/supabase-js").then(({ createClient }) => {
      const supabase = createClient(supabaseUrl, supabaseKey)
      channel = supabase
        .channel("cms_settings_changes")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "cms_global_content" },
          (payload: any) => {
            if (payload.new?.content_key && payload.new?.value_text) {
              setSettings((prev) => ({ ...prev, [payload.new.content_key]: payload.new.value_text }))
            }
          }
        )
        .subscribe()
    })

    return () => { if (channel) channel.unsubscribe() }
  }, [])

  return { settings, loading: false }
}

export function useCms<T = any>(resource: string): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>(() => (DEFAULTS[resource] as T[]) || [])

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("your-")) return

    let channel: any = null
    import("@supabase/supabase-js").then(({ createClient }) => {
      const supabase = createClient(supabaseUrl, supabaseKey)
      channel = supabase
        .channel(`cms_${resource}_changes`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: resource },
          () => {
            fetch(`/api/cms/${resource}`)
              .then((r) => (r.ok ? r.json() : []))
              .then((rows) => { if (Array.isArray(rows) && rows.length > 0) setData(rows) })
              .catch(() => {})
          }
        )
        .subscribe()
    })

    return () => { if (channel) channel.unsubscribe() }
  }, [resource])

  return { data, loading: false }
}

export function visibleOnly<T extends { visible?: boolean }>(rows: T[]): T[] {
  return rows.filter((r) => r.visible)
}
