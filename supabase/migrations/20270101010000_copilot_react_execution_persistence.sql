-- Execuções ReAct do Copilot e passos individualmente retomáveis.
-- Complementa copilot_activity_steps (telemetria agregada) sem duplicá-la.

CREATE TABLE IF NOT EXISTS public.copilot_executions (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  task_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('queued','running','paused','completed','failed_retryable','failed_final','cancelled')),
  current_phase TEXT,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  resume_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(task_id)
);

CREATE TABLE IF NOT EXISTS public.copilot_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.copilot_executions(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  step_id TEXT NOT NULL,
  agent TEXT,
  step_type TEXT NOT NULL,
  label TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued','running','completed','failed','cancelled','paused')),
  fsm_phase TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  tokens_used INTEGER,
  cost_usd NUMERIC(12,6),
  observation JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_call JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  UNIQUE(execution_id, sequence_no),
  UNIQUE(execution_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_copilot_executions_thread_updated ON public.copilot_executions(thread_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_executions_store_updated ON public.copilot_executions(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_executions_resumable ON public.copilot_executions(status, updated_at DESC) WHERE status IN ('running','paused','failed_retryable');
CREATE INDEX IF NOT EXISTS idx_copilot_execution_steps_execution ON public.copilot_execution_steps(execution_id, sequence_no);

ALTER TABLE public.copilot_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_execution_steps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.copilot_executions, public.copilot_execution_steps FROM anon, authenticated;
GRANT SELECT ON public.copilot_executions, public.copilot_execution_steps TO authenticated;
GRANT ALL ON public.copilot_executions, public.copilot_execution_steps TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'copilot_executions' AND policyname = 'copilot_executions_select_own') THEN
    CREATE POLICY copilot_executions_select_own ON public.copilot_executions FOR SELECT TO authenticated USING (
      user_id = (SELECT auth.uid()) OR store_id = ANY(auth_user_store_ids()) OR is_platform_admin()
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'copilot_execution_steps' AND policyname = 'copilot_execution_steps_select_own') THEN
    CREATE POLICY copilot_execution_steps_select_own ON public.copilot_execution_steps FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.copilot_executions e WHERE e.id = execution_id)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.copilot_executions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.copilot_execution_steps; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

COMMENT ON TABLE public.copilot_executions IS 'Estado retomável de cada execução do Copilot/ReAct.';
COMMENT ON TABLE public.copilot_execution_steps IS 'Log individual e realtime de cada ação/observação do ReAct.';
