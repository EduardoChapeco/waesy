-- Migration 20270126000000_travel_and_copilot_specs_completion.sql
-- Covers SPEC-MASTER-TRAVEL and SPEC-MASTER-COPILOT completions:
-- 1. travel_price_history table for price telemetry & fluctuation tracking
-- 2. global_hotels rating score & review count columns
-- 3. copilot_executions and copilot_execution_steps subagent DAG fields (parent_task_id, role)

BEGIN;

-- 1. Travel Price History
CREATE TABLE IF NOT EXISTS public.travel_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  price_cents BIGINT NOT NULL,
  days_to_departure INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_price_history_pkg_date
  ON public.travel_price_history (package_id, snapshot_date DESC);

ALTER TABLE public.travel_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_price_history_public_read ON public.travel_price_history;
CREATE POLICY travel_price_history_public_read ON public.travel_price_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS travel_price_history_staff_insert ON public.travel_price_history;
CREATE POLICY travel_price_history_staff_insert ON public.travel_price_history
  FOR INSERT TO authenticated
  WITH CHECK (true);

GRANT SELECT, INSERT ON public.travel_price_history TO authenticated;
GRANT ALL ON public.travel_price_history TO service_role;

-- 2. Global Hotels Aggregated Scores
ALTER TABLE public.global_hotels
  ADD COLUMN IF NOT EXISTS hotel_score NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS destination_score NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_service_score NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- 3. Copilot Subagent DAG fields
ALTER TABLE public.copilot_executions
  ADD COLUMN IF NOT EXISTS parent_task_id TEXT;

ALTER TABLE public.copilot_execution_steps
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS parent_task_id TEXT;

-- 4. Classifieds and Travel Packages Unlisted Visibility & Access Token
ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'unlisted', 'archived')),
  ADD COLUMN IF NOT EXISTS access_token TEXT;

CREATE INDEX IF NOT EXISTS idx_classifieds_visibility_status
  ON public.classifieds (visibility, status);

CREATE INDEX IF NOT EXISTS idx_classifieds_access_token
  ON public.classifieds (access_token) WHERE access_token IS NOT NULL;

COMMIT;
