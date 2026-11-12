-- Migration: 20270323000000_gastronomy_supplies_recipes_bom_and_production.sql
-- Description: Tabelas completas para Motor de Insumos, Sub-Receitas, Ficha Técnica (BOM), Desperdício, Validade & Impressão Térmica

-- 1. Fornecedores de Insumos e Alimentos
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  corporate_name TEXT,
  trade_name TEXT NOT NULL,
  cnpj_cpf TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  contact_name TEXT,
  lead_time_days INTEGER DEFAULT 1,
  payment_terms TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_suppliers_store_id ON public.suppliers(store_id);

-- 2. Insumos Básicos e Matérias-Primas (Despensa)
CREATE TABLE IF NOT EXISTS public.supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'ingredient' CHECK (category IN ('ingredient', 'packaging', 'chemical', 'other')),
  unit TEXT NOT NULL DEFAULT 'un' CHECK (unit IN ('g', 'kg', 'ml', 'l', 'un')),
  stock_on_hand NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  min_stock_alert NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
  cost_cents_per_unit BIGINT NOT NULL DEFAULT 0,
  is_composite BOOLEAN NOT NULL DEFAULT FALSE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  barcode TEXT,
  standard_shelf_life_days INTEGER DEFAULT 3,
  storage_temperature TEXT DEFAULT 'Refrigerado 0°C a 4°C',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_supplies_store_id ON public.supplies(store_id);
CREATE INDEX IF NOT EXISTS idx_supplies_barcode ON public.supplies(barcode);

-- 3. Fichas Técnicas & POP (Procedimento Operacional Padrão)
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sub_recipe' CHECK (type IN ('sub_recipe', 'product_dish')),
  yield_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  yield_unit TEXT NOT NULL DEFAULT 'un' CHECK (yield_unit IN ('un', 'kg', 'l', 'porcoes', 'g', 'ml')),
  preparation_time_minutes INTEGER DEFAULT 15,
  prep_instructions TEXT,
  chef_notes TEXT,
  total_cost_cents BIGINT NOT NULL DEFAULT 0,
  cost_cents_per_yield_unit BIGINT NOT NULL DEFAULT 0,
  standard_shelf_life_hours INTEGER DEFAULT 72,
  storage_instructions TEXT DEFAULT 'Etiquetar e refrigerar entre 0°C e 4°C',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recipes_store_id ON public.recipes(store_id);

