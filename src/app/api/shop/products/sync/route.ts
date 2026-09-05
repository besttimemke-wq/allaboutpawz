import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { repo } from "@/lib/repo"

// POST /api/shop/products/sync
// Body: { productId: string } | { productIds: string[] } | {} (sync ALL visible)
//
// Bidirectional product sync between Supabase (source of truth) and Stripe:
//   1. Creates the Stripe product when stripeProductId is missing, otherwise
//      updates its name / description / image in place.
//   2. Reuses the linked Stripe price whenever it is still active and its
//      unit_amount matches the catalog price (parsed to cents exactly like
//      /api/shop/checkout). Otherwise creates a new price and deactivates
//      the old one (non-fatal on failure).
//   3. Writes stripeProductId + stripePriceId back onto the Supabase row.
//
// Per-product failures never abort the batch — they land in failed[].
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  return _stripe
}

// Same parsing as src/app/api/shop/checkout/route.ts.
function parseCents(price: string | null | undefined): number | null {
  if (!price) return null
  const v = parseFloat(String(price).replace(/[^0-9.]/g, ""))
  if (!isFinite(v) || v <= 0) return null
  return Math.round(v * 100)
}

// Stripe only accepts absolute http(s) image URLs (Supabase Storage public
// URLs qualify; local /assets/... paths must be omitted).
const isHttpUrl = (s: unknown) => typeof s === "string" && /^https?:\/\//i.test(s)

type SyncedItem = {
  productId: string
  name: string
  stripeProductId: string
  stripePriceId: string
  priceChanged: boolean
}

async function syncOne(p: Record<string, any>): Promise<SyncedItem> {
  const stripe = getStripe()
  const cents = parseCents(p.price)
  if (cents == null) throw new Error(`No valid price to sync (price: "${p.price ?? ""}")`)

  // ---- 1. Stripe product (create or update) ----
  let stripeProductId: string = p.stripeProductId
  const description = String(p.shortDescription || "").slice(0, 350)

  if (!stripeProductId) {
    const sp = await stripe.products.create({
      name: p.name,
      ...(description ? { description } : {}),
      ...(isHttpUrl(p.image) ? { images: [p.image] } : {}),
      metadata: {
        supabaseProductId: p.id,
        ...(p.slug ? { slug: p.slug } : {}),
      },
    })
    stripeProductId = sp.id
  } else {
    await stripe.products.update(stripeProductId, {
      name: p.name,
      ...(description ? { description } : {}),
      ...(isHttpUrl(p.image) ? { images: [p.image] } : {}),
    })
  }

  // ---- 2. Stripe price (reuse when active + amount matches) ----
  let stripePriceId: string = p.stripePriceId || ""
  let reusable = false
  if (stripePriceId) {
    try {
      const price = await stripe.prices.retrieve(stripePriceId)
      if (price.active && price.unit_amount === cents) reusable = true
    } catch {
      // Unusable/deleted price — fall through and create a fresh one.
    }
  }

  let priceChanged = false
  if (!reusable) {
    const newPrice = await stripe.prices.create({
      product: stripeProductId,
      unit_amount: cents,
      currency: "usd",
      nickname: `${p.name} — one-time`,
    })
    if (stripePriceId) {
      try { await stripe.prices.update(stripePriceId, { active: false }) } catch { /* non-fatal */ }
    }
    stripePriceId = newPrice.id
    priceChanged = true
  }

  // ---- 3. Write linkage back to Supabase ----
  await repo.update("products", p.id, { stripeProductId, stripePriceId } as any)

  return { productId: p.id, name: p.name, stripeProductId, stripePriceId, priceChanged }
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in .env to enable product sync." },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))

  // Explicit ids sync regardless of visibility; empty body syncs ALL visible.
  let ids: string[] | null = null
  if (typeof body.productId === "string" && body.productId) {
    ids = [body.productId]
  } else if (Array.isArray(body.productIds)) {
    ids = body.productIds.filter((x: unknown) => typeof x === "string" && x)
  }

  try {
    const products: Record<string, any>[] = ids
      ? (await Promise.all(ids.map((id) => repo.get("products", id)))).filter(Boolean) as Record<string, any>[]
      : ((await repo.list("products")) as Record<string, any>[]).filter((p) => p.visible !== false)

    const synced: SyncedItem[] = []
    const failed: { productId: string; name: string; error: string }[] = []

    for (const p of products) {
      try {
        synced.push(await syncOne(p))
      } catch (e: any) {
        failed.push({ productId: p.id, name: p.name, error: e?.message || "Sync failed" })
      }
    }

    return NextResponse.json({ ok: true, synced, failed })
  } catch (e: any) {
    console.error("[shop/products/sync]", e)
    return NextResponse.json({ error: e?.message || "Sync failed" }, { status: 500 })
  }
}
