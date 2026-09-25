import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-support
// Returns the support queue:
//   - escalations: lms.human_escalation_routing LEFT JOIN ai_teaching_sessions
//                  + learner_profiles (learner_user_id → preferred_name)
//   - caseloads:   lms.navigator_caseloads JOIN learner_profiles
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const escalations = await pgQuery<{
      id: string;
      session_id: string | null;
      learner_user_id: string;
      learner_name: string | null;
      escalation_type: string;
      priority: string;
      assigned_to: string | null;
      assigned_role: string | null;
      status: string;
      resolution_notes: string | null;
      resolved_at: string | null;
      created_at: string | null;
    }>(
      `SELECT
         er.id,
         er.session_id,
         er.learner_user_id,
         lp.preferred_name AS learner_name,
         er.escalation_type,
         er.priority,
         er.assigned_to,
         er.assigned_role,
         er.status,
         er.resolution_notes,
         er.resolved_at,
         er.created_at
       FROM lms.human_escalation_routing er
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = er.learner_user_id
       ORDER BY
         CASE er.status
           WHEN 'pending' THEN 0
           WHEN 'assigned' THEN 1
           WHEN 'acknowledged' THEN 2
           WHEN 'in_progress' THEN 3
           ELSE 4
         END,
         er.created_at DESC
       LIMIT 200`,
    );

    const caseloads = await pgQuery<{
      id: string;
      navigator_user_id: string;
      learner_user_id: string;
      learner_name: string | null;
      assigned_at: string | null;
      status: string;
      closed_at: string | null;
      closed_reason: string | null;
    }>(
      `SELECT
         nc.id,
         nc.navigator_user_id,
         nc.learner_user_id,
         lp.preferred_name AS learner_name,
         nc.assigned_at,
         nc.status,
         nc.closed_at,
         nc.closed_reason
       FROM lms.navigator_caseloads nc
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = nc.learner_user_id
       ORDER BY nc.assigned_at DESC NULLS LAST
       LIMIT 200`,
    );

    return NextResponse.json({ escalations, caseloads });
  } catch (error) {
    console.error("Support queue fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
