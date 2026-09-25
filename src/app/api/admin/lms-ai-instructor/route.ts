import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-ai-instructor
// Returns the AI instructor configuration surface:
//   - personas:        lms.ai_instructor_personas LEFT JOIN courses
//                      (course title for persona-scoped courses)
//   - promptTemplates: lms.ai_prompt_templates (system + user prompt templates)
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const personas = await pgQuery<{
      id: string;
      name: string;
      display_name: string;
      voice_profile: string | null;
      tone_default: string;
      avatar_url: string | null;
      is_co_instructor: boolean | null;
      is_active: boolean | null;
      course_id: string | null;
      course_title: string | null;
      created_at: string;
    }>(
      `SELECT
         p.id,
         p.name,
         p.display_name,
         p.voice_profile,
         p.tone_default,
         p.avatar_url,
         p.is_co_instructor,
         p.is_active,
         p.course_id,
         c.title AS course_title,
         p.created_at
       FROM lms.ai_instructor_personas p
       LEFT JOIN lms.courses c ON c.id = p.course_id
       ORDER BY p.is_active DESC, p.created_at DESC
       LIMIT 200`,
    );

    const promptTemplates = await pgQuery<{
      id: string;
      template_name: string;
      template_category: string;
      system_prompt: string;
      user_prompt_template: string;
      model_config_id: string | null;
      is_active: boolean | null;
      created_at: string;
    }>(
      `SELECT
         t.id,
         t.template_name,
         t.template_category,
         t.system_prompt,
         t.user_prompt_template,
         t.model_config_id::text,
         t.is_active,
         t.created_at
       FROM lms.ai_prompt_templates t
       ORDER BY t.is_active DESC, t.template_name ASC
       LIMIT 200`,
    );

    return NextResponse.json({ personas, promptTemplates });
  } catch (error) {
    console.error("AI instructor config fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
