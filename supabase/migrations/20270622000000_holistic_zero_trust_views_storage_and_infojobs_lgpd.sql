-- =============================================================================
-- MIGRATION: 20270622000000_holistic_zero_trust_views_storage_and_infojobs_lgpd.sql
-- OBJETIVO:
-- 1. Eixo 2 (Zero-Trust Views): Impor security_invoker = true em views sensíveis
--    (public.ai_conversations, public.classified_listings, public.v_customer_phones)
--    para impedir bypass de RLS das tabelas base.
-- 2. Eixo 2 (Storage RLS): Restringir inserção em buckets institucionais/admin
--    (cms-media, banners, home-banners, home-categories) apenas a platform_admin
--    ou membros ativos de staff, mantendo upload civil apenas nos buckets de usuário.
-- 3. Eixo 6 (InfoJobs LGPD & Anonimato Real): Adicionar colunas de consentimento
--    explícito LGPD em public.employer_reviews e restringir leitura direta anônima
--    para somente reviews com status = 'published', criando view pública
--    public.v_public_employer_reviews que mascara user_id quando is_anonymous = true.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SECURITY INVOKER EM VIEWS SENSÍVEIS
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.ai_conversations') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.ai_conversations SET (security_invoker = true)';
  END IF;

  IF to_regclass('public.classified_listings') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.classified_listings SET (security_invoker = true)';
  END IF;

  IF to_regclass('public.v_customer_phones') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.v_customer_phones SET (security_invoker = true)';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. HARDENING DE STORAGE BUCKETS (SEPARAÇÃO ADMIN/LOJA VS CIVIL)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "media_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_authenticated_insert_civil_and_tenant" ON storage.objects;

CREATE POLICY "media_authenticated_insert_civil_and_tenant"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- Buckets civis/gerais autenticados
      bucket_id IN (
        'store-assets',
        'product-images',
        'classified-images',
        'social-media',
        'avatars',
        'stories',
        'chat-attachments',
        'documents',
        'contracts',
        'proposals',
        'tourism-media',
        'Fiscal_Certificates',
        'resumes'
      )
      OR (
        -- Buckets institucionais e de vitrine master exigem staff de loja ou platform_admin
        bucket_id IN ('cms-media', 'banners', 'home-banners', 'home-categories')
        AND (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('platform_admin', 'master', 'admin_master', 'superadmin')
          )
          OR EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.profile_id = auth.uid()
              AND wm.role IN ('owner', 'admin', 'manager', 'content')
          )
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. INFOJOBS & EMPLOYER REVIEWS — LGPD CONSENT & PROTEÇÃO DE IDENTIDADE ANÔNIMA
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.employer_reviews
  ADD COLUMN IF NOT EXISTS consent_lgpd_accepted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reason_for_leaving TEXT;

ALTER TABLE IF EXISTS public.employer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employer_reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employer_reviews_public_read" ON public.employer_reviews;
DROP POLICY IF EXISTS "employer_reviews_authenticated_read_own_or_published" ON public.employer_reviews;

-- Apenas o próprio autor ou platform_admin lê a linha bruta com user_id;
-- leituras públicas de avaliações publicadas passam pela BFF ou pela view mascarada.
CREATE POLICY "employer_reviews_authenticated_read_own_or_published"
  ON public.employer_reviews
  FOR SELECT
  USING (
    status = 'published'
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master', 'admin_master', 'superadmin')
    )
  );

CREATE OR REPLACE VIEW public.v_public_employer_reviews
WITH (security_invoker = false)
AS
SELECT
  er.id,
  er.store_id,
  er.company_name,
  CASE WHEN er.is_anonymous THEN NULL ELSE er.user_id END AS author_user_id,
  er.employment_status,
  er.job_title,
  er.department,
  er.work_period,
  er.rating_overall,
  er.rating_culture,
  er.rating_compensation,
  er.rating_leadership,
  er.rating_work_life,
  er.rating_career,
  er.recommends_company,
  er.approves_leadership,
  er.title,
  er.pros,
  er.cons,
  er.advice_to_management,
  er.is_anonymous,
  er.is_verified_employee,
  er.created_at
FROM public.employer_reviews er
WHERE er.status = 'published';

GRANT SELECT ON public.v_public_employer_reviews TO anon, authenticated;

COMMIT;
