-- ============================================================================
-- MIGRATION: 20261119000000_oauth_nexus_and_gmb_sync.sql
-- DESCRIÇÃO: OAuth Nexus, Gestão Segura de Tokens com Refresh, e Sincronização GMB
-- AUTOR: Chief Integration Officer & Especialista em Segurança OAuth2
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.oauth_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_my_business', 'meta_ads', 'tiktok_ads', 'google_calendar', 'stripe_connect', 'govbr_signature')),
  account_id TEXT, -- ID Externo (ex: GMB Location ID, Meta Ad Account ID, WABA ID)
  account_name TEXT, -- Nome amigável retornado pela API da plataforma
  access_token TEXT NOT NULL, -- Token de acesso (encriptado pelo backend)
  refresh_token TEXT, -- Token de renovação perpétuo/de longa duração
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ, -- Data de expiração do access_token atual
  scopes TEXT[] DEFAULT '{}', -- Escopos OAuth autorizados pelo consentimento
  metadata JSONB DEFAULT '{}'::jsonb, -- Dados adicionais (perfil, avatars, horários brutos, etc.)
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'error', 'expired')),
  sync_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_oauth_integrations_store_provider UNIQUE (store_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_oauth_integrations_store_id ON public.oauth_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_oauth_integrations_provider ON public.oauth_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_integrations_status ON public.oauth_integrations(sync_status);

-- RLS: Isolamento Absoluto Multi-Tenant
ALTER TABLE public.oauth_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_integrations_staff_select"
  ON public.oauth_integrations FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.workspace_members
      WHERE profile_id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "oauth_integrations_staff_all"
  ON public.oauth_integrations FOR ALL
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

-- Service role bypass para rotas de Webhook e Workers
CREATE POLICY "oauth_integrations_service_role"
  ON public.oauth_integrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Gatilho de Updated At
CREATE OR REPLACE FUNCTION public.handle_oauth_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_oauth_integrations_updated_at ON public.oauth_integrations;
CREATE TRIGGER trg_oauth_integrations_updated_at
  BEFORE UPDATE ON public.oauth_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_oauth_integrations_updated_at();

-- Colunas de metadados GMB em stores para Truthful Public View
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'gmb_location_id') THEN
    ALTER TABLE public.stores ADD COLUMN gmb_location_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'gmb_place_id') THEN
    ALTER TABLE public.stores ADD COLUMN gmb_place_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'google_rating') THEN
    ALTER TABLE public.stores ADD COLUMN google_rating NUMERIC(2,1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'google_review_count') THEN
    ALTER TABLE public.stores ADD COLUMN google_review_count INTEGER DEFAULT 0;
  END IF;
END $$;
