import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-ai-teaching
// Lists AI teaching sessions joined to lms.courses (for the human-readable
// course title) and lms.learner_profiles (preferred_name on learner_user_id).
export async function GET() {
  try {
    const rows = await pgQuery<{
      id: string;
      learner_user_id: string;
      learner_name: string | null;
      course_id: string;
      course_title: string | null;
      session_status: string;
      started_at: string | null;
      ended_at: string | null;
      total_turns: number | null;
      total_duration_seconds: number | null;
      delivery_mode: string | null;
      escalation_triggered: boolean | null;
      escalation_reason: string | null;
    }>(
      `SELECT
         s.id,
         s.learner_user_id,
         lp.preferred_name AS learner_name,
         s.course_id,
         c.title AS course_title,
         s.session_status,
         s.started_at,
         s.ended_at,
         s.total_turns,
         s.total_duration_seconds,
         s.delivery_mode,
         s.escalation_triggered,
         s.escalation_reason
       FROM lms.ai_teaching_sessions s
       LEFT JOIN lms.courses c ON c.id = s.course_id
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = s.learner_user_id
       ORDER BY s.started_at DESC NULLS LAST
       LIMIT 200`,
    );

    return NextResponse.json({ sessions: rows });
  } catch (error) {
    console.error("AI teaching sessions fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
