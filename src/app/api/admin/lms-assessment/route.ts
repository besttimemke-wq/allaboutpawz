import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-assessment
// Returns three datasets covering the assessment surface area:
//   - submissions: artifact_submissions JOIN assignments JOIN enrollments JOIN courses
//   - gradeBook:    grade_book JOIN courses (course title)
//   - quizAttempts: quiz_attempts (raw + learner_user_id)
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const submissions = await pgQuery<{
      id: string;
      learner_user_id: string;
      learner_name: string | null;
      assignment_id: string;
      assignment_title: string | null;
      enrollment_id: string | null;
      course_id: string | null;
      course_title: string | null;
      status: string;
      submitted_at: string | null;
      is_late: boolean | null;
    }>(
      `SELECT
         s.id,
         s.learner_user_id,
         lp.preferred_name AS learner_name,
         s.assignment_id,
         a.title AS assignment_title,
         s.enrollment_id,
         e.course_id,
         c.title AS course_title,
         s.status,
         s.submitted_at,
         s.is_late
       FROM lms.artifact_submissions s
       LEFT JOIN lms.assignments a ON a.id = s.assignment_id
       LEFT JOIN lms.enrollments e ON e.id = s.enrollment_id
       LEFT JOIN lms.courses c ON c.id = e.course_id
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = s.learner_user_id
       ORDER BY s.submitted_at DESC NULLS LAST
       LIMIT 200`,
    );

    const gradeBook = await pgQuery<{
      id: string;
      learner_user_id: string;
      course_id: string;
      course_title: string | null;
      category: string;
      item_name: string;
      score: string | null;
      max_score: string | null;
      weight: string | null;
      is_ai_graded: boolean | null;
      is_released: boolean | null;
      created_at: string | null;
    }>(
      `SELECT
         g.id,
         g.learner_user_id,
         g.course_id,
         c.title AS course_title,
         g.category,
         g.item_name,
         g.score::text,
         g.max_score::text,
         g.weight::text,
         g.is_ai_graded,
         g.is_released,
         g.created_at
       FROM lms.grade_book g
       LEFT JOIN lms.courses c ON c.id = g.course_id
       ORDER BY g.created_at DESC NULLS LAST
       LIMIT 200`,
    );

    const quizAttempts = await pgQuery<{
      id: string;
      learner_user_id: string;
      quiz_id: string;
      enrollment_id: string | null;
      attempt_number: number | null;
      started_at: string | null;
      submitted_at: string | null;
      score: string | null;
      max_score: string | null;
      percentage: string | null;
      is_passed: boolean | null;
      status: string;
    }>(
      `SELECT
         q.id,
         q.learner_user_id,
         q.quiz_id,
         q.enrollment_id,
         q.attempt_number,
         q.started_at,
         q.submitted_at,
         q.score::text,
         q.max_score::text,
         q.percentage::text,
         q.is_passed,
         q.status
       FROM lms.quiz_attempts q
       ORDER BY q.started_at DESC NULLS LAST
       LIMIT 200`,
    );

    return NextResponse.json({ submissions, gradeBook, quizAttempts });
  } catch (error) {
    console.error("Assessment fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
