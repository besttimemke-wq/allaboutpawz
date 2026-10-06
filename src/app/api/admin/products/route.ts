import { NextRequest, NextResponse } from "next/server"
import { requireAdminApi } from "@/lib/admin/gate"
import { revalidateShop } from "@/lib/admin/revalidate-shop"
import { supabaseConfig, supabaseReady } from "@/lib/repo"
import {
  listCatalogProducts,
  createCatalogProduct,
  type CatalogProductInput,
} from "@/lib/enterprise/catalog"
import { repo } from "@/lib/repo"

// ============================================================================
// /api/admin/products — admin-gated CRUD for the NORMALIZED catalog.
//
//   GET    /api/admin/products           list every ecommerce-enabled catalog
//                                        item (joined with erp_products,
//                                        erp_product_skus, commerce_prices,
//                                        commerce_product_media, stock).
//   POST   /api/admin/products           create a new product across the real
//                                        schema (erp_products + erp_product_skus
//                                        + commerce_catalog_items + commerce_prices
//                                        + commerce_product_media + opening stock
//                                        via erp_inventory_movements).
//   POST   /api/admin/products?upload=image
//                                        multipart/form-data upload of a single
//                                        `file` field → cms-media bucket; returns
//                                        { url, path }. Server-side (service role).
//
// PATCH + DELETE live in [id]/route.ts. Both also write across the normalized
// tables — no flat commerce_products writes anywhere.
// ============================================================================

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function GET(_req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  // listCatalogProducts returns the unified CatalogProduct shape (joined
  // across all normalized tables). Add the brand_name/brand_slug join in JS
  // so the admin table can show the brand without a second round-trip.
  const [products, brands] = await Promise.all([
    listCatalogProducts(),
    repo.list("commerce_brands").catch(() => []),
  ])
  const brandById = new Map<string, { name: string; slug: string }>()
  for (const b of brands) {
    if (b?.id) brandById.set(String(b.id), { name: b.name, slug: b.slug })
  }
  const merged = products.map((p) => ({
    ...p,
    brand_name: p.brandId ? brandById.get(String(p.brandId))?.name ?? null : null,
    brand_slug: p.brandId ? brandById.get(String(p.brandId))?.slug ?? null : null,
  }))
  return NextResponse.json({ products: merged })
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi()
  if (gate) return gate

  // --- Image-upload branch (?upload=image) -------------------------------
  if (req.nextUrl.searchParams.get("upload") === "image") {
    return handleImageUpload(req)
  }

  // --- Create-product branch (writes across the normalized schema) -------
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  // Parse the price (accept "$35.00" or 35 or 3500).
  const priceDollars = parsePriceToDollars(body.base_price ?? body.price)
  if (priceDollars == null || priceDollars <= 0) {
    return NextResponse.json({ error: "A valid base_price is required" }, { status: 400 })
  }
  const compareAtDollars = parsePriceToDollars(body.compare_at_price ?? body.compareAtPrice)

  const input: CatalogProductInput = {
    name: body.name,
    slug: body.slug || slugify(body.name),
    description: body.description || null,
    shortDescription: body.short_description || body.shortDescription || null,
    brand: body.brand || null,
    brandId: body.brand_id || body.brandId || null,
    price: priceDollars,
    compareAtPrice: compareAtDollars,
    media: Array.isArray(body.media)
      ? body.media
      : body.image
        ? [{ url: body.image, altText: body.alt || body.name, isPrimary: true }]
        : [],
    openingStock: Number(body.inventory_count ?? body.stock ?? body.openingStock) || 0,
    featured: body.featured === true,
    badge: body.badge || null,
    categoryId: body.category_id ?? body.categoryId ?? null,
    category: body.category || null,
    specs: body.specs || null,
    materials: body.materials || null,
    ingredients: body.ingredients || null,
    directions: body.directions || null,
    warranty: body.warranty || null,
    stripeProductId: body.stripe_product_id || body.stripeProductId || null,
    stripePriceId: body.stripe_price_id || body.stripePriceId || null,
    sortOrder: Number(body.sort_order ?? body.sortOrder) || 99,
  }

  try {
    const created = await createCatalogProduct(input)
    revalidateShop()
    return NextResponse.json({ product: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Create failed: ${msg}` }, { status: 502 })
  }
}

function parsePriceToDollars(v: any): number | null {
  if (v == null) return null
  if (typeof v === "number") return v
  const m = String(v).replace(/[$,\s]/g, "")
  const n = Number.parseFloat(m)
  return Number.isFinite(n) ? n : null
}

// ---- image upload helper (Storage bypass — repo only covers PostgREST) ----
async function handleImageUpload(req: NextRequest): Promise<NextResponse> {
  if (!supabaseReady) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 })
  }
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 })
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No 'file' field provided" }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (10 MB max)" }, { status: 413 })
  }
  if (!/^image\//.test(file.type || "")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 415 })
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${safeName}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const upRes = await fetch(`${supabaseConfig.url}/storage/v1/object/cms-media/${path}`, {
    method: "POST",
    headers: {
      apikey: supabaseConfig.key!,
      Authorization: `Bearer ${supabaseConfig.key}`,
      "Content-Type": file.type || "image/jpeg",
      "x-upsert": "true",
    },
    body: buf,
  })
  if (!upRes.ok) {
    const t = await upRes.text().catch(() => upRes.statusText)
    return NextResponse.json({ error: `Upload failed (${upRes.status}): ${t}` }, { status: 502 })
  }
  const url = `${supabaseConfig.url}/storage/v1/object/public/cms-media/${path}`
  return NextResponse.json({ url, path })
}
