// ---------------------------------------------------------------------------
// Repository — Supabase ONLY.
//   All reads/writes go to Supabase (Postgres via the PostgREST API +
//   Storage for uploads). All 47 tables live in Supabase. There is no
//   local fallback backend.
//   If the Supabase env keys are not set yet, reads return empty results
//   (so the site renders) and writes fail with a clear error telling you
//   to set the keys in .env.
// ---------------------------------------------------------------------------

export type Row = Record<string, any>

export type CmsResource =
  | "services" | "products" | "gallery" | "packages" | "addons"
  | "faqs" | "policies" | "testimonials" | "bookings" | "consultations" | "messages"
  | "orders" | "order_items" | "customers" | "dogs" | "activity_log" | "dog_breeds"
  | "staff" | "haircut_styles"
  | "coat_types" | "coat_textures" | "coat_lengths" | "coat_conditions" | "shedding_levels"
  | "clip_lengths" | "body_styles" | "leg_styles" | "face_styles" | "head_styles"
  | "ear_styles" | "tail_styles" | "feet_styles"
  | "sanitary_options" | "nail_services" | "paw_pad_services" | "ear_services"
  | "teeth_services" | "deshedding_services" | "coat_techniques"
  | "dog_grooming_profiles" | "appointment_grooming_requests"
  | "payments" | "blocked_times" | "availability" | "service_pricing"
  | "invoices" | "invoice_items" | "email_messages" | "communications"
  | "product_reviews"
  | "pet_product_categories" | "pet_product_filters" | "pet_product_filter_values" | "pet_category_filters"
  | "serviceItems"

const TABLE: Record<CmsResource, string> = {
  services: "services",
  products: "products",
  gallery: "gallery_photos",
  packages: "pricing_packages",
  addons: "add_ons",
  faqs: "faqs",
  policies: "policies",
  testimonials: "testimonials",
  bookings: "bookings",
  consultations: "consultations",
  messages: "contact_messages",
  orders: "orders",
  order_items: "order_items",
  customers: "customers",
  dogs: "dogs",
  activity_log: "activity_log",
  dog_breeds: "dog_breeds",
  staff: "staff",
  haircut_styles: "haircut_styles",
  coat_types: "coat_types", coat_textures: "coat_textures", coat_lengths: "coat_lengths",
  coat_conditions: "coat_conditions", shedding_levels: "shedding_levels", clip_lengths: "clip_lengths",
  body_styles: "body_styles", leg_styles: "leg_styles", face_styles: "face_styles",
  head_styles: "head_styles", ear_styles: "ear_styles", tail_styles: "tail_styles",
  feet_styles: "feet_styles", sanitary_options: "sanitary_options", nail_services: "nail_services",
  paw_pad_services: "paw_pad_services", ear_services: "ear_services", teeth_services: "teeth_services",
  deshedding_services: "deshedding_services", coat_techniques: "coat_techniques",
  dog_grooming_profiles: "dog_grooming_profiles",
  appointment_grooming_requests: "appointment_grooming_requests",
  payments: "payments",
  blocked_times: "blocked_times",
  availability: "availability",
  service_pricing: "service_pricing",
  invoices: "invoices",
  invoice_items: "invoice_items",
  email_messages: "email_messages",
  communications: "communications",
  product_reviews: "product_reviews",
  pet_product_categories: "pet_product_categories",
  pet_product_filters: "pet_product_filters",
  pet_product_filter_values: "pet_product_filter_values",
  pet_category_filters: "pet_category_filters",
  serviceItems: "service_items",
}

// Explicit PostgREST order overrides for tables that have no createdAt column.
const CUSTOM_ORDER: Partial<Record<CmsResource, string>> = {
  pet_product_categories: "id.asc",
  pet_product_filters: "display_order.asc,id.asc",
  pet_product_filter_values: "display_order.asc,id.asc",
  pet_category_filters: "display_order.asc",
}

const ORDERED = new Set<CmsResource>([
  "services", "products", "gallery", "packages", "addons", "faqs", "policies", "testimonials", "serviceItems",
])

// Use NEXT_PUBLIC_ vars (available on both server and client) with fallback
// to the non-public versions for backwards compatibility.
// Values straight from .env.example (e.g. "https://your-project.supabase.co",
// "your-service-role-key") are treated as unconfigured placeholders.
const isPlaceholder = (v: string | undefined) =>
  !v || v.startsWith("your-") || v.includes("your-project") || v.startsWith("sk_live_or_test")
const SB_URL = isPlaceholder(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)
  ? undefined
  : (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)?.replace(/\/$/, "")
const SB_KEY = isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? undefined
  : process.env.SUPABASE_SERVICE_ROLE_KEY
export const supabaseReady = !!(SB_URL && SB_KEY)
export const supabaseConfig = { url: SB_URL, key: SB_KEY }

const NOT_CONFIGURED = new Error(
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env, then restart the dev server.",
)

// ---- Supabase REST helper ----
async function sb<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SB_URL || !SB_KEY) throw NOT_CONFIGURED
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const t = await res.text().catch(() => res.statusText)
    throw new Error(`Supabase ${res.status}: ${t}`)
  }
  if (res.status === 204) return null as T
  const txt = await res.text()
  return (txt ? JSON.parse(txt) : null) as T
}

