-- Migration: Events External Ticket + Enriched Fields
-- Adiciona campos para eventos externos (link para ingresso fora da plataforma),
-- localidade (city/state), organizer phone, age rating, tags, e featured_until.
-- Também adiciona índices para otimizar filtros por data e localidade.

-- ─────────────────────────────────────────────────────────────────
-- 1. Campos de Evento Externo
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_external_ticket boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_ticket_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS organizer_phone text,
  ADD COLUMN IF NOT EXISTS age_rating text DEFAULT 'livre',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_rule text; -- RRULE padrão iCal (ex: FREQ=WEEKLY;BYDAY=SA)

-- ─────────────────────────────────────────────────────────────────
-- 2. Índices para Filtros de Alta Performance
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_event_date_status
  ON public.events(event_date, status);

CREATE INDEX IF NOT EXISTS idx_events_city
  ON public.events(city)
  WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_state
  ON public.events(state)
  WHERE state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_category_date
  ON public.events(category, event_date, status);

CREATE INDEX IF NOT EXISTS idx_events_featured
  ON public.events(featured_until)
  WHERE featured_until IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 3. Campos de Controle da Vitrine de Afiliados no Perfil de Membro
-- ─────────────────────────────────────────────────────────────────
-- Tabela para que afiliados/criadores vinculem produtos específicos
-- à sua vitrine pública (além do showcase automático por RPC)
CREATE TABLE IF NOT EXISTS public.creator_showcase_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  custom_title text,
  custom_description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_showcase_products ENABLE ROW LEVEL SECURITY;

-- RLS: O próprio criador pode gerenciar sua vitrine
DROP POLICY IF EXISTS "creator_showcase_self_manage" ON public.creator_showcase_products;
CREATE POLICY "creator_showcase_self_manage" ON public.creator_showcase_products
  FOR ALL USING (
    creator_profile_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );

-- RLS: Qualquer pessoa pode ver vitrines de criadores
DROP POLICY IF EXISTS "creator_showcase_public_read" ON public.creator_showcase_products;
CREATE POLICY "creator_showcase_public_read" ON public.creator_showcase_products
  FOR SELECT USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_creator_showcase_creator
  ON public.creator_showcase_products(creator_profile_id, sort_order);

-- ─────────────────────────────────────────────────────────────────
-- 4. Rastreamento de Cliques em Vitrine (UTM/Referral Analytics)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.creator_showcase_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_profile_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  referral_handle text,
  utm_source text DEFAULT 'waesy_profile',
  utm_medium text DEFAULT 'vitrine',
  ip_hash text,
  user_agent_hash text,
  converted boolean NOT NULL DEFAULT false,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  commission_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_showcase_clicks ENABLE ROW LEVEL SECURITY;

-- Somente o criador pode ver suas métricas
DROP POLICY IF EXISTS "showcase_clicks_creator_read" ON public.creator_showcase_clicks;
CREATE POLICY "showcase_clicks_creator_read" ON public.creator_showcase_clicks
  FOR SELECT USING (
    creator_profile_id IN (
      SELECT id FROM public.creator_profiles WHERE user_id = auth.uid()
    )
  );

-- Sistema pode inserir (sem auth)
DROP POLICY IF EXISTS "showcase_clicks_insert_anon" ON public.creator_showcase_clicks;
CREATE POLICY "showcase_clicks_insert_anon" ON public.creator_showcase_clicks
  FOR INSERT WITH CHECK (true);

-- Índices para dashboard de telemetria
CREATE INDEX IF NOT EXISTS idx_creator_clicks_creator_date
  ON public.creator_showcase_clicks(creator_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_clicks_converted
  ON public.creator_showcase_clicks(creator_profile_id, converted)
  WHERE converted = true;

-- ─────────────────────────────────────────────────────────────────
-- 5. Posts: Campos de SEO, Agendamento e Vinculação Geográfica
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS collaborators jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS paid_partner_handle text,
  ADD COLUMN IF NOT EXISTS paid_partner_label text,
  ADD COLUMN IF NOT EXISTS publish_as_handle text, -- handle do creator_profile se publicado como marca
  ADD COLUMN IF NOT EXISTS external_instagram_post_id text;

-- Índice para posts agendados
CREATE INDEX IF NOT EXISTS idx_posts_scheduled
  ON public.posts(scheduled_at, is_scheduled)
  WHERE is_scheduled = true AND scheduled_at IS NOT NULL;

-- Índice para posts por criador/handle
CREATE INDEX IF NOT EXISTS idx_posts_publish_as
  ON public.posts(publish_as_handle)
  WHERE publish_as_handle IS NOT NULL;
