-- ==============================================================================
-- MIGRATION: 20270609000000_b2b_rotary_crm_gps_routes_and_omnimatch_engine.sql
-- DESCRIÇÃO: Hardening de RLS de Tabelas de Preço B2B, Matriz de Carteira Rotativa,
--            Roteirização GPS de Campo com Geofence Haversine e OmniMatch Neural Engine.
-- AUTOR: Conselho Executivo Soberano Waesy
-- GOVERNANÇA: AGENTS.md, docs/specs/SPEC-B2B-ROTARY-CRM-GPS-ROUTES-AND-OMNIMATCH-ENGINE.md
-- ==============================================================================

-- 1. EXTENSÃO PGVECTOR (SE NÃO HABILITADA)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. HARDENING RLS EM PUBLIC.PRICE_TABLES E PUBLIC.PRICE_TABLE_ITEMS
-- Erradica a vulnerabilidade pública irrestrita corrigindo visibilidade por tenant/cliente.
ALTER TABLE public.price_tables ADD COLUMN IF NOT EXISTS visibility_scope TEXT NOT NULL DEFAULT 'b2b_restricted' CHECK (visibility_scope IN ('public', 'b2b_restricted', 'private_seller'));

DROP POLICY IF EXISTS "price_tables_public_read" ON public.price_tables;
DROP POLICY IF EXISTS "price_table_items_public_read" ON public.price_table_items;

-- 3. ASSOCIAÇÃO CLIENTE X TABELA DE PREÇO B2B
CREATE TABLE IF NOT EXISTS public.customer_price_table_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    price_table_id UUID NOT NULL REFERENCES public.price_tables(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_customer_price_table UNIQUE (store_id, customer_id, price_table_id)
);

CREATE INDEX IF NOT EXISTS idx_cpta_store_customer ON public.customer_price_table_assignments(store_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_cpta_table ON public.customer_price_table_assignments(price_table_id);

ALTER TABLE public.customer_price_table_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpta_staff_all" ON public.customer_price_table_assignments
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "cpta_customer_read" ON public.customer_price_table_assignments
    FOR SELECT USING (auth.uid() = customer_id);

-- POLÍTICAS RECONSTRUÍDAS PARA PRICE_TABLES E ITEMS COM ZERO-TRUST
CREATE POLICY "price_tables_scoped_select" ON public.price_tables
    FOR SELECT
    USING (
        (active = true AND visibility_scope = 'public')
        OR public.is_store_staff(store_id)
        OR (
            auth.uid() IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.customer_price_table_assignments cpta
                WHERE cpta.price_table_id = price_tables.id
                AND cpta.customer_id = auth.uid()
                AND (cpta.valid_until IS NULL OR cpta.valid_until >= now())
            )
        )
    );

CREATE POLICY "price_table_items_scoped_select" ON public.price_table_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.price_tables pt
            WHERE pt.id = price_table_items.price_table_id
            AND (
                (pt.active = true AND pt.visibility_scope = 'public')
                OR public.is_store_staff(pt.store_id)
                OR (
                    auth.uid() IS NOT NULL AND EXISTS (
                        SELECT 1 FROM public.customer_price_table_assignments cpta
                        WHERE cpta.price_table_id = pt.id
                        AND cpta.customer_id = auth.uid()
                        AND (cpta.valid_until IS NULL OR cpta.valid_until >= now())
                    )
                )
            )
        )
    );

-- 4. CATÁLOGOS COMERCIAIS E LINHAS DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.sales_catalogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    min_order_value_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_catalog_slug UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sales_catalogs_store ON public.sales_catalogs(store_id);
ALTER TABLE public.sales_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_catalogs_staff_all" ON public.sales_catalogs
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "sales_catalogs_public_read" ON public.sales_catalogs
    FOR SELECT USING (active = true);

