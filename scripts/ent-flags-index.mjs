// ============================================================================
// ent-flags-index.mjs — Oct 10, 2026
// 1. Carry merch flags (is_new / is_best_seller / is_salon_favorite / is_sale)
//    from flat products into erp_products.metadata (migration Step 1 missed them)
// 2. GIN index on commerce_catalog_items (metadata->'taxonomy_node_ids')
//    so node-scoped ?| lookups stay fast on 12.8k items
// Idempotent.
// ============================================================================
import pg from "pg";

const cs = process.env.SUPABASE_SESSION_POOLER ||
  "postgresql://postgres.qdgfkxbkqcnuhckhvhzd:Aapawzmemphis!@aws-0-us-west-2.pooler.supabase.com:5432/postgres";
const pool = new pg.Pool({ connectionString: cs, max: 1, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000, query_timeout: 120000 });

try {
  const u = await pool.query(`
    UPDATE erp_products ep
    SET metadata = COALESCE(ep.metadata, '{}'::jsonb) || jsonb_build_object(
      'is_new', p.is_new, 'is_best_seller', p.is_best_seller,
      'is_salon_favorite', p.is_salon_favorite, 'is_sale', p.is_sale
    )
    FROM products p
    WHERE ep.id = p.id
      AND (p.is_new OR p.is_best_seller OR p.is_salon_favorite OR p.is_sale)
      AND (COALESCE(ep.metadata->>'is_new','false') <> p.is_new::text
        OR COALESCE(ep.metadata->>'is_best_seller','false') <> p.is_best_seller::text
        OR COALESCE(ep.metadata->>'is_salon_favorite','false') <> p.is_salon_favorite::text)
  `);
  console.log("flags updated:", u.rowCount);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_cci_taxonomy_node_ids ON commerce_catalog_items USING GIN ((metadata->'taxonomy_node_ids'))`);
  console.log("GIN index ready");

  const v = await pool.query(`SELECT
    COUNT(*) FILTER (WHERE metadata->>'is_best_seller' = 'true')::int bestseller,
    COUNT(*) FILTER (WHERE metadata->>'is_new' = 'true')::int new,
    COUNT(*) FILTER (WHERE metadata->>'is_salon_favorite' = 'true')::int salon
    FROM erp_products`);
  console.log("VERIFY:", JSON.stringify(v.rows[0]));
} catch (e) { console.error("ERR:", e.message); } finally { await pool.end(); }
