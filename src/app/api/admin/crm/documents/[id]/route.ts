import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

// PATCH /api/admin/crm/documents/[id] — update a document's status.
// Body: { status?, rejectionReason? }
// Used by CustomerDetailsView handleVerifyDocument to mark a document as verified.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { id } = await ctx.params;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const doc = await client.query(`SELECT * FROM public.crm_documents WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`, [tenant, id]);
    if (!doc.rows[0]) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    const status = body.status || "approved";
    await client.query("BEGIN");
    try {
      await client.query(`UPDATE public.crm_documents SET status = $2, rejection_reason = $3, updated_at = now() WHERE id = $1::uuid`, [id, status, body.rejectionReason || null]);
      try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.document.verified", targetType: "crm_document", targetId: id, actorRole: "admin", metadata: { status } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT");
      return NextResponse.json({ ok: true, status });
    } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
