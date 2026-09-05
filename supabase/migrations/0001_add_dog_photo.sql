-- ============================================================================
-- All About Pawz — Add pet photo column to dogs table
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query → paste →
-- Run). Adds a "photoUrl" column to the dogs table so customer-uploaded pet
-- photos can be associated with each dog profile and displayed on the
-- customer dashboard, booking wizard, and admin customer 360 view.
-- ============================================================================

alter table public.dogs
  add column if not exists "photoUrl" text;

-- Backfill nulls so the column is selectable in PostgREST immediately
comment on column public.dogs."photoUrl" is 'Public URL of the pet photo stored in the cms-media Supabase Storage bucket';
