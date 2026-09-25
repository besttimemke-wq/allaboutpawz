import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const [purchaseOrders, vendors] = await Promise.all([
      pgQuery(`SELECT po.id, po.tenant_id, po.po_number, po.vendor_id, po.status,
        po.order_date, po.expected_date, po.currency, po.subtotal::text,
        po.tax_total::text, po.shipping_total::text, po.total::text,
        po.notes, po.created_at, v.name AS vendor_name
        FROM public.erp_purchase_orders po
        LEFT JOIN public.erp_vendors v ON v.id = po.vendor_id
        WHERE po.tenant_id = $1
        ORDER BY po.order_date DESC LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT id, vendor_number, name, email, phone, payment_terms,
        currency, is_active, created_at
        FROM public.erp_vendors
        WHERE tenant_id = $1 AND is_active = true
        ORDER BY name ASC LIMIT 200`, [TENANT_ID()]),
    ]);
    return NextResponse.json({ purchaseOrders, vendors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
