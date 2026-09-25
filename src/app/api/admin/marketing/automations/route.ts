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
    const [workflows, enrollments, runs] = await Promise.all([
      pgQuery(`SELECT w.id, w.name, w.workflow_type, w.status,
        w.trigger_definition, w.condition_definition, w.action_definition,
        w.allow_reentry, w.created_by, w.created_at, w.updated_at,
        (SELECT count(*)::int FROM public.crm_automation_enrollments e WHERE e.workflow_id = w.id) AS enrollment_count
        FROM public.crm_automation_workflows w
        WHERE w.tenant_id = $1
        ORDER BY w.created_at DESC LIMIT 200`, [TENANT_ID()]),
      pgQuery(`SELECT e.id, e.workflow_id, e.customer_id, e.status,
        e.current_step, e.scheduled_for, e.started_at, e.completed_at,
        e.last_error, e.created_at
        FROM public.crm_automation_enrollments e
        WHERE e.tenant_id = $1
        ORDER BY e.created_at DESC LIMIT 50`, [TENANT_ID()]),
      pgQuery(`SELECT r.id, r.workflow_id, r.enrollment_id, r.action_type,
        r.status, r.scheduled_for, r.executed_at, r.error_message, r.created_at
        FROM public.crm_automation_runs r
        WHERE r.tenant_id = $1
        ORDER BY r.created_at DESC LIMIT 50`, [TENANT_ID()]),
    ]);
    return NextResponse.json({ workflows, enrollments, runs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