-- 4. Itens da Receita (Ingredientes consumidos na ficha)
CREATE TABLE IF NOT EXISTS public.recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  unit TEXT NOT NULL DEFAULT 'un' CHECK (unit IN ('g', 'kg', 'ml', 'l', 'un')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe_id ON public.recipe_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_items_supply_id ON public.recipe_items(supply_id);

-- 5. Vínculo da Ficha Técnica a Produtos / Variações / Modificadores (Adicionais)
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  modifier_id UUID REFERENCES public.product_modifiers(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT chk_product_recipe_target CHECK (
    product_id IS NOT NULL OR variant_id IS NOT NULL OR modifier_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_product_recipes_store_id ON public.product_recipes(store_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_product_id ON public.product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_variant_id ON public.product_recipes(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_modifier_id ON public.product_recipes(modifier_id);

-- 6. Ordens de Produção Interna (Cozinha & Transformação)
CREATE TABLE IF NOT EXISTS public.production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  target_supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
  batches_count NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  actual_yield_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
  total_cost_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress', 'cancelled')),
  produced_by TEXT,
  produced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ,
  batch_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_production_orders_store_id ON public.production_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_recipe_id ON public.production_orders(recipe_id);

-- 7. Desperdício e Perdas de Insumos
CREATE TABLE IF NOT EXISTS public.waste_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supply_id UUID REFERENCES public.supplies(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  unit TEXT NOT NULL DEFAULT 'un',
  cost_loss_cents BIGINT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'spoiled' CHECK (reason IN ('expired', 'spoiled', 'burnt', 'dropped', 'prep_error', 'customer_returned', 'other')),
  reason_description TEXT,
  reported_by TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_waste_logs_store_id ON public.waste_logs(store_id);

-- 8. Histórico / Kardex de Movimentações de Insumos
CREATE TABLE IF NOT EXISTS public.supply_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'purchase_entry', 'production_consumption', 'production_yield', 
    'order_sale', 'waste', 'manual_adjustment', 'inventory_audit'
  )),
  quantity_delta NUMERIC(12, 3) NOT NULL,
  balance_after NUMERIC(12, 3) NOT NULL,
  unit_cost_cents BIGINT NOT NULL DEFAULT 0,
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_supply_movements_store_id ON public.supply_inventory_movements(store_id);
CREATE INDEX IF NOT EXISTS idx_supply_movements_supply_id ON public.supply_inventory_movements(supply_id);

-- 9. Etiquetas Térmicas de Validade Emitidas
CREATE TABLE IF NOT EXISTS public.expiration_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  batch_code TEXT,
  manufactured_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL,
  storage_temperature TEXT DEFAULT 'Refrigerado 0°C a 4°C',
  responsible_name TEXT,
  printed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expiration_labels_store_id ON public.expiration_labels(store_id);

-- ─── HABILITAÇÃO DE RLS EM TODAS AS TABELAS ──────────────────────────────
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supply_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expiration_labels ENABLE ROW LEVEL SECURITY;

-- ─── POLÍTICAS DE RLS (ISOLAMENTO MULTI-TENANT) ─────────────────────────
DO $$ 
BEGIN
  -- suppliers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'suppliers_tenant_all') THEN
    CREATE POLICY suppliers_tenant_all ON public.suppliers FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = suppliers.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = suppliers.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- supplies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supplies' AND policyname = 'supplies_tenant_all') THEN
    CREATE POLICY supplies_tenant_all ON public.supplies FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = supplies.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = supplies.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- recipes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipes' AND policyname = 'recipes_tenant_all') THEN
    CREATE POLICY recipes_tenant_all ON public.recipes FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = recipes.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = recipes.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- recipe_items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recipe_items' AND policyname = 'recipe_items_tenant_all') THEN
    CREATE POLICY recipe_items_tenant_all ON public.recipe_items FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.recipes r
        JOIN public.workspace_members wm ON wm.store_id = r.store_id
        WHERE r.id = recipe_items.recipe_id AND wm.user_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.recipes r
        JOIN public.workspace_members wm ON wm.store_id = r.store_id
        WHERE r.id = recipe_items.recipe_id AND wm.user_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- product_recipes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_recipes' AND policyname = 'product_recipes_tenant_all') THEN
    CREATE POLICY product_recipes_tenant_all ON public.product_recipes FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = product_recipes.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = product_recipes.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- production_orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'production_orders' AND policyname = 'production_orders_tenant_all') THEN
    CREATE POLICY production_orders_tenant_all ON public.production_orders FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = production_orders.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = production_orders.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- waste_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'waste_logs' AND policyname = 'waste_logs_tenant_all') THEN
    CREATE POLICY waste_logs_tenant_all ON public.waste_logs FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = waste_logs.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = waste_logs.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- supply_inventory_movements
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'supply_inventory_movements' AND policyname = 'supply_movements_tenant_all') THEN
    CREATE POLICY supply_movements_tenant_all ON public.supply_inventory_movements FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = supply_inventory_movements.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = supply_inventory_movements.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;

  -- expiration_labels
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expiration_labels' AND policyname = 'expiration_labels_tenant_all') THEN
    CREATE POLICY expiration_labels_tenant_all ON public.expiration_labels FOR ALL TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = expiration_labels.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    )
    WITH CHECK (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = expiration_labels.store_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('platform_admin', 'master_admin'))
    );
  END IF;
END $$;
