import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-enrollment
// Direct mapping to the lms.enrollments schema, joined to lms.courses for
// human-readable course titles and codes. The learner name is pulled from
// lms.learner_profiles when available.
export async function GET() {
  try {
    const rows = await pgQuery<{
      id: string;
      learner_user_id: string;
      learner_name: string | null;
      course_id: string;
      course_title: string | null;
      course_code: string | null;
      status: string;
      delivery_mode: string;
      enrolled_at: string | null;
      completed_at: string | null;
      dropped_at: string | null;
      progress_percentage: string | null;
      last_activity_at: string | null;
    }>(
      `SELECT
         e.id,
         e.learner_user_id,
         lp.preferred_name AS learner_name,
         e.course_id,
         c.title AS course_title,
         c.code AS course_code,
         e.status,
         e.delivery_mode,
         e.enrolled_at,
         e.completed_at,
         e.dropped_at,
         e.progress_percentage::text,
         e.last_activity_at
       FROM lms.enrollments e
       LEFT JOIN lms.courses c ON c.id = e.course_id
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = e.learner_user_id
       ORDER BY e.enrolled_at DESC NULLS LAST
       LIMIT 200`,
    );

    return NextResponse.json({ enrollments: rows });
  } catch (error) {
    console.error("Enrollment fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
