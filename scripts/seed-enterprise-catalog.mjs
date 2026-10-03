// ============================================================================
// seed-enterprise-catalog.mjs
// Migrates the 8 flat commerce_products rows into the REAL normalized schema:
//   erp_products + erp_product_skus + commerce_catalog_items + commerce_prices
//   + commerce_product_media + erp_inventory_movements (opening stock)
//
// Also seeds the foundation rows the normalized schema requires:
//   - commerce_price_lists (one retail price list)
//   - erp_warehouses (one default warehouse)
//   - commerce_order_channels (one 'web' channel)
//
// Idempotent — safe to re-run. Uses upserts / ON CONFLICT.
// ============================================================================
import pg from "pg";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });

const TENANT = "00000000-0000-0000-0000-000000000001";

function parseCents(s) {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

try {
  await client.connect();
  console.log("Connected. Seeding enterprise foundation...");

  // --- 1. Default price list (retail) -------------------------------------
  const { rows: plRows } = await client.query(`
    INSERT INTO public.commerce_price_lists (tenant_id, code, name, currency, list_type, active)
    VALUES ($1, 'RETAIL', 'Retail Price List', 'USD', 'retail', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET active = true
    RETURNING id;
  `, [TENANT]);
  const priceListId = plRows[0].id;
  console.log("  price_list:", priceListId);

  // --- 2. Default warehouse -----------------------------------------------
  const { rows: whRows } = await client.query(`
    INSERT INTO public.erp_warehouses (tenant_id, code, name, warehouse_type, is_active)
    VALUES ($1, 'MAIN', 'Main Warehouse', 'warehouse', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET is_active = true
    RETURNING id;
  `, [TENANT]);
  const warehouseId = whRows[0].id;
  console.log("  warehouse:", warehouseId);

  // --- 3. Default web order channel ---------------------------------------
  const { rows: chRows } = await client.query(`
    INSERT INTO public.commerce_order_channels (tenant_id, code, name, channel_type, active)
    VALUES ($1, 'WEB', 'Online Store', 'ecommerce', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET active = true
    RETURNING id;
  `, [TENANT]);
  const channelId = chRows[0].id;
  console.log("  channel:", channelId);

  // --- 4. Migrate the 8 flat commerce_products into the real schema -------
  const { rows: flatProducts } = await client.query(`
    SELECT * FROM public.commerce_products ORDER BY sort_order, name;
  `);
  console.log(`\nMigrating ${flatProducts.length} products into the normalized schema...`);

  let migrated = 0, skipped = 0;
  for (const p of flatProducts) {
    const slug = p.slug || slugify(p.name);
    if (!slug) { skipped++; continue; }

    // Check if this product is already migrated (by slug in catalog_item metadata)
    const { rows: existing } = await client.query(`
      SELECT id FROM public.commerce_catalog_items
      WHERE tenant_id = $1 AND metadata->>'slug' = $2
      LIMIT 1;
    `, [TENANT, slug]);
    if (existing.length > 0) { skipped++; continue; }

    const baseCents = parseCents(p.base_price);
    const saleCents = parseCents(p.sale_price);
    const compareCents = parseCents(p.compare_at_price);
    const priceCents = (saleCents != null && saleCents < baseCents) ? saleCents : baseCents;
    const sku = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

    // 4a. erp_products (base product — NO price, NO image)
    const { rows: epRows } = await client.query(`
      INSERT INTO public.erp_products
        (tenant_id, name, description, brand, product_type, is_inventory_item,
         is_sellable, is_purchasable, is_active, default_unit_price, metadata)
      VALUES ($1, $2, $3, $4, 'physical', true, true, true, true, $5,
        $6)
      RETURNING id;
    `, [
      TENANT,
      p.name,
      p.description || null,
      p.badge || null,
      priceCents != null ? priceCents / 100 : 0,
      JSON.stringify({
        slug,
        short_description: p.short_description || null,
        specs: p.specs || null,
        materials: p.materials || null,
        ingredients: p.ingredients || null,
        directions: p.directions || null,
        warranty: p.warranty || null,
        badge: p.badge || null,
        featured: p.featured || false,
        category_id: p.category_id || null,
        category: p.category || null,
        sort_order: p.sort_order || 99,
        stripe_product_id: p.stripe_product_id || null,
        stripe_price_id: p.stripe_price_id || null,
      }),
    ]);
    const productId = epRows[0].id;

    // 4b. erp_product_skus (the sellable unit — carries the unit_price)
    const { rows: skuRows } = await client.query(`
      INSERT INTO public.erp_product_skus
        (tenant_id, product_id, sku, uom, unit_price, is_active)
      VALUES ($1, $2, $3, 'EA', $4, true)
      RETURNING id;
    `, [TENANT, productId, sku, priceCents != null ? priceCents / 100 : 0]);
    const skuId = skuRows[0].id;

    // 4c. commerce_catalog_items (the ecommerce bridge — ecommerce_enabled=true)
    const { rows: ciRows } = await client.query(`
      INSERT INTO public.commerce_catalog_items
        (tenant_id, sku_id, item_type, sku, name, description, short_description,
         brand, taxable, active, ecommerce_enabled, purchasable, sellable, metadata)
      VALUES ($1, $2, 'product', $3, $4, $5, $6, $7, true, true, true, true, true,
        $8)
      RETURNING id;
    `, [
      TENANT, skuId, sku, p.name, p.description || null, p.short_description || null,
      p.badge || null,
      JSON.stringify({ slug, product_id: productId }),
    ]);
    const catalogItemId = ciRows[0].id;

    // 4d. commerce_prices (pricing lives HERE — not on the product)
    await client.query(`
      INSERT INTO public.commerce_prices
        (tenant_id, price_list_id, catalog_item_id, price, compare_at_price, valid_from)
      VALUES ($1, $2, $3, $4, $5, now());
    `, [
      TENANT, priceListId, catalogItemId,
      priceCents != null ? priceCents / 100 : 0,
      compareCents != null ? compareCents / 100 : null,
    ]);

    // 4e. commerce_product_media (images live HERE — multi-image support)
    if (p.image) {
      await client.query(`
        INSERT INTO public.commerce_product_media
          (tenant_id, catalog_item_id, media_type, url, alt_text, sort_order, is_primary)
        VALUES ($1, $2, 'image', $3, $4, 0, true);
      `, [TENANT, catalogItemId, p.image, p.alt || p.name]);
    }

    // 4f. erp_inventory_movements (opening stock — NOT a flat integer count)
    const openingQty = p.inventory_count || p.stock || 0;
    if (openingQty > 0) {
      await client.query(`
        INSERT INTO public.erp_inventory_movements
          (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost,
           source_type, source_id, reason, occurred_at)
        VALUES ($1, 'opening', $2, $3, $4, 0, 'migration', $5, 'Initial migration from commerce_products', now());
      `, [TENANT, skuId, warehouseId, openingQty, catalogItemId]);
    }

    migrated++;
    console.log(`  ✓ ${p.name} → product:${productId.slice(0,8)} sku:${sku} price:${priceCents}¢ stock:${openingQty}`);
  }

  console.log(`\nMigration complete: ${migrated} migrated, ${skipped} skipped (already existed).`);

  // --- 5. Verify ----------------------------------------------------------
  const { rows: counts } = await client.query(`
    SELECT
      (SELECT count(*) FROM public.erp_products WHERE tenant_id=$1) as erp_products,
      (SELECT count(*) FROM public.erp_product_skus WHERE tenant_id=$1) as erp_skus,
      (SELECT count(*) FROM public.commerce_catalog_items WHERE tenant_id=$1) as catalog_items,
      (SELECT count(*) FROM public.commerce_prices WHERE tenant_id=$1) as prices,
      (SELECT count(*) FROM public.commerce_product_media WHERE tenant_id=$1) as media,
      (SELECT count(*) FROM public.erp_inventory_movements WHERE tenant_id=$1) as movements;
  `, [TENANT]);
  console.log("\nFinal counts:", counts[0]);
} catch (e) {
  console.error("SEED FAILED:", e.message);
  console.error(e.stack);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
