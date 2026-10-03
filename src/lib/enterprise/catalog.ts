import "server-only"
import pg from "pg"
import { revalidatePath } from "next/cache"
import { TENANT_ID, withPg } from "@/lib/crm/enterprise"

// ============================================================================
// enterprise/catalog.ts — the read/write layer for the NORMALIZED catalog.
//
// GROUND RULE (owner's directive): the schema is ground truth. Products are
// NOT flat. This module wires directly into:
//   erp_products              — base product info (name, description, brand)
//   erp_product_skus          — the sellable unit (sku, unit_price, weight)
//   erp_product_variants      — variant attributes (size, color, …)
//   commerce_catalog_items    — the ecommerce bridge (ecommerce_enabled)
//   commerce_prices           — pricing (price, compare_at_price) per price list
//   commerce_product_media    — multi-image media (url, alt, is_primary)
//   erp_inventory_movements   — stock movements (opening, sale, adjustment, …)
//   commerce_brands           — brand CRUD
//
// Every read is a single SQL query with LEFT JOINs + aggregation. Every write
// is a transaction that touches the right subset of tables. No flat tables,
// no simplified shapes — the normalized schema is the only source of truth.
// ============================================================================

export const DEFAULT_TENANT = TENANT_ID

// ---- the unified catalog product shape (what the storefront + admin see) ----
export type CatalogProductMedia = {
  id: string
  url: string
  altText: string | null
  sortOrder: number
  isPrimary: boolean
}

export type CatalogProduct = {
  // identities
  id: string                 // commerce_catalog_items.id (the storefront's PK)
  productId: string          // erp_products.id
  skuId: string              // erp_product_skus.id
  sku: string                // erp_product_skus.sku (human-readable)
  slug: string               // stored in commerce_catalog_items.metadata.slug
  // display
  name: string
  description: string | null
  shortDescription: string | null
  brand: string | null
  brandId: string | null
  // pricing (cents — from commerce_prices on the RETAIL price list)
  priceCents: number
  compareAtPriceCents: number | null
  salePriceCents: number | null   // derived: priceCents when compareAtPriceCents > priceCents
  isOnSale: boolean
  // media (from commerce_product_media, sorted by sort_order, primary first)
  media: CatalogProductMedia[]
  image: string | null            // the primary image URL (for backward compat)
  alt: string | null
  // inventory (sum of erp_inventory_movements.quantity for this sku)
  stock: number
  // flags
  ecommerceEnabled: boolean
  active: boolean
  featured: boolean
  badge: string | null
  visible: boolean               // active && ecommerce_enabled && !is_hidden(metadata)
  // category (stored in metadata.category_id — the pet_product_categories tree)
  categoryId: number | null
  category: string | null
  // detail fields (from erp_products.metadata)
  specs: string | null
  materials: string | null
  ingredients: string | null
  directions: string | null
  warranty: string | null
  // stripe
  stripeProductId: string | null
  stripePriceId: string | null
  // sort
  sortOrder: number
  // timestamps
  createdAt: string
  updatedAt: string
}

// ============================================================================
// READ — list all ecommerce-enabled catalog products in one query
// ============================================================================

