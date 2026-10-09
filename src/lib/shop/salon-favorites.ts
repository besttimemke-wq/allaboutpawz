import "server-only"
import { pgQuery } from "@/lib/pg"
import { cached } from "@/lib/cache"

// ---------------------------------------------------------------------------
// salon-favorites — the "AA Picks · Salon Favorites" curation.
//
// The owner curates the trust surface directly in Supabase by flagging
// products with products.is_salon_favorite. Every surface that shows the
// curation (homepage rail, /shop/collections/salon-favorites) reads the SAME
// flag through this one module — no parallel hand-maintained lists.
//
// Query mirrors the PLP shape: price/stock from active variants (lateral min),
// first image by sort_order, visible-review rollup, and ONE card per variant
// group (variant_group_key) so multi-listing items appear once. Cached 5 min
// (owner edits the flags rarely; SWR keeps views instant).
// ---------------------------------------------------------------------------

export type SalonFavorite = {
  id: string
  slug: string
  name: string
  brand: string | null
  image: string | null
  /** Clean plain-text blurb (products.short_description — trigger-written). */
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
  WITH fav AS (
    SELECT p.id, p.slug, COALESCE(p.title, p.name) AS name, p.brand,
           p.short_description,
           p.is_sale, p.is_new, p.is_best_seller, p.created_at,
           v.price, v.compare_at, v.in_stock,
           m.url AS image,
           review.n AS review_n, review.avg AS review_avg,
           COALESCE(p.variant_group_key, p.id::text) AS gkey
      FROM products p
      LEFT JOIN LATERAL (
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
     WHERE p.status = 'published' AND p.is_salon_favorite = true
       AND v.price IS NOT NULL
  ),
  ranked AS (
    SELECT *, row_number() OVER (
      PARTITION BY gkey
      ORDER BY is_best_seller DESC NULLS LAST, review_n DESC NULLS LAST,
               price ASC NULLS LAST, created_at DESC
    ) AS rn
      FROM fav
  )
  SELECT id, slug, name, brand, short_description,
         is_sale, is_new, is_best_seller,
         price, compare_at, in_stock, image, review_n, review_avg
    FROM ranked
   WHERE rn = 1
   ORDER BY is_best_seller DESC NULLS LAST, review_n DESC NULLS LAST, created_at DESC
   LIMIT $1`

function toCents(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

function mapFavorite(r: Record<string, unknown>): SalonFavorite {
  const priceCents = toCents(r.price)
  const compareAtCents = toCents(r.compare_at)
  const isOnSale = r.is_sale === true || (compareAtCents != null && priceCents != null && compareAtCents > priceCents)
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
    ratingAvg: r.review_avg != null ? Math.round(Number(r.review_avg) * 10) / 10 : null,
    ratingCount: Number(r.review_n) || 0,
  }
}

/** Salon-favorite cards (deduped per variant group). Cached 5 min. */
export async function getSalonFavorites(limit = 12): Promise<SalonFavorite[]> {
  return cached(`salon-favorites:${limit}`, 5 * 60_000, async () => {
    const rows = await pgQuery<Record<string, unknown>>(FAVORITES_SQL, [limit])
    return rows.map(mapFavorite)
  })
}

/** Total count of deduped salon favorites (for the collection page header). */
export async function getSalonFavoritesCount(): Promise<number> {
  return cached("salon-favorites:count", 5 * 60_000, async () => {
    const rows = await pgQuery<{ n: number }>(
      `SELECT count(DISTINCT COALESCE(variant_group_key, id::text))::int AS n
         FROM products WHERE status = 'published' AND is_salon_favorite = true`,
    )
    return rows[0]?.n ?? 0
  })
}