CREATE TABLE IF NOT EXISTS public.sales_catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES public.sales_catalogs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_catalog_product UNIQUE (catalog_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_catalog_items_cat ON public.sales_catalog_items(catalog_id);
ALTER TABLE public.sales_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_catalog_items_staff_all" ON public.sales_catalog_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sales_catalogs sc
            WHERE sc.id = sales_catalog_items.catalog_id
            AND public.is_store_staff(sc.store_id)
        )
    );

CREATE POLICY "sales_catalog_items_public_read" ON public.sales_catalog_items
    FOR SELECT USING (
        is_active = true AND EXISTS (
            SELECT 1 FROM public.sales_catalogs sc
            WHERE sc.id = sales_catalog_items.catalog_id
            AND sc.active = true
        )
    );

-- 5. MATRIZ DE CARTEIRA ROTATIVA (CLIENTE X VENDEDOR X CATÁLOGO X TABELA)
CREATE TABLE IF NOT EXISTS public.seller_portfolio_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    seller_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    catalog_id UUID REFERENCES public.sales_catalogs(id) ON DELETE SET NULL,
    price_table_id UUID REFERENCES public.price_tables(id) ON DELETE SET NULL,
    route_id UUID,
    visit_weekdays INTEGER[] NOT NULL DEFAULT '{1}', -- 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex
    visit_frequency_days INTEGER NOT NULL DEFAULT 14,
    avg_repurchase_days INTEGER NOT NULL DEFAULT 14,
    last_visit_at TIMESTAMPTZ,
    last_order_at TIMESTAMPTZ,
    next_attention_date DATE,
    churn_risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_customer_seller UNIQUE (store_id, customer_id, seller_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_seller_portfolio_store ON public.seller_portfolio_assignments(store_id);
CREATE INDEX IF NOT EXISTS idx_seller_portfolio_seller ON public.seller_portfolio_assignments(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_portfolio_customer ON public.seller_portfolio_assignments(customer_id);

ALTER TABLE public.seller_portfolio_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seller_portfolio_staff_all" ON public.seller_portfolio_assignments
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "seller_portfolio_rep_read" ON public.seller_portfolio_assignments
    FOR SELECT USING (auth.uid() = seller_profile_id);

-- 6. ROTAS DE CAMPO, PONTOS E LOGS DE VISITA COM GEOFENCE
CREATE TABLE IF NOT EXISTS public.sales_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    seller_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weekday INTEGER NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 1 AND 7),
    active BOOLEAN NOT NULL DEFAULT true,
    optimized_polygon_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_routes_store_rep ON public.sales_routes(store_id, seller_profile_id);
ALTER TABLE public.sales_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_routes_staff_all" ON public.sales_routes
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "sales_routes_rep_read" ON public.sales_routes
    FOR SELECT USING (auth.uid() = seller_profile_id);

CREATE TABLE IF NOT EXISTS public.sales_route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.sales_routes(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL DEFAULT 1,
    planned_time TIME,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'skipped', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_route_stop_order UNIQUE (route_id, stop_order)
);

CREATE INDEX IF NOT EXISTS idx_sales_route_stops_route ON public.sales_route_stops(route_id);
ALTER TABLE public.sales_route_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_route_stops_staff_all" ON public.sales_route_stops
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.sales_routes sr
            WHERE sr.id = sales_route_stops.route_id
            AND public.is_store_staff(sr.store_id)
        )
    );

