import { NextRequest, NextResponse } from "next/server"
import { repo, supabaseReady } from "@/lib/repo"
import { listCatalogProducts } from "@/lib/enterprise/catalog"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ============================================================================
// POST /api/shop/cart — server-side cart + coupon verifier.
//
// Body: { items: [{ id, qty }], couponCode?: string }
//
// For each line item:
//   • looks up the product in the NORMALIZED catalog (commerce_catalog_items
//     + erp_products + erp_product_skus + commerce_prices) via
//     listCatalogProducts()
//   • skips (with a `missing` flag) when not found or not visible
//   • activePrice = CatalogProduct.priceCents (sale price when on sale,
//     otherwise the base price from commerce_prices)
//   • lineTotal = activePrice * qty
//
// If couponCode is provided:
//   • looks up commerce_coupons by UPPER(code) (and tenant_id)
//   • validates: status==='active' AND valid_from (null|<=now)
//     AND valid_to (null|>=now) AND usage_limit (null|usage_count<limit)
//   • joins commerce_promotions by promotion_id to get promotion_type +
//     value. percent_off → subtotal * (value/100);
//     amount_off → min(value, subtotal).
//
// Returns: { subtotal, discount, total, couponApplied, items: [...] }
// ============================================================================

const TENANT_ID = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"

type CartItem = { id: string; qty: number; quantity?: number }

function fmt(n: number): string {
  return `$${n.toFixed(2)}`
}

export async function POST(req: NextRequest) {
  if (!supabaseReady) {
    return NextResponse.json(
      { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env, then restart the dev server." },
      { status: 503 },
    )
  }

  try {
    const body = await req.json().catch(() => ({}))
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : []
    const couponCode: string | undefined = typeof body?.couponCode === "string" && body.couponCode.trim()
      ? body.couponCode.trim()
      : undefined

    if (items.length === 0) {
      return NextResponse.json(
        { subtotal: 0, discount: 0, total: 0, couponApplied: false, items: [] },
      )
    }

    // ---- Resolve products (NORMALIZED catalog) ---------------------------
    const products = await listCatalogProducts()
    const lineItems: any[] = []
    let subtotal = 0

    for (const it of items) {
      const id = String(it?.id || "")
      const qty = Math.max(1, Math.min(99, parseInt(String(it?.qty ?? it?.quantity ?? 1), 10) || 1))
      if (!id) continue
      const p = products.find((x) => x.id === id)
      if (!p || !p.visible) {
        lineItems.push({ id, name: "Unavailable", qty, unitPrice: "$0.00", lineTotal: 0, missing: true })
        continue
      }
      // priceCents is the active display price (sale when on sale, else base).
      const active = p.priceCents / 100
      const lineTotal = active * qty
      subtotal += lineTotal
      lineItems.push({
        id: p.id,
        name: p.name,
        qty,
        unitPrice: fmt(active),
        lineTotal,
      })
    }

    // ---- Resolve coupon ----------------------------------------------------
    let discount = 0
    let couponApplied = false
    let couponMessage: string | undefined
    if (couponCode) {
      const coupons = (await repo.list("commerce_coupons").catch(() => [])) as any[]
      const coupon = coupons.find((c: any) =>
        String(c.code || "").toUpperCase() === couponCode.toUpperCase() &&
        String(c.tenant_id || TENANT_ID) === TENANT_ID,
      )

      const now = Date.now()
      const validFromOk = !coupon?.valid_from || new Date(coupon.valid_from).getTime() <= now
      const validToOk = !coupon?.valid_to || new Date(coupon.valid_to).getTime() >= now
      const usageOk = !coupon?.usage_limit || Number(coupon.usage_count || 0) < Number(coupon.usage_limit)
      const statusOk = coupon?.status === "active"

      if (coupon && statusOk && validFromOk && validToOk && usageOk) {
        // Join to commerce_promotions for the discount math.
        let promo: any = null
        if (coupon.promotion_id) {
          promo = await repo.get("commerce_promotions", String(coupon.promotion_id)).catch(() => null)
        }
        if (promo) {
          const value = Number(promo.value || 0)
          const ptype = String(promo.promotion_type || "").toLowerCase()
          if (ptype === "percent_off" || ptype === "percentage") {
            discount = (subtotal * value) / 100
          } else if (ptype === "amount_off" || ptype === "fixed") {
            discount = Math.min(value, subtotal)
          }
          // Optional: respect minimum_subtotal / maximum_discount caps.
          if (promo.minimum_subtotal != null) {
            const min = Number(promo.minimum_subtotal)
            if (!isNaN(min) && subtotal < min) {
              discount = 0
              couponMessage = `Coupon requires a $${min.toFixed(2)} minimum subtotal.`
            }
          }
          if (promo.maximum_discount != null && discount > 0) {
            const max = Number(promo.maximum_discount)
            if (!isNaN(max) && discount > max) discount = max
          }
        }
        if (discount > 0) {
          couponApplied = true
        } else if (!couponMessage) {
          couponMessage = "Coupon applied but no discount could be computed."
        }
      } else if (coupon) {
        couponMessage = !statusOk
          ? "Coupon is no longer active."
          : !validFromOk
            ? "Coupon is not yet valid."
            : !validToOk
              ? "Coupon has expired."
              : !usageOk
                ? "Coupon usage limit reached."
                : "Coupon is not valid."
      } else {
        couponMessage = "Coupon not found."
      }
    }

    const total = Math.max(0, subtotal - discount)

    return NextResponse.json({
      subtotal,
      discount,
      total,
      couponApplied,
      ...(couponMessage ? { couponMessage } : {}),
      items: lineItems,
    })
  } catch (e: any) {
    console.error("[POST /api/shop/cart]", e)
    return NextResponse.json({ error: e?.message || "Cart verification failed" }, { status: 500 })
  }
}