const LIST_SQL = `
  SELECT
    ci.id AS id,
    ci.name AS name,
    ci.description AS description,
    ci.short_description AS "shortDescription",
    ci.brand AS brand,
    ci.ecommerce_enabled AS "ecommerceEnabled",
    ci.active AS active,
    ci.metadata AS ci_metadata,
    ci.created_at AS "createdAt",
    ci.updated_at AS "updatedAt",
    ep.id AS "productId",
    ep.metadata AS ep_metadata,
    sku.id AS "skuId",
    sku.sku AS sku,
    sku.unit_price AS sku_unit_price,
    cp.price AS price,
    cp.compare_at_price AS compare_at_price,
    COALESCE(stock.qty, 0) AS stock,
    COALESCE(media.aggregated, '[]'::json) AS media
  FROM public.commerce_catalog_items ci
  JOIN public.erp_product_skus sku ON sku.id = ci.sku_id
  JOIN public.erp_products ep ON ep.id = sku.product_id
  LEFT JOIN public.commerce_prices cp
    ON cp.catalog_item_id = ci.id
    AND cp.price_list_id = (SELECT id FROM public.commerce_price_lists WHERE tenant_id = ci.tenant_id AND code = 'RETAIL' AND active = true LIMIT 1)
    AND (cp.valid_to IS NULL OR cp.valid_to >= now())
  LEFT JOIN (
    SELECT sku_id, SUM(quantity) AS qty
    FROM public.erp_inventory_movements
    GROUP BY sku_id
  ) stock ON stock.sku_id = sku.id
  LEFT JOIN LATERAL (
    SELECT COALESCE(json_agg(json_build_object(
      'id', m.id, 'url', m.url, 'altText', m.alt_text,
      'sortOrder', m.sort_order, 'isPrimary', m.is_primary
    ) ORDER BY m.sort_order, m.is_primary DESC) FILTER (WHERE m.id IS NOT NULL), '[]'::json) AS aggregated
    FROM public.commerce_product_media m
    WHERE m.catalog_item_id = ci.id
  ) media ON true
  WHERE ci.tenant_id = $1
    AND ci.ecommerce_enabled = true
    AND ci.active = true
`

const LIST_ORDER = `ORDER BY (ci.metadata->>'sort_order')::int ASC NULLS LAST, ci.name ASC`

export async function listCatalogProducts(): Promise<CatalogProduct[]> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`${LIST_SQL} ${LIST_ORDER}`, [DEFAULT_TENANT()])
    return rows.map(rowToCatalogProduct)
  })) ?? []
}

export async function getCatalogProductBySlug(slug: string): Promise<CatalogProduct | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(
      `${LIST_SQL} AND ci.metadata->>'slug' = $2 ${LIST_ORDER} LIMIT 1`,
      [DEFAULT_TENANT(), slug],
    )
    return rows[0] ? rowToCatalogProduct(rows[0]) : null
  })) ?? null
}

export async function getCatalogProductById(id: string): Promise<CatalogProduct | null> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`${LIST_SQL} AND ci.id = $2 ${LIST_ORDER} LIMIT 1`, [DEFAULT_TENANT(), id])
    return rows[0] ? rowToCatalogProduct(rows[0]) : null
  })) ?? null
}

