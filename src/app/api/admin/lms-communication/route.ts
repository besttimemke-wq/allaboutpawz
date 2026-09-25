import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-communication
// Returns the communications surface:
//   - announcements: lms.announcements LEFT JOIN courses (course title)
//   - notifications: lms.notification_queue LEFT JOIN learner_profiles
//                    (recipient name on user_id)
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const announcements = await pgQuery<{
      id: string;
      title: string;
      body: string | null;
      author_type: string;
      audience_scope: string;
      course_id: string | null;
      course_title: string | null;
      cohort_id: string | null;
      is_published: boolean | null;
      published_at: string | null;
      sticky_until: string | null;
      created_at: string;
    }>(
      `SELECT
         a.id,
         a.title,
         a.body,
         a.author_type,
         a.audience_scope,
         a.course_id,
         c.title AS course_title,
         a.cohort_id,
         a.is_published,
         a.published_at,
         a.sticky_until,
         a.created_at
       FROM lms.announcements a
       LEFT JOIN lms.courses c ON c.id = a.course_id
       ORDER BY a.created_at DESC
       LIMIT 200`,
    );

    const notifications = await pgQuery<{
      id: string;
      user_id: string;
      recipient_name: string | null;
      notification_type: string;
      channel: string;
      subject: string | null;
      status: string;
      priority: string;
      scheduled_for: string | null;
      sent_at: string | null;
      retry_count: number | null;
      error_message: string | null;
      created_at: string;
    }>(
      `SELECT
         n.id,
         n.user_id,
         lp.preferred_name AS recipient_name,
         n.notification_type,
         n.channel,
         n.subject,
         n.status,
         n.priority,
         n.scheduled_for,
         n.sent_at,
         n.retry_count,
         n.error_message,
         n.created_at
       FROM lms.notification_queue n
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = n.user_id
       ORDER BY n.created_at DESC
       LIMIT 200`,
    );

    return NextResponse.json({ announcements, notifications });
  } catch (error) {
    console.error("Communications fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
