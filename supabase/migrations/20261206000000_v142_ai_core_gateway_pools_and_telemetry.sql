-- ============================================================
-- Migration: v142 - AI Core Gateway, Pool Resilience & Granular Telemetry
-- Núcleo de IA da Plataforma Waesy (Prompt 02)
-- Aditivo, Idempotente e Compatível com Schemas Existentes
-- ============================================================

-- 1. Estender a tabela api_key_pools com suporte a Circuit Breaker e Rotação Fina
ALTER TABLE IF EXISTS public.api_key_pools
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS circuit_state TEXT NOT NULL DEFAULT 'closed',
  ADD COLUMN IF NOT EXISTS consecutive_failures INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circuit_broken_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS window_request_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_requests_served BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_api_key_pools_circuit_lookup
  ON public.api_key_pools(provider, status, circuit_state, priority ASC);

-- 2. Tabela de Telemetria de IA Granular por Chamada (FinOps & Observabilidade)
CREATE TABLE IF NOT EXISTS public.ai_telemetry_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  task TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT 'core_gateway',
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id UUID,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_version TEXT DEFAULT 'v1.0',
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  latency_ms INT NOT NULL DEFAULT 0,
  attempts_count INT NOT NULL DEFAULT 1,
  fallback_used BOOLEAN NOT NULL DEFAULT false,
  fallback_from TEXT,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'fallback_recovered', 'error', 'blocked'
  error_code TEXT,
  error_message TEXT,
  request_fingerprint TEXT,
  cache_hit BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_telemetry_created_at ON public.ai_telemetry_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_task ON public.ai_telemetry_logs(task, status);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_store_user ON public.ai_telemetry_logs(store_id, user_id);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_fingerprint ON public.ai_telemetry_logs(request_fingerprint);

-- 3. Tabela de Cache Inteligente de Respostas por Impressão Digital (SHA-256)
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT UNIQUE NOT NULL,
  task TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  response_payload JSONB NOT NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  hit_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_lookup ON public.ai_response_cache(fingerprint_hash, expires_at);

-- 4. Tabela de Regras Dinâmicas de Roteamento por Tarefa
CREATE TABLE IF NOT EXISTS public.ai_task_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT UNIQUE NOT NULL,
  preferred_provider TEXT NOT NULL,
  preferred_model TEXT NOT NULL,
  fallback_cascade JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_quality_score NUMERIC(3,2) NOT NULL DEFAULT 0.80,
  cost_tier TEXT NOT NULL DEFAULT 'cheap_first', -- 'cheap_first', 'quality_first', 'fast_first'
  default_max_tokens INT NOT NULL DEFAULT 1024,
  timeout_ms INT NOT NULL DEFAULT 15000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed das regras canônicas de roteamento
INSERT INTO public.ai_task_routing_rules (task, preferred_provider, preferred_model, fallback_cascade, cost_tier, default_max_tokens, timeout_ms)
VALUES
  ('chat', 'groq', 'llama-3.3-70b-versatile', '[{"provider":"gemini","model":"gemini-1.5-flash"},{"provider":"openrouter","model":"google/gemma-2-9b-it:free"}]'::jsonb, 'cheap_first', 2048, 12000),
  ('resumo', 'groq', 'llama-3.1-8b-instant', '[{"provider":"gemini","model":"gemini-1.5-flash"},{"provider":"openai","model":"gpt-4o-mini"}]'::jsonb, 'cheap_first', 1024, 8000),
  ('classificacao', 'groq', 'llama-3.1-8b-instant', '[{"provider":"gemini","model":"gemini-1.5-flash"},{"provider":"openai","model":"gpt-4o-mini"}]'::jsonb, 'cheap_first', 512, 6000),
  ('extracao', 'gemini', 'gemini-1.5-flash', '[{"provider":"groq","model":"llama-3.3-70b-versatile"},{"provider":"openai","model":"gpt-4o-mini"}]'::jsonb, 'quality_first', 2048, 15000),
  ('geracao_texto', 'groq', 'llama-3.3-70b-versatile', '[{"provider":"gemini","model":"gemini-1.5-flash"},{"provider":"openrouter","model":"meta-llama/llama-3.1-70b-instruct:free"}]'::jsonb, 'cheap_first', 3000, 20000),
  ('ocr', 'gemini', 'gemini-1.5-flash', '[{"provider":"openai","model":"gpt-4o-mini"},{"provider":"anthropic","model":"claude-3-haiku-20240307"}]'::jsonb, 'quality_first', 4096, 25000),
  ('codigo', 'gemini', 'gemini-1.5-pro', '[{"provider":"groq","model":"llama-3.3-70b-versatile"},{"provider":"openai","model":"gpt-4o"}]'::jsonb, 'quality_first', 4096, 30000),
  ('embedding', 'gemini', 'text-embedding-004', '[{"provider":"openai","model":"text-embedding-3-small"}]'::jsonb, 'cheap_first', 2048, 5000),
  ('imagem', 'openai', 'dall-e-3', '[{"provider":"openrouter","model":"recraft-ai/recraft-v3"}]'::jsonb, 'quality_first', 1024, 45000),
  ('video', 'openrouter', 'luma/dream-machine', '[]'::jsonb, 'quality_first', 1024, 90000)
ON CONFLICT (task) DO UPDATE SET
  preferred_provider = EXCLUDED.preferred_provider,
  preferred_model = EXCLUDED.preferred_model,
  fallback_cascade = EXCLUDED.fallback_cascade,
  updated_at = now();

-- 5. Tabela de Jobs Assíncronos de IA (Imagem, Vídeo, Documentos Longos)
CREATE TABLE IF NOT EXISTS public.ai_async_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id UUID,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed', 'cancelled'
  payload JSONB NOT NULL,
  result JSONB,
  error_message TEXT,
  progress_percent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_async_jobs_status ON public.ai_async_jobs(status, created_at ASC);

-- 6. Habilitar RLS e Políticas Seguras
ALTER TABLE public.ai_telemetry_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_async_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin visualiza telemetria de IA"
  ON public.ai_telemetry_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'platform_admin', 'owner')
    )
  );

CREATE POLICY "Admin gerencia regras de roteamento"
  ON public.ai_task_routing_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'platform_admin', 'owner')
    )
  );

CREATE POLICY "Usuário gerencia seus próprios jobs assíncronos"
  ON public.ai_async_jobs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