// ---- Shared shape ----
export type Repo = {
  list(resource: CmsResource): Promise<Row[]>
  get(resource: CmsResource, id: string): Promise<Row | null>
  create(resource: CmsResource, data: Row): Promise<Row>
  update(resource: CmsResource, id: string, data: Row): Promise<Row>
  remove(resource: CmsResource, id: string): Promise<{ ok: boolean }>
  stats(): Promise<any>
  getSettings(): Promise<Record<string, string>>
  saveSettings(obj: Record<string, string>): Promise<void>
  addNewsletter(email: string): Promise<Row>
  listNewsletter(): Promise<Row[]>
}

// ===========================================================================
// Supabase implementation (PostgREST via fetch) — the only backend
// ===========================================================================
export const repo: Repo = {
  async list(r) {
    if (!supabaseReady) return []
    const t = TABLE[r]
    const order = CUSTOM_ORDER[r] ?? (ORDERED.has(r) ? "order.asc" : "createdAt.desc")
    const rows = await sb<Row[]>(`${t}?order=${order}`)
    return rows || []
  },
  async get(r, id) {
    if (!supabaseReady) return null
    const t = TABLE[r]
    const rows = await sb<Row[]>(`${t}?id=eq.${encodeURIComponent(id)}&limit=1`)
    return (rows && rows[0]) || null
  },
  async create(r, data) {
    const t = TABLE[r]
    const rows = await sb<Row[]>(t, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(stripNulls(data)),
    })
    return (rows && rows[0]) || data
  },
  async update(r, id, data) {
    const t = TABLE[r]
    const rows = await sb<Row[]>(`${t}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(stripNulls(data)),
    })
    return (rows && rows[0]) || data
  },
  async remove(r, id) {
    const t = TABLE[r]
    await sb(`${t}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" })
    return { ok: true }
  },
  async stats() {
    if (!supabaseReady) {
      return {
        counts: {}, pendingBookings: 0, unreadMessages: 0, pendingConsultations: 0,
        recentBookings: [], recentMessages: [],
      }
    }
    const [services, products, gallery, packages, addons, faqs, policies,
      testimonials, bookings, consultations, messages, newsletter] = await Promise.all([
      sb<Row[]>("services?select=id"), sb<Row[]>("products?select=id"),
      sb<Row[]>("gallery_photos?select=id"), sb<Row[]>("pricing_packages?select=id"),
      sb<Row[]>("add_ons?select=id"), sb<Row[]>("faqs?select=id"),
      sb<Row[]>("policies?select=id"), sb<Row[]>("testimonials?select=id"),
      sb<Row[]>("bookings?select=*&order=createdAt.desc&limit=50"),
      sb<Row[]>("consultations?select=id"),
      sb<Row[]>("contact_messages?select=*&order=createdAt.desc&limit=50"),
      sb<Row[]>("newsletter?select=id"),
    ])
    const arr = (x: Row[] | null) => x || []
    const b = arr(bookings), m = arr(messages)
    return {
      counts: {
        services: arr(services).length, products: arr(products).length,
        gallery: arr(gallery).length, packages: arr(packages).length,
        addons: arr(addons).length, faqs: arr(faqs).length, policies: arr(policies).length,
        testimonials: arr(testimonials).length, bookings: b.length,
        consultations: arr(consultations).length, messages: m.length, newsletter: arr(newsletter).length,
      },
      pendingBookings: b.filter((x) => x.status === "PENDING").length,
      unreadMessages: m.filter((x) => x.status === "UNREAD").length,
      pendingConsultations: arr(await sb<Row[]>("consultations?select=status")).filter((x) => x.status === "PENDING").length,
      recentBookings: b.slice(0, 5),
      recentMessages: m.slice(0, 5),
    }
  },
  async getSettings() {
    if (!supabaseReady) return {}
    const rows = await sb<Row[]>("site_settings?select=key,value")
    const obj: Record<string, string> = {}
    for (const r of rows || []) obj[r.key] = r.value
    return obj
  },
  async saveSettings(obj) {
    for (const [key, value] of Object.entries(obj)) {
      await sb("site_settings", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key, value: String(value) }),
      })
    }
  },
  async addNewsletter(email) {
    const rows = await sb<Row[]>("newsletter", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ email }),
    })
    return (rows && rows[0]) || { email }
  },
  async listNewsletter() {
    if (!supabaseReady) return []
    const rows = await sb<Row[]>("newsletter?order=createdAt.desc")
    return rows || []
  },
}

function stripNulls(data: Row): Row {
  const out: Row = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) out[k] = v === null ? undefined : v
  }
  return out
}

// ---- backend status ----
// The only backend is Supabase. `usingSupabase()` reports whether the env
// keys are present. Reads before keys are set return empty data; writes
// throw the NOT_CONFIGURED error above.
export async function getBackend() {
  return "supabase" as const
}
export async function usingSupabase() {
  return supabaseReady
}
