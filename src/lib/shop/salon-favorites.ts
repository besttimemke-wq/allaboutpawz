import "server-only"
import { pgQuery } from "@/lib/pg"
import { cached } from "@/lib/cache"

// ---------------------------------------------------------------------------
// salon-favorites — the "AA Picks · Salon Favorites" curation.
//
// ENTERPRISE SOURCE: the owner curates by flagging catalog items with
// erp_products.metadata.is_salon_favorite (mirrored onto
// commerce_catalog_items.metadata by the flags backfill). One flag, one
// module, every surface (homepage rail + /shop/collections/salon-favorites).
//
// Query mirrors the enterprise PLP shape: price from commerce_prices (fallback
// erp_product_skus.unit_price), primary image from commerce_product_media,
// ONE card per slug. Cached 5 min.
// ---------------------------------------------------------------------------

export type SalonFavorite = {
  id: string
  slug: string
  name: string
  brand: string | null
  image: string | null
  shortDescription: string | null
  priceCents: number | null
  compareAtPriceCents: number | null
  isOnSale: boolean
  isNew: boolean
  isBestseller: boolean
  inStock: boolean
  ratingAvg: number | null
  ratingCount: number
}

const FAVORITES_SQL = `
  SELECT
    ci.id,
    ci.metadata->>'slug' AS slug,
    ci.name,
    ci.brand,
    ci.short_description,
    ci.created_at,
    COALESCE(cp.price, es.unit_price) AS price,
    cp.compare_at_price AS compare_at,
    COALESCE((ev.attributes->>'in_stock')::bool, true) AS in_stock,
    COALESCE((ep.metadata->>'is_new')::bool, (ci.metadata->>'is_new')::bool, false) AS is_new,
    COALESCE((ep.metadata->>'is_best_seller')::bool, (ci.metadata->>'is_best_seller')::bool, false) AS is_best_seller,
    (SELECT mm.url FROM commerce_product_media mm
      WHERE mm.catalog_item_id = ci.id
      ORDER BY mm.is_primary DESC, mm.sort_order ASC NULLS LAST
      LIMIT 1) AS image,
    ROW_NUMBER() OVER (
      PARTITION BY ci.metadata->>'slug'
      ORDER BY COALESCE((ep.metadata->>'is_best_seller')::bool, false) DESC,
               COALESCE(cp.price, es.unit_price) ASC NULLS LAST,
               ci.created_at DESC
    ) AS rn
  FROM commerce_catalog_items ci
  JOIN erp_product_skus es ON es.id = ci.sku_id
  JOIN erp_products ep ON ep.id = es.product_id
  LEFT JOIN erp_product_variants ev ON ev.id = es.variant_id
  LEFT JOIN commerce_prices cp ON cp.catalog_item_id = ci.id
    AND cp.price_list_id = (SELECT id FROM commerce_price_lists WHERE tenant_id = ci.tenant_id AND code = 'RETAIL' AND active LIMIT 1)
    AND (cp.valid_to IS NULL OR cp.valid_to >= now())
  WHERE ci.tenant_id = $1::uuid
    AND ci.active = true AND ci.sellable = true AND ci.ecommerce_enabled = true
    AND COALESCE(ci.metadata->>'slug', '') <> ''
    AND COALESCE(cp.price, es.unit_price) > 0
    AND COALESCE((ep.metadata->>'is_salon_favorite')::bool, (ci.metadata->>'is_salon_favorite')::bool, false) = true
`

function toCents(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function mapFavorite(r: Record<string, unknown>): SalonFavorite {
  const priceCents = toCents(r.price)
  const compareAtCents = toCents(r.compare_at)
  const isOnSale = compareAtCents != null && priceCents != null && compareAtCents > priceCents
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    brand: (r.brand as string) || null,
    image: (r.image as string) || null,
    shortDescription: ((r.short_description as string) || null),
    priceCents,
    compareAtPriceCents: isOnSale ? compareAtCents : null,
    isOnSale,
    isNew: r.is_new === true,
    isBestseller: r.is_best_seller === true,
    inStock: r.in_stock !== false,
    ratingAvg: null,
    ratingCount: 0,
  }
}

/** Salon-favorite cards (deduped per slug). Cached 5 min. */
export async function getSalonFavorites(limit = 12): Promise<SalonFavorite[]> {
  return cached(`ent:salon-favorites:${limit}`, 5 * 60_000, async () => {
    const tenant = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"
    const rows = await pgQuery<Record<string, unknown>>(
      `SELECT * FROM (${FAVORITES_SQL}) ranked WHERE rn = 1
       ORDER BY is_best_seller DESC, created_at DESC NULLS LAST
       LIMIT $2`,
      [tenant, limit],
    )
    return rows.map(mapFavorite)
  })
}

/** Total count of deduped salon favorites (for the collection page header). */
export async function getSalonFavoritesCount(): Promise<number> {
  return cached("ent:salon-favorites:count", 5 * 60_000, async () => {
    const tenant = process.env.SUPABASE_TENANT_ID || "00000000-0000-0000-0000-000000000001"
    const rows = await pgQuery<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM (${FAVORITES_SQL}) ranked WHERE rn = 1`,
      [tenant],
    )
    return rows[0]?.n ?? 0
  })
}
