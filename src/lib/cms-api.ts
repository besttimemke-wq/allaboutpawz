// Lightweight typed client for the /api/cms catch-all REST API.

const BASE = "/api/cms"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText)
    throw new Error(msg || `Request failed (${res.status})`)
  }
  const ct = res.headers.get("content-type") || ""
  if (!ct.includes("application/json")) return undefined as unknown as T
  return res.json() as Promise<T>
}

export const cms = {
  list: <T>(resource: string) => request<T[]>(resource),
  get: <T>(resource: string, id: string) => request<T>(`${resource}/${id}`),
  create: <T>(resource: string, data: Partial<T>) =>
    request<T>(resource, { method: "POST", body: JSON.stringify(data) }),
  update: <T>(resource: string, id: string, data: Partial<T>) =>
    request<T>(`${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (resource: string, id: string) =>
    request<{ ok: boolean }>(`${resource}/${id}`, { method: "DELETE" }),
  settings: () => request<Record<string, string>>("settings"),
  saveSettings: (settings: Record<string, string>) =>
    request<{ ok: boolean }>("settings", { method: "POST", body: JSON.stringify({ settings }) }),
  stats: () => request<Stats>("stats"),
  status: () => request<{ backend: string; supabaseConfigured: boolean }>("status"),
  upload: async (file: File) => {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/cms/upload", { method: "POST", body: fd })
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(e.error || `Upload failed (${res.status})`)
    }
    return res.json() as Promise<{ url: string; path: string }>
  },
}

export type Stats = {
  counts: Record<string, number>
  pendingBookings: number
  unreadMessages: number
  pendingConsultations: number
  recentBookings: Booking[]
  recentMessages: ContactMessage[]
}

// Mirror Prisma model shapes (subset used by the UI)
export type Service = { id: string; title: string; description: string; icon: string; image: string | null; alt: string | null; order: number; visible: boolean }
export type Product = { id: string; name: string; price: string; image: string | null; alt: string | null; description: string | null; badge: string | null; order: number; visible: boolean }
export type GalleryPhoto = { id: string; alt: string; category: string; image: string; order: number; visible: boolean }
export type PricingPackage = { id: string; name: string; smallPrice: string; mediumPrice: string; largePrice: string; xlargePrice: string; description: string | null; featured: boolean; order: number }
export type AddOn = { id: string; title: string; price: string; icon: string; order: number }
export type Faq = { id: string; question: string; answer: string; order: number }
export type Policy = { id: string; title: string; body: string; order: number }
export type Testimonial = { id: string; quote: string; author: string; rating: number; visible: boolean; order: number }
export type Booking = { id: string; ownerName: string; dogName: string; breed: string | null; service: string; size: string; date: string; time: string; notes: string | null; phone: string | null; email: string | null; status: string; createdAt: string }
export type Consultation = { id: string; name: string; dogName: string | null; breed: string | null; concerns: string | null; preferredTime: string | null; phone: string | null; email: string | null; status: string; createdAt: string }
export type ContactMessage = { id: string; name: string; email: string; subject: string | null; message: string; status: string; createdAt: string }
