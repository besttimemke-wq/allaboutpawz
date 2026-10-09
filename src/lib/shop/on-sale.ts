import "server-only"
import { pgQuery } from "@/lib/pg"
import { cached } from "@/lib/cache"
import type { SalonFavorite } from "@/lib/shop/salon-favorites"

// ---------------------------------------------------------------------------
// on-sale — the homepage final CTA's "on sale items scrolling" rail.
//
// Same card shape as the AA Picks curation (SalonFavorite) so the ProductCard
// mapping is shared. A product qualifies when it is flagged is_sale OR any
// active variant has compare_at_price > price. Ranked by the biggest visible
// markdown first, then best-seller / review volume. One card per variant
// group, cached 5 min like the rest of the merchandising reads.
// ---------------------------------------------------------------------------

export type SaleProduct = SalonFavorite

const ON_SALE_SQL = `
  WITH sale AS (
    SELECT p.id, p.slug, COALESCE(p.title, p.name) AS name, p.brand,
           p.is_sale, p.is_new, p.is_best_seller, p.created_at,
           v.price, v.compare_at, v.in_stock,
           m.url AS image,
           review.n AS review_n, review.avg AS review_avg,
           COALESCE(p.variant_group_key, p.id::text) AS gkey
      FROM products p
      JOIN LATERAL (
        SELECT min(vv.price) AS price,
               min(vv.compare_at_price) FILTER (WHERE vv.compare_at_price > vv.price) AS compare_at,
               bool_or(vv.in_stock) AS in_stock
          FROM product_variants vv
         WHERE vv.product_id = p.id AND vv.status = 'active' AND vv.price IS NOT NULL
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT mm.url FROM product_media mm
         WHERE mm.product_id = p.id AND mm.media_type = 'image'
         ORDER BY mm.sort_order LIMIT 1
      ) m ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS n, avg(rr.rating) AS avg
          FROM product_reviews rr
         WHERE rr."productId" = p.id::text AND rr.visible = true
      ) review ON true
     WHERE p.status = 'published'
       AND (p.is_sale = true OR v.compare_at IS NOT NULL)
       AND v.price IS NOT NULL
       AND v.in_stock IS TRUE
  ),
  ranked AS (
    SELECT *, row_number() OVER (
      PARTITION BY gkey
      ORDER BY is_best_seller DESC NULLS LAST, review_n DESC NULLS LAST,
               price ASC NULLS LAST, created_at DESC
    ) AS rn
      FROM sale
  )
  SELECT id, slug, name, brand, is_sale, is_new, is_best_seller,
         price, compare_at, in_stock, image, review_n, review_avg
    FROM ranked
   WHERE rn = 1
   ORDER BY (CASE WHEN compare_at > price THEN (compare_at - price) / compare_at ELSE 0 END) DESC NULLS LAST,
            is_best_seller DESC NULLS LAST, review_n DESC NULLS LAST, created_at DESC
   LIMIT $1`

function toCents(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function mapSaleProduct(r: Record<string, unknown>): SaleProduct {
  const priceCents = toCents(r.price)
  const compareAtCents = toCents(r.compare_at)
  const isOnSale = r.is_sale === true || (compareAtCents != null && priceCents != null && compareAtCents > priceCents)
  return {
    id: String(r.id),
    slug: String(r.slug ?? ""),
    name: String(r.name ?? ""),
    brand: (r.brand as string) || null,
    image: (r.image as string) || null,
    priceCents,
    compareAtPriceCents: isOnSale ? compareAtCents : null,
    isOnSale,
    isNew: r.is_new === true,
    isBestseller: r.is_best_seller === true,
    inStock: r.in_stock !== false,
    ratingAvg: r.review_avg != null ? Math.round(Number(r.review_avg) * 10) / 10 : null,
    ratingCount: Number(r.review_n) || 0,
  }
}

/** On-sale products for the homepage final CTA rail. Cached 5 min. */
export async function getOnSaleProducts(limit = 12): Promise<SaleProduct[]> {
  return cached(`on-sale:${limit}`, 5 * 60_000, async () => {
    const rows = await pgQuery<Record<string, unknown>>(ON_SALE_SQL, [limit])
    return rows.map(mapSaleProduct)
  })
}
