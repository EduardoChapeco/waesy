-- ============================================================================
-- WAESY COMMERCE — Hardening Integral E2E do Hub de Marketplaces e Webhooks
-- Corrige constraints de plataforma/sync_logs, credenciais/OAuth expiração,
-- políticas RLS multi-tenant e adiciona inbox estruturado de Perguntas (Q&A).
-- ============================================================================

BEGIN;

-- 1. Expande plataformas suportadas em marketplace_connectors (idempotente)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.marketplace_connectors'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%platform%'
  LOOP
    EXECUTE format('ALTER TABLE public.marketplace_connectors DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.marketplace_connectors
  ADD CONSTRAINT marketplace_connectors_platform_check CHECK (
    platform IN (
      'mercadolivre', 'ifood', 'shopee', 'magalu', 'amazon',
      'rappi', 'amodelivery', '99food', 'amoofertas',
      'bling', 'tiny',
      'melhorenvio', 'correios', 'kangu', 'frenet', 'loggi', 'jadlog',
      'google_business'
    )
  );

-- Adiciona metadados operacionais de OAuth / Webhook ao conector
ALTER TABLE public.marketplace_connectors
  ADD COLUMN IF NOT EXISTS credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS scope TEXT;

-- 2. Alinha constraints e colunas de auditoria em marketplace_sync_logs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.marketplace_sync_logs'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) LIKE '%sync_type%'
        OR pg_get_constraintdef(oid) LIKE '%direction%'
        OR pg_get_constraintdef(oid) LIKE '%status%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.marketplace_sync_logs DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.marketplace_sync_logs
  ADD COLUMN IF NOT EXISTS items_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS message TEXT;

ALTER TABLE public.marketplace_sync_logs
  ADD CONSTRAINT marketplace_sync_logs_sync_type_check CHECK (
    sync_type IN ('catalog', 'catalog_import', 'catalog_publish', 'stock', 'stock_broadcast', 'orders', 'prices', 'questions', 'profile', 'full')
  ),
  ADD CONSTRAINT marketplace_sync_logs_direction_check CHECK (
    direction IN ('import', 'export', 'bidirectional', 'inbound', 'outbound')
  ),
  ADD CONSTRAINT marketplace_sync_logs_status_check CHECK (
    status IN ('started', 'completed', 'error', 'partial', 'failed', 'unconfigured', 'pending_external_api')
  );

-- 3. Expande colunas de rastreabilidade em marketplace_external_orders
ALTER TABLE public.marketplace_external_orders
  ADD COLUMN IF NOT EXISTS raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS synced_to_master_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_marketplace_external_orders_store_order_id
  ON public.marketplace_external_orders (store_id, order_id)
  WHERE order_id IS NOT NULL;

-- 4. Fortalece marketplace_webhook_events (retry metadata + plataformas completas)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.marketplace_webhook_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%platform%'
  LOOP
    EXECUTE format('ALTER TABLE public.marketplace_webhook_events DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.marketplace_webhook_events
  ADD COLUMN IF NOT EXISTS external_account_id TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketplace_webhook_events_platform_event_id
  ON public.marketplace_webhook_events (platform, event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketplace_webhook_events_store_status
  ON public.marketplace_webhook_events (store_id, status, created_at DESC);

-- 5. Corrige políticas RLS usando public.is_store_staff(store_id) e profile_id
DROP POLICY IF EXISTS "marketplace_connectors_store_staff_all" ON public.marketplace_connectors;
CREATE POLICY "marketplace_connectors_store_staff_all"
  ON public.marketplace_connectors FOR ALL
  USING (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS "marketplace_external_orders_store_staff_all" ON public.marketplace_external_orders;
CREATE POLICY "marketplace_external_orders_store_staff_all"
  ON public.marketplace_external_orders FOR ALL
  USING (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS "marketplace_sync_logs_store_staff_select" ON public.marketplace_sync_logs;
CREATE POLICY "marketplace_sync_logs_store_staff_select"
  ON public.marketplace_sync_logs FOR ALL
  USING (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  );

DROP POLICY IF EXISTS "marketplace_webhooks_store_admin_read" ON public.marketplace_webhook_events;
CREATE POLICY "marketplace_webhooks_store_staff_all"
  ON public.marketplace_webhook_events FOR ALL
  USING (
    auth.role() = 'service_role'
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (store_id IS NOT NULL AND public.is_store_staff(store_id))
  );

-- 6. Inbox Estruturado de Perguntas Pré-Venda (Mercado Livre / Marketplaces Q&A)
CREATE TABLE IF NOT EXISTS public.marketplace_questions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id               UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id             UUID REFERENCES public.products(id) ON DELETE SET NULL,
  platform               TEXT NOT NULL DEFAULT 'mercadolivre',
  external_question_id   TEXT NOT NULL,
  external_item_id       TEXT NOT NULL,
  buyer_id               TEXT,
  buyer_nickname         TEXT,
  question_text          TEXT NOT NULL,
  answer_text            TEXT,
  status                 TEXT NOT NULL DEFAULT 'unanswered' CHECK (status IN ('unanswered', 'answered', 'closed', 'deleted')),
  asked_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at            TIMESTAMPTZ,
  raw_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_marketplace_questions_store_ext UNIQUE (store_id, platform, external_question_id)
);

ALTER TABLE public.marketplace_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketplace_questions_store_staff_all" ON public.marketplace_questions;
CREATE POLICY "marketplace_questions_store_staff_all"
  ON public.marketplace_questions FOR ALL
  USING (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_store_staff(store_id)
  );

CREATE INDEX IF NOT EXISTS idx_marketplace_questions_store_status
  ON public.marketplace_questions (store_id, platform, status, asked_at DESC);

COMMIT;
