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
