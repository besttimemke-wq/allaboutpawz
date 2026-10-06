-- ============================================================================
-- 0016 — Shot-record upload support on dogs (new-customer vaccination docs)
-- ============================================================================
-- OWNER REQUEST: "there is no way for a user to upload their shot records
-- if they are a new user." The booking wizard (step 3 — YOUR DOG) now lets
-- ANY visitor attach vaccination-record photos (rabies certificate, distemper,
-- bordetella…) plus an optional notes line. Photos land in the existing
-- cms-media Supabase Storage bucket (same as pet photos); URLs + notes are
-- stored on the dogs row the wizard creates/updates.
--
-- Idempotent — safe to run any number of times.
-- ============================================================================

BEGIN;

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS "vaccinationPhotoUrls" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS "vaccinationNotes" text;

COMMENT ON COLUMN public.dogs."vaccinationPhotoUrls"
  IS 'Public URLs of vaccination-record photos (cms-media bucket), newest last. Set from the booking wizard step 3.';

COMMENT ON COLUMN public.dogs."vaccinationNotes"
  IS 'Optional note from the owner about vaccination status (e.g. vet, due dates).';

COMMIT;

-- ----------------------------------------------------------------------------
-- Verify: SELECT "name", "vaccinationPhotoUrls", "vaccinationNotes" FROM public.dogs LIMIT 5;
-- ----------------------------------------------------------------------------
