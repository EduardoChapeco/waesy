-- ============================================================
-- MIGRATION: 20260912_hub_channel_origin_social_ads.sql
-- Autores: Conselho Executivo BigTech Waesy/Waesy
-- Escopo: channel_origin em orders/cash_flows/stock_movements,
--         tabela store_social_posts, store_ad_accounts,
--         google_product_category em products,
--         pixel_dispatch_log para auditoria imutável.
-- ============================================================

-- ── 1. google_product_category em products ──────────────────
-- Campo numérico da taxonomia Google Product Category.
-- Ex: 166 = Apparel, 783 = Electronics, 436 = Food
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS google_product_category TEXT;

COMMENT ON COLUMN public.products.google_product_category
  IS 'ID ou nome da taxonomia Google Product Category. Ex: "166" ou "Apparel & Accessories > Shoes". Vazio = ignorado pelo Google (não causa rejeição).';

-- ── 2. channel_origin em orders ─────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS channel_origin TEXT NOT NULL DEFAULT 'vitrine_online';

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_channel_origin;

ALTER TABLE public.orders
  ADD CONSTRAINT chk_orders_channel_origin
  CHECK (channel_origin IN (
    'mercadolivre','amazon','magalu','shopee',
    'ifood','rappi','amodelivery','correios',
    'balcao_pos','vitrine_online','outros'
  ));

CREATE INDEX IF NOT EXISTS idx_orders_channel_origin
  ON public.orders(store_id, channel_origin);

COMMENT ON COLUMN public.orders.channel_origin
  IS 'Canal de origem do pedido. Obrigatório para rastreabilidade omnichannel e DRE por canal.';

-- ── 3. channel_origin em cash_flows / cash_register_entries ───────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_flows') THEN
    ALTER TABLE public.cash_flows ADD COLUMN IF NOT EXISTS channel_origin TEXT NOT NULL DEFAULT 'vitrine_online';
    CREATE INDEX IF NOT EXISTS idx_cash_flows_channel_origin ON public.cash_flows(store_id, channel_origin);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_register_entries') THEN
    ALTER TABLE public.cash_register_entries ADD COLUMN IF NOT EXISTS channel_origin TEXT DEFAULT 'vitrine_online';
    CREATE INDEX IF NOT EXISTS idx_cash_reg_entries_chan_orig ON public.cash_register_entries(cash_register_id, channel_origin);
  END IF;
END $$;

-- ── 4. channel_origin em stock_movements ────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stock_movements') THEN
    ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS channel_origin TEXT DEFAULT 'vitrine_online';
  END IF;
END $$;

-- ── 5. Tabela store_social_posts ────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_social_posts (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID           NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  content            TEXT           NOT NULL CHECK (length(content) BETWEEN 1 AND 2200),
  image_url          TEXT,
  image_format       TEXT           CHECK (image_format IN ('story_9x16','feed_1x1','banner_16x9')),
  networks           TEXT[]         NOT NULL DEFAULT '{}',
  status             TEXT           NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft','scheduled','publishing','published','failed')),
  scheduled_at       TIMESTAMPTZ,
  published_at       TIMESTAMPTZ,
  external_post_ids  JSONB          NOT NULL DEFAULT '{}',
  error_message      TEXT,
  reference_type     TEXT           CHECK (reference_type IN ('product','tour','classified','news','event','custom')),
  reference_id       UUID,
  created_by         UUID           REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_social_posts ENABLE ROW LEVEL SECURITY;

-- RLS: acesso restrito a membros da loja com perfil de editor ou superior
CREATE POLICY "store_members_social_posts" ON public.store_social_posts
  FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.store_members
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin','manager','editor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_social_posts_store_status
  ON public.store_social_posts(store_id, status, created_at DESC);

-- ── 6. Tabela store_ad_accounts ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_ad_accounts (
  id                 UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           UUID           NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  platform           TEXT           NOT NULL
                                    CHECK (platform IN (
                                      'meta_ads','google_ads','tiktok_ads',
                                      'mercadolivre_ads','google_analytics'
                                    )),
  account_id         TEXT           NOT NULL,
  account_name       TEXT,
  currency           TEXT           NOT NULL DEFAULT 'BRL',
  access_token       TEXT,
  refresh_token      TEXT,
  token_expires_at   TIMESTAMPTZ,
  status             TEXT           NOT NULL DEFAULT 'disconnected'
                                    CHECK (status IN ('connected','disconnected','error')),
  monthly_budget_cents INTEGER      DEFAULT 0,
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_store_ad_account UNIQUE(store_id, platform, account_id)
);

ALTER TABLE public.store_ad_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_owner_ad_accounts" ON public.store_ad_accounts
  FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.store_members
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin')
    )
  );

-- ── 7. Tabela pixel_dispatch_log (auditoria imutável) ───────
-- Registra cada disparo de evento de conversão (Meta CAPI, Google Ads, TikTok).
-- Imutável: sem UPDATE/DELETE para manter trilha de auditoria.
CREATE TABLE IF NOT EXISTS public.pixel_dispatch_log (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID         NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_name     TEXT         NOT NULL,
  event_id       TEXT         NOT NULL,
  channel        TEXT         NOT NULL CHECK (channel IN ('meta_capi','google_ads','tiktok','ga4')),
  status         TEXT         NOT NULL CHECK (status IN ('delivered','failed','disabled','dispatched')),
  response_data  JSONB,
  dispatched_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pixel_dispatch_log ENABLE ROW LEVEL SECURITY;

-- Somente leitura para dono/admin. Nenhuma deleção permitida via RLS.
CREATE POLICY "store_owner_pixel_log_read" ON public.pixel_dispatch_log
  FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.store_members
      WHERE user_id = auth.uid()
        AND role IN ('owner','admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_pixel_dispatch_log_store
  ON public.pixel_dispatch_log(store_id, dispatched_at DESC);

-- ── 8. Função de updated_at automático ──────────────────────
-- Reutiliza a função já existente ou cria uma nova se não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_social_posts_updated_at
  BEFORE UPDATE ON public.store_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_ad_accounts_updated_at
  BEFORE UPDATE ON public.store_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
