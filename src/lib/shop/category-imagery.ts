// ---------------------------------------------------------------------------
// Enterprise Category Imagery Strategy — selection function (owner spec).
//
// Picks the best hero image for a taxonomy node from its product photos:
//   1. Hero selection priority: best-selling → top rated (4+ stars, 10+
//      reviews) → newest professional photos → parent category → brand
//      placeholder. (Order volume proxy: salon favorite + review social
//      proof — see scoreImage.)
//   2. Additive-only storage: taxonomy_nodes.hero_image_url /
//      hero_image_product_id / hero_image_locked / hero_image_updated_at.
//   3. hero_image_locked = true means an admin pinned this image — never
//      overwrite. Selection is otherwise idempotent and safe to re-run.
//
// Source images come from product_media (supplier CDN). Copies are uploaded
// to Supabase Storage (bucket "category-images", path <node-uuid>/hero.jpg)
// when the service role key is available; if a fetch/upload fails the
// supplier URL is stored directly so the node still gets a unique image.
// ---------------------------------------------------------------------------

import { pgQuery, pgExec } from "@/lib/pg"

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const STORAGE_BUCKET = "category-images"

export const PLACEHOLDER_RE = /(placeholder|no[-_]?image|missing|coming[-_]?soon)/i

export interface ImageCandidate {
  productId: string
  productName: string
  url: string
  rating: number
  reviews: number
  isSalonFavorite: boolean
  createdAt: string
  score: number
}

/**
 * Owner spec scoring:
 *   has image          — required (candidates without photos are excluded)
 *   is_salon_favorite  — +50
 *   review count       — +1 per 10 reviews
 *   rating             — +10 per star above 4
 *   fresh (< 30 days)  — +5
 *   non-placeholder    — +100
 */
export function scoreImage(c: {
  isSalonFavorite: boolean
  reviews: number
  rating: number
  createdAt: string | Date
  url: string
}): number {
  let score = 100 * (PLACEHOLDER_RE.test(c.url) ? 0 : 1)
  if (c.isSalonFavorite) score += 50
  score += Math.floor(c.reviews / 10)
  if (c.rating > 4) score += (c.rating - 4) * 10
  const created = typeof c.createdAt === "string" ? new Date(c.createdAt) : c.createdAt
  if (Date.now() - created.getTime() < 30 * 24 * 60 * 60 * 1000) score += 5
  return score
}

/**
 * Candidate query — recursive subtree walk (all products hang at L3; the
 * non-cat/dog L2 departments have 0 direct attachments). Returns the top
 * scored candidates, best first.
 */
export async function getNodeImageCandidates(nodeId: string, limit = 5): Promise<ImageCandidate[]> {
  const rows = await pgQuery<{
    id: string
    name: string
    url: string
    rating: string | null
    reviews: string
    is_salon_favorite: boolean
    created_at: string
  }>(
    `WITH RECURSIVE sub AS (
       SELECT id, depth FROM taxonomy_nodes WHERE id = $1::uuid
       UNION ALL
       SELECT tn.id, tn.depth FROM taxonomy_nodes tn JOIN sub ON tn.parent_id = sub.id
     ),
     attached AS (
       SELECT DISTINCT p.id, p.name, p.created_at, p.is_salon_favorite
       FROM products p
       WHERE p.status = 'published'
         AND (p.category_id IN (SELECT id FROM sub)
              OR EXISTS (SELECT 1 FROM product_nodes pn
                         WHERE pn.product_id = p.id AND pn.node_id IN (SELECT id FROM sub)))
     ),
     best_media AS (
       SELECT DISTINCT ON (pm.product_id) pm.product_id, pm.url
       FROM product_media pm
       JOIN attached a ON a.id = pm.product_id
       WHERE pm.media_type = 'image'
       ORDER BY pm.product_id, pm.sort_order NULLS LAST
     ),
     review_agg AS (
       SELECT pr."productId" AS pid, AVG(pr.rating) AS avg_rating, COUNT(*) AS cnt
       FROM product_reviews pr
       WHERE pr.visible = true
       GROUP BY 1
     )
     SELECT a.id, a.name, bm.url,
            r.avg_rating AS rating, r.cnt AS reviews,
            a.is_salon_favorite, a.created_at
       FROM attached a
       JOIN best_media bm ON bm.product_id = a.id
       LEFT JOIN review_agg r ON r.pid = a.id::text
      ORDER BY a.is_salon_favorite DESC, r.cnt DESC NULLS LAST, r.avg_rating DESC NULLS LAST, a.created_at DESC
      LIMIT 200`,
    [nodeId],
  )

  return rows
    .map(r => {
      const rating = r.rating ? Number(r.rating) : 0
      const reviews = Number(r.reviews ?? 0)
      const c = {
        url: r.url,
        isSalonFavorite: !!r.is_salon_favorite,
        reviews,
        rating,
        createdAt: r.created_at,
      }
      return {
        productId: r.id,
        productName: r.name,
        url: r.url,
        rating,
        reviews,
        isSalonFavorite: !!r.is_salon_favorite,
        createdAt: r.created_at,
        score: scoreImage(c),
      }
    })
    .sort((a, b) => b.score - a.score || b.reviews - a.reviews)
    .slice(0, limit)
}

