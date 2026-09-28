-- Migration: 20261130000000_v125_omni_telemetry_and_persona.sql
-- Description: Omni-Telemetry, Unified Search History, Behavioral Telemetry Logs & AI Persona Brain.

BEGIN;

-- 1. Ensure user_behavior_events has civil_id and dwell_time_ms
ALTER TABLE IF EXISTS public.user_behavior_events
  ADD COLUMN IF NOT EXISTS civil_id UUID,
  ADD COLUMN IF NOT EXISTS dwell_time_ms INTEGER DEFAULT 0;

-- 2. Tabela de Histórico Unificado de Buscas (Search History & Zero-Result Discovery)
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  civil_id UUID,
  session_id TEXT NOT NULL DEFAULT 'anonymous',
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT 'geral',
  results_count INTEGER NOT NULL DEFAULT 0,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_session ON public.search_history(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON public.search_history(normalized_query, niche);
CREATE INDEX IF NOT EXISTS idx_search_history_zero_results ON public.search_history(results_count) WHERE results_count = 0;

-- 3. Tabela de Logs de Telemetria Invisível (Omni-Telemetry Logs)
CREATE TABLE IF NOT EXISTS public.telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL DEFAULT 'anonymous',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  civil_id UUID,
  event_type TEXT NOT NULL, -- 'pageview', 'dwell', 'search', 'click_cta', 'form_start', 'conversion'
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_masked TEXT,
  dwell_time_ms INTEGER DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_logs_session ON public.telemetry_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_user ON public.telemetry_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_path ON public.telemetry_logs(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_event_type ON public.telemetry_logs(event_type, created_at DESC);

-- 4. Persona Engine Relational Tables (Transplant from SimLab Persona Brain, adapted for Waesy E-Commerce & SDR)
CREATE TABLE IF NOT EXISTS public.ai_persona_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  persona_code TEXT NOT NULL DEFAULT 'shopper_general',
  persona_group TEXT NOT NULL DEFAULT 'consumer',
  intent_classification TEXT NOT NULL DEFAULT 'curious', -- 'curious', 'warm', 'ready_to_buy', 'bargain_hunter', 'vip'
  price_sensitivity TEXT NOT NULL DEFAULT 'balanced', -- 'budget', 'balanced', 'premium'
  top_niches JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
  avg_ticket_cents INTEGER NOT NULL DEFAULT 0,
  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  token_dense_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_persona_profiles_user ON public.ai_persona_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_persona_profiles_session ON public.ai_persona_profiles(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_persona_profiles_intent ON public.ai_persona_profiles(intent_classification);

-- 5. RLS Policies
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_persona_profiles ENABLE ROW LEVEL SECURITY;

-- search_history:
CREATE POLICY "Allow public insert to search_history"
  ON public.search_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own search history"
  ON public.search_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access search_history"
  ON public.search_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- telemetry_logs:
CREATE POLICY "Allow public insert to telemetry_logs"
  ON public.telemetry_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can read own telemetry logs"
  ON public.telemetry_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access telemetry_logs"
  ON public.telemetry_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ai_persona_profiles:
CREATE POLICY "Users can read own ai_persona_profile"
  ON public.ai_persona_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access ai_persona_profiles"
  ON public.ai_persona_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. RPC: Atomic Ingestion of Telemetry Batches (Anti-Jank Batch Processor)
CREATE OR REPLACE FUNCTION public.ingest_telemetry_batch(
  p_events JSONB,
  p_searches JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_events_inserted INTEGER := 0;
  v_searches_inserted INTEGER := 0;
BEGIN
  -- 1. Inserir logs de telemetria
  IF p_events IS NOT NULL AND jsonb_array_length(p_events) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_events)
    LOOP
      INSERT INTO public.telemetry_logs (
        session_id,
        user_id,
        civil_id,
        event_type,
        path,
        referrer,
        user_agent,
        ip_masked,
        dwell_time_ms,
        metadata,
        created_at
      ) VALUES (
        COALESCE(v_item->>'session_id', 'anonymous'),
        NULLIF(v_item->>'user_id', '')::UUID,
        NULLIF(v_item->>'civil_id', '')::UUID,
        COALESCE(v_item->>'event_type', 'unknown'),
        COALESCE(v_item->>'path', '/'),
        v_item->>'referrer',
        v_item->>'user_agent',
        v_item->>'ip_masked',
        COALESCE((v_item->>'dwell_time_ms')::INTEGER, 0),
        COALESCE(v_item->'metadata', '{}'::jsonb),
        COALESCE(NULLIF(v_item->>'created_at', '')::TIMESTAMPTZ, NOW())
      );
      v_events_inserted := v_events_inserted + 1;
    END LOOP;
  END IF;

  -- 2. Inserir pesquisas
  IF p_searches IS NOT NULL AND jsonb_array_length(p_searches) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_searches)
    LOOP
      INSERT INTO public.search_history (
        user_id,
        civil_id,
        session_id,
        query,
        normalized_query,
        niche,
        results_count,
        filters,
        created_at
      ) VALUES (
        NULLIF(v_item->>'user_id', '')::UUID,
        NULLIF(v_item->>'civil_id', '')::UUID,
        COALESCE(v_item->>'session_id', 'anonymous'),
        COALESCE(v_item->>'query', ''),
        LOWER(TRIM(COALESCE(v_item->>'query', ''))),
        COALESCE(v_item->>'niche', 'geral'),
        COALESCE((v_item->>'results_count')::INTEGER, 0),
        COALESCE(v_item->'filters', '{}'::jsonb),
        COALESCE(NULLIF(v_item->>'created_at', '')::TIMESTAMPTZ, NOW())
      );
      v_searches_inserted := v_searches_inserted + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'events_inserted', v_events_inserted,
    'searches_inserted', v_searches_inserted
  );
END;
$$;

COMMIT;
