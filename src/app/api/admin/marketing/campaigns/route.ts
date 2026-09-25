import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/gate";
import { pgQuery } from "@/lib/pg";
import { TENANT_ID } from "@/lib/crm/enterprise";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const gate = await requireAdminApi();
  if (gate) return gate;
  try {
    const [campaigns, templates, segments] = await Promise.all([
      pgQuery(`SELECT c.id, c.name, c.campaign_type, c.status, c.channel, c.template_id,
        c.scheduled_at, c.started_at, c.completed_at, c.created_at,
        t.name AS template_name,
        (SELECT count(*)::int FROM public.crm_campaign_members cm WHERE cm.campaign_id = c.id) AS member_count
        FROM public.crm_campaigns c
        LEFT JOIN public.crm_message_templates t ON t.id = c.template_id
        WHERE c.tenant_id = $1
        ORDER BY c.created_at DESC LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT id, name, channel, subject, category, is_system, is_active, created_at
        FROM public.crm_message_templates
        WHERE tenant_id = $1 ORDER BY name ASC LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT s.id, s.name, s.description, s.entity_type, s.segment_type,
        s.is_active, s.created_at,
        (SELECT count(*)::int FROM public.crm_segment_memberships sm WHERE sm.segment_id = s.id AND sm.exited_at IS NULL) AS member_count
        FROM public.crm_segments s
        WHERE s.tenant_id = $1 ORDER BY s.name ASC LIMIT 200`, [TENANT_ID()]),
    ]);
    return NextResponse.json({ campaigns, templates, segments });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
