// All About Pawz Academy — demo seed (married to the real lms.* schema).
//
// The seed's original job was to bootstrap demo courses, enrollments, a
// school-day schedule, gradebook entries, and meetings the first time a
// learner loaded the classroom. The enterprise schema now ships with the
// demo course catalog pre-seeded (15 published courses in lms.courses) and
// exactly one active demo enrollment (the seeded auth user
// allaboutpawz901@gmail.com → lms.enrollments).
//
// This rewritten seed is a thin idempotent verifier: it ensures the demo
// learner has at least one active enrollment. If the pre-seeded enrollment
// already exists (the normal case), this is a fast no-op. The school
// snapshot, schedule, grades, and meetings are synthesized on read by
// getSchoolSnapshot from the real enrollment — no persisted demo rows are
// needed for those anymore.
//
// Called on every /api/identity GET. Never throws.

import { pgQuery, pgExec } from "./pg";

const TENANT_ID = process.env.SUPABASE_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";

// Demo learner UUID — kept in sync with src/lib/db.ts.
const DEMO_LEARNER_UUID = "7ea0339e-d79d-477e-adc5-66b6b417525d";

// The seeded demo course (Animal Care Assistant) — its UUID is stable across
// reseeds because the catalog seed uses a fixed id.
const ACA_COURSE_ID = "dca55606-11e6-431d-9837-deda6427103b";
const ACA_COURSE_VERSION_ID = "a2ea02c4-f65d-43fa-b04d-be320490e24e";

export async function ensureDemoSeed(ownerId: string): Promise<void> {
  void ownerId; // tenant + learner scoped, not visitor ownerId
  try {
    // 1. Verify the demo course exists in lms.courses. If not, log and bail —
    //    the catalog seed runs out-of-band (SQL migration) and we don't
    //    want to silently recreate it from JS.
    const courseRows = await pgQuery<{ id: string }>(
      `SELECT id FROM lms.courses WHERE tenant_id = $1 AND id = $2::uuid`,
      [TENANT_ID, ACA_COURSE_ID],
    );
    if (courseRows.length === 0) {
      console.warn("[seed] demo course not found — run the catalog seed SQL migration.");
      return;
    }

    // 2. Ensure the demo enrollment exists. Idempotent: if an active
    //    enrollment already exists, do nothing.
    const enrRows = await pgQuery<{ id: string }>(
      `SELECT id FROM lms.enrollments
       WHERE learner_user_id = $1 AND course_id = $2 AND status = 'active'
       LIMIT 1`,
      [DEMO_LEARNER_UUID, ACA_COURSE_ID],
    );
    if (enrRows.length > 0) return; // already enrolled

    // 3. Create the enrollment (first-time only).
    await pgExec(
      `INSERT INTO lms.enrollments
         (id, tenant_id, learner_user_id, course_id, course_version_id,
          delivery_mode, status, enrolled_at, progress_percentage,
          is_minor, pinned_version_locked, metadata)
       VALUES (gen_random_uuid(), $1, $2, $3, $4,
               'self_paced', 'active', now(), 0.00,
               false, false, $5::jsonb)`,
      [
        TENANT_ID,
        DEMO_LEARNER_UUID,
        ACA_COURSE_ID,
        ACA_COURSE_VERSION_ID,
        JSON.stringify({ pathwayCode: "ACA", demoEnrollment: true }),
      ],
    );
    console.log("[seed] created demo enrollment for learner", DEMO_LEARNER_UUID);
  } catch (e) {
    // Never throw — /api/identity must always return 200.
    console.error("[seed] ensureDemoSeed failed:", e instanceof Error ? e.message : String(e));
  }
}
