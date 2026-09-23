import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

// GET /api/admin/products — legacy products table (same catalog the public shop uses)
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "500") || 500, 1000);
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["tenant_id = $1::uuid"]; const params: any[] = [tenant]; let pi = 2;
    if (search) { where.push(`(name ILIKE $${pi} OR category ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
    const r = await client.query(`SELECT id::text, name, price, stock, category, image, "shortDescription", visible, featured FROM public.products WHERE ${where.join(" AND ")} ORDER BY category NULLS LAST, name LIMIT $${pi}`, [...params, limit]);
    return NextResponse.json({ products: r.rows.map((p: any) => ({ id: p.id, name: p.name, price: parseFloat(String(p.price||"0").replace(/[^0-9.]/g,""))||0, stock: Number(p.stock||0), category: p.category || "Uncategorized", image: p.image, shortDescription: p.shortDescription, visible: p.visible !== false, featured: !!p.featured, sku: p.id.slice(0,8) })), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
