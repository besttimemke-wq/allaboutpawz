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

// The module tree the admin can check per user — parent = domain, children =
// the features inside it. Adding a line here adds a checkbox in the admin
// panel; nothing is predefined per role.
const MODULES = [
  { code: 'crm:dashboard', label: 'CRM Dashboard', module: 'CRM' },
  { code: 'crm:quick-actions', label: 'Quick Actions', module: 'CRM' },
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

const VALID_CODES = new Set(MODULES.map(m => m.code));

// The owner's live platform_module_permissions table has CHECK constraints
// (module_code ∈ a fixed 14-code enum, access_level ∈ none/read/write/full)
// and a staff_id → crm_staff foreign key — values this app's module tree
// cannot satisfy, so NOTHING ever persisted through it (same in the source
// repo). His schema is left untouched; per-user feature grants live in this
// app-owned table keyed by the AUTH user id, RLS enabled with no policies so
// only the server (service/postgres role) can read or write it.
async function ensureTable(pgClient: pg.Client) {
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS public.user_module_access (
      user_id UUID NOT NULL,
      module_code TEXT NOT NULL,
      access_level TEXT NOT NULL DEFAULT 'edit',
      granted_by UUID,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, module_code)
    );
    ALTER TABLE public.user_module_access ENABLE ROW LEVEL SECURITY;
  `);
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const pgClient = await getPgClient();
    if (!pgClient) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    await ensureTable(pgClient);

    let userPerms: any[] = [];
    if (userId) {
      const res = await pgClient.query(
        "SELECT module_code, access_level FROM public.user_module_access WHERE user_id::text = $1",
        [userId]
      );
      userPerms = res.rows;
    }
    await pgClient.end();
    return NextResponse.json({
      modules: MODULES,
      userPermissions: userPerms.reduce((acc: Record<string, string>, p: any) => {
        acc[p.module_code] = p.access_level;
        return acc;
      }, {}),
    });
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
    if (!userId || !moduleCode || !VALID_CODES.has(moduleCode)) {
      return NextResponse.json({ error: "userId and a valid moduleCode are required" }, { status: 400 });
    }
    const pgClient = await getPgClient();
    if (!pgClient) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    await ensureTable(pgClient);

    if (accessLevel === 'none') {
      await pgClient.query(
        "DELETE FROM public.user_module_access WHERE user_id::text = $1 AND module_code = $2",
        [userId, moduleCode]
      );
    } else {
      await pgClient.query(
        `INSERT INTO public.user_module_access (user_id, module_code, access_level, granted_at)
         VALUES ($1, $2, 'edit', NOW())
         ON CONFLICT (user_id, module_code) DO UPDATE SET access_level = 'edit', granted_at = NOW()`,
        [userId, moduleCode]
      );
    }
    await pgClient.end();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/admin/permissions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
