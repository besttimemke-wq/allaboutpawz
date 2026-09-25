import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-curriculum
// Direct mapping to the lms.courses schema, joined to lms.pathways for the
// pathway name. Returns all published + unpublished courses for admin
// management.
export async function GET() {
  try {
    const rows = await pgQuery<{
      id: string;
      code: string | null;
      title: string;
      slug: string;
      category: string | null;
      difficulty_level: string | null;
      is_published: boolean;
      total_clock_hours: string | null;
      total_estimated_hours: string | null;
      course_type: string;
      program_level: number | null;
      state_board_approved: boolean;
      pathway_name: string | null;
      created_at: string;
    }>(
      `SELECT
         c.id, c.code, c.title, c.slug, c.category, c.difficulty_level,
         c.is_published, c.total_clock_hours::text, c.total_estimated_hours::text,
         c.course_type, c.program_level, c.state_board_approved,
         p.name AS pathway_name,
         c.created_at
       FROM lms.courses c
       LEFT JOIN lms.pathways p ON p.id = c.pathway_id
       ORDER BY c.is_published DESC, c.sort_order ASC NULLS LAST, c.title ASC
       LIMIT 200`,
    );

    return NextResponse.json({ courses: rows });
  } catch (error) {
    console.error("Curriculum fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
