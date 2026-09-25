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
    const taxCodes = await pgQuery(`SELECT id, tenant_id, jurisdiction_id, code, name, tax_type, rate::text, recoverable_percent::text, is_active FROM public.acct_tax_codes WHERE tenant_id = $1 ORDER BY code`, [TENANT_ID()]);
    const jurisdictions = await pgQuery(`SELECT id, tenant_id, code, name, country_code, state_code, locality, registration_number FROM public.acct_tax_jurisdictions WHERE tenant_id = $1 ORDER BY code`, [TENANT_ID()]);
    return NextResponse.json({ taxCodes, jurisdictions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
