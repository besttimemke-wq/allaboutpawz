import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { withPg, TENANT_ID } from "@/lib/crm/enterprise";

function toIso(v: any): string | null { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toISOString(); }

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi(); if (gate) return gate;
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId") || "";
  const petId = searchParams.get("petId") || "";
  if (!customerId && !petId) return NextResponse.json({ error: "customerId or petId required" }, { status: 400 });
  const limit = Math.min(parseInt(searchParams.get("limit") || "200") || 200, 500);
  return withPg(async (client) => {
    const tenant = TENANT_ID();
    const where = ["d.tenant_id = $1"]; const params: any[] = [tenant]; let pi = 2;
    if (customerId) { where.push(`d.customer_id = $${pi}::uuid`); params.push(customerId); pi++; }
    if (petId) { where.push(`d.pet_id = $${pi}::uuid`); params.push(petId); pi++; }
    const r = await client.query(`SELECT * FROM public.crm_documents d WHERE ${where.join(" AND ")} ORDER BY d.uploaded_at DESC NULLS LAST, d.created_at DESC LIMIT $${pi}`, [...params, limit]);
    return NextResponse.json({ documents: r.rows.map((row: any) => ({ id: String(row.id), name: row.name ?? "—", status: row.status ?? "pending", storagePath: row.storage_path ?? null, mimeType: row.mime_type ?? null, uploadedAt: toIso(row.uploaded_at), expiresAt: row.expires_at ? String(row.expires_at).slice(0,10) : null })), total: r.rows.length });
  }).then((r) => r ?? NextResponse.json({ error: "DB unavailable" }, { status: 503 })).catch((e: any) => NextResponse.json({ error: e?.message }, { status: 500 }));
}