// ---- row → CatalogProduct (the normalizer) ----
function rowToCatalogProduct(r: any): CatalogProduct {
  const ciMeta = typeof r.ci_metadata === "string" ? safeJson(r.ci_metadata) : (r.ci_metadata || {})
  const epMeta = typeof r.ep_metadata === "string" ? safeJson(r.ep_metadata) : (r.ep_metadata || {})
  const media = typeof r.media === "string" ? safeJson(r.media) : (r.media || [])
  const priceCents = toCents(r.price ?? r.sku_unit_price)
  const compareAtCents = r.compare_at_price != null ? toCents(r.compare_at_price) : null
  const isOnSale = compareAtCents != null && compareAtCents > priceCents
  const primary = Array.isArray(media) ? media.find((m: any) => m.isPrimary) || media[0] : null
  return {
    id: r.id,
    productId: r.productId,
    skuId: r.skuId,
    sku: r.sku,
    slug: ciMeta.slug || "",
    name: r.name,
    description: r.description,
    shortDescription: r.shortDescription,
    brand: r.brand,
    brandId: epMeta.brand_id || null,
    priceCents,
    compareAtPriceCents: compareAtCents,
    salePriceCents: isOnSale ? priceCents : null,
    isOnSale,
    media: Array.isArray(media) ? media : [],
    image: primary?.url || null,
    alt: primary?.altText || r.name,
    stock: Number(r.stock) || 0,
    ecommerceEnabled: r.ecommerceEnabled,
    active: r.active,
    featured: epMeta.featured === true,
    badge: epMeta.badge || null,
    visible: r.active === true && r.ecommerceEnabled === true && epMeta.is_hidden !== true,
    categoryId: epMeta.category_id ?? null,
    category: epMeta.category ?? null,
    specs: epMeta.specs || null,
    materials: epMeta.materials || null,
    ingredients: epMeta.ingredients || null,
    directions: epMeta.directions || null,
    warranty: epMeta.warranty || null,
    stripeProductId: epMeta.stripe_product_id || null,
    stripePriceId: epMeta.stripe_price_id || null,
    sortOrder: Number(ciMeta.sort_order) || 99,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function toCents(n: any): number {
  const v = Number(n)
  return Number.isFinite(v) ? Math.round(v * 100) : 0
}
function safeJson(s: string): any {
  try { return JSON.parse(s) } catch { return {} }
}

// ============================================================================
// WRITE — create a catalog product across the normalized tables (transaction)
// ============================================================================

export type CatalogProductInput = {
  name: string
  slug?: string
  description?: string
  shortDescription?: string
  brand?: string
  brandId?: string
  // pricing (dollars → stored as numeric)
  price: number
  compareAtPrice?: number | null
  // media (array — multi-image support)
  media?: { url: string; altText?: string; isPrimary?: boolean }[]
  // inventory (opening stock — becomes an erp_inventory_movements 'opening' row)
  openingStock?: number
  // flags
  featured?: boolean
  badge?: string
  categoryId?: number | null
  category?: string
  // detail fields
  specs?: string
  materials?: string
  ingredients?: string
  directions?: string
  warranty?: string
  // stripe
  stripeProductId?: string
  stripePriceId?: string
  // sort
  sortOrder?: number
}

export async function createCatalogProduct(input: CatalogProductInput): Promise<CatalogProduct | null> {
  return withPg(async (client) => {
    const tenant = DEFAULT_TENANT()
    const slug = input.slug || slugify(input.name)
    if (!slug) throw new Error("Cannot create a product without a slug")

    await client.query("BEGIN")
    try {
      // 1. erp_products (base — no price, no image)
      const { rows: ep } = await client.query(`
        INSERT INTO public.erp_products
          (tenant_id, name, description, brand, product_type, is_inventory_item,
           is_sellable, is_purchasable, is_active, default_unit_price, metadata)
        VALUES ($1, $2, $3, $4, 'physical', true, true, true, true, $5, $6)
        RETURNING id
      `, [
        tenant, input.name, input.description || null, input.brand || null,
        input.price,
        JSON.stringify({
          slug, short_description: input.shortDescription || null,
          specs: input.specs || null, materials: input.materials || null,
          ingredients: input.ingredients || null, directions: input.directions || null,
          warranty: input.warranty || null, badge: input.badge || null,
          featured: input.featured || false,
          category_id: input.categoryId ?? null, category: input.category || null,
          sort_order: input.sortOrder ?? 99,
          stripe_product_id: input.stripeProductId || null,
          stripe_price_id: input.stripePriceId || null,
          brand_id: input.brandId || null,
        }),
      ])
      const productId = ep[0].id

      // 2. erp_product_skus (the sellable unit)
      const skuCode = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
      const { rows: sk } = await client.query(`
        INSERT INTO public.erp_product_skus
          (tenant_id, product_id, sku, uom, unit_price, is_active)
        VALUES ($1, $2, $3, 'EA', $4, true)
        RETURNING id, sku
      `, [tenant, productId, skuCode, input.price])
      const skuId = sk[0].id
      const sku = sk[0].sku

      // 3. commerce_catalog_items (the ecommerce bridge)
      const { rows: ci } = await client.query(`
        INSERT INTO public.commerce_catalog_items
          (tenant_id, sku_id, item_type, sku, name, description, short_description,
           brand, taxable, active, ecommerce_enabled, purchasable, sellable, metadata)
        VALUES ($1, $2, 'product', $3, $4, $5, $6, $7, true, true, true, true, true, $8)
        RETURNING id
      `, [
        tenant, skuId, sku, input.name, input.description || null,
        input.shortDescription || null, input.brand || null,
        JSON.stringify({ slug, product_id: productId, sort_order: input.sortOrder ?? 99 }),
      ])
      const catalogItemId = ci[0].id

      // 4. commerce_prices (pricing lives HERE)
      const priceListId = await ensureRetailPriceList(client, tenant)
      await client.query(`
        INSERT INTO public.commerce_prices
          (tenant_id, price_list_id, catalog_item_id, price, compare_at_price, valid_from)
        VALUES ($1, $2, $3, $4, $5, now())
      `, [tenant, priceListId, catalogItemId, input.price, input.compareAtPrice ?? null])

      // 5. commerce_product_media (multi-image)
      if (Array.isArray(input.media)) {
        for (let i = 0; i < input.media.length; i++) {
          const m = input.media[i]
          if (!m.url) continue
          await client.query(`
            INSERT INTO public.commerce_product_media
              (tenant_id, catalog_item_id, media_type, url, alt_text, sort_order, is_primary)
            VALUES ($1, $2, 'image', $3, $4, $5, $6)
          `, [
            tenant, catalogItemId, m.url, m.altText || input.name, i,
            m.isPrimary ?? (i === 0),
          ])
        }
      }

      // 6. erp_inventory_movements (opening stock)
      if (input.openingStock && input.openingStock > 0) {
        const warehouseId = await ensureMainWarehouse(client, tenant)
        await client.query(`
          INSERT INTO public.erp_inventory_movements
            (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost,
             source_type, source_id, reason, occurred_at)
          VALUES ($1, 'opening', $2, $3, $4, 0, 'admin', $5, 'Opening stock on product creation', now())
        `, [tenant, skuId, warehouseId, input.openingStock, catalogItemId])
      }

      await client.query("COMMIT")
      revalidateShopPaths()
      return await getCatalogProductById(catalogItemId)
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })
}

// ============================================================================
// WRITE — update a catalog product (touches the right subset of tables)
// ============================================================================

export async function updateCatalogProduct(
  catalogItemId: string,
  patch: Partial<CatalogProductInput> & { visible?: boolean; isHidden?: boolean },
): Promise<CatalogProduct | null> {
  return withPg(async (client) => {
    const tenant = DEFAULT_TENANT()
    await client.query("BEGIN")
    try {
      // Load current row to get productId / skuId
      const { rows: cur } = await client.query(`
        SELECT ci.id, ci.sku_id, sku.product_id, ci.metadata AS ci_meta, ep.metadata AS ep_meta
        FROM public.commerce_catalog_items ci
        JOIN public.erp_product_skus sku ON sku.id = ci.sku_id
        JOIN public.erp_products ep ON ep.id = sku.product_id
        WHERE ci.id = $1 AND ci.tenant_id = $2
      `, [catalogItemId, tenant])
      if (cur.length === 0) throw new Error("Catalog item not found")
      const row = cur[0]
      const ciMeta = mergeMeta(row.ci_meta, { slug: patch.slug })
      const epMeta = mergeMeta(row.ep_meta, {
        short_description: patch.shortDescription,
        specs: patch.specs, materials: patch.materials,
        ingredients: patch.ingredients, directions: patch.directions,
        warranty: patch.warranty, badge: patch.badge,
        featured: patch.featured,
        category_id: patch.categoryId, category: patch.category,
        sort_order: patch.sortOrder,
        stripe_product_id: patch.stripeProductId,
        stripe_price_id: patch.stripePriceId,
        brand_id: patch.brandId,
        is_hidden: patch.isHidden ?? (patch.visible === false ? true : patch.visible === true ? false : undefined),
      })

      // erp_products
      await client.query(`
        UPDATE public.erp_products SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          brand = COALESCE($4, brand),
          metadata = $5,
          updated_at = now()
        WHERE id = $1
      `, [row.product_id, patch.name || null, patch.description || null, patch.brand || null, JSON.stringify(epMeta)])

      // erp_product_skus (unit_price mirrors the base price)
      if (patch.price != null) {
        await client.query(`
          UPDATE public.erp_product_skus SET unit_price = $2, updated_at = now()
          WHERE id = $1
        `, [row.sku_id, patch.price])
      }

      // commerce_catalog_items
      await client.query(`
        UPDATE public.commerce_catalog_items SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          short_description = COALESCE($4, short_description),
          brand = COALESCE($5, brand),
          metadata = $6,
          updated_at = now()
        WHERE id = $1
      `, [catalogItemId, patch.name || null, patch.description || null, patch.shortDescription || null, patch.brand || null, JSON.stringify(ciMeta)])

      // commerce_prices (upsert the retail price row)
      if (patch.price != null || patch.compareAtPrice !== undefined) {
        const priceListId = await ensureRetailPriceList(client, tenant)
        await client.query(`
          INSERT INTO public.commerce_prices
            (tenant_id, price_list_id, catalog_item_id, price, compare_at_price, valid_from)
          VALUES ($1, $2, $3, $4, $5, now())
          ON CONFLICT DO NOTHING
        `, [tenant, priceListId, catalogItemId, patch.price, patch.compareAtPrice ?? null])
        // Always update the existing row if present
        await client.query(`
          UPDATE public.commerce_prices SET
            price = COALESCE($2, price),
            compare_at_price = CASE WHEN $3::numeric IS NULL THEN compare_at_price ELSE $3 END,
            valid_from = now()
          WHERE catalog_item_id = $1
            AND price_list_id = (SELECT id FROM public.commerce_price_lists WHERE tenant_id = $4 AND code = 'RETAIL' LIMIT 1)
        `, [catalogItemId, patch.price, patch.compareAtPrice ?? null, tenant])
      }

      // commerce_product_media (replace-all on patch.media)
      if (Array.isArray(patch.media)) {
        await client.query(`DELETE FROM public.commerce_product_media WHERE catalog_item_id = $1`, [catalogItemId])
        for (let i = 0; i < patch.media.length; i++) {
          const m = patch.media[i]
          if (!m.url) continue
          await client.query(`
            INSERT INTO public.commerce_product_media
              (tenant_id, catalog_item_id, media_type, url, alt_text, sort_order, is_primary)
            VALUES ($1, $2, 'image', $3, $4, $5, $6)
          `, [tenant, catalogItemId, m.url, m.altText || patch.name || "", i, m.isPrimary ?? (i === 0)])
        }
      }

      await client.query("COMMIT")
      revalidateShopPaths()
      return await getCatalogProductById(catalogItemId)
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })
}

// ============================================================================
// WRITE — delete a catalog product (cascades across all tables)
// ============================================================================

export async function deleteCatalogProduct(catalogItemId: string): Promise<boolean> {
  return (await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()
    await client.query("BEGIN")
    try {
      const { rows } = await client.query(`
        SELECT sku_id, product_id FROM public.commerce_catalog_items
        WHERE id = $1 AND tenant_id = $2
      `, [catalogItemId, tenant])
      if (rows.length === 0) { await client.query("ROLLBACK"); return false }
      const { sku_id, product_id } = rows[0]
      // delete in dependency order
      await client.query(`DELETE FROM public.commerce_product_media WHERE catalog_item_id = $1`, [catalogItemId])
      await client.query(`DELETE FROM public.commerce_prices WHERE catalog_item_id = $1`, [catalogItemId])
      await client.query(`DELETE FROM public.erp_inventory_movements WHERE sku_id = $1`, [sku_id])
      await client.query(`DELETE FROM public.commerce_catalog_items WHERE id = $1`, [catalogItemId])
      await client.query(`DELETE FROM public.erp_product_skus WHERE id = $1`, [sku_id])
      await client.query(`DELETE FROM public.erp_products WHERE id = $1`, [product_id])
      await client.query("COMMIT")
      revalidateShopPaths()
      return true
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    }
  })) ?? false
}

// ============================================================================
// INVENTORY — adjust stock via a movement (the ONLY way stock changes)
// ============================================================================

export async function adjustInventory(
  skuId: string,
  delta: number,
  movementType: string = "adjustment",
  reason?: string,
): Promise<number | null> {
  return withPg(async (client) => {
    const tenant = DEFAULT_TENANT()
    const warehouseId = await ensureMainWarehouse(client, tenant)
    await client.query(`
      INSERT INTO public.erp_inventory_movements
        (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost,
         source_type, reason, occurred_at)
      VALUES ($1, $2, $3, $4, $5, 0, 'admin', $6, now())
    `, [tenant, movementType, skuId, warehouseId, delta, reason || `Manual ${movementType}`])
    // return new stock-on-hand
    const { rows } = await client.query(`SELECT COALESCE(SUM(quantity), 0) AS qty FROM public.erp_inventory_movements WHERE sku_id = $1`, [skuId])
    return Number(rows[0].qty) || 0
  })
}

export async function getStockOnHand(skuId: string): Promise<number> {
  return (await withPg(async (client) => {
    const { rows } = await client.query(`SELECT COALESCE(SUM(quantity), 0) AS qty FROM public.erp_inventory_movements WHERE sku_id = $1`, [skuId])
    return Number(rows[0].qty) || 0
  })) ?? 0
}

// ---------------------------------------------------------------------------
// decrementInventoryForCartItems — called by the Stripe webhook after a
// successful shop payment. For each cart line, looks up the catalog item →
// its sku_id → writes an erp_inventory_movements row (movement_type='sale',
// negative quantity). This is the ONLY way stock decreases — no flat integer
// column updates anywhere.
// ---------------------------------------------------------------------------
export async function decrementInventoryForCartItems(
  cartItems: { productId?: string; id?: string; quantity?: number; qty?: number; name?: string }[],
  sourceId: string,
): Promise<void> {
  await withPg(async (client) => {
    const tenant = DEFAULT_TENANT()
    const warehouseId = await ensureMainWarehouse(client, tenant)
    for (const ci of cartItems) {
      const catalogItemId = String(ci?.productId || ci?.id || "")
      const qty = Math.max(1, Number(ci?.quantity || ci?.qty || 1))
      if (!catalogItemId) continue
      // Look up the sku_id for this catalog item.
      const { rows } = await client.query(
        `SELECT sku_id FROM public.commerce_catalog_items WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [catalogItemId, tenant],
      )
      if (rows.length === 0 || !rows[0].sku_id) continue
      const skuId = rows[0].sku_id
      await client.query(`
        INSERT INTO public.erp_inventory_movements
          (tenant_id, movement_type, sku_id, warehouse_id, quantity, unit_cost,
           source_type, source_id, reason, occurred_at)
        VALUES ($1, 'sale', $2, $3, $4, 0, 'order', $5, $6, now())
      `, [tenant, skuId, warehouseId, -qty, sourceId, `Sale — ${ci?.name || catalogItemId} x${qty}`])
    }
  })
}

// ============================================================================
// helpers
// ============================================================================

function slugify(s: string): string {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function mergeMeta(current: any, patch: Record<string, any>): any {
  const base = typeof current === "string" ? safeJson(current) : (current || {})
  const out: any = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

async function ensureRetailPriceList(client: pg.Client, tenant: string): Promise<string> {
  const { rows } = await client.query(`
    INSERT INTO public.commerce_price_lists (tenant_id, code, name, currency, list_type, active)
    VALUES ($1, 'RETAIL', 'Retail Price List', 'USD', 'retail', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET active = true
    RETURNING id
  `, [tenant])
  return rows[0].id
}

async function ensureMainWarehouse(client: pg.Client, tenant: string): Promise<string> {
  const { rows } = await client.query(`
    INSERT INTO public.erp_warehouses (tenant_id, code, name, warehouse_type, is_active)
    VALUES ($1, 'MAIN', 'Main Warehouse', 'warehouse', true)
    ON CONFLICT (tenant_id, code) DO UPDATE SET is_active = true
    RETURNING id
  `, [tenant])
  return rows[0].id
}

function revalidateShopPaths() {
  try {
    revalidatePath("/shop", "page")
    revalidatePath("/shop/[...slug]", "page")
    revalidatePath("/products/[slug]", "page")
    revalidatePath("/", "page")
  } catch { /* non-fatal during build */ }
}
