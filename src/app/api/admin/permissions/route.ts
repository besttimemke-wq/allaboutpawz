import { NextRequest, NextResponse } from "next/server";
import pg from "pg";
import { requireAdminApi } from "@/lib/admin/gate";
import { getCurrentUser } from "@/lib/auth/server";
import { TENANT_ID, ensureCrmStaffForUser, withPg } from "@/lib/crm/enterprise";

// The owner's platform_module_permissions table is THE module-permission
// registry. His CHECK constraint fixes the module codes to exactly these 14
// (no app-invented codes), and access_level ∈ none/read/write/full. Grants
// attach to crm_staff rows (his model: permissions hang off staff records,
// staff records link to auth users via crm_staff.user_id).
const MODULES = [
  { code: 'customers', label: 'Customers', module: 'CRM' },
  { code: 'appointments', label: 'Appointments', module: 'CRM' },
  { code: 'communications', label: 'Communications', module: 'CRM' },
  { code: 'payments', label: 'Payments & Register', module: 'ACCOUNTING' },
  { code: 'invoices', label: 'Invoices', module: 'ACCOUNTING' },
  { code: 'deposits', label: 'Deposits & Escrow', module: 'ACCOUNTING' },
  { code: 'refunds_disputes', label: 'Refunds & Disputes', module: 'ACCOUNTING' },
  { code: 'gift_cards_credits', label: 'Gift Cards & Credits', module: 'ACCOUNTING' },
  { code: 'inventory', label: 'Inventory', module: 'ORDERS' },
  { code: 'products_services', label: 'Products & Services', module: 'ORDERS' },
  { code: 'purchasing', label: 'Purchasing', module: 'ORDERS' },
  { code: 'reports', label: 'Reports', module: 'REPORTS' },
  { code: 'staff_groomer_management', label: 'Staff & Groomer Management', module: 'SYSTEM' },
  { code: 'administration', label: 'Administration', module: 'SYSTEM' },
];

const VALID_CODES = new Set(MODULES.map((m) => m.code));
const VALID_LEVELS = new Set(["none", "read", "write", "full"]);

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const result = await withPg(async (client) => {
      let userPerms: any[] = [];
      let hasStaffRecord = false;
      if (userId) {
        // Permissions attach to the user's crm_staff record (his model).
        const staff = await client.query(
          `SELECT id::text FROM public.crm_staff WHERE tenant_id = $1 AND user_id = $2::uuid LIMIT 1`,
          [TENANT_ID(), userId],
        );
        if (staff.rows[0]) {
          hasStaffRecord = true;
          const res = await client.query(
            `SELECT module_code, access_level FROM public.platform_module_permissions
             WHERE tenant_id = $1 AND staff_id = $2::uuid`,
            [TENANT_ID(), staff.rows[0].id],
          );
          userPerms = res.rows;
        }
      }
      return { userPerms, hasStaffRecord };
    });

    if (!result) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });

    return NextResponse.json({
      modules: MODULES,
      hasStaffRecord: result.hasStaffRecord,
      userPermissions: result.userPerms.reduce((acc: Record<string, string>, p: any) => {
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
    let { userId, moduleCode, accessLevel } = body;
    if (!userId || !moduleCode || !VALID_CODES.has(moduleCode)) {
      return NextResponse.json({ error: "userId and a valid moduleCode are required" }, { status: 400 });
    }
    // The app's checkbox posts 'edit'; his enum is none/read/write/full.
    if (accessLevel === "edit") accessLevel = "write";
    if (!accessLevel) accessLevel = "write";
    if (!VALID_LEVELS.has(accessLevel)) {
      return NextResponse.json({ error: `accessLevel must be one of none/read/write/full` }, { status: 400 });
    }

    const actor = await getCurrentUser().catch(() => null);

    const ok = await withPg(async (client) => {
      // The grant attaches to the user's crm_staff record — find-or-create
      // (creating the staff registry row IS the enterprise way to make an
      // auth user grantable; no parallel table).
      const auth = await client.query(
        `SELECT email, raw_user_meta_data FROM auth.users WHERE id = $1::uuid LIMIT 1`,
        [userId],
      );
      const email = auth.rows[0]?.email || null;
      const displayName =
        (auth.rows[0]?.raw_user_meta_data?.full_name) || (email ? email.split("@")[0] : null);
      const staffId = await ensureCrmStaffForUser(client, { userId, displayName, email });
      if (!staffId) return false;

      // granted_by → the acting admin's own crm_staff record.
      let grantedBy: string | null = null;
      if (actor?.id) {
        grantedBy = await ensureCrmStaffForUser(client, {
          userId: actor.id,
          displayName: (actor.user_metadata?.full_name as string) || null,
          email: actor.email || null,
        });
      }

      if (accessLevel === "none") {
        await client.query(
          `DELETE FROM public.platform_module_permissions
           WHERE tenant_id = $1 AND staff_id = $2::uuid AND module_code = $3`,
          [TENANT_ID(), staffId, moduleCode],
        );
      } else {
        await client.query(
          `INSERT INTO public.platform_module_permissions
             (tenant_id, staff_id, module_code, access_level, granted_by)
           VALUES ($1, $2::uuid, $3, $4, $5::uuid)
           ON CONFLICT (staff_id, module_code)
           DO UPDATE SET access_level = EXCLUDED.access_level, granted_by = EXCLUDED.granted_by, granted_at = now()`,
          [TENANT_ID(), staffId, moduleCode, accessLevel, grantedBy],
        );
      }
      return true;
    });

    if (!ok) return NextResponse.json({ error: "DB unavailable" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[POST /api/admin/permissions]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
