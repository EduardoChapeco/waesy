-- =============================================================================
-- MIGRATION: 20270325000000_universal_multi_nicho_bom_and_service_kits.sql
-- ECOSSISTEMA WAESY: BOM UNIVERSAL MULTI-NICHO, KITS DE PROCEDIMENTO & INSUMOS
-- =============================================================================

-- 1. Extensões em public.supplies (Fator de Conversão e Nicho)
ALTER TABLE public.supplies
  ADD COLUMN IF NOT EXISTS niche TEXT NOT NULL DEFAULT 'gastronomy',
  ADD COLUMN IF NOT EXISTS purchase_unit TEXT,
  ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC(10, 4) NOT NULL DEFAULT 1.0;

CREATE INDEX IF NOT EXISTS idx_supplies_store_niche ON public.supplies(store_id, niche);

-- 2. Extensões em public.recipes (Nicho, Tempo e Modo de Preparo)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS niche TEXT NOT NULL DEFAULT 'gastronomy',
  ADD COLUMN IF NOT EXISTS prep_time_minutes INT NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS instructions TEXT;

CREATE INDEX IF NOT EXISTS idx_recipes_store_niche ON public.recipes(store_id, niche);

-- 3. Extensões em public.product_recipes (Vínculo com Serviços e Insumos Diretos)
ALTER TABLE public.product_recipes
  ADD COLUMN IF NOT EXISTS service_id UUID,
  ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES public.supplies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS niche TEXT NOT NULL DEFAULT 'gastronomy';

-- Torna recipe_id opcional quando supply_id estiver presente
ALTER TABLE public.product_recipes ALTER COLUMN recipe_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_recipes_service_id ON public.product_recipes(service_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_supply_id ON public.product_recipes(supply_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_niche ON public.product_recipes(store_id, niche);

-- 4. Extensões em public.service_consumed_materials (Vínculo com Insumos do Almoxarifado)
ALTER TABLE public.service_consumed_materials
  ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_cents INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_service_consumed_supply_id ON public.service_consumed_materials(supply_id);
