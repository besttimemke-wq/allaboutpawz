import { NextRequest, NextResponse } from "next/server"
import { repo, type CmsResource } from "@/lib/repo"
import { sendBookingConfirmation, sendConsultationRequest } from "@/lib/email"

const RESOURCES = new Set<CmsResource>([
  "services", "products", "gallery", "packages", "addons", "faqs",
  "policies", "testimonials", "bookings", "consultations", "messages",
  "orders", "order_items", "customers", "dogs", "activity_log", "dog_breeds",
  "staff", "haircut_styles",
  "coat_types", "coat_textures", "coat_lengths", "coat_conditions", "shedding_levels",
  "clip_lengths", "body_styles", "leg_styles", "face_styles", "head_styles",
  "ear_styles", "tail_styles", "feet_styles",
  "sanitary_options", "nail_services", "paw_pad_services", "ear_services",
  "teeth_services", "deshedding_services", "coat_techniques",
  "dog_grooming_profiles", "appointment_grooming_requests",
  "payments", "blocked_times", "availability", "service_pricing",
  "invoices", "invoice_items", "email_messages", "communications",
])

function isResource(k: string): k is CmsResource {
  return RESOURCES.has(k as CmsResource)
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params
  const [resource, id] = slug

  if (resource === "status") {
    const { getBackend } = await import("@/lib/repo")
    return NextResponse.json({ backend: await getBackend(), supabaseConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL), resendReady: !!process.env.RESEND_API_KEY })
  }
  if (resource === "stats") return NextResponse.json(await repo.stats())
  if (resource === "settings") return NextResponse.json(await repo.getSettings())
  if (resource === "newsletter") return NextResponse.json(await repo.listNewsletter())
  if (!isResource(resource)) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })
  if (id) {
    const rec = await repo.get(resource, id)
    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(rec)
  }
  return NextResponse.json(await repo.list(resource))
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params
  const [resource] = slug

  if (resource === "settings") {
    const body = await req.json()
    if (body.settings && typeof body.settings === "object") {
      await repo.saveSettings(body.settings as Record<string, string>)
      return NextResponse.json({ ok: true })
    }
    if (body.key) {
      await repo.saveSettings({ [body.key]: String(body.value ?? "") })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "Invalid settings payload" }, { status: 400 })
  }

  if (!isResource(resource)) return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 })

  const body = await req.json()
  const rec = await repo.create(resource, body)

  // ---- Email notifications (fail-soft) ----
  if (resource === "bookings") {
    sendBookingConfirmation(rec as any).catch((e) => console.error("[email] booking notify failed:", e.message))
  } else if (resource === "consultations") {
    sendConsultationRequest(rec as any).catch((e) => console.error("[email] consultation notify failed:", e.message))
  }

  return NextResponse.json(rec, { status: 201 })
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params
  const [resource, id] = slug
  if (!isResource(resource) || !id) return NextResponse.json({ error: "Bad request" }, { status: 400 })
  const body = await req.json()
  const rec = await repo.update(resource, id, body)
  return NextResponse.json(rec)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await ctx.params
  const [resource, id] = slug
  if (!isResource(resource) || !id) return NextResponse.json({ error: "Bad request" }, { status: 400 })
  await repo.remove(resource, id)
  return NextResponse.json({ ok: true })
}
