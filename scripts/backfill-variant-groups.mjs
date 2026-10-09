// ---------------------------------------------------------------------------
// Backfill products.variant_group_key — group same-item listings.
//
// Run: node --env-file=.env scripts/backfill-variant-groups.mjs
//
// Group key = brand + base name, both normalized:
//   • lowercase, punctuation → space
//   • color words stripped (brown, black, blue, orange, pink, purple,
//     green, red, yellow, gray/grey, tan, white, charcoal, teal, ...)
//   • size words stripped (xs..xxl, small/medium/large, oz, lb sizes,
//     pack counts, "case of N")
//   • whitespace collapsed
// Rows that normalize identically for a brand are the same physical item.
// Idempotent: recomputes every published row; cheap (single scan + update).
// ---------------------------------------------------------------------------

import pg from "pg"
import { readFileSync } from "node:fs"

const env = {}
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2]
}

const cs = env.SUPABASE_SESSION_POOLER
if (!cs) {
  console.error("SUPABASE_SESSION_POOLER missing")
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: cs,
  max: 2,
  ssl: cs.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
})

const COLORS = [
  "brown","black","blue","orange","pink","purple","green","red","yellow","gray","grey",
  "tan","white","charcoal","teal","beige","cream","turquoise","aqua","maroon","navy",
  "khaki","olive","mint","coral","lavender","burgundy","mocha","chocolate","coffee",
  "silver","gold","rose","bronze","copper","leopard","camo","camouflage","plaid",
  "striped","stripe","polka","dot","floral","neutral","multi","multicolor","assorted",
]
const SIZES = [
  "xs","s","m","l","xl","xxl","xxxl","2xl","3xl","small","medium","large","jumbo","mini",
  "petite","tall","long","short","extra",
]
const NOISE = [
  "case","of","pack","count","ct","oz","ounce","lb","lbs","pound","pounds","inch","in","ft",
]

function normalize(name) {
  let t = " " + String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ") + " "
  // "case of 12", "12 pack", "5.5-oz" → gone
  t = t.replace(/\s\d+(\.\d+)?\s?(oz|ounce|lb|lbs|inch|in|ft|pack|count|ct)\b/g, " ")
  t = t.replace(/\bcase of \d+\b/g, " ")
  t = t.replace(/\b\d+\s?(pack|count|ct)\b/g, " ")
  t = t.replace(/\b\d+(\.\d+)?\b/g, " ")
  for (const w of COLORS) t = t.replace(new RegExp(`\\s${w}\\s`, "g"), " ")
  for (const w of SIZES) t = t.replace(new RegExp(`\\s${w}\\s`, "g"), " ")
  for (const w of NOISE) t = t.replace(new RegExp(`\\s${w}\\s`, "g"), " ")
  t = t.replace(/\s+/g, " ").trim()
  return t
}

try {
  const { rows } = await pool.query(
    `SELECT id, COALESCE(brand,'') AS brand, COALESCE(title, name) AS name FROM products WHERE status = 'published'`,
  )
  let updated = 0
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const ids = []
    const keys = []
    for (const r of slice) {
      const base = normalize(r.name)
      const brand = String(r.brand).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
      // No meaningful base (e.g. accessories) → leave NULL (never grouped).
      if (base.length < 6) continue
      ids.push(r.id)
      keys.push(`${brand}|${base}`)
    }
    if (ids.length === 0) continue
    // Single UPDATE with unnest — one round trip per batch.
    const res = await pool.query(
      `UPDATE products p SET variant_group_key = k.key
         FROM (SELECT * FROM unnest($1::uuid[], $2::text[]) AS t(id, key)) k
       WHERE p.id = k.id AND p.variant_group_key IS DISTINCT FROM k.key`,
      [ids, keys],
    )
    updated += res.rowCount
  }
  const { rows: stat } = await pool.query(
    `SELECT count(DISTINCT variant_group_key) AS groups,
            count(*) FILTER (WHERE variant_group_key IS NOT NULL) AS keyed
       FROM products WHERE status='published'`,
  )
  const { rows: multi } = await pool.query(
    `SELECT count(*) AS multi_groups FROM (
       SELECT variant_group_key FROM products WHERE status='published' AND variant_group_key IS NOT NULL
       GROUP BY variant_group_key HAVING count(*) > 1) t`,
  )
  console.log(`keyed ${stat[0].keyed} products → ${stat[0].groups} groups (${multi[0].multi_groups} groups have 2+ items); ${updated} rows updated`)
} finally {
  await pool.end()
}
