import pg from "pg"
import { readFileSync } from "fs"

const FILE = "/home/z/my-project/upload/supabase-import.jsonl"
const envFile = readFileSync("/home/z/my-project/.env", "utf-8")
const envVars: Record<string, string> = {}
envFile.split("\n").forEach(l => {
  const m = l.match(/^([A-Z_]+)=(.*)$/)
  if (m) envVars[m[1]] = m[2].replace(/["']/g, "")
})
const DB_URL = envVars["SUPABASE_SESSION_POOLER"] || ""
const TENANT = envVars["SUPABASE_TENANT_ID"] || "00000000-0000-0000-0000-000000000001"

async function main() {
  const client = new pg.Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log("Connected to Supabase")

  // Load the mapping cache: lookup_key → { primary_category, in_taxonomy }
  const mapRes = await client.query("SELECT lookup_key, primary_category, in_taxonomy FROM supplier_category_mapping")
  const mappingCache: Map<string, { primary_category: string; in_taxonomy: boolean }> = new Map()
  mapRes.rows.forEach((r: any) => mappingCache.set(r.lookup_key, { primary_category: r.primary_category, in_taxonomy: r.in_taxonomy }))
  console.log(`Loaded ${mappingCache.size} mapping entries`)

  // Get or create price list + warehouse
  let priceListId: string
  const plRes = await client.query("SELECT id FROM public.commerce_price_lists WHERE tenant_id = $1 AND name = 'Retail' LIMIT 1", [TENANT])
  if (plRes.rows.length > 0) priceListId = plRes.rows[0].id
  else {
    const r = await client.query("INSERT INTO public.commerce_price_lists (tenant_id, code, name, currency, active) VALUES ($1, 'RETAIL', 'Retail', 'USD', true) RETURNING id", [TENANT])
    priceListId = r.rows[0].id
  }

  let warehouseId: string
  const whRes = await client.query("SELECT id FROM public.erp_warehouses WHERE tenant_id = $1 LIMIT 1", [TENANT])
  if (whRes.rows.length > 0) warehouseId = whRes.rows[0].id
  else {
    const r = await client.query("INSERT INTO public.erp_warehouses (tenant_id, code, name, warehouse_type, is_active) VALUES ($1, 'MAIN', 'Main', 'store', true) RETURNING id", [TENANT])
    warehouseId = r.rows[0].id
  }

  const raw = readFileSync(FILE, "utf-8")
  const lines = raw.trim().split("\n")
  console.log(`Total lines: ${lines.length}`)

  let imported = 0, skipped = 0, quarantined = 0, errors = 0
  const quarantine: string[] = []

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    try {
      const p = JSON.parse(lines[i])
      const tags: string[] = p.tags || []

      // Skip discontinued
      if (tags.some((t: string) => t.toLowerCase() === "discontinued")) { skipped++; continue }

      // Normalize product_type using the SAME function as the SQL
      const normalized = p.product_type.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim()

      // Look up in mapping cache — STRICT 1:1, no guessing
      const mapping = mappingCache.get(normalized)
      if (!mapping) {
        // NO MATCH → quarantine, never guess
        quarantined++
        quarantine.push(`${p.product_type} → ${normalized}`)
        continue
      }

      // Skip products not in our taxonomy (fish, bird, reptile, etc.)
      if (!mapping.in_taxonomy) { skipped++; continue }

      const category = mapping.primary_category

      // Check for duplicate slug
      const dupCheck = await client.query("SELECT id FROM public.commerce_catalog_items ci JOIN erp_product_skus s ON s.id = ci.sku_id WHERE ci.metadata->>'slug' = $1 LIMIT 1", [p.handle])
      if (dupCheck.rows.length > 0) { skipped++; continue }

      await client.query("BEGIN")

      // 1. erp_products
      const epRes = await client.query(`
        INSERT INTO public.erp_products (tenant_id, name, description, brand, product_type, is_inventory_item, is_sellable, is_purchasable, is_active, default_unit_price, metadata)
        VALUES ($1, $2, $3, $4, 'physical', true, true, true, true, $5, $6)
        RETURNING id
      `, [
        TENANT, p.title, p.description_html || null, p.vendor || null, p.price,
        JSON.stringify({ slug: p.handle, category, badge: tags.find((t: string) => t === "Best Seller") ? "bestseller" : tags.find((t: string) => t.startsWith("New")) ? "new" : null, featured: tags.some((t: string) => t === "Best Seller"), sort_order: 99 })
      ])
      const productId = epRes.rows[0].id

      // 2. erp_product_skus
      const skuCode = (p.handle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) || "SKU") + "-" + (p.sku || Math.random().toString(36).slice(2, 6)).toUpperCase()
      const skRes = await client.query(`
        INSERT INTO public.erp_product_skus (tenant_id, product_id, sku, uom, unit_price, weight, is_active)
        VALUES ($1, $2, $3, 'EA', $4, $5, true)
        RETURNING id, sku
      `, [TENANT, productId, skuCode, p.price, p.weight_grams || null])
      const skuId = skRes.rows[0].id
      const sku = skRes.rows[0].sku

      // 3. commerce_catalog_items
      const ciRes = await client.query(`
        INSERT INTO public.commerce_catalog_items (tenant_id, sku_id, item_type, sku, name, description, short_description, brand, taxable, active, ecommerce_enabled, purchasable, sellable, metadata)
        VALUES ($1, $2, 'product', $3, $4, $5, $6, $7, true, true, true, true, true, $8)
        RETURNING id
      `, [TENANT, skuId, sku, p.title, p.description_html || null, null, p.vendor || null, JSON.stringify({ slug: p.handle, product_id: productId, sort_order: 99, category })])
      const catalogItemId = ciRes.rows[0].id

      // 4. commerce_prices
      await client.query(`
        INSERT INTO public.commerce_prices (tenant_id, price_list_id, catalog_item_id, price, compare_at_price, valid_from)
        VALUES ($1, $2, $3, $4, $5, now())
        ON CONFLICT DO NOTHING
      `, [TENANT, priceListId, catalogItemId, p.price, p.compare_at_price ?? null])

      // 5. commerce_product_media
      if (Array.isArray(p.image_urls)) {
        for (let j = 0; j < p.image_urls.length; j++) {
          if (!p.image_urls[j]) continue
          await client.query(`
            INSERT INTO public.commerce_product_media (tenant_id, catalog_item_id, media_type, url, alt_text, sort_order, is_primary)
            VALUES ($1, $2, 'image', $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `, [TENANT, catalogItemId, p.image_urls[j], p.title, j, j === 0])
        }
      }

      // 6. erp_inventory_movements
      if (p.available) {
        await client.query(`
          INSERT INTO public.erp_inventory_movements (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost, source_type, source_id, reason, occurred_at)
          VALUES ($1, 'opening', $2, $3, 10, 0, 'admin', $4, 'Opening stock on import', now())
          ON CONFLICT DO NOTHING
        `, [TENANT, skuId, warehouseId, catalogItemId])
      }

      await client.query("COMMIT")
      imported++

      if (imported % 100 === 0) {
        console.log(`Progress: ${imported} imported, ${skipped} skipped, ${quarantined} quarantined, ${errors} errors, ${i + 1}/${lines.length} processed`)
      }
    } catch (err: any) {
      try { await client.query("ROLLBACK") } catch {}
      errors++
      if (errors <= 10) console.error(`Error on line ${i + 1}:`, err.message.substring(0, 150))
    }
  }

  console.log(`\n=== IMPORT COMPLETE ===`)
  console.log(`Imported:    ${imported}`)
  console.log(`Skipped:     ${skipped}`)
  console.log(`Quarantined: ${quarantined}`)
  console.log(`Errors:      ${errors}`)

  if (quarantine.length > 0) {
    console.log(`\n=== QUARANTINE LIST (no mapping found) ===`)
    const unique = [...new Set(quarantine)]
    unique.forEach(q => console.log(`  ${q}`))
  }

  // Spot-check: count per category
  console.log(`\n=== PRODUCT COUNT BY CATEGORY ===`)
  const catRes = await client.query(`
    SELECT metadata->>'category' as category, count(*) as cnt
    FROM commerce_catalog_items
    WHERE tenant_id = $1
    GROUP BY metadata->>'category'
    ORDER BY cnt DESC
    LIMIT 20
  `, [TENANT])
  catRes.rows.forEach((r: any) => console.log(`  ${r.category}: ${r.cnt}`))

  await client.end()
}

main().catch(console.error)
