import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

const VALID_STATUS = new Set(["current","expired","waived","missing"]);

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { id: petId } = await ctx.params;
  return withPg(async (client) => {
    const r = await client.query(
      `SELECT v.*, vt.vaccine_name, d.name AS document_name, d.storage_path AS document_storage_path
       FROM public.crm_pet_vaccinations v
       LEFT JOIN public.crm_vaccine_types vt ON vt.id = v.vaccine_type_id AND vt.tenant_id = v.tenant_id
       LEFT JOIN public.crm_documents d ON d.id = v.document_id AND d.tenant_id = v.tenant_id
       WHERE v.tenant_id = $1 AND v.pet_id = $2::uuid
       ORDER BY v.expires_on DESC NULLS LAST`,
      [TENANT_ID(), petId],
    );
    return NextResponse.json({ vaccinations: r.rows.map((row: any) => ({ id: String(row.id), vaccineName: row.vaccine_name ?? null, administeredOn: row.administered_on ? String(row.administered_on).slice(0,10) : null, expiresOn: row.expires_on ? String(row.expires_on).slice(0,10) : null, veterinarianName: row.veterinarian_name ?? null, status: row.status ?? "current", documentUrl: row.document_storage_path ?? null })), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { id: petId } = await ctx.params;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const status = String(body.status || "current").toLowerCase(); if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    // Find-or-create vaccine_type by name
    let vaccineTypeId = body.vaccineTypeId || null;
    if (!vaccineTypeId && body.vaccineName) {
      const found = await client.query(`SELECT id FROM public.crm_vaccine_types WHERE tenant_id = $1 AND lower(vaccine_name) = lower($2) LIMIT 1`, [tenant, String(body.vaccineName)]);
      if (found.rows[0]) vaccineTypeId = found.rows[0].id;
      else { const ins = await client.query(`INSERT INTO public.crm_vaccine_types (tenant_id, vaccine_name) VALUES ($1, $2) RETURNING id`, [tenant, String(body.vaccineName)]); vaccineTypeId = ins.rows[0].id; }
    }
    await client.query("BEGIN");
    try {
      const ins = await client.query(`INSERT INTO public.crm_pet_vaccinations (tenant_id, pet_id, vaccine_type_id, administered_on, expires_on, lot_number, veterinarian_name, document_id, status, notes) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`, [tenant, petId, vaccineTypeId, body.administeredOn || null, body.expiresOn || null, body.lotNumber || null, body.veterinarianName || null, body.documentId || null, status, body.notes || null]);
      const row = ins.rows[0];
      try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.pet.vaccination.created", targetType: "crm_pet_vaccination", targetId: String(row.id), actorRole: "admin", metadata: { petId, vaccineName: body.vaccineName, status } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT");
      return NextResponse.json({ vaccination: { id: String(row.id), vaccineName: body.vaccineName, expiresOn: body.expiresOn, status } }, { status: 201 });
    } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
