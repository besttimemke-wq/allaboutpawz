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
    const paymentMethods = await pgQuery(`SELECT id, code, name, method_type, processor FROM public.commerce_payment_methods WHERE tenant_id = $1 AND processor = 'stripe' ORDER BY code`, [TENANT_ID()]);
    return NextResponse.json({ stripePaymentMethods: paymentMethods });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
