// ---------------------------------------------------------------------------
// GET|POST /api/automations/product-page-queue
//
// PRODUCT-PAGE QUEUE PROCESSOR — the automation behind product_page_queue.
// feed-sync enqueues every NEW product it places (status='pending'); this
// route drains the queue:
//
//   1. claim a batch atomically (FOR UPDATE SKIP LOCKED — safe when cron
//      overlaps or an admin runs it manually)
//   2. per entry: verify the product is still published, revalidate the PDP
//      (cache + metadata fresh), and — when INDEXNOW_KEY is configured —
//      submit the URL to IndexNow so search engines crawl it immediately
//   3. mark processed / re-queue failures (attempts cap 5 → 'failed')
//
// TRIGGERS:
//   - Vercel Cron (vercel.json) — hourly, Authorization: Bearer $CRON_SECRET
//   - Manual: /api/automations/product-page-queue?secret=$CRON_SECRET
//
// ONE-TIME BACKFILL (catalog predating the queue):
//   /api/automations/product-page-queue?secret=…&enqueue-missing=500
//   inserts queue rows for published products that have none (cap per run).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { pgQuery } from "@/lib/pg"
import { SITE_URL } from "@/lib/site-url"

const BATCH_LIMIT = 50
const MAX_ATTEMPTS = 5

type QueueRow = { id: string; product_id: string; slug: string | null; attempts: number }

async function indexNowSubmit(urls: string[]): Promise<number> {
  const key = process.env.INDEXNOW_KEY
  if (!key || urls.length === 0) return 0
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key,
        keyLocation: `${SITE_URL}/${key}.txt`,
        urlList: urls,
      }),
      // Never let a slow search-engine endpoint hold the cron run hostage.
      signal: AbortSignal.timeout(8000),
    })
    return res.ok ? urls.length : 0
  } catch {
    return 0
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}
export async function POST(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest) {
  // ---- Auth: Vercel Cron bearer or ?secret= (when CRON_SECRET is set) ----
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization") || ""
    const querySecret = new URL(req.url).searchParams.get("secret") || ""
    if (auth !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const sp = new URL(req.url).searchParams
  const enqueueMissing = Math.min(1000, Math.max(0, Number(sp.get("enqueue-missing")) || 0))

  try {
    // ---- Optional backfill: queue published products that have no row ----
    let enqueued = 0
    if (enqueueMissing > 0) {
      const ins = await pgQuery<{ product_id: string }>(
        `INSERT INTO product_page_queue (product_id, slug, status)
         SELECT p.id, p.slug, 'pending'
           FROM products p
          WHERE p.status = 'published'
            AND NOT EXISTS (SELECT 1 FROM product_page_queue q WHERE q.product_id = p.id)
          LIMIT $1`,
        [enqueueMissing],
      )
      enqueued = ins.length
    }

    // ---- Claim a batch atomically ----
    const claimed = await pgQuery<QueueRow>(
      `UPDATE product_page_queue
          SET status = 'processing', attempts = attempts + 1
        WHERE id IN (
          SELECT id FROM product_page_queue
           WHERE status = 'pending' AND attempts < $1
           ORDER BY created_at
           LIMIT $2
           FOR UPDATE SKIP LOCKED
        )
        RETURNING id, product_id, slug, attempts`,
      [MAX_ATTEMPTS, BATCH_LIMIT],
    )

    let processed = 0
    let skipped = 0
    let failed = 0
    const submittedUrls: string[] = []

    for (const row of claimed) {
      const slug = row.slug || ""
      try {
        // The product must still exist and be published.
        const prod = await pgQuery<{ slug: string }>(
          `SELECT slug FROM products WHERE id = $1::uuid AND status = 'published'`,
          [row.product_id],
        )
        if (!prod.length) {
          await pgQuery(`UPDATE product_page_queue SET status = 'skipped', processed_at = now() WHERE id = $1::uuid`, [row.id])
          skipped++
          continue
        }

        const productSlug = prod[0].slug || slug
        // Revalidate the PDP — Next refreshes its cached render + data.
        revalidatePath(`/products/${productSlug}`)
        submittedUrls.push(`${SITE_URL}/products/${productSlug}`)

        await pgQuery(`UPDATE product_page_queue SET status = 'processed', processed_at = now() WHERE id = $1::uuid`, [row.id])
        processed++
      } catch {
        // Failure → back to pending until the attempts cap, then failed.
        await pgQuery(
          `UPDATE product_page_queue SET status = $2, processed_at = NULL WHERE id = $1::uuid`,
          [row.id, row.attempts >= MAX_ATTEMPTS ? "failed" : "pending"],
        )
        failed++
      }
    }

    const indexed = await indexNowSubmit(submittedUrls)

    const remaining = await pgQuery<{ n: number }>(
      `SELECT count(*)::int AS n FROM product_page_queue WHERE status = 'pending'`,
    )

    return NextResponse.json({
      ok: true,
      claimed: claimed.length,
      processed,
      skipped,
      failed,
      enqueuedMissing: enqueued,
      indexNowSubmitted: indexed,
      pendingRemaining: remaining[0]?.n ?? 0,
    })
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message || e) }, { status: 500 })
  }
}
