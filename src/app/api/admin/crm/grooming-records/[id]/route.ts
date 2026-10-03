import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

// PATCH /api/admin/crm/grooming-records/[id] — update a grooming session.
// Body: { notes?, petBehaviorNotes?, coatCondition?, skinCondition?,
//         mattingLevel?, servicesSummary?, customerVisibleNotes?,
//         recommendNextVisit?, recommendedNextVisitDate? }
// Used by CustomerDetailsView handleAddGroomingNotePrompt to append
// clinical notes to a completed grooming session.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { id } = await ctx.params;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  return withPg(async (client) => {
    const tenant = TENANT_ID();
    // Verify the record exists
    const rec = await client.query(`SELECT id::text, notes FROM public.crm_grooming_records WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [tenant, id]);
    if (!rec.rows[0]) return NextResponse.json({ error: "Grooming record not found" }, { status: 404 });

    await client.query("BEGIN");
    try {
      // If appending a note (not replacing), combine with existing
      const existingNotes = rec.rows[0].notes || "";
      const newNotes = body.appendNote
        ? (existingNotes ? `${existingNotes} • ${body.appendNote}` : body.appendNote)
        : body.notes ?? existingNotes;

      const sets: string[] = []; const vals: any[] = []; let pi = 1;
      sets.push(`notes = $${pi++}`); vals.push(newNotes);
      if (body.petBehaviorNotes !== undefined) { sets.push(`pet_behavior_notes = $${pi++}`); vals.push(body.petBehaviorNotes); }
      if (body.coatCondition !== undefined) { sets.push(`coat_condition = $${pi++}`); vals.push(body.coatCondition); }
      if (body.skinCondition !== undefined) { sets.push(`skin_condition = $${pi++}`); vals.push(body.skinCondition); }
      if (body.mattingLevel !== undefined) { sets.push(`matting_level = $${pi++}`); vals.push(body.mattingLevel); }
      if (body.servicesSummary !== undefined) { sets.push(`services_summary = $${pi++}`); vals.push(body.servicesSummary); }
      if (body.customerVisibleNotes !== undefined) { sets.push(`customer_visible_notes = $${pi++}`); vals.push(body.customerVisibleNotes); }
      if (body.recommendNextVisit !== undefined) { sets.push(`recommend_next_visit = $${pi++}`); vals.push(body.recommendNextVisit); }
      if (body.recommendedNextVisitDate !== undefined) { sets.push(`recommended_next_visit_date = $${pi++}`); vals.push(body.recommendedNextVisitDate); }
      sets.push(`updated_at = now()`);
      vals.push(id);

      await client.query(`UPDATE public.crm_grooming_records SET ${sets.join(", ")} WHERE id = $${pi}::uuid`, vals);

      try {
        await client.query("SAVEPOINT audit_sp");
        await platformAudit(client, {
          action: "crm.grooming_record.updated",
          targetType: "crm_grooming_record",
          targetId: id,
          actorRole: "admin",
          metadata: { fields: Object.keys(body) },
        });
        await client.query("RELEASE SAVEPOINT audit_sp");
      } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }

      await client.query("COMMIT");
      return NextResponse.json({ ok: true, notes: newNotes });
    } catch (e: any) {
      await client.query("ROLLBACK").catch(() => {});
      return NextResponse.json({ error: e?.message }, { status: 500 });
    }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 }))
    .catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
