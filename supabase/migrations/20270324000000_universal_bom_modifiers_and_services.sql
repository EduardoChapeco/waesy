-- =============================================================================
-- MIGRATION: 20270324000000_universal_bom_modifiers_and_services.sql
-- Motor Universal de Composição Recursiva (BOM), Sabores/Modificadores,
-- Fator de Conversão de Compras, Pausa Automática por Gargalo e Serviços Compostos
-- =============================================================================

-- 1. Fator de conversão e unidade de compra em insumos (ex: Caixa c/ 12 un -> 12, Saco 25kg -> 25000g)
ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS purchase_unit text,
  ADD COLUMN IF NOT EXISTS conversion_factor numeric(12,4) NOT NULL DEFAULT 1;

-- 2. Suporte a insumos diretos, serviços compostos e flag de gargalo primário em product_recipes
ALTER TABLE public.product_recipes
  ADD COLUMN IF NOT EXISTS booking_service_id uuid REFERENCES public.booking_services(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS supply_id uuid REFERENCES public.supplies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un',
  ADD COLUMN IF NOT EXISTS is_primary_gargalo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS modifier_option_label text;

ALTER TABLE public.product_recipes
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN recipe_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_recipes_booking_service_id
  ON public.product_recipes(booking_service_id)
  WHERE booking_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_recipes_supply_id
  ON public.product_recipes(supply_id)
  WHERE supply_id IS NOT NULL;

-- 3. Vínculo direto de receitas e insumos em option_values (Sabores, Adicionais, Bordas, Toppings)
ALTER TABLE public.option_values
  ADD COLUMN IF NOT EXISTS supply_id uuid REFERENCES public.supplies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consume_quantity numeric(12,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS consume_unit text NOT NULL DEFAULT 'un';

-- 4. Suporte a insumos universais (supplies) e sub-receitas/kits (recipes) em service_consumed_materials
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'service_consumed_materials'
  ) THEN
    ALTER TABLE public.service_consumed_materials
      ADD COLUMN IF NOT EXISTS supply_id uuid REFERENCES public.supplies(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'un',
      ADD COLUMN IF NOT EXISTS cost_cents integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_primary_gargalo boolean NOT NULL DEFAULT true;

    ALTER TABLE public.service_consumed_materials
      ALTER COLUMN product_id DROP NOT NULL;
  END IF;
END $$;
