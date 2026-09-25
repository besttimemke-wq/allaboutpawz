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
    const [entities, fiscalYears, periods, currencies, books] = await Promise.all([
      pgQuery(`SELECT id, code, legal_name, display_name, entity_type, country FROM public.acct_entities WHERE tenant_id = $1 ORDER BY code`, [TENANT_ID()]),
      pgQuery(`SELECT id, fiscal_year, start_date, end_date, is_adjustment_year FROM public.acct_fiscal_years WHERE tenant_id = $1 ORDER BY fiscal_year DESC`, [TENANT_ID()]),
      pgQuery(`SELECT id, book_id, fiscal_year_id, period_no, name, start_date, end_date, status FROM public.acct_periods WHERE tenant_id = $1 ORDER BY period_no`, [TENANT_ID()]),
      pgQuery(`SELECT code, name, symbol, minor_units, is_active FROM public.acct_currencies WHERE is_active = true ORDER BY code`, []),
      pgQuery(`SELECT id, code, name, book_type, accounting_basis, currency, is_active FROM public.acct_books WHERE tenant_id = $1 ORDER BY code`, [TENANT_ID()]),
    ]);
    return NextResponse.json({ entities, fiscalYears, periods, currencies, books });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
