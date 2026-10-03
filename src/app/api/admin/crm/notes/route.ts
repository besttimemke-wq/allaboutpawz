import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

const VALID_NOTE_TYPES = new Set(["internal","customer_visible","appointment","pet_handling","system"]);
function toIso(v: any): string | null { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toISOString(); }

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);
  return withPg(async (client) => {
    const r = await client.query(`SELECT * FROM public.crm_notes WHERE tenant_id = $1 AND customer_id = $2::uuid ORDER BY is_pinned DESC, created_at DESC LIMIT $3`, [TENANT_ID(), customerId, limit]);
    return NextResponse.json({ notes: r.rows.map((row: any) => ({ id: String(row.id), customerId: String(row.customer_id), petId: row.pet_id ? String(row.pet_id) : null, noteType: row.note_type ?? "internal", body: row.body ?? "", isPinned: !!row.is_pinned, createdAt: toIso(row.created_at) })), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const customerId = String(body.customerId || ""); if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const noteBody = String(body.body || ""); if (!noteBody) return NextResponse.json({ error: "body required" }, { status: 400 });
  const noteType = String(body.noteType || "internal"); if (!VALID_NOTE_TYPES.has(noteType)) return NextResponse.json({ error: "Invalid noteType" }, { status: 400 });
  return withPg(async (client) => {
    const tenant = TENANT_ID(); await client.query("BEGIN");
    try {
      const ins = await client.query(`INSERT INTO public.crm_notes (tenant_id, customer_id, pet_id, note_type, body, is_pinned) VALUES ($1, $2::uuid, $3, $4, $5, $6) RETURNING *`, [tenant, customerId, body.petId || null, noteType, noteBody, !!body.isPinned]);
      const row = ins.rows[0];
      try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.note.created", targetType: "crm_note", targetId: String(row.id), actorRole: "admin", metadata: { customerId, noteType, bodyPreview: noteBody.slice(0, 100) } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT"); return NextResponse.json({ note: { id: String(row.id), noteType, body: noteBody, isPinned: !!body.isPinned, createdAt: toIso(row.created_at) } }, { status: 201 });
    } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
