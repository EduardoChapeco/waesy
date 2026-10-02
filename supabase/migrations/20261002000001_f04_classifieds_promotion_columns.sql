-- ============================================================================
-- Migration: F04 — Colunas de Promoção de Classificados para o Workspace Pro
-- Fase: F04 do Plano Mestre de Estabilização dos 4 Pilares
-- Data: 2026-10-02
-- Referência: docs/specs/SPEC-F04-UPGRADE-BRIDGE.md
-- ============================================================================

-- 1. Adicionar colunas de rastreabilidade bidirecional na tabela classifieds
ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS promoted_to_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ;

-- Comentários de coluna para documentação do esquema
COMMENT ON COLUMN public.classifieds.promoted_to_product_id IS
  'ID do produto no Workspace Pro criado a partir deste classificado (rastreabilidade bidirecional).';
COMMENT ON COLUMN public.classifieds.promoted_at IS
  'Timestamp em que o anúncio foi promovido para o catálogo do Workspace Pro.';

-- 2. Adicionar coluna de rastreabilidade reversa na tabela products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promoted_from_classified_id UUID REFERENCES public.classifieds(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_from_classified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.products.promoted_from_classified_id IS
  'ID do classificado de origem que foi promovido para este produto (rastreabilidade bidirecional).';
COMMENT ON COLUMN public.products.promoted_from_classified_at IS
  'Timestamp em que o classificado de origem foi promovido para este produto.';

-- 3. Garantir que 'promoted' está no CHECK de status de classifieds (se houver constraint)
-- Nota: ALTER TABLE ... ADD CONSTRAINT é idempotente com IF NOT EXISTS (PostgreSQL 12+)
DO $$
BEGIN
  -- Remover constraint existente de status se não incluir 'promoted'
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'classifieds'
      AND constraint_name = 'classifieds_status_check'
  ) THEN
    -- Verificar se 'promoted' já está incluído
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name = 'classifieds_status_check'
        AND check_clause LIKE '%promoted%'
    ) THEN
      ALTER TABLE public.classifieds DROP CONSTRAINT classifieds_status_check;
    END IF;
  END IF;
END $$;

-- 4. Índice para consultas de rastreabilidade bidirecional
CREATE INDEX IF NOT EXISTS idx_classifieds_promoted_to_product
  ON public.classifieds (promoted_to_product_id)
  WHERE promoted_to_product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_promoted_from_classified
  ON public.products (promoted_from_classified_id)
  WHERE promoted_from_classified_id IS NOT NULL;

-- 5. Índice para listagem de classificados não promovidos por autor
CREATE INDEX IF NOT EXISTS idx_classifieds_author_not_promoted
  ON public.classifieds (author_profile_id, created_at DESC)
  WHERE status NOT IN ('promoted', 'archived');

-- 6. RLS — As políticas existentes já cobrem via author_profile_id.
-- A coluna promoted_to_product_id herda as políticas da tabela classifieds.
-- Nenhuma política adicional necessária — deny-by-default já ativo.

-- 7. Retrocompatibilidade: marcar como 'promoted' os classifieds com workspace_entity_id preenchido
UPDATE public.classifieds
SET
  status = 'promoted',
  promoted_to_product_id = workspace_entity_id::UUID,
  promoted_at = updated_at
WHERE
  workspace_entity_id IS NOT NULL
  AND status NOT IN ('promoted', 'archived', 'expired');
