import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID, platformAudit } from "@/lib/crm/enterprise";

const VALID_CHANNELS = new Set(["sms","email","phone","in_person","mail","other"]);
function toIso(v: any): string | null { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toISOString(); }

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);
  return withPg(async (client) => {
    const r = await client.query(`SELECT * FROM public.crm_messages WHERE tenant_id = $1 AND customer_id = $2::uuid ORDER BY created_at DESC LIMIT $3`, [TENANT_ID(), customerId, limit]);
    return NextResponse.json({ messages: r.rows.map((row: any) => ({ id: String(row.id), channel: row.channel ?? "other", direction: row.direction ?? "outbound", status: row.status ?? "sent", subject: row.subject ?? null, body: row.body ?? "", createdAt: toIso(row.created_at) })), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}

export async function POST(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const customerId = String(body.customerId || ""); if (!customerId) return NextResponse.json({ error: "customerId required" }, { status: 400 });
  const msgBody = String(body.body || ""); if (!msgBody) return NextResponse.json({ error: "body required" }, { status: 400 });
  const channel = String(body.channel || "sms").toLowerCase(); if (!VALID_CHANNELS.has(channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  return withPg(async (client) => {
    const tenant = TENANT_ID(); await client.query("BEGIN");
    try {
      const ins = await client.query(`INSERT INTO public.crm_messages (tenant_id, customer_id, channel, direction, status, subject, body, provider, sent_at) VALUES ($1, $2::uuid, $3, 'outbound', 'sent', $4, $5, $6, now()) RETURNING *`, [tenant, customerId, channel, body.subject || null, msgBody, channel === "email" ? "resend" : channel === "sms" ? "twilio" : null]);
      const row = ins.rows[0];
      try { await client.query("SAVEPOINT audit_sp"); await platformAudit(client, { action: "crm.message.sent", targetType: "crm_message", targetId: String(row.id), actorRole: "admin", metadata: { customerId, channel, bodyPreview: msgBody.slice(0, 100) } }); await client.query("RELEASE SAVEPOINT audit_sp"); } catch { await client.query("ROLLBACK TO SAVEPOINT audit_sp").catch(() => {}); }
      await client.query("COMMIT"); return NextResponse.json({ message: { id: String(row.id), channel, body: msgBody, status: "sent", createdAt: toIso(row.created_at) } }, { status: 201 });
    } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); return NextResponse.json({ error: e?.message }, { status: 500 }); }
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