// --- Storage helpers -------------------------------------------------------

async function ensureBucket(): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_KEY) return false
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${STORAGE_BUCKET}`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return true
    // 404 / default: try to create (idempotent — 400 "already exists" also ok)
    const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ id: STORAGE_BUCKET, name: STORAGE_BUCKET, public: true }),
      signal: AbortSignal.timeout(8000),
    })
    return create.ok || (await fetch(`${SUPABASE_URL}/storage/v1/bucket/${STORAGE_BUCKET}`, {
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
      signal: AbortSignal.timeout(8000),
    }).then(r => r.ok))
  } catch {
    return false
  }
}

async function copyToStorage(nodeId: string, sourceUrl: string): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null
  try {
    const img = await fetch(sourceUrl, { signal: AbortSignal.timeout(10_000) })
    if (!img.ok) return null
    const type = img.headers.get("content-type") ?? "image/jpeg"
    if (!type.startsWith("image/")) return null
    const bytes = Buffer.from(await img.arrayBuffer())
    if (bytes.length < 1024 || bytes.length > 8 * 1024 * 1024) return null
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg"
    const objectPath = `${nodeId}/hero.${ext}`
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": type,
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(15_000),
    })
    if (!up.ok) return null
    return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`
  } catch {
    return null
  }
}

// --- Core selection --------------------------------------------------------

export interface RefreshResult {
  nodeId: string
  status: "updated" | "locked" | "no-candidates" | "failed" | "skipped"
  heroImageUrl?: string
  productId?: string
  score?: number
  storedIn?: "storage" | "source"
}

/**
 * Refresh one node's hero image (owner spec refreshCategoryImage):
 *   - respect hero_image_locked (admin pin) — skip
 *   - score candidates from the node's subtree product photos
 *   - copy winner to Supabase Storage, fall back to the supplier URL
 *   - write hero_image_url + hero_image_product_id + hero_image_updated_at
 *   - honor the priority chain: best product photo → (future: parent
 *     category → brand placeholder) — parent/brand fallbacks land with the
 *     front-end integration pass, selection stays product-first per spec.
 */
export async function refreshCategoryImage(nodeId: string): Promise<RefreshResult> {
  const lock = await pgQuery<{ hero_image_locked: boolean }>(
    `SELECT hero_image_locked FROM taxonomy_nodes WHERE id = $1::uuid`,
    [nodeId],
  )
  if (lock.length && lock[0].hero_image_locked) {
    return { nodeId, status: "locked" }
  }

  const candidates = await getNodeImageCandidates(nodeId)
  const winner = candidates.find(c => c.score > 0)
  if (!winner) {
    return { nodeId, status: "no-candidates" }
  }

  const stored = (await ensureBucket()) ? await copyToStorage(nodeId, winner.url) : null
  const heroUrl = stored ?? winner.url

  // $1 = node id, $2 = hero url, $3 = winning PRODUCT id (verify the write —
  // pgExec swallows SQL errors, so a 0 rowCount must surface as a failure)
  const wrote = await pgExec(
    `UPDATE taxonomy_nodes
        SET hero_image_url = $2, hero_image_product_id = $3::uuid, hero_image_updated_at = now()
      WHERE id = $1::uuid`,
    [nodeId, heroUrl, winner.productId],
  )
  if (!wrote) {
    console.error(`[category-imagery] node ${nodeId}: hero UPDATE wrote 0 rows`)
    return { nodeId, status: "failed" }
  }

  return {
    nodeId,
    status: "updated",
    heroImageUrl: heroUrl,
    productId: winner.productId,
    score: winner.score,
    storedIn: stored ? "storage" : "source",
  }
}

/** All published L2+L3 node ids under an animal root (for batch refreshes). */
export async function getAnimalNodeIds(animalSlug: string): Promise<string[]> {
  const rows = await pgQuery<{ id: string }>(
    `WITH RECURSIVE sub AS (
       SELECT id FROM taxonomy_nodes WHERE slug = $1 AND depth = 1 AND status = 'published'
       UNION ALL
       SELECT tn.id FROM taxonomy_nodes tn JOIN sub ON tn.parent_id = sub.id
       WHERE tn.depth <= 3 AND tn.status = 'published'
     )
     SELECT id FROM sub`,
    [animalSlug],
  )
  return rows.map(r => r.id)
}

/** Batch: refresh every node of the given animals; returns per-node results. */
export async function refreshAnimalImagery(
  animalSlugs: string[],
  concurrency = 3,
): Promise<RefreshResult[]> {
  const ids = new Set<string>()
  for (const slug of animalSlugs) {
    for (const id of await getAnimalNodeIds(slug)) ids.add(id)
  }
  const list = Array.from(ids)
  const results: RefreshResult[] = []
  let cursor = 0
  async function worker() {
    while (cursor < list.length) {
      const id = list[cursor++]
      try {
        results.push(await refreshCategoryImage(id))
      } catch (e) {
        console.error(`[category-imagery] node ${id} failed:`, e instanceof Error ? e.message : e)
        results.push({ nodeId: id, status: "skipped" })
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker))
  return results
}
