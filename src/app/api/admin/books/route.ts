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
    const books = await pgQuery(`SELECT id, tenant_id, entity_id, code, name, book_type, accounting_basis, currency, is_active FROM public.acct_books WHERE tenant_id = $1 ORDER BY code`, [TENANT_ID()]);
    const accounts = await pgQuery(`SELECT id, code, name, account_type, normal_balance, is_active FROM public.acct_chart_of_accounts WHERE tenant_id = $1 ORDER BY code`, [TENANT_ID()]);
    return NextResponse.json({ books, chartOfAccounts: accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