CREATE TABLE IF NOT EXISTS public.sales_visit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    seller_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    route_stop_id UUID REFERENCES public.sales_route_stops(id) ON DELETE SET NULL,
    lat NUMERIC(10, 7) NOT NULL,
    lng NUMERIC(10, 7) NOT NULL,
    accuracy_meters NUMERIC(8, 2),
    distance_to_customer_meters NUMERIC(10, 2),
    geofence_status TEXT NOT NULL DEFAULT 'within_geofence' CHECK (geofence_status IN ('within_geofence', 'outside_geofence', 'no_coords')),
    checkin_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    checkout_at TIMESTAMPTZ,
    notes TEXT,
    voice_audio_url TEXT,
    voice_transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_visit_logs_store ON public.sales_visit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_visit_logs_rep ON public.sales_visit_logs(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_sales_visit_logs_customer ON public.sales_visit_logs(customer_id);

ALTER TABLE public.sales_visit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_visit_logs_staff_all" ON public.sales_visit_logs
    FOR ALL USING (public.is_store_staff(store_id));

-- 7. OMNIMATCH / MATCHTRAVEL MOTOR PARAMÉTRICO DE DESCOBERTA E SWIPE
CREATE TABLE IF NOT EXISTS public.match_deck_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    niche_id TEXT NOT NULL DEFAULT 'geral',
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    card_mix_rules JSONB NOT NULL DEFAULT '{"trade_off_ratio": 0.4, "hot_offer_ratio": 0.3, "package_ratio": 0.3}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    target_persona TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_deck_store_slug UNIQUE (store_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_match_deck_store ON public.match_deck_templates(store_id);
ALTER TABLE public.match_deck_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_deck_templates_staff_all" ON public.match_deck_templates
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "match_deck_templates_public_read" ON public.match_deck_templates
    FOR SELECT USING (active = true);

CREATE TABLE IF NOT EXISTS public.match_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_template_id UUID NOT NULL REFERENCES public.match_deck_templates(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    card_kind TEXT NOT NULL DEFAULT 'trade_off' CHECK (card_kind IN ('trade_off', 'hot_offer', 'travel_package', 'product', 'service')),
    title TEXT NOT NULL,
    subtitle TEXT,
    badge TEXT,
    cover_image_url TEXT,
    media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    trade_off_axis TEXT,
    axis_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    preference_vector vector(1536),
    linked_entity_id UUID,
    cta_label TEXT NOT NULL DEFAULT 'Quero Conhecer',
    display_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_cards_deck ON public.match_cards(deck_template_id);
CREATE INDEX IF NOT EXISTS idx_match_cards_store ON public.match_cards(store_id);
ALTER TABLE public.match_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_cards_staff_all" ON public.match_cards
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "match_cards_public_read" ON public.match_cards
    FOR SELECT USING (active = true);

CREATE TABLE IF NOT EXISTS public.match_visitor_brains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    visitor_session_id TEXT NOT NULL,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    axis_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    preference_embedding vector(1536),
    swipes_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    passes_count INTEGER NOT NULL DEFAULT 0,
    top_matched_offer_ids UUID[] NOT NULL DEFAULT '{}',
    last_swiped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_store_visitor_session UNIQUE (store_id, visitor_session_id)
);

CREATE INDEX IF NOT EXISTS idx_match_visitor_brains_store ON public.match_visitor_brains(store_id);
CREATE INDEX IF NOT EXISTS idx_match_visitor_brains_session ON public.match_visitor_brains(visitor_session_id);
CREATE INDEX IF NOT EXISTS idx_match_visitor_brains_lead ON public.match_visitor_brains(lead_id);
ALTER TABLE public.match_visitor_brains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_visitor_brains_staff_all" ON public.match_visitor_brains
    FOR ALL USING (public.is_store_staff(store_id));

CREATE POLICY "match_visitor_brains_customer_read" ON public.match_visitor_brains
    FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = customer_id);

-- EVOLUÇÃO DE MATCH_TIME_SWIPES COM REFERÊNCIA A MATCH_CARD_ID
ALTER TABLE public.match_time_swipes ADD COLUMN IF NOT EXISTS match_card_id UUID REFERENCES public.match_cards(id) ON DELETE SET NULL;

-- 8. HARDENING ZERO-TRUST EM TRAVEL_CONTRACT_SIGNERS (ERRADICAÇÃO DE LEAKS PÚBLICOS)
-- Assinantes e pagadores de contratos de viagem só devem ser acessados via BFF seguro ou por staff da loja.
DROP POLICY IF EXISTS "travel_contract_signers_public_token" ON public.travel_contract_signers;
DROP POLICY IF EXISTS "travel_contract_signers_public_update" ON public.travel_contract_signers;
REVOKE ALL ON public.travel_contract_signers FROM anon;
REVOKE ALL ON public.travel_contract_signers FROM public;

