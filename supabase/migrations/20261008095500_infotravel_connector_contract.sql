-- InfoTravel connector contract
-- A credencial pertence à loja/agência e o payload secreto deve ser AES-256-GCM.
ALTER TABLE public.integration_credentials
  ALTER COLUMN provider TYPE TEXT USING provider::text,
  ADD COLUMN IF NOT EXISTS public_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS token_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS secret_payload_encrypted TEXT;

COMMENT ON COLUMN public.integration_credentials.secret_payload_encrypted IS
  'Payload JSON InfoTravel cifrado com AES-256-GCM; a chave fica somente em VAULT_MASTER_KEY.';

CREATE INDEX IF NOT EXISTS idx_integration_credentials_infotravel_active
  ON public.integration_credentials (store_id, provider, updated_at DESC)
  WHERE provider = 'infotravel' AND is_active = true;

CREATE TABLE IF NOT EXISTS public.integration_connector_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'error')),
  error_code TEXT,
  provider_status INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_connector_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integration_connector_events_staff_read ON public.integration_connector_events;
CREATE POLICY integration_connector_events_staff_read
  ON public.integration_connector_events FOR SELECT TO authenticated
  USING (public.is_store_staff(store_id));

CREATE INDEX IF NOT EXISTS idx_integration_connector_events_store_created
  ON public.integration_connector_events (store_id, created_at DESC);
