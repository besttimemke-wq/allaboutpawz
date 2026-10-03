import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

// PATCH /api/admin/crm/pets/[id] — update a pet record.
// Body: { name?, breed?, sex?, color?, weight?, handlingNotes?, isPrimary? }
// When isPrimary=true, demotes other primary pets for the same customer.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { id } = await ctx.params;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const pet = await client.query(`SELECT * FROM public.crm_pets WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [tenant, id]);
    if (!pet.rows[0]) return NextResponse.json({ error: "Pet not found" }, { status: 404 });
    await client.query("BEGIN");
    try {
      const sets: string[] = []; const vals: any[] = []; let pi = 1;
      if (body.name !== undefined) { sets.push(`name = $${pi++}`); vals.push(body.name); }
      if (body.breed !== undefined) { sets.push(`breed = $${pi++}`); vals.push(body.breed); }
      if (body.sex !== undefined) { sets.push(`sex = $${pi++}`); vals.push(body.sex); }
      if (body.color !== undefined) { sets.push(`color = $${pi++}`); vals.push(body.color); }
      if (body.weight !== undefined) { sets.push(`weight = $${pi++}`); vals.push(body.weight); }
      if (body.handlingNotes !== undefined) { sets.push(`handling_notes = $${pi++}`); vals.push(body.handlingNotes); }
      if (body.behavioralNotes !== undefined) { sets.push(`behavioral_notes = $${pi++}`); vals.push(body.behavioralNotes); }
      if (body.medicalNotes !== undefined) { sets.push(`medical_notes = $${pi++}`); vals.push(body.medicalNotes); }
      if (body.medicalAlert !== undefined) { sets.push(`medical_alert = $${pi++}`); vals.push(body.medicalAlert); }
      sets.push(`updated_at = now()`);
      if (sets.length > 1) {
        vals.push(id);
        await client.query(`UPDATE public.crm_pets SET ${sets.join(", ")} WHERE id = $${pi}::uuid`, vals);
      }
      // Handle isPrimary
      if (body.isPrimary !== undefined && pet.rows[0].primary_customer_id) {
        if (body.isPrimary) {
          await client.query(`UPDATE public.crm_customer_pets SET is_primary = false WHERE tenant_id = $1 AND customer_id = $2::uuid AND pet_id <> $3::uuid`, [tenant, pet.rows[0].primary_customer_id, id]);
        }
        await client.query(`UPDATE public.crm_customer_pets SET is_primary = $2 WHERE tenant_id = $1 AND pet_id = $3::uuid`, [tenant, body.isPrimary, id]);
      }
      try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.pet.updated", targetType: "crm_pet", targetId: id, actorRole: "admin", metadata: { fields: Object.keys(body) } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT");
      return NextResponse.json({ ok: true });
    } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
