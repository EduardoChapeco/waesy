-- =============================================================================
-- MIGRATION: 20270326000000_multi_brand_vertical_ecosystem_and_marketplace_opt_in.sql
-- ECOSSISTEMA MULTI-MARCA, VERTICAIS ESPECIALIZADAS & OPT-IN DE MARKETPLACE
-- =============================================================================

-- 1. Extensões de Governança Multi-Marca e Opt-In de Marketplace em public.stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS publish_to_marketplace BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS waesy_marketplace_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_origin TEXT NOT NULL DEFAULT 'waesy',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT NOT NULL DEFAULT 'enterprise',
  ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_domain TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_marketplace_opt_in
  ON public.stores(publish_to_marketplace, waesy_marketplace_enabled);

CREATE INDEX IF NOT EXISTS idx_stores_brand_origin_tier
  ON public.stores(brand_origin, subscription_tier);

CREATE INDEX IF NOT EXISTS idx_stores_custom_domain
  ON public.stores(custom_domain)
  WHERE custom_domain IS NOT NULL;

COMMENT ON COLUMN public.stores.publish_to_marketplace IS 'Define se a empresa publica seu perfil e catalogo no Marketplace Civil compartilhado Waesy (Opt-In)';
COMMENT ON COLUMN public.stores.waesy_marketplace_enabled IS 'Chave soberana do canal Waesy Marketplace (false = 100% Private SaaS / White-Label)';
COMMENT ON COLUMN public.stores.brand_origin IS 'Marca vertical de origem do tenant (waesy, wowbook, tableway, turis, passhub, lexcloud, talentlink, omnipage, signflow, waesy_news, waesy_copilot, waesy_studio)';
COMMENT ON COLUMN public.stores.subscription_tier IS 'Plano contratado pelo estabelecimento (starter, pro, enterprise)';
COMMENT ON COLUMN public.stores.enabled_modules IS 'Lista explicita de modulos habilitados ou add-ons contratados';

-- 2. Opt-In no Nível de Produto (public.products)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_published_to_marketplace BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_products_marketplace_opt_in
  ON public.products(store_id, is_published_to_marketplace);

COMMENT ON COLUMN public.products.is_published_to_marketplace IS 'Quando false, o item opera exclusivamente no ERP/PDV/Cardapio proprio da loja e nao aparece na busca global do Marketplace Waesy';

-- 3. Opt-In no Nível de Serviço (public.services)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'services'
  ) THEN
    ALTER TABLE public.services
      ADD COLUMN IF NOT EXISTS is_published_to_marketplace BOOLEAN NOT NULL DEFAULT true;

    CREATE INDEX IF NOT EXISTS idx_services_marketplace_opt_in
      ON public.services(store_id, is_published_to_marketplace);
  END IF;
END $$;

-- 4. Opt-In no Diretório Público (public.directory_listings)
ALTER TABLE public.directory_listings
  ADD COLUMN IF NOT EXISTS is_published_to_marketplace BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS brand_origin TEXT NOT NULL DEFAULT 'waesy';

CREATE INDEX IF NOT EXISTS idx_directory_listings_marketplace_opt_in
  ON public.directory_listings(is_published_to_marketplace, status);

-- 5. Função e Trigger para sincronizar o Opt-In da Loja com directory_listings
CREATE OR REPLACE FUNCTION public.sync_store_marketplace_opt_in_to_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.directory_listings
  SET
    is_published_to_marketplace = (COALESCE(NEW.publish_to_marketplace, true) AND COALESCE(NEW.waesy_marketplace_enabled, true)),
    brand_origin = COALESCE(NEW.brand_origin, 'waesy'),
    updated_at = now()
  WHERE store_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_marketplace_opt_in ON public.stores;
CREATE TRIGGER trg_sync_store_marketplace_opt_in
  AFTER UPDATE OF publish_to_marketplace, waesy_marketplace_enabled, brand_origin ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_store_marketplace_opt_in_to_directory();
