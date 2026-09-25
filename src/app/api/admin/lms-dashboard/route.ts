import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-dashboard
// Aggregate counts across the LMS schema for the admin overview panel.
// Returns { stats: { courses, enrollments, sessions, pathways, messages, ragChunks } }.
// Some counts may be 0 if a table is empty — that is expected, not an error.
export async function GET() {
  try {
    // Each count is a single-row SELECT. Run them sequentially (Pool max:1).
    const coursesRows = await pgQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM lms.courses`,
    );
    const enrollmentRows = await pgQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM lms.enrollments WHERE status = 'active'`,
    );
    const sessionRows = await pgQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM lms.ai_teaching_sessions`,
    );
    const pathwayRows = await pgQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM lms.pathways`,
    );
    const messageRows = await pgQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM lms.ai_tutor_messages`,
    );
    const ragRows = await pgQuery<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM lms.ai_rag_chunks`,
    );

    const toNum = (rows: { count: string }[]) =>
      rows && rows.length > 0 ? Number(rows[0].count) || 0 : 0;

    return NextResponse.json({
      stats: {
        courses: toNum(coursesRows),
        enrollments: toNum(enrollmentRows),
        sessions: toNum(sessionRows),
        pathways: toNum(pathwayRows),
        messages: toNum(messageRows),
        ragChunks: toNum(ragRows),
      },
    });
  } catch (error) {
    console.error("LMS dashboard fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
