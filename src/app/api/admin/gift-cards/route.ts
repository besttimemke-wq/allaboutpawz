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
    const giftCards = await pgQuery(`SELECT id, tenant_id, card_number, balance::text, currency, status, initial_balance::text, issued_at, expires_at FROM public.commerce_gift_cards WHERE tenant_id = $1 ORDER BY issued_at DESC LIMIT 200`, [TENANT_ID()]);
    return NextResponse.json({ giftCards });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
