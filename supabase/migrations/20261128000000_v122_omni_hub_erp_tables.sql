-- ═══════════════════════════════════════════════════════════════════════════
-- V122/V123 OMNI-HUB ERP — Core Relational Schema
-- 
-- Tabelas Canônicas:
-- 1. inventory_locations: Dark Stores, Depósitos Centrais, Lojas Físicas e Cozinhas
-- 2. product_location_inventories: Saldo e estoque físico segregado por local
-- 3. channel_listings: 1:N de Anúncios e Preços por canal de venda (Mercado Livre, Shopee, iFood, etc.)
-- 4. stock_movements.location_id: Rastreabilidade de movimentação por armazém
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. inventory_locations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  type TEXT NOT NULL DEFAULT 'warehouse'
    CHECK (type IN ('warehouse', 'storefront', 'dark_store', 'kitchen', 'fulfillment_center')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  dispatch_radius_km NUMERIC DEFAULT 10,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_store 
  ON inventory_locations (store_id, is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_default 
  ON inventory_locations (store_id, is_default) 
  WHERE is_default = true;

-- ── 2. product_location_inventories ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_location_inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  reserved_qty INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 0,
  shelf_location TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index permitindo variantes nulas (produto simples)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prod_loc_inv_unique_variant 
  ON product_location_inventories (location_id, product_id, variant_id) 
  WHERE variant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prod_loc_inv_unique_simple 
  ON product_location_inventories (location_id, product_id) 
  WHERE variant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_prod_loc_inv_store_loc 
  ON product_location_inventories (store_id, location_id);

CREATE INDEX IF NOT EXISTS idx_prod_loc_inv_product 
  ON product_location_inventories (product_id);

-- ── 3. channel_listings ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  compare_at_cents INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  external_listing_id TEXT,
  external_sku TEXT,
  channel_status TEXT NOT NULL DEFAULT 'active'
    CHECK (channel_status IN ('active', 'paused', 'error', 'pending')),
  commission_rate NUMERIC DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  sync_error_message TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_listings_unique 
  ON channel_listings (store_id, product_id, channel);

CREATE INDEX IF NOT EXISTS idx_channel_listings_channel_active 
  ON channel_listings (store_id, channel, is_active);

-- ── 4. stock_movements.location_id ──────────────────────────────────────────
ALTER TABLE stock_movements 
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_movements_location 
  ON stock_movements (store_id, location_id, created_at DESC);

-- ── 5. Auto-Seed Default Location para Lojas Existentes ─────────────────────
INSERT INTO inventory_locations (store_id, name, slug, type, is_default, is_active)
SELECT s.id, 'Depósito Central', 'deposito-central', 'warehouse', true, true
FROM stores s
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_locations il WHERE il.store_id = s.id
)
ON CONFLICT DO NOTHING;

-- ── 6. Migrar dados legados de products.availability_channels para channel_listings ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'availability_channels'
  ) THEN
    INSERT INTO channel_listings (
      product_id, 
      store_id, 
      channel, 
      external_listing_id, 
      external_sku, 
      price_cents, 
      is_active, 
      channel_status, 
      last_synced_at
    )
    SELECT 
      p.id, 
      p.store_id, 
      kv.key AS channel,
      kv.value->>'listing_id',
      kv.value->>'external_sku',
      COALESCE((kv.value->>'price_cents')::integer, p.price_cents, 0),
      COALESCE((kv.value->>'status' = 'active'), true),
      CASE 
        WHEN kv.value->>'status' IN ('active', 'paused', 'error', 'pending') THEN kv.value->>'status'
        ELSE 'active'
      END,
      CASE 
        WHEN kv.value->>'synced_at' IS NOT NULL THEN (kv.value->>'synced_at')::timestamptz 
        ELSE now() 
      END
    FROM products p,
    LATERAL jsonb_each(p.availability_channels) kv
    WHERE p.availability_channels IS NOT NULL 
      AND jsonb_typeof(p.availability_channels) = 'object'
      AND p.availability_channels != '{}'::jsonb
      AND p.availability_channels != 'null'::jsonb
    ON CONFLICT (store_id, product_id, channel) DO NOTHING;
  END IF;
END $$;

-- ── 7. RLS: Segurança Multi-Tenant Deny-by-Default ──────────────────────────
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_location_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'inventory_locations'::regclass AND polname = 'inventory_locations_store_members'
  ) THEN
    CREATE POLICY "inventory_locations_store_members"
      ON inventory_locations
      FOR ALL
      TO authenticated
      USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()))
      WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'product_location_inventories'::regclass AND polname = 'product_location_inventories_store_members'
  ) THEN
    CREATE POLICY "product_location_inventories_store_members"
      ON product_location_inventories
      FOR ALL
      TO authenticated
      USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()))
      WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polrelid = 'channel_listings'::regclass AND polname = 'channel_listings_store_members'
  ) THEN
    CREATE POLICY "channel_listings_store_members"
      ON channel_listings
      FOR ALL
      TO authenticated
      USING (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()))
      WITH CHECK (store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid()));
  END IF;
END $$;
