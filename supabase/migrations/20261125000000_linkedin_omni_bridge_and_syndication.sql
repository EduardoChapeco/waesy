-- ============================================================================
-- MIGRATION: 20261125000000_linkedin_omni_bridge_and_syndication.sql
-- DESCRIÇÃO: LinkedIn Omni-Bridge, Root Credentials Vault, Candidate Parsing & B2B Syndication
-- AUTOR: Chief API Integrations Officer & B2B Monetization Lead (Waesy)
-- ============================================================================

-- 1. Tabela Master de Credenciais do App LinkedIn (Criptografia AES-256-GCM Server-Side)
CREATE TABLE IF NOT EXISTS public.linkedin_master_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  client_secret_masked TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  default_company_id TEXT,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email', 'w_member_social', 'w_organization_social'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_master_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linkedin_credentials_master_admin_all"
  ON public.linkedin_master_credentials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('platform_admin', 'master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('platform_admin', 'master')
    )
  );

CREATE POLICY "linkedin_credentials_service_role"
  ON public.linkedin_master_credentials FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Atualizar CHECK constraint de provider em oauth_integrations
DO $$
BEGIN
  ALTER TABLE public.oauth_integrations DROP CONSTRAINT IF EXISTS oauth_integrations_provider_check;
  ALTER TABLE public.oauth_integrations ADD CONSTRAINT oauth_integrations_provider_check 
    CHECK (provider IN ('google_my_business', 'meta_ads', 'tiktok_ads', 'google_calendar', 'stripe_connect', 'govbr_signature', 'linkedin', 'linkedin_company'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Tabela de Sindicação B2B de Vagas (LinkedIn Jobs Syndication)
CREATE TABLE IF NOT EXISTS public.linkedin_job_syndications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  linkedin_job_urn TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'retrying')),
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,
  tracking_url TEXT,
  last_error TEXT,
  error_log JSONB DEFAULT '[]'::jsonb,
  payload_snapshot JSONB DEFAULT '{}'::jsonb,
  last_attempt_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linkedin_syndications_store_job ON public.linkedin_job_syndications(store_id, job_id);
CREATE INDEX IF NOT EXISTS idx_linkedin_syndications_status ON public.linkedin_job_syndications(status);

ALTER TABLE public.linkedin_job_syndications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "linkedin_syndications_staff_select"
  ON public.linkedin_job_syndications FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.workspace_members
      WHERE profile_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "linkedin_syndications_staff_all"
  ON public.linkedin_job_syndications FOR ALL
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.workspace_members
      WHERE profile_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.workspace_members
      WHERE profile_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "linkedin_syndications_service_role"
  ON public.linkedin_job_syndications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Extensão de Colunas na Tabela jobs para Sindicação
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'syndicate_to_linkedin') THEN
    ALTER TABLE public.jobs ADD COLUMN syndicate_to_linkedin BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'linkedin_published_urn') THEN
    ALTER TABLE public.jobs ADD COLUMN linkedin_published_urn TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'linkedin_sync_status') THEN
    ALTER TABLE public.jobs ADD COLUMN linkedin_sync_status TEXT NOT NULL DEFAULT 'none' CHECK (linkedin_sync_status IN ('none', 'pending', 'published', 'failed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'linkedin_tracking_code') THEN
    ALTER TABLE public.jobs ADD COLUMN linkedin_tracking_code TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'linkedin_last_error') THEN
    ALTER TABLE public.jobs ADD COLUMN linkedin_last_error TEXT;
  END IF;
END $$;

-- 5. Extensão de Coluna subscription_plan na Tabela stores para o Paywall B2B
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subscription_plan') THEN
    ALTER TABLE public.stores ADD COLUMN subscription_plan TEXT NOT NULL DEFAULT 'FREE' CHECK (subscription_plan IN ('FREE', 'PRO', 'ENTERPRISE'));
  END IF;
END $$;
