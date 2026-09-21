-- ==============================================================================
-- Migration: 20261025000000_multi_niche_dynamic_checkout_and_order_metadata.sql
-- Description: Suporte canônico para Dynamic Checkout Multi-Nicho:
--              - orders: notes, custom_fields, cpf_on_receipt, substitution_policy, receiver_info, checkout_niche_metadata
--              - order_items: notes
-- ==============================================================================

-- 1. Expansão na Tabela orders (Notas, Custom Fields, CPF, Substituição, Recebedor e Metadados do Nicho)
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cpf_on_receipt JSONB DEFAULT '{"requested": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS substitution_policy TEXT DEFAULT 'similar',
  ADD COLUMN IF NOT EXISTS receiver_info JSONB DEFAULT '{"mode": "self"}'::jsonb,
  ADD COLUMN IF NOT EXISTS checkout_niche_metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Expansão na Tabela order_items (Observações específicas por item / prato / produto)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Índices parciais e documentação de metadados
CREATE INDEX IF NOT EXISTS orders_substitution_policy_idx 
  ON public.orders (substitution_policy) 
  WHERE substitution_policy IS NOT NULL;
