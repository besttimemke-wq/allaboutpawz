-- ============================================================================
-- All About Pawz LMS — Patch 001
-- Run AFTER Leashed_io_LMS_Schema.sql
-- Idempotent. Safe to re-run. Touches nothing that is still an open decision —
-- see leashed_lms_schema_audit_v1.md for what's deliberately NOT in this patch.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Fix 1: lms.pathway_courses.course_id has no foreign key.
-- A duplicate CREATE TABLE further down the source file (never applied, since
-- CREATE TABLE IF NOT EXISTS no-ops on a name collision) did add this FK, but
-- that block was silently discarded. Adding it here instead of editing the
-- original CREATE TABLE, so this patch is reviewable as a clean diff.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pathway_courses_course_fk'
          AND conrelid = 'lms.pathway_courses'::regclass
    ) THEN
        ALTER TABLE lms.pathway_courses
            ADD CONSTRAINT pathway_courses_course_fk
            FOREIGN KEY (tenant_id, course_id)
            REFERENCES lms.courses(tenant_id, id) ON DELETE CASCADE;
        RAISE NOTICE '[patch 001] added pathway_courses.course_id FK';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Fix 2: gamification display is adaptive per learner, not one mode for
-- everyone. Learner's own explicit choice always outranks an AI suggestion.
-- Default is 'adaptive' so existing rows keep today's behavior until the
-- personalization logic actually starts writing to this.
-- ----------------------------------------------------------------------------
ALTER TABLE lms.personalization_state
    ADD COLUMN IF NOT EXISTS gamification_display_mode text NOT NULL DEFAULT 'adaptive'
        CHECK (gamification_display_mode IN ('competitive','personal_progress','minimal','adaptive')),
    ADD COLUMN IF NOT EXISTS gamification_mode_source text NOT NULL DEFAULT 'default'
        CHECK (gamification_mode_source IN ('learner_set','ai_suggested','default'));

COMMENT ON COLUMN lms.personalization_state.gamification_display_mode IS
'competitive = leaderboards/rankings visible; personal_progress = badges/points/streaks only, no ranking; minimal = off; adaptive = personalization engine decides from sentiment signals. Never overrides an explicit learner_set value.';

COMMIT;
