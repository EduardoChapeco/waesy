-- BFF contract closure: relations referenced by server functions that were never
-- represented in the local migration ledger. These tables are intentionally
-- tenant-scoped and deny direct client access; server functions use service role.

BEGIN;

CREATE TABLE IF NOT EXISTS public.activation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_id uuid NOT NULL,
  user_id uuid,
  interaction_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  store_id uuid,
  classified_id uuid,
  entry_type text NOT NULL,
  amount_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  routing_mode text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  title text NOT NULL,
  price_cents bigint NOT NULL DEFAULT 0,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.badge_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  name text NOT NULL,
  variant text NOT NULL,
  primary_color text NOT NULL DEFAULT '#000000',
  html_structure text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_vault_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  platform text NOT NULL,
  token_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, platform)
);

CREATE TABLE IF NOT EXISTS public.condicional_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condicional_id uuid NOT NULL,
  store_id uuid NOT NULL,
  name text NOT NULL,
  size text,
  price_cents bigint NOT NULL DEFAULT 0,
  product_id uuid,
  variant_id uuid,
  status text NOT NULL DEFAULT 'with_customer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_addendums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending_signature',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid,
  subject text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eventos_campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text,
  tipo text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  publico_alvo text,
  orcamento numeric,
  data_inicio timestamptz,
  data_fim timestamptz,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.immutable_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  transaction_type text NOT NULL,
  reference_entity_id uuid,
  amount_cents bigint NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lead_capture_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  name text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  media_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_condicionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  dispatch_date timestamptz NOT NULL DEFAULT now(),
  return_due_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'open',
  notes text,
  total_estimated_cents bigint NOT NULL DEFAULT 0,
  total_sold_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  total_amount_cents bigint NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  title text,
  media_url text NOT NULL,
  product_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.travel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  customer_id uuid,
  destination text,
  travel_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id text NOT NULL,
  store_id uuid NOT NULL,
  commission_rate numeric,
  commission_cents bigint,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_activation_logs_activation ON public.activation_logs (activation_id);
CREATE INDEX IF NOT EXISTS idx_ad_ledger_campaign ON public.ad_ledger (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_store_status ON public.ads (store_id, status);
CREATE INDEX IF NOT EXISTS idx_condicional_items_condicional ON public.condicional_items (condicional_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media (post_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_condicionais_store ON public.store_condicionais (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_orders_store ON public.store_orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_stories_store ON public.store_stories (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_bookings_window ON public.travel_bookings (store_id, travel_date);

DO $$
DECLARE
  relation_name text;
BEGIN
  FOREACH relation_name IN ARRAY ARRAY[
    'activation_logs', 'ad_ledger', 'ads', 'badge_templates',
    'channel_vault_credentials', 'condicional_items', 'contract_addendums',
    'direct_conversations', 'direct_messages', 'eventos_campanhas',
    'immutable_ledger_entries', 'lead_capture_forms', 'post_media',
    'store_condicionais', 'store_invites', 'store_orders', 'store_stories',
    'travel_bookings', 'trip_commissions'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', relation_name);
  END LOOP;
END $$;

COMMIT;
