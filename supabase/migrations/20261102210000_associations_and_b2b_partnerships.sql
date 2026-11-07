-- ==============================================================================
-- MIGRATION: 20261102210000_associations_and_b2b_partnerships.sql
-- Description:
--   1. Criação da tabela store_association_memberships para gestão de empresas
--      associadas a organizações, associações comerciais, ONGs e sindicatos.
--   2. Criação da tabela association_b2b_transactions para metrificação de negócios
--      gerados entre associados (transações diretas via checkout e indiretas offline).
--   3. Índices de performance e políticas RLS completas (deny-by-default).
-- ==============================================================================

-- 1. TABELA DE MEMBRO / AFILIAÇÃO A ASSOCIAÇÕES E ORGANIZAÇÕES
CREATE TABLE IF NOT EXISTS public.store_association_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  member_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0.00 AND discount_percent <= 100.00),
  entity_default_discount_accepted BOOLEAN NOT NULL DEFAULT true,
  custom_benefit_description TEXT,
  requested_by TEXT NOT NULL DEFAULT 'member' CHECK (requested_by IN ('member', 'entity')),
  notes TEXT,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_entity_member_store UNIQUE (entity_store_id, member_store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_assoc_entity ON public.store_association_memberships (entity_store_id, status);
CREATE INDEX IF NOT EXISTS idx_store_assoc_member ON public.store_association_memberships (member_store_id, status);
CREATE INDEX IF NOT EXISTS idx_store_assoc_status ON public.store_association_memberships (status);

ALTER TABLE public.store_association_memberships ENABLE ROW LEVEL SECURITY;

-- Leitura pública de associações aprovadas (para exibição na vitrine da entidade e nos cards)
CREATE POLICY "store_association_memberships_public_read"
  ON public.store_association_memberships FOR SELECT
  USING (status = 'approved');

-- Gestão pelos operadores da entidade promotora ou da loja associada
CREATE POLICY "store_association_memberships_participant_all"
  ON public.store_association_memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.profile_id = auth.uid()
        AND (wm.store_id = entity_store_id OR wm.store_id = member_store_id)
    )
  );

-- 2. TABELA DE TRANSAÇÕES E MÉTRICAS DE NEGÓCIOS GERADOS (DIRETAS E INDIRETAS/OFFLINE)
CREATE TABLE IF NOT EXISTS public.association_b2b_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  seller_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  buyer_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  buyer_document TEXT,
  buyer_name TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL DEFAULT 'direct' CHECK (transaction_type IN ('direct', 'indirect_offline')),
  gross_amount_cents BIGINT NOT NULL CHECK (gross_amount_cents >= 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_percent >= 0.00 AND discount_percent <= 100.00),
  discount_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount_cents >= 0),
  net_amount_cents BIGINT NOT NULL CHECK (net_amount_cents >= 0),
  notes TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assoc_b2b_entity_date ON public.association_b2b_transactions (entity_store_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_assoc_b2b_seller ON public.association_b2b_transactions (seller_store_id);
CREATE INDEX IF NOT EXISTS idx_assoc_b2b_buyer ON public.association_b2b_transactions (buyer_store_id);

ALTER TABLE public.association_b2b_transactions ENABLE ROW LEVEL SECURITY;

-- Leitura das transações pelos gestores da entidade ou das lojas participantes
CREATE POLICY "association_b2b_transactions_participant_read"
  ON public.association_b2b_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.profile_id = auth.uid()
        AND (wm.store_id = entity_store_id OR wm.store_id = seller_store_id OR wm.store_id = buyer_store_id)
    )
  );

-- Inserção permitida para a loja vendedora ou para a entidade
CREATE POLICY "association_b2b_transactions_insert"
  ON public.association_b2b_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.profile_id = auth.uid()
        AND (wm.store_id = entity_store_id OR wm.store_id = seller_store_id)
    )
  );