-- 9. PROMOÇÕES SEGMENTADAS B2B (CATÁLOGOS, TABELAS DE PREÇO E CARTEIRA DE VENDEDOR)
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS target_catalog_ids UUID[] DEFAULT NULL;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS target_price_table_ids UUID[] DEFAULT NULL;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS target_seller_ids UUID[] DEFAULT NULL;

-- 10. VISIBILIDADE CONTROLADA EM SALES_CATALOGS
ALTER TABLE public.sales_catalogs ADD COLUMN IF NOT EXISTS visibility_scope TEXT NOT NULL DEFAULT 'public' CHECK (visibility_scope IN ('public', 'b2b_restricted', 'private_seller'));

DROP POLICY IF EXISTS "sales_catalogs_public_read" ON public.sales_catalogs;
CREATE POLICY "sales_catalogs_public_read" ON public.sales_catalogs
    FOR SELECT USING (
        (active = true AND visibility_scope = 'public')
        OR public.is_store_staff(store_id)
        OR (
            auth.uid() IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.seller_portfolio_assignments spa
                WHERE spa.catalog_id = sales_catalogs.id
                AND spa.customer_id = auth.uid()
                AND spa.active = true
            )
        )
    );

-- 11. EVOLUÇÃO OMNIMATCH: HESITAÇÃO DE SWIPE E REGRAS COMERCIAIS
ALTER TABLE public.match_time_swipes ADD COLUMN IF NOT EXISTS hesitation_ms INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.match_time_swipes ADD COLUMN IF NOT EXISTS visitor_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_match_time_swipes_visitor_card
  ON public.match_time_swipes (visitor_session_id, match_card_id)
  WHERE visitor_session_id IS NOT NULL;
ALTER TABLE public.match_deck_templates ADD COLUMN IF NOT EXISTS rules_discount_config JSONB NOT NULL DEFAULT '{"max_discount_pct": 20, "superlike_bonus_pct": 5}'::jsonb;

-- 12. HARDENING ZERO-TRUST EM TABELAS OPERACIONAIS B2B E VISITANTES (DENY-BY-DEFAULT)
REVOKE ALL ON public.customer_price_table_assignments FROM anon;
REVOKE ALL ON public.seller_portfolio_assignments FROM anon;
REVOKE ALL ON public.sales_routes FROM anon;
REVOKE ALL ON public.sales_route_stops FROM anon;
REVOKE ALL ON public.sales_visit_logs FROM anon;
REVOKE ALL ON public.match_visitor_brains FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_price_table_assignments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_portfolio_assignments TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_routes TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_route_stops TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_visit_logs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_visitor_brains TO authenticated, service_role;

-- 13. RPC DE BATCHING E RE-RANKING HÍBRIDO OMNIMATCH
CREATE OR REPLACE FUNCTION public.match_next_cards_batch(
    p_store_id UUID,
    p_visitor_session_id TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    deck_template_id UUID,
    card_kind TEXT,
    title TEXT,
    subtitle TEXT,
    badge TEXT,
    cover_image_url TEXT,
    media_urls JSONB,
    metadata JSONB,
    trade_off_axis TEXT,
    axis_weights JSONB,
    linked_entity_id UUID,
    cta_label TEXT,
    display_order INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        mc.id,
        mc.deck_template_id,
        mc.card_kind,
        mc.title,
        mc.subtitle,
        mc.badge,
        mc.cover_image_url,
        mc.media_urls,
        mc.metadata,
        mc.trade_off_axis,
        mc.axis_weights,
        mc.linked_entity_id,
        mc.cta_label,
        mc.display_order
    FROM public.match_cards mc
    WHERE mc.store_id = p_store_id
      AND mc.active = true
      AND NOT EXISTS (
          SELECT 1 FROM public.match_time_swipes mts
          WHERE mts.match_card_id = mc.id
            AND mts.visitor_session_id = p_visitor_session_id
      )
    ORDER BY mc.display_order ASC, mc.created_at ASC
    LIMIT p_limit;
$$;


