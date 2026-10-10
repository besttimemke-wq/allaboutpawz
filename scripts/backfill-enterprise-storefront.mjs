// ============================================================================
// backfill-enterprise-storefront.mjs — Oct 10, 2026
// Completes the flat→enterprise migration for STOREFRONT reads:
//   A. commerce_catalog_items.metadata.slug  (11,329 migrated items lack it;
//      the app layer filters getProducts() on slug truthiness)
//   B. commerce_prices (RETAIL price list): price = erp_product_skus.unit_price,
//      compare_at_price = erp_product_variants.attributes.compare_at_price
//      when strictly greater (drives SALE badges + strikethrough)
//   C. commerce_product_media from product_media (erp_products.id = flat
//      products.id), is_primary = first image per product by sort_order
// Idempotent — safe to re-run.
// ============================================================================
import pg from "pg";

const cs = process.env.SUPABASE_SESSION_POOLER ||
  "postgresql://postgres.qdgfkxbkqcnuhckhvhzd:Aapawzmemphis!@aws-0-us-west-2.pooler.supabase.com:5432/postgres";

const pool = new pg.Pool({
  connectionString: cs, max: 1,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, query_timeout: 240000,
});

try {
  // ---- A. slug ----
  const a = await pool.query(`
    UPDATE commerce_catalog_items ci
    SET metadata = COALESCE(ci.metadata, '{}'::jsonb) || jsonb_build_object('slug', ep.metadata->>'slug'),
        updated_at = now()
    FROM erp_product_skus es
    JOIN erp_products ep ON ep.id = es.product_id
    WHERE ci.sku_id = es.id
      AND COALESCE(ci.metadata->>'slug','') = ''
      AND COALESCE(ep.metadata->>'slug','') <> ''
  `);
  console.log("A. slugs backfilled:", a.rowCount);

  // ---- B. commerce_prices ----
  const b = await pool.query(`
    INSERT INTO commerce_prices
      (id, tenant_id, price_list_id, catalog_item_id, price, compare_at_price, valid_from)
    SELECT gen_random_uuid(), ci.tenant_id, pl.id, ci.id, es.unit_price,
           CASE WHEN (ev.attributes->>'compare_at_price')::numeric > es.unit_price
                THEN (ev.attributes->>'compare_at_price')::numeric END,
           now()
    FROM commerce_catalog_items ci
    JOIN erp_product_skus es ON es.id = ci.sku_id
    LEFT JOIN erp_product_variants ev ON ev.id = es.variant_id
    JOIN commerce_price_lists pl ON pl.tenant_id = ci.tenant_id AND pl.code = 'RETAIL' AND pl.active = true
    WHERE COALESCE(ci.metadata->>'slug','') <> ''
      AND es.unit_price > 0
      AND NOT EXISTS (
        SELECT 1 FROM commerce_prices cp
        WHERE cp.catalog_item_id = ci.id AND cp.price_list_id = pl.id
      )
  `);
  console.log("B. prices backfilled:", b.rowCount);

  // ---- C. commerce_product_media ----
  const c = await pool.query(`
    INSERT INTO commerce_product_media
      (id, tenant_id, catalog_item_id, media_type, url, alt_text, sort_order, is_primary)
    SELECT gen_random_uuid(), ci.tenant_id, ci.id,
           COALESCE(NULLIF(pm.media_type, ''), 'image'),
           pm.url, pm.alt_text, pm.sort_order, ranked.rn = 1
    FROM commerce_catalog_items ci
    JOIN erp_product_skus es ON es.id = ci.sku_id
    JOIN erp_products ep ON ep.id = es.product_id
    JOIN product_media pm ON pm.product_id = ep.id
    JOIN (
      SELECT pm2.id, row_number() OVER (PARTITION BY pm2.product_id ORDER BY pm2.sort_order ASC NULLS LAST, pm2.id ASC) AS rn
      FROM product_media pm2
    ) ranked ON ranked.id = pm.id
    WHERE COALESCE(ci.metadata->>'slug','') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM commerce_product_media m2
        WHERE m2.catalog_item_id = ci.id AND m2.url = pm.url
      )
  `);
  console.log("C. media backfilled:", c.rowCount);

  // ---- Verify ----
  const v = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM commerce_catalog_items WHERE COALESCE(metadata->>'slug','') <> '') AS items_with_slug,
      (SELECT COUNT(*)::int FROM commerce_prices) AS prices,
      (SELECT COUNT(*)::int FROM commerce_product_media) AS media,
      (SELECT COUNT(*)::int FROM commerce_product_media WHERE is_primary) AS primary_media
  `);
  console.log("VERIFY:", JSON.stringify(v.rows[0]));
} catch (e) {
  console.error("ERR:", e.message);
} finally {
  await pool.end();
}
