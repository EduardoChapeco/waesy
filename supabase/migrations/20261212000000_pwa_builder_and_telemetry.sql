-- ---------------------------------------------------------------------------
-- Migration: 20261212000000_pwa_builder_and_telemetry.sql
-- Master Prompt V145: The Omni-PWA Whitelabel Builder, Native Telemetry & App Metamorphosis
-- ---------------------------------------------------------------------------

-- 1. Criação da tabela pwa_telemetry para rastreamento determinístico de instalações e aberturas
CREATE TABLE IF NOT EXISTS public.pwa_telemetry (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('prompt_shown', 'prompt_accepted', 'prompt_dismissed', 'installed', 'app_opened')),
  platform    TEXT NOT NULL DEFAULT 'unknown',
  user_agent  TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de alta performance para agregações e dashboards
CREATE INDEX IF NOT EXISTS idx_pwa_telemetry_store_created 
  ON public.pwa_telemetry(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pwa_telemetry_store_event 
  ON public.pwa_telemetry(store_id, event_type);

-- Habilitar RLS
ALTER TABLE public.pwa_telemetry ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS staff_read_pwa_telemetry ON public.pwa_telemetry;
CREATE POLICY staff_read_pwa_telemetry ON public.pwa_telemetry
  FOR SELECT
  USING (public.is_store_staff(store_id));

DROP POLICY IF EXISTS public_insert_pwa_telemetry ON public.pwa_telemetry;
CREATE POLICY public_insert_pwa_telemetry ON public.pwa_telemetry
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stores s WHERE s.id = store_id
    )
  );

-- 2. Garantir coluna settings com valor padrão estruturado em store_pwa_configs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'store_pwa_configs' 
      AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.store_pwa_configs 
      ADD COLUMN settings JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
