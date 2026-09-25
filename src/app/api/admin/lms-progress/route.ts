import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-progress
// Returns lesson_progress joined to enrollments + courses for human-readable
// context, plus module_progress rows for module-level completion.
// Both tables may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const lessonProgress = await pgQuery<{
      id: string;
      learner_user_id: string;
      learner_name: string | null;
      enrollment_id: string;
      lesson_id: string;
      course_id: string | null;
      course_title: string | null;
      status: string;
      progress_percentage: string | null;
      time_spent_seconds: number | null;
      started_at: string | null;
      completed_at: string | null;
      last_accessed_at: string | null;
    }>(
      `SELECT
         lp.id,
         lp.learner_user_id,
         lprof.preferred_name AS learner_name,
         lp.enrollment_id,
         lp.lesson_id,
         e.course_id,
         c.title AS course_title,
         lp.status,
         lp.progress_percentage::text,
         lp.time_spent_seconds,
         lp.started_at,
         lp.completed_at,
         lp.last_accessed_at
       FROM lms.lesson_progress lp
       LEFT JOIN lms.enrollments e ON e.id = lp.enrollment_id
       LEFT JOIN lms.courses c ON c.id = e.course_id
       LEFT JOIN lms.learner_profiles lprof ON lprof.user_id = lp.learner_user_id
       ORDER BY lp.last_accessed_at DESC NULLS LAST
       LIMIT 200`,
    );

    const moduleProgress = await pgQuery<{
      id: string;
      learner_user_id: string;
      enrollment_id: string;
      module_id: string;
      status: string;
      lessons_total: number | null;
      lessons_completed: number | null;
      progress_percentage: string | null;
      last_accessed_at: string | null;
    }>(
      `SELECT
         mp.id,
         mp.learner_user_id,
         mp.enrollment_id,
         mp.module_id,
         mp.status,
         mp.lessons_total,
         mp.lessons_completed,
         mp.progress_percentage::text,
         mp.last_accessed_at
       FROM lms.module_progress mp
       ORDER BY mp.last_accessed_at DESC NULLS LAST
       LIMIT 200`,
    );

    return NextResponse.json({ lessonProgress, moduleProgress });
  } catch (error) {
    console.error("Learner progress fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
