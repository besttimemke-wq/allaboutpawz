import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

function num(v: any): number { return Math.round((parseFloat(String(v ?? "0")) || 0) * 100) / 100; }
function toIso(v: any): string | null { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toISOString(); }

function toUiPet(row: any) {
  return {
    id: String(row.id), name: row.name ?? "—", species: row.species ?? "dog",
    breed: row.breed ?? null, sex: row.sex ?? null, color: row.color ?? null,
    weight: row.weight != null ? num(row.weight) : null, weightUnit: row.weight_unit ?? "lb",
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth).slice(0, 10) : null,
    approximateAgeYears: row.approximate_age_years != null ? num(row.approximate_age_years) : null,
    medicalAlert: !!row.medical_alert, nervous: !!row.nervous, aggressive: !!row.aggressive,
    firstVisit: row.first_visit !== false, senior: !!row.senior, puppy: !!row.puppy,
    handlingNotes: row.handling_notes ?? null, behavioralNotes: row.behavioral_notes ?? null,
    medicalNotes: row.medical_notes ?? null, serviceNotes: row.service_notes ?? null,
    primaryCustomerId: row.primary_customer_id ? String(row.primary_customer_id) : null,
    sourcePetId: row.source_pet_id ?? null, status: row.status ?? "active",
    createdAt: toIso(row.created_at),
  };
}

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  const search = searchParams.get("search") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    if (customerId) {
      const r = await client.query(`SELECT p.*, cp.relationship, cp.is_primary FROM public.crm_pets p JOIN public.crm_customer_pets cp ON cp.pet_id = p.id WHERE cp.tenant_id = $1 AND cp.customer_id = $2::uuid ORDER BY cp.is_primary DESC, p.name LIMIT $3`, [tenant, customerId, limit]);
      return NextResponse.json({ pets: r.rows.map(toUiPet), total: r.rows.length });
    }
    if (search) {
      const r = await client.query(`SELECT * FROM public.crm_pets WHERE tenant_id = $1 AND (name ILIKE $2 OR breed ILIKE $2) ORDER BY name LIMIT $3`, [tenant, `%${search}%`, limit]);
      return NextResponse.json({ pets: r.rows.map(toUiPet), total: r.rows.length });
    }
    const r = await client.query(`SELECT * FROM public.crm_pets WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`, [tenant, limit]);
    return NextResponse.json({ pets: r.rows.map(toUiPet), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const customerId = String(body.customerId || "");
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const name = String(body.name || "");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const cust = await client.query(`SELECT id FROM public.crm_customers WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [tenant, customerId]);
    if (!cust.rows[0]) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    // Find-or-create by (customer, name)
    const found = await client.query(`SELECT * FROM public.crm_pets WHERE tenant_id = $1 AND primary_customer_id = $2::uuid AND lower(name) = lower($3) LIMIT 1`, [tenant, customerId, name]);
    let row = found.rows[0];

    if (!row) {
      await client.query("BEGIN");
      try {
        const ins = await client.query(
          `INSERT INTO public.crm_pets (tenant_id, primary_customer_id, name, species, breed, sex, color, weight, weight_unit, date_of_birth, approximate_age_years, first_visit, handling_notes, behavioral_notes, medical_notes, service_notes, status)
           VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active') RETURNING *`,
          [tenant, customerId, name, body.species || "dog", body.breed || null, body.sex || null, body.color || null, body.weight ?? null, body.weightUnit || "lb", body.dateOfBirth || null, body.approximateAgeYears ?? null, body.firstVisit ?? true, body.handlingNotes || null, body.behavioralNotes || null, body.medicalNotes || null, body.serviceNotes || null],
        );
        row = ins.rows[0];
        await client.query(`INSERT INTO public.crm_customer_pets (tenant_id, customer_id, pet_id, relationship, is_primary) VALUES ($1, $2::uuid, $3::uuid, $4, $5) ON CONFLICT (tenant_id, customer_id, pet_id) DO NOTHING`, [tenant, customerId, row.id, body.relationship || "owner", body.isPrimary ?? false]);
        try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.pet.created", targetType: "crm_pet", targetId: String(row.id), actorRole: "admin", metadata: { name, customerId } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
        await client.query("COMMIT");
      } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
    }
    return NextResponse.json(toUiPet(row), { status: 201 });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
