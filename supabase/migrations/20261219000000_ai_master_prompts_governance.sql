-- 20261219000000_ai_master_prompts_governance.sql
-- Prompt 26: Biblioteca de Prompts Master (Governança, Versionamento Semântico e Fallback em Cascata)

-- 1. Ampliar ai_master_prompts com versionamento semântico, validação de variáveis e governança multi-tenant
ALTER TABLE public.ai_master_prompts
  ADD COLUMN IF NOT EXISTS version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'operations',
  ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_providers JSONB NOT NULL DEFAULT '["gemini", "groq", "openai"]'::jsonb,
  ADD COLUMN IF NOT EXISTS max_tokens INT DEFAULT 2048,
  ADD COLUMN IF NOT EXISTS visual_reference_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS success_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failure_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_master_prompts_slug ON public.ai_master_prompts(slug);
CREATE INDEX IF NOT EXISTS idx_master_prompts_store ON public.ai_master_prompts(store_id);
CREATE INDEX IF NOT EXISTS idx_master_prompts_category ON public.ai_master_prompts(category);
CREATE INDEX IF NOT EXISTS idx_master_prompts_active ON public.ai_master_prompts(is_active);

-- 2. Tabela de Histórico de Versões do Prompt Master (SemVer com Diff e Rollback)
CREATE TABLE IF NOT EXISTS public.ai_master_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.ai_master_prompts(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  system_instruction TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  variables_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_provider TEXT NOT NULL,
  target_model TEXT NOT NULL,
  temperature NUMERIC(3,2) NOT NULL,
  max_tokens INT DEFAULT 2048,
  change_summary TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_prompt_version UNIQUE (prompt_id, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt ON public.ai_master_prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created ON public.ai_master_prompt_versions(created_at DESC);

-- 3. Tabela de Logs de Execução e Resolução de Prompts (Auditoria e Telemetria)
CREATE TABLE IF NOT EXISTS public.ai_prompt_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  prompt_slug TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  resolved_tier TEXT NOT NULL CHECK (resolved_tier IN ('tenant', 'system', 'builtin')),
  provider_used TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_exec_slug ON public.ai_prompt_execution_logs(prompt_slug);
CREATE INDEX IF NOT EXISTS idx_prompt_exec_store ON public.ai_prompt_execution_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_prompt_exec_tier ON public.ai_prompt_execution_logs(resolved_tier);
CREATE INDEX IF NOT EXISTS idx_prompt_exec_created ON public.ai_prompt_execution_logs(created_at DESC);

-- 4. RLS Deny-by-Default em tabelas novas e atualizadas
ALTER TABLE public.ai_master_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_master_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_execution_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Leitura de Prompts: Globais do sistema ou da própria loja
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_master_prompts' AND policyname = 'ai_master_prompts_select_policy'
  ) THEN
    CREATE POLICY ai_master_prompts_select_policy ON public.ai_master_prompts
      FOR SELECT
      TO authenticated
      USING (
        store_id IS NULL OR
        public.is_store_staff(store_id)
      );
  END IF;

  -- Escrita de Prompts: Apenas time autorizado da loja para prompts do tenant, ou admin
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_master_prompts' AND policyname = 'ai_master_prompts_write_policy'
  ) THEN
    CREATE POLICY ai_master_prompts_write_policy ON public.ai_master_prompts
      FOR ALL
      TO authenticated
      USING (
        store_id IS NOT NULL AND
        public.is_store_staff(store_id)
      )
      WITH CHECK (
        store_id IS NOT NULL AND
        public.is_store_staff(store_id)
      );
  END IF;

  -- Leitura de Versões
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_master_prompt_versions' AND policyname = 'ai_master_prompt_versions_select'
  ) THEN
    CREATE POLICY ai_master_prompt_versions_select ON public.ai_master_prompt_versions
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.ai_master_prompts p
          WHERE p.id = prompt_id
          AND (
            p.store_id IS NULL OR
            public.is_store_staff(p.store_id)
          )
        )
      );
  END IF;

  -- Leitura de Logs de Execução
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_prompt_execution_logs' AND policyname = 'ai_prompt_execution_logs_select'
  ) THEN
    CREATE POLICY ai_prompt_execution_logs_select ON public.ai_prompt_execution_logs
      FOR SELECT
      TO authenticated
      USING (
        store_id IS NULL OR
        public.is_store_staff(store_id)
      );
  END IF;
END $$;
