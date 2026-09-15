-- ============================================================================
-- Waesy Platform: External Jobs Mining, Sourcing & Content Pipeline Expansion
-- Migration: 20261026000000_jobs_external_mining_and_quality.sql
-- ============================================================================

-- 1. Expandir public.mining_content_type com 'empregos' se ainda não existir
DO $$ BEGIN
  ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS 'empregos';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Expandir public.jobs com campos para Vagas Externas & Fontes Oficiais
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_external BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_url TEXT,
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS application_mode TEXT NOT NULL DEFAULT 'internal'
    CHECK (application_mode IN ('internal', 'external_link', 'whatsapp', 'email'));

-- Índices de performance para consultas públicas e de mineração
CREATE INDEX IF NOT EXISTS idx_jobs_external_status 
  ON public.jobs(is_external, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_external_id 
  ON public.jobs(external_id) WHERE external_id IS NOT NULL;

-- 3. Vincular public.mined_raw_extractions com vagas curadas
ALTER TABLE public.mined_raw_extractions
  ADD COLUMN IF NOT EXISTS curated_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mined_raw_curated_job 
  ON public.mined_raw_extractions(curated_job_id) WHERE curated_job_id IS NOT NULL;
