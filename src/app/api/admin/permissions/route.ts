import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { requireAdminApi } from "@/lib/admin/gate";

async function getPgClient() {
  const cs = process.env.SUPABASE_SESSION_POOLER || process.env.SUPABASE_DIRECT_CONNECTION;
  if (!cs) return null;
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

const MODULES = [
  { code: 'crm:dashboard', label: 'CRM Dashboard', module: 'CRM' },
  { code: 'crm:customers', label: 'Customers', module: 'CRM' },
  { code: 'crm:pets', label: 'Pets & Patients', module: 'CRM' },
  { code: 'crm:appointments', label: 'Appointments', module: 'CRM' },
  { code: 'crm:grooming-records', label: 'Grooming Records', module: 'CRM' },
  { code: 'crm:calendar', label: 'Calendar', module: 'CRM' },
  { code: 'crm:services', label: 'Services & Pricing', module: 'CRM' },
  { code: 'crm:staff', label: 'Staff & Groomers', module: 'CRM' },
  { code: 'crm:schedule', label: 'Schedule & Shifts', module: 'CRM' },
  { code: 'orders:orders', label: 'Orders & POS', module: 'ORDERS' },
  { code: 'orders:inventory', label: 'Inventory', module: 'ORDERS' },
  { code: 'orders:shipping', label: 'Shipping', module: 'ORDERS' },
  { code: 'orders:returns', label: 'Returns & RMA', module: 'ORDERS' },
  { code: 'orders:purchase-orders', label: 'Purchase Orders', module: 'ORDERS' },
  { code: 'acct:books', label: 'Books & Records', module: 'ACCOUNTING' },
  { code: 'acct:invoices', label: 'Invoices', module: 'ACCOUNTING' },
  { code: 'acct:payments', label: 'Payments & Register', module: 'ACCOUNTING' },
  { code: 'acct:deposits', label: 'Deposits & Escrow', module: 'ACCOUNTING' },
  { code: 'acct:refunds', label: 'Refunds & Disputes', module: 'ACCOUNTING' },
  { code: 'acct:gift-cards', label: 'Gift Cards', module: 'ACCOUNTING' },
  { code: 'acct:payroll', label: 'Payroll', module: 'ACCOUNTING' },
  { code: 'acct:taxes', label: 'Taxes', module: 'ACCOUNTING' },
  { code: 'acct:reports', label: 'Financial Reports', module: 'ACCOUNTING' },
  { code: 'acct:settings', label: 'Financial Settings', module: 'ACCOUNTING' },
  { code: 'acct:stripe', label: 'Stripe Connections', module: 'ACCOUNTING' },
  { code: 'system:settings', label: 'Admin Settings', module: 'SYSTEM' },
];

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const pgClient = await getPgClient();
    if (!pgClient) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    await pgClient.query(`CREATE TABLE IF NOT EXISTS public.platform_permission_registry (permission_code TEXT PRIMARY KEY, module TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`);
    const count = await pgClient.query("SELECT count(*) FROM public.platform_permission_registry");
    if (parseInt(count.rows[0].count) === 0) {
      for (const m of MODULES) { await pgClient.query("INSERT INTO public.platform_permission_registry (permission_code, module, description) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [m.code, m.module, m.label]); }
    }
    await pgClient.query(`CREATE TABLE IF NOT EXISTS public.platform_module_permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID DEFAULT '00000000-0000-0000-0000-000000000001', staff_id UUID, module_code TEXT NOT NULL, access_level TEXT DEFAULT 'view', granted_by UUID, granted_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(staff_id, module_code))`);

    let userPerms: any[] = [];
    if (userId) {
      const res = await pgClient.query("SELECT module_code, access_level FROM public.platform_module_permissions WHERE staff_id::text = $1", [userId]);
      userPerms = res.rows;
    }
    await pgClient.end();
    return NextResponse.json({ modules: MODULES, userPermissions: userPerms.reduce((acc: Record<string, string>, p: any) => { acc[p.module_code] = p.access_level; return acc; }, {}) });
  } catch (err: any) {
    console.error("[GET /api/admin/permissions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const body = await req.json();
    const { userId, moduleCode, accessLevel } = body;
    if (!userId || !moduleCode) return NextResponse.json({ error: "userId and moduleCode required" }, { status: 400 });
    const pgClient = await getPgClient();
    if (!pgClient) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
    if (accessLevel === 'none') {
      await pgClient.query("DELETE FROM public.platform_module_permissions WHERE staff_id::text = $1 AND module_code = $2", [userId, moduleCode]);
    } else {
      await pgClient.query(`INSERT INTO public.platform_module_permissions (tenant_id, staff_id, module_code, access_level, granted_at) VALUES ('00000000-0000-0000-0000-000000000001', $1, $2, $3, NOW()) ON CONFLICT (staff_id, module_code) DO UPDATE SET access_level = EXCLUDED.access_level, granted_at = NOW()`, [userId, moduleCode, accessLevel || 'view']);
    }
    await pgClient.end();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/admin/permissions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
