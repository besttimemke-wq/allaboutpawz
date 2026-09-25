import { NextResponse } from "next/server";
import { pgQuery } from "@/lib/pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/lms-skills
// Returns the credentials + skills surface area:
//   - skills:          lms.skills (registry)
//   - skillSignoffs:   lms.skill_signoffs JOIN skills + learner_profiles
//   - credentials:     lms.credentials JOIN learner_profiles
//   - badges:           lms.badges
// Each dataset may be empty (0 rows) — that is expected, not an error.
export async function GET() {
  try {
    const skills = await pgQuery<{
      id: string;
      skill_domain_id: string;
      name: string;
      slug: string;
      is_core: boolean | null;
      created_at: string;
    }>(
      `SELECT s.id, s.skill_domain_id, s.name, s.slug, s.is_core, s.created_at
       FROM lms.skills s
       ORDER BY s.name ASC
       LIMIT 200`,
    );

    const skillSignoffs = await pgQuery<{
      id: string;
      learner_user_id: string;
      learner_name: string | null;
      skill_id: string;
      skill_name: string | null;
      course_id: string | null;
      signoff_level: string;
      signoff_method: string;
      verified_at: string | null;
      evidence_url: string | null;
      notes: string | null;
    }>(
      `SELECT
         ss.id,
         ss.learner_user_id,
         lp.preferred_name AS learner_name,
         ss.skill_id,
         s.name AS skill_name,
         ss.course_id,
         ss.signoff_level,
         ss.signoff_method,
         ss.verified_at,
         ss.evidence_url,
         ss.notes
       FROM lms.skill_signoffs ss
       LEFT JOIN lms.skills s ON s.id = ss.skill_id
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = ss.learner_user_id
       ORDER BY ss.verified_at DESC NULLS LAST
       LIMIT 200`,
    );

    const credentials = await pgQuery<{
      id: string;
      learner_user_id: string;
      learner_name: string | null;
      course_id: string | null;
      credential_type: string;
      title: string;
      issuer_name: string | null;
      issue_date: string | null;
      expiry_date: string | null;
      verification_code: string;
      revoked_at: string | null;
      certificate_url: string | null;
    }>(
      `SELECT
         cr.id,
         cr.learner_user_id,
         lp.preferred_name AS learner_name,
         cr.course_id,
         cr.credential_type,
         cr.title,
         cr.issuer_name,
         cr.issue_date::text,
         cr.expiry_date::text,
         cr.verification_code,
         cr.revoked_at,
         cr.certificate_url
       FROM lms.credentials cr
       LEFT JOIN lms.learner_profiles lp ON lp.user_id = cr.learner_user_id
       ORDER BY cr.issue_date DESC NULLS LAST, cr.created_at DESC
       LIMIT 200`,
    );

    const badges = await pgQuery<{
      id: string;
      name: string;
      slug: string;
      badge_type: string;
      points_value: number | null;
      is_active: boolean | null;
      created_at: string;
    }>(
      `SELECT b.id, b.name, b.slug, b.badge_type, b.points_value, b.is_active, b.created_at
       FROM lms.badges b
       ORDER BY b.name ASC
       LIMIT 200`,
    );

    return NextResponse.json({ skills, skillSignoffs, credentials, badges });
  } catch (error) {
    console.error("Skills registry fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 },
    );
  }
}
