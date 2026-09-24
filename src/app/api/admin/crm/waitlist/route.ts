import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";
export async function GET(req: NextRequest) {
  const g = await requireAdminApi(); if (g) return g;
  return withPg(async (c) => {
    const r = await c.query("SELECT id::text, customer_id::text, pet_id::text, service_id::text, priority, status, notes, requested_start_at, created_at FROM public.crm_waitlist WHERE tenant_id = $1 ORDER BY priority DESC, created_at ASC", [TENANT_ID()]);
    return NextResponse.json({ waitlist: r.rows, total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
export async function POST(req: NextRequest) {
  const g = await requireAdminApi(); if (g) return g;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  return withPg(async (c) => {
    await c.query("BEGIN");
    try {
      const ins = await c.query("INSERT INTO public.crm_waitlist (tenant_id, customer_id, pet_id, service_id, priority, status, notes, requested_start_at) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7) RETURNING id::text", [TENANT_ID(), body.customerId || null, body.petId || null, body.serviceId || null, body.priority || 5, body.notes || null, body.requestedStartAt || null]);
      try { await c.query("SAVEPOINT audit_sp"); await platformAudit(c, { action: "crm.waitlist.added", targetType: "crm_waitlist", targetId: ins.rows[0].id, actorRole: "admin", metadata: { customerId: body.customerId } }); await c.query("RELEASE SAVEPOINT audit_sp"); } catch { await c.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await c.query("COMMIT");
      return NextResponse.json({ id: ins.rows[0].id }, { status: 201 });
    } catch (e: any) { await c.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
