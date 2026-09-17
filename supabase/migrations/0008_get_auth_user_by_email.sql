-- 0008_get_auth_user_by_email.sql
-- ============================================================================
-- O(1) auth-user lookup by email for the Google OAuth callback.
--
-- The previous pawz-auth.findAuthUserByEmail paginated
-- admin.auth.admin.listUsers (200/page, 20-page cap = 4000 users max). Past
-- 4000 users it returns null even when the user exists, AND it is slow + rate-
-- limited on every sign-in. The result: a returning Supabase Auth user who
-- signed in with Google using the same email was NOT found, the callback
-- fell into the AUTO branch, and (not in ADMIN_EMAILS) was bounced to the
-- door with ?error=not_authorized — even though their account existed and
-- should have been linked.
--
-- This RPC queries auth.users directly by email. Security definer so the
-- service role (which already has full auth.admin access) can call it; the
-- function returns only the columns the callback needs, never the hashed
-- password. Returns null when no user matches (case-insensitive email).
-- ============================================================================

create or replace function public.get_auth_user_by_email(p_email text)
returns table (
  id uuid,
  email text,
  raw_user_meta_data jsonb,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select
    u.id,
    u.email,
    u.raw_user_meta_data,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  where lower(coalesce(u.email, '')) = lower(coalesce(p_email, ''))
  limit 1;
$$;

-- Service role already bypasses RLS, but be explicit so the function is
-- callable by the service-role client without surprises.
grant execute on function public.get_auth_user_by_email(text) to service_role;
grant execute on function public.get_auth_user_by_email(text) to authenticated;

-- ============================================================================
-- Index note: auth.users.email is already unique-indexed by GoTrue, so a
-- functional lower(email) index is optional. Attempting to create it via the
-- management API fails ("must be owner of table users") because the migration
-- runner is not the auth schema owner. If you have psql access as the postgres
-- superuser, the following will speed up case-insensitive lookups further:
--
--   create index if not exists auth_users_lower_email_idx
--     on auth.users (lower(email));
-- ============================================================================
