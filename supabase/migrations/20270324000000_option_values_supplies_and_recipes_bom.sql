-- Migration: Insumos & Sub-Receitas em Opcionais / Adicionais (BOM para Adicionais)
-- Permite que opções (ex: Bacon Extra, Molho Chilli, Cheddar) consumam insumos da despensa

ALTER TABLE public.option_values
  ADD COLUMN IF NOT EXISTS supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consume_quantity NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS consume_unit TEXT DEFAULT 'un';

CREATE INDEX IF NOT EXISTS idx_option_values_supply ON public.option_values(supply_id);
CREATE INDEX IF NOT EXISTS idx_option_values_recipe ON public.option_values(recipe_id);

COMMENT ON COLUMN public.option_values.supply_id IS 'Insumo consumido pelo adicional/opcao (ex: fatias de bacon, queijo cheddar)';
COMMENT ON COLUMN public.option_values.recipe_id IS 'Sub-receita consumida pelo adicional/opcao (ex: porcao de chilli, guacamole caseira)';
COMMENT ON COLUMN public.option_values.consume_quantity IS 'Quantidade do insumo ou receita consumida por unidade do adicional';
COMMENT ON COLUMN public.option_values.consume_unit IS 'Unidade de medida de consumo (g, kg, ml, l, un)';
