-- Migration: 20261006000001_whatsapp_credential_secret_encryption.sql
-- Objetivo: impedir que access tokens e App Secrets do WhatsApp fiquem em JSONB
-- legível no banco, mantendo phone_number_id pesquisável para roteamento webhook.

ALTER TABLE public.integration_credentials
  ADD COLUMN IF NOT EXISTS public_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS secret_payload_encrypted TEXT;

COMMENT ON COLUMN public.integration_credentials.public_metadata IS
  'Metadados não secretos para lookup/diagnóstico. Nunca armazenar tokens, App Secrets ou verify tokens.';

COMMENT ON COLUMN public.integration_credentials.secret_payload_encrypted IS
  'Payload JSON cifrado pelo Waesy AES-256-GCM. A chave fica somente em VAULT_MASTER_KEY.';

CREATE INDEX IF NOT EXISTS idx_integration_credentials_whatsapp_phone
  ON public.integration_credentials ((public_metadata->>'phone_number_id'))
  WHERE provider = 'whatsapp_cloud_api' AND is_active = true;
