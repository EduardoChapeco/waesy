-- Consolidated historical migration: duplicate version timestamp resolved.
-- Original SQL blocks are preserved in their previous lexical order.

-- ============================================================================
-- BEGIN 20270106000000_campaign_scheduling_and_auto_archive.sql
-- ============================================================================

-- Migration: 20270106000000_campaign_scheduling_and_auto_archive.sql
-- Adiciona suporte canônico a agendamento temporal e auto-arquivamento de campanhas CMS

ALTER TABLE IF EXISTS hotpages
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE IF EXISTS marketplace_sections
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_archive_at TIMESTAMPTZ DEFAULT NULL;

-- Índices parciais para consulta performática de itens de campanha ativos
CREATE INDEX IF NOT EXISTS idx_hotpages_campaign_schedule
  ON hotpages(is_active, starts_at, ends_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_marketplace_sections_campaign_schedule
  ON marketplace_sections(is_active, starts_at, ends_at)
  WHERE is_active = true;


-- END 20270106000000_campaign_scheduling_and_auto_archive.sql
-- ============================================================================

-- ============================================================================
-- BEGIN 20270106000000_live_p0_security_hardening.sql
-- ============================================================================

-- Waesy live P0 hardening: secrets, storage privacy and prohibited icon invariant.
-- This migration is intentionally fail-closed and does not fabricate existing data.

-- API keys in tenant_ai_providers are encrypted by the BFF with AES-256-GCM.
-- The column remains TEXT for backwards-compatible rollout; legacy plaintext rows
-- must be rotated before their provider is used.
COMMENT ON COLUMN public.tenant_ai_providers.api_key IS
  'AES-256-GCM payload managed only by the server BFF; legacy plaintext rows require rotation before use.';

-- Public catalog data must never persist the prohibited visual token.
DO $$
BEGIN
  IF to_regclass('public.ai_skills') IS NOT NULL THEN
    UPDATE public.ai_skills SET icon = 'Brain' WHERE icon ILIKE 'sparkles';
    ALTER TABLE public.ai_skills ALTER COLUMN icon SET DEFAULT 'Brain';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.ai_skills'::regclass AND conname = 'ai_skills_icon_no_sparkles'
    ) THEN
      ALTER TABLE public.ai_skills ADD CONSTRAINT ai_skills_icon_no_sparkles
        CHECK (lower(icon) <> 'sparkles');
    END IF;
  END IF;
END $$;

-- Existing CMS rows are corrected without inventing a semantic icon.
DO $$
BEGIN
  IF to_regclass('public.hotpages') IS NOT NULL THEN
    UPDATE public.hotpages SET icon_name = 'Storefront' WHERE lower(icon_name) = 'sparkles';
  END IF;
  IF to_regclass('public.squad_templates') IS NOT NULL THEN
    UPDATE public.squad_templates SET icon_name = 'UsersThree' WHERE lower(icon_name) = 'sparkles';
  END IF;
END $$;

-- Sensitive buckets are private-by-default. Existing objects remain addressable
-- only through signed URLs after the BFF authorization checks.
UPDATE storage.buckets
SET public = false
WHERE id IN ('classifieds', 'classified-media', 'legal-documents', 'receipts', 'identity-vault', 'payment-proofs', 'rma-proofs');


-- END 20270106000000_live_p0_security_hardening.sql
-- ============================================================================
