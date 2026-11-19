-- =============================================================================
-- Migration: 20270602000000_store_app_client_magic_access.sql
-- Desacoplamento Waesy Pro vs Marketplace:
-- Tokens mágicos e códigos de acesso do cliente escopados por empresa (/app/:slug)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.store_app_client_tokens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  crm_customer_id       UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL,
  lead_id               UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  thread_id             UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  customer_name         TEXT,
  customer_phone        TEXT,
  customer_phone_digits TEXT,
  customer_document     TEXT,
  customer_email        TEXT,
  client_code           TEXT NOT NULL,
  magic_token           TEXT NOT NULL UNIQUE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '90 days'),
  last_accessed_at      TIMESTAMPTZ,
  access_count          INTEGER NOT NULL DEFAULT 0,
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_app_client_tokens_store_code
  ON public.store_app_client_tokens (store_id, client_code)
  WHERE is_active = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_app_client_tokens_store_phone
  ON public.store_app_client_tokens (store_id, customer_phone_digits)
  WHERE customer_phone_digits IS NOT NULL AND is_active = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_app_client_tokens_store_customer
  ON public.store_app_client_tokens (store_id, customer_id)
  WHERE customer_id IS NOT NULL AND is_active = true AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_store_app_client_tokens_store_lead
  ON public.store_app_client_tokens (store_id, lead_id)
  WHERE lead_id IS NOT NULL AND is_active = true AND revoked_at IS NULL;

ALTER TABLE public.store_app_client_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_app_client_tokens_staff_all" ON public.store_app_client_tokens;
CREATE POLICY "store_app_client_tokens_staff_all"
  ON public.store_app_client_tokens
  FOR ALL
  USING (public.is_platform_admin() OR public.is_store_staff(store_id))
  WITH CHECK (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "store_app_client_tokens_service_all" ON public.store_app_client_tokens;
CREATE POLICY "store_app_client_tokens_service_all"
  ON public.store_app_client_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.store_app_client_tokens FROM anon;

COMMIT;
