import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";
export async function GET(req: NextRequest) {
  const g = await requireAdminApi(); if (g) return g;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);
  return withPg(async (c) => {
    const r = await c.query("SELECT id::text, customer_id::text, event_type, event_data, created_at FROM public.crm_funnel_events WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2", [TENANT_ID(), limit]);
    return NextResponse.json({ events: r.rows, total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
