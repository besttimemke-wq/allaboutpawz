import { NextRequest } from "next/server";
import { handleCrmList, handleCrmCreate } from "@/lib/crm/handlers";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";
import { requireAdminApi } from "@/lib/admin/gate";
import { NextResponse } from "next/server";
import { platformAudit } from "@/lib/crm/enterprise";

const VALID_STAGES = new Set(["new_lead","new_customer","active","vip","returning","lapsed","at_risk","lost"]);
const VALID_STATUSES = new Set(["healthy","needs_attention","at_risk"]);

function num(v: any): number { return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100; }
function toIso(v: any): string | null { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toISOString(); }

function toUiCustomer(row: any, pets: any[] = [], tags: string[] = []) {
  const firstName = row.first_name ?? "";
  const lastName = row.last_name ?? "";
  return {
    id: String(row.id),
    firstName: firstName || null,
    lastName: lastName || null,
    name: `${firstName} ${lastName}`.trim() || row.preferred_name || row.email || "—",
    email: row.email ?? null,
    phone: row.phone ?? null,
    lifecycleStage: row.lifecycle_stage ?? "new_lead",
    lifecycleStatus: row.lifecycle_status ?? "healthy",
    customerType: row.customer_type ?? "individual",
    customerSince: row.customer_since ? String(row.customer_since).slice(0, 10) : null,
    lastActivityAt: toIso(row.last_activity_at),
    lastVisitAt: toIso(row.last_visit_at),
    nextAppointmentAt: toIso(row.next_appointment_at),
    lifetimeValue: num(row.lifetime_value),
    outstandingBalance: num(row.outstanding_balance),
    isActive: !!row.is_active,
    petCount: pets.length,
    pets: pets.map((p: any) => ({ id: String(p.id), name: p.name ?? "—", species: p.species, breed: p.breed, sex: p.sex, isPrimary: !!p.is_primary })),
    tags,
    createdAt: toIso(row.created_at),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["c.tenant_id = $1", "(c.archived_at IS NULL)"];
    const params: any[] = [tenant];
    let pi = 2;
    if (search) {
      where.push(`(COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'') ILIKE $${pi} OR c.email ILIKE $${pi} OR COALESCE(c.phone,'') ILIKE $${pi})`);
      params.push(`%${search}%`); pi++;
    }
    const pageRes = await client.query(`SELECT c.* FROM public.crm_customers c WHERE ${where.join(" AND ")} ORDER BY c.last_activity_at DESC NULLS LAST, c.created_at DESC LIMIT $${pi}`, [...params, limit]);
    const ids = pageRes.rows.map((r: any) => String(r.id));
    let petsByCust = new Map<string, any[]>();
    let tagsByCust = new Map<string, string[]>();
    if (ids.length > 0) {
      const petsRes = await client.query(`SELECT cp.customer_id, cp.is_primary, p.id, p.name, p.species, p.breed, p.sex FROM public.crm_customer_pets cp JOIN public.crm_pets p ON p.id = cp.pet_id WHERE cp.tenant_id = $1 AND cp.customer_id = ANY($2::uuid[]) ORDER BY cp.is_primary DESC, p.name`, [tenant, ids]);
      for (const r of petsRes.rows) { const k = String(r.customer_id); if (!petsByCust.has(k)) petsByCust.set(k, []); petsByCust.get(k)!.push(r); }
      const tagsRes = await client.query(`SELECT ct.customer_id, t.name FROM public.crm_customer_tags ct JOIN public.crm_tags t ON t.id = ct.tag_id WHERE ct.tenant_id = $1 AND ct.customer_id = ANY($2::uuid[])`, [tenant, ids]);
      for (const r of tagsRes.rows) { const k = String(r.customer_id); if (!tagsByCust.has(k)) tagsByCust.set(k, []); tagsByCust.get(k)!.push(r.name); }
    }
    const customers = pageRes.rows.map((r: any) => toUiCustomer(r, petsByCust.get(String(r.id)) ?? [], tagsByCust.get(String(r.id)) ?? []));
    return NextResponse.json({ customers, total: customers.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => { console.error("[crm/customers GET]", e); return NextResponse.json({ error: e?.message }, { status: 500 }); });
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  const stage = String(body.lifecycleStage || "new_lead");
  if (!VALID_STAGES.has(stage)) return NextResponse.json({ error: `Invalid lifecycleStage` }, { status: 400 });
  const status = String(body.lifecycleStatus || "healthy");
  if (!VALID_STATUSES.has(status)) return NextResponse.json({ error: `Invalid lifecycleStatus` }, { status: 400 });

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const found = await client.query(`SELECT * FROM public.crm_customers WHERE tenant_id = $1 AND lower(email) = $2 LIMIT 1`, [tenant, email]);
    let row = found.rows[0];
    if (row) return NextResponse.json(toUiCustomer(row), { status: 200 });

    await client.query("BEGIN");
    try {
      const ins = await client.query(
        `INSERT INTO public.crm_customers (tenant_id, email, first_name, last_name, phone, preferred_name, company_name, lifecycle_stage, lifecycle_status, customer_type, customer_since, first_contact_at, last_activity_at, address_line1, city, state, postal_code, marketing_email_opt_in, marketing_sms_opt_in)
         VALUES ($1, lower($2), $3, $4, $5, $6, $7, $8, $9, $10, CAST(CURRENT_DATE AS date), now(), now(), $11, $12, $13, $14, $15, $16) RETURNING *`,
        [tenant, email, body.firstName || null, body.lastName || null, body.phone || null, body.preferredName || null, body.companyName || null, stage, status, body.customerType || "individual", body.addressLine1 || null, body.city || null, body.state || null, body.postalCode || null, body.marketingEmailOptIn ?? false, body.marketingSmsOptIn ?? false],
      );
      row = ins.rows[0];
      try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.customer.created", targetType: "crm_customer", targetId: String(row.id), actorRole: "admin", metadata: { email } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch (e) { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT");
      return NextResponse.json(toUiCustomer(row), { status: 201 });
    } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
