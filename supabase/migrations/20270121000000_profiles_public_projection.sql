-- Waesy security hardening: public profile projection
-- Public clients must never read the profiles base table, which contains
-- civil, contact, financial and authorization fields.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING ((SELECT auth.uid()) = id OR public.is_platform_admin());

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  full_name,
  username,
  avatar_url,
  cover_url,
  bio,
  occupation,
  city,
  state,
  instagram,
  website,
  is_verified,
  profile_type,
  badges,
  featured_banner_url,
  featured_banner_link,
  created_at
FROM public.profiles;

ALTER VIEW public.profiles_public SET (security_invoker = true);

REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

COMMIT;
