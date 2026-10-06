-- ============================================================================
-- Onda 3: registry de operadoras, adapters documentais e runs idempotentes
-- ============================================================================

ALTER TABLE public.travel_document_ingestions
  ADD COLUMN IF NOT EXISTS operator_code TEXT,
  ADD COLUMN IF NOT EXISTS normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS sync_run_id UUID;

CREATE TABLE IF NOT EXISTS public.travel_operator_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.travel_suppliers(id) ON DELETE SET NULL,
  provider_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  adapter_kind TEXT NOT NULL DEFAULT 'document',
  adapter_version TEXT NOT NULL DEFAULT 'travel-operator-v1',
  capabilities JSONB NOT NULL DEFAULT '{"quote": true, "reservation": true, "receipt": true, "voucher": true}'::jsonb,
  config_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_sync_at TIMESTAMPTZ,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider_code)
);

CREATE TABLE IF NOT EXISTS public.travel_operator_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.travel_operator_integrations(id) ON DELETE SET NULL,
  source_ingestion_id UUID NOT NULL REFERENCES public.travel_document_ingestions(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL,
  operator_code TEXT NOT NULL,
  adapter_version TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'review_required', 'ready', 'applied', 'failed')),
  normalized_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (store_id, idempotency_key),
  UNIQUE (store_id, source_ingestion_id)
);

ALTER TABLE public.travel_operator_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_operator_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_operator_integrations_staff_all" ON public.travel_operator_integrations;
CREATE POLICY "travel_operator_integrations_staff_all"
  ON public.travel_operator_integrations FOR ALL TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));

DROP POLICY IF EXISTS "travel_operator_sync_runs_staff_all" ON public.travel_operator_sync_runs;
CREATE POLICY "travel_operator_sync_runs_staff_all"
  ON public.travel_operator_sync_runs FOR ALL TO authenticated
  USING (is_store_staff(store_id))
  WITH CHECK (is_store_staff(store_id));

CREATE INDEX IF NOT EXISTS idx_operator_integrations_store_status
  ON public.travel_operator_integrations(store_id, status, provider_code);
CREATE INDEX IF NOT EXISTS idx_operator_sync_runs_store_status
  ON public.travel_operator_sync_runs(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_sync_runs_ingestion
  ON public.travel_operator_sync_runs(store_id, source_ingestion_id);

-- O sync é disparado pelo BFF com service_role, nunca por PostgREST público.
REVOKE ALL ON public.travel_operator_integrations FROM anon;
REVOKE ALL ON public.travel_operator_sync_runs FROM anon;
