// ---------------------------------------------------------------------------
// Import node_filter_values for every filter row that has NONE.
//
// WHY: v_node_filter_spec (the sidebar's facet source) renders the filters of
// effective_filter_node(node) = the DEEPEST ancestor-or-self that has ANY
// node_filters rows. 86 nodes own filter rows with ZERO linked values — their
// empty sets beat the populated parent sets, so those pages render no
// attribute facets at all (all 50 Fish/Bird/Reptile/Small Animal L3s, most
// department pages, even a few rows on the dog/cat roots).
//
// WHAT: for each valueless filter row (attribute has a value pool, and the
// attribute is not one of the live-computed generics), link the
// attribute_values that actually appear in the node subtree's product data
// (product title/name or variant title, word-boundary match). This mirrors
// the dog/cat precedent (dog root links 54 of the 57 flavor values) and keeps
// every facet option findable by the PLP filter SQL (name/variant ILIKE).
//
// Idempotent: rows that already have values are skipped; inserts guard with
// NOT EXISTS.  Run: bun scripts/import-node-filter-values.mjs [--dry-run]
// ---------------------------------------------------------------------------

import pg from "pg"

const DRY_RUN = process.argv.includes("--dry-run")

const connectionString = process.env.SUPABASE_SESSION_POOLER
if (!connectionString) {
  console.error("SUPABASE_SESSION_POOLER missing")
  process.exit(1)
}

const pool = new pg.Pool({ connectionString, max: 3 })

// Attributes the PLP computes live (Brand/Price/Rating) or that have no
// canonical value pool — never link these.
const SKIP_ATTR_SLUGS = new Set(["brand", "price", "customer-rating", "quantity"])

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/** Does haystack contain the value as a full word sequence?
 *  "dry food" needs " dry food "; "toy" also matches " toys ". */
function textMatches(haystack, valueTokens) {
  if (!haystack || valueTokens.length === 0) return false
  const v = " " + valueTokens.join(" ") + " "
  const last = valueTokens[valueTokens.length - 1]
  const vPlural = " " + valueTokens.slice(0, -1).join(" ") + (valueTokens.length > 1 ? " " : "") + last + "s "
  return haystack.includes(v) || haystack.includes(vPlural)
}

async function main() {
  // 1. All valueless filter rows with a usable attribute pool.
  const rows = (await pool.query(`
    SELECT f.id AS filter_id, f.node_id, at.slug AS attr_slug, at.name AS attr_name
      FROM node_filters f
      JOIN attributes at ON at.id = f.attribute_id
     WHERE NOT EXISTS (SELECT 1 FROM node_filter_values nfv WHERE nfv.node_filter_id = f.id)
       AND NOT (at.slug = ANY($1::text[]))
       AND EXISTS (SELECT 1 FROM attribute_values av WHERE av.attribute_id = at.id)
  `, [[...SKIP_ATTR_SLUGS]])).rows

  console.log(`valueless filter rows to fill: ${rows.length}`)

  // 2. Value pools per attribute.
  const pools = new Map()
  const poolRows = (await pool.query(`
    SELECT av.id, av.attribute_id, av.value, av.sort_order
      FROM attribute_values av
     ORDER BY av.sort_order NULLS LAST, av.value
  `)).rows
  for (const r of poolRows) {
    if (!pools.has(r.attribute_id)) pools.set(r.attribute_id, [])
    pools.get(r.attribute_id).push({ id: r.id, value: r.value, tokens: norm(r.value).split(" ").filter(Boolean), sort: r.sort_order ?? 0 })
  }

  // 3. Group filter rows by node.
  const byNode = new Map()
  for (const r of rows) {
    if (!byNode.has(r.node_id)) byNode.set(r.node_id, [])
    byNode.get(r.node_id).push(r)
  }
  console.log(`nodes affected: ${byNode.size}`)

  // 4. Per node: fetch subtree product texts once, match, insert.
  let inserted = 0
  const perAttrReport = new Map()
  for (const [nodeId, filters] of byNode) {
    // Subtree product texts (title/name + variant titles).
    const prods = (await pool.query(`
      SELECT DISTINCT COALESCE(p.title, p.name) AS t,
             (SELECT string_agg(vv.variant_title, ' | ') FROM product_variants vv
               WHERE vv.product_id = p.id AND vv.variant_title IS NOT NULL) AS vt
        FROM product_nodes pn
        JOIN products p ON p.id = pn.product_id AND p.status = 'published'
        JOIN taxonomy_nodes n ON n.id = pn.node_id
       WHERE n.path = (SELECT path FROM taxonomy_nodes WHERE id = $1)
          OR n.path LIKE (SELECT path || '/%' FROM taxonomy_nodes WHERE id = $1)
    `, [nodeId])).rows

    const haystacks = []
    for (const p of prods) {
      const base = " " + norm(p.t) + " "
      haystacks.push(base)
      if (p.vt) for (const vt of p.vt.split(" | ")) haystacks.push(" " + norm(vt) + " ")
    }

    // Need attribute pools keyed by attribute id — refetch mapping for this node's filters.
    const attrIds = (await pool.query(`
      SELECT f.id AS filter_id, f.attribute_id FROM node_filters f WHERE f.id = ANY($1::uuid[])
    `, [filters.map((x) => x.filter_id)])).rows
    const attrByFilter = new Map(attrIds.map((r) => [r.filter_id, r.attribute_id]))

    for (const f of filters) {
      const attrId = attrByFilter.get(f.filter_id)
      const vp = pools.get(attrId) || []
      const matched = []
      for (const v of vp) {
        if (haystacks.some((h) => textMatches(h, v.tokens))) matched.push(v)
      }
      if (matched.length === 0) continue
      if (DRY_RUN) {
        console.log(`  [dry] ${f.attr_slug} @ ${nodeId.slice(0, 8)} → ${matched.length} values: ${matched.slice(0, 8).map((m) => m.value).join(", ")}${matched.length > 8 ? " …" : ""}`)
        inserted += matched.length
        continue
      }
      const res = await pool.query(`
        INSERT INTO node_filter_values (node_filter_id, attribute_value_id, sort_order, is_visible, added_by, needs_review)
        SELECT $1, x.vid, x.so, true, 'admin', false
          FROM unnest($2::uuid[], $3::int[]) AS x(vid, so)
         WHERE NOT EXISTS (
          SELECT 1 FROM node_filter_values e
           WHERE e.node_filter_id = $1 AND e.attribute_value_id = x.vid)
      `, [f.filter_id, matched.map((m) => m.id), matched.map((_, i) => i + 1)])
      inserted += res.rowCount
      const key = f.attr_slug
      perAttrReport.set(key, (perAttrReport.get(key) || 0) + res.rowCount)
    }
  }

  console.log(DRY_RUN ? `would insert ${inserted} node_filter_values` : `inserted ${inserted} node_filter_values`)
  if (!DRY_RUN) for (const [k, v] of [...perAttrReport].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => pool.end())
