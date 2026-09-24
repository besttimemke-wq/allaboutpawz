import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

// GET /api/admin/products — reads from erp_products (the canonical product
// catalog in the ERP schema). 13 rows in DB. Maps erp_products columns to
// the InventoryView's expected shape.
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "500") || 500, 1000);
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["p.tenant_id = $1::uuid", "p.is_active = true", "p.is_sellable = true"];
    const params: any[] = [tenant]; let pi = 2;
    if (search) { where.push(`(p.name ILIKE $${pi} OR p.brand ILIKE $${pi} OR p.description ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
    const r = await client.query(
      `SELECT p.id::text, p.name, p.description, p.brand, p.default_unit_price, p.reorder_point,
              p.safety_stock, p.is_inventory_item, p.is_sellable, p.is_active,
              p.metadata, p.created_at,
              pc.name AS category_name,
              COALESCE(stock.qty, 0) AS stock_qty,
              sku.sku AS sku_code, sku.id::text AS sku_id
       FROM public.erp_products p
       LEFT JOIN public.erp_product_categories pc ON pc.id = p.category_id
       LEFT JOIN public.erp_product_skus sku ON sku.product_id = p.id AND sku.is_active = true
       LEFT JOIN (
         SELECT sku_id, SUM(quantity) AS qty
         FROM public.erp_inventory_movements
         GROUP BY sku_id
       ) stock ON stock.sku_id = sku.id
       WHERE ${where.join(" AND ")}
       ORDER BY p.name LIMIT $${pi}`,
      [...params, limit],
    );
    return NextResponse.json({
      products: r.rows.map((p: any) => ({
        id: p.id,
        name: p.name || "—",
        price: parseFloat(String(p.default_unit_price || "0")) || 0,
        stock: Number(p.stock_qty) || 0,
        reorderPoint: Number(p.reorder_point) || 5,
        safetyStock: Number(p.safety_stock) || 0,
        category: p.category_name || p.brand || "Uncategorized",
        brand: p.brand || null,
        description: p.description || null,
        isInventoryItem: !!p.is_inventory_item,
        active: !!p.is_active,
        sku: p.sku_code || p.id.slice(0, 8),
        skuId: p.sku_id || null,
      })),
      total: r.rows.length,
    });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
