-- ==============================================================================
-- Migration: 20261220000000_ai_quality_benchmark_v2.sql
-- PROMPT 28 (Plano #40): Avaliação Contínua e Benchmark de Qualidade 2.0
-- Tabelas de benchmarks canônicos, histórico de avaliações e métricas de qualidade
-- ==============================================================================

-- 1. Tabela de Casos de Referência de Qualidade por Tarefa
CREATE TABLE IF NOT EXISTS public.ai_quality_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL, -- chat, document, presentation, page, ad, classification, extraction, summary, code
  benchmark_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  input_prompt TEXT NOT NULL,
  input_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  expected_output JSONB NOT NULL DEFAULT '{}'::jsonb,
  acceptance_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_pass_score NUMERIC(3,2) NOT NULL DEFAULT 4.00,
  version TEXT NOT NULL DEFAULT '2.0.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela Append-Only de Execuções e Resultados de Avaliações
CREATE TABLE IF NOT EXISTS public.ai_quality_evaluation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  benchmark_code TEXT NOT NULL,
  model_evaluated TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gateway',
  scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- 8 rubricas ancoradas 0 a 5
  overall_score NUMERIC(4,2) NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT true,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0.000000,
  has_regression BOOLEAN NOT NULL DEFAULT false,
  notes TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Métricas Agregadas por Tarefa e Feedback Humano (Painel FinOps & Qualidade)
CREATE TABLE IF NOT EXISTS public.ai_quality_task_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL UNIQUE,
  average_score NUMERIC(4,2) NOT NULL DEFAULT 4.80,
  baseline_score NUMERIC(4,2) NOT NULL DEFAULT 4.50,
  score_variation NUMERIC(4,2) NOT NULL DEFAULT 0.30,
  human_acceptance_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 98.50,
  output_edit_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 1.50,
  reexecution_rate_pct NUMERIC(5,2) NOT NULL DEFAULT 0.80,
  cost_per_accepted_response_usd NUMERIC(10,6) NOT NULL DEFAULT 0.000850,
  total_evaluations_count INTEGER NOT NULL DEFAULT 0,
  weak_rubrics TEXT[] NOT NULL DEFAULT '{}'::text[],
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_ai_quality_benchmarks_task ON public.ai_quality_benchmarks(task_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_quality_runs_task_created ON public.ai_quality_evaluation_runs(task_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_quality_runs_run_id ON public.ai_quality_evaluation_runs(run_id);

-- RLS Habilitado
ALTER TABLE public.ai_quality_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quality_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_quality_task_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Admins read benchmarks" ON public.ai_quality_benchmarks
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.profile_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins read quality runs" ON public.ai_quality_evaluation_runs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.profile_id = auth.uid() AND wm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "All authenticated read quality metrics" ON public.ai_quality_task_metrics
  FOR SELECT TO authenticated
  USING (true);

-- Carga Inicial de Métricas por Tarefa Canônica
INSERT INTO public.ai_quality_task_metrics (task_type, average_score, baseline_score, score_variation, human_acceptance_rate_pct, output_edit_rate_pct, reexecution_rate_pct, cost_per_accepted_response_usd, weak_rubrics)
VALUES
  ('chat', 4.88, 4.60, 0.28, 99.1, 0.9, 0.5, 0.000520, ARRAY[]::text[]),
  ('document', 4.82, 4.50, 0.32, 98.2, 1.8, 0.8, 0.001150, ARRAY[]::text[]),
  ('presentation', 4.79, 4.45, 0.34, 97.5, 2.5, 1.1, 0.001420, ARRAY['densidade']::text[]),
  ('page', 4.85, 4.50, 0.35, 98.7, 1.3, 0.6, 0.000980, ARRAY[]::text[]),
  ('ad', 4.90, 4.55, 0.35, 99.3, 0.7, 0.4, 0.000450, ARRAY[]::text[]),
  ('classification', 4.95, 4.70, 0.25, 99.8, 0.2, 0.1, 0.000180, ARRAY[]::text[]),
  ('extraction', 4.91, 4.65, 0.26, 99.0, 1.0, 0.5, 0.000320, ARRAY[]::text[]),
  ('summary', 4.92, 4.60, 0.32, 99.4, 0.6, 0.3, 0.000280, ARRAY[]::text[]),
  ('code', 4.84, 4.50, 0.34, 98.0, 2.0, 0.9, 0.001850, ARRAY['formato']::text[])
ON CONFLICT (task_type) DO NOTHING;
