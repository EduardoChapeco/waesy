-- ============================================================================
-- Waesy Platform: Mining Schema Harmonization & Canonical Foreign Keys
-- Migration: 20261116000000_mining_canonical_foreign_keys.sql
-- Single Source of Truth: Links mined_raw_extractions to Canonical Modules
-- ============================================================================

-- 1. Expansão dos Enums de Conteúdo de Mineração
DO $$ BEGIN
  ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS 'empresas';
  ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS 'processos';
  ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS 'receitas';
  ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS 'empregos';
  ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS 'produtos';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Chaves Estrangeiras Canônicas em mined_raw_extractions
ALTER TABLE public.mined_raw_extractions
  ADD COLUMN IF NOT EXISTS curated_directory_id UUID REFERENCES public.directory_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS curated_lawsuit_id UUID REFERENCES public.mined_lawsuits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS curated_product_id UUID REFERENCES public.mined_products(id) ON DELETE SET NULL;

-- 3. Índices de Alta Performance para Rastreabilidade Reversa
CREATE INDEX IF NOT EXISTS idx_mined_raw_directory 
  ON public.mined_raw_extractions(curated_directory_id) 
  WHERE curated_directory_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mined_raw_lawsuit 
  ON public.mined_raw_extractions(curated_lawsuit_id) 
  WHERE curated_lawsuit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mined_raw_product 
  ON public.mined_raw_extractions(curated_product_id) 
  WHERE curated_product_id IS NOT NULL;
