-- ============================================================================
-- MIGRATION: 20270212000000_pre_boarding_presentations_inline_commissions_and_crm_import.sql
-- DESCRIÇÃO:
--   1. Gerador Modular de Apresentações (Cotação Comercial vs. Guia de Pré-Embarque)
--      + Agendamento Bidirecional de Reunião de Pré-Embarque (Online / Presencial)
--   2. Metas Escalonadas por Agente (Faixas de Comissão) & Edição Inline por Viagem
--   3. Gestão de Cancelamento, Multas, Carta de Crédito e Financiamento Ativo
--   4. Lotes de Importação Universal de Clientes/Leads e Crédito de Operadoras no CRM
-- ============================================================================

-- 1. Apresentações Inteligentes de Viagem (Cotação Comercial vs. Pré-Embarque) + Reunião
CREATE TABLE IF NOT EXISTS public.travel_pre_boarding_presentations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    trip_id UUID,
    proposal_id UUID,
    presentation_type TEXT NOT NULL DEFAULT 'pre_boarding_guide'
        CHECK (presentation_type IN ('commercial_quote', 'pre_boarding_guide')),
    title TEXT NOT NULL,
    subtitle_concept TEXT, -- ex: 'Caribe entre amigas — Punta Cana', 'Disney em família', 'Itália em casal'
    destination_archetype TEXT NOT NULL DEFAULT 'custom'
        CHECK (destination_archetype IN ('caribe_resort', 'orlando_parques', 'italia_multicidade', 'europa_multipais', 'nacional_receptivo', 'cruzeiro_maritimo', 'custom')),
    traveler_profile_type TEXT NOT NULL DEFAULT 'casal'
        CHECK (traveler_profile_type IN ('casal', 'familia_criancas', 'amigos_grupo', 'idosos_primeira_viagem', 'corporativo', 'individual')),
    complexity_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    selected_module_keys TEXT[] NOT NULL DEFAULT '{}',
    modules_pages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de páginas geradas pelo motor de raciocínio
    requires_human_review BOOLEAN NOT NULL DEFAULT FALSE,
    human_review_notes TEXT[] NOT NULL DEFAULT '{}',
    is_published_to_client BOOLEAN NOT NULL DEFAULT FALSE,
    public_share_token TEXT UNIQUE,

    -- Agendamento Bidirecional da Reunião de Pré-Embarque (Online ou Presencial)
    meeting_status TEXT NOT NULL DEFAULT 'not_scheduled'
        CHECK (meeting_status IN ('not_scheduled', 'proposed_by_agency', 'accepted_by_client', 'reschedule_requested', 'completed')),
    meeting_modality TEXT NOT NULL DEFAULT 'online_video'
        CHECK (meeting_modality IN ('online_video', 'in_person_agency')),
    proposed_slots JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de ISO timestamps propostos pelo agente
    confirmed_slot_iso TIMESTAMPTZ,
    meeting_link_or_address TEXT,
    agent_name TEXT,
    client_meeting_notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_travel_pre_boarding_presentations_store
    ON public.travel_pre_boarding_presentations(store_id, presentation_type);
CREATE INDEX IF NOT EXISTS idx_travel_pre_boarding_presentations_trip
    ON public.travel_pre_boarding_presentations(trip_id);

ALTER TABLE public.travel_pre_boarding_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_pre_boarding_presentations_tenant_read" ON public.travel_pre_boarding_presentations;
CREATE POLICY "travel_pre_boarding_presentations_tenant_read"
    ON public.travel_pre_boarding_presentations
    FOR SELECT
    USING (is_published_to_client = TRUE OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "travel_pre_boarding_presentations_tenant_write" ON public.travel_pre_boarding_presentations;
CREATE POLICY "travel_pre_boarding_presentations_tenant_write"
    ON public.travel_pre_boarding_presentations
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 2. Faixas de Metas Escalonadas de Comissionamento por Agente/Vendedor
CREATE TABLE IF NOT EXISTS public.travel_agent_commission_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_role TEXT NOT NULL DEFAULT 'Consultor de Viagens',
    base_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    tiers_json JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ tierName, minRevenueCents, maxRevenueCents, commissionPct, bonusCents }]
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, agent_id)
);

ALTER TABLE public.travel_agent_commission_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_agent_commission_tiers_auth_all" ON public.travel_agent_commission_tiers;
CREATE POLICY "travel_agent_commission_tiers_auth_all"
    ON public.travel_agent_commission_tiers
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 3. Gestão de Cancelamentos, Multas Contratuais, Carta de Crédito e Financiamento Ativo
CREATE TABLE IF NOT EXISTS public.travel_trip_cancellations_and_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    sale_sheet_id TEXT NOT NULL,
    trip_id UUID,
    client_name TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    locator_code TEXT,
    cancellation_reason TEXT NOT NULL DEFAULT 'desistencia_passageiro'
        CHECK (cancellation_reason IN ('desistencia_passageiro', 'alteracao_fornecedor', 'forca_maior', 'inadimplencia', 'remarcacao_credito')),
    gross_sale_cents BIGINT NOT NULL DEFAULT 0,
    already_paid_by_client_cents BIGINT NOT NULL DEFAULT 0,
    remaining_financed_balance_cents BIGINT NOT NULL DEFAULT 0,
    supplier_non_refundable_cents BIGINT NOT NULL DEFAULT 0,
    agency_contract_fine_pct NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    agency_contract_fine_cents BIGINT NOT NULL DEFAULT 0,
    operator_credit_letter_cents BIGINT NOT NULL DEFAULT 0,
    net_refund_to_client_cents BIGINT NOT NULL DEFAULT 0,
    client_must_keep_paying_financing BOOLEAN NOT NULL DEFAULT TRUE,
    credit_expiration_date DATE,
    formal_statement_pt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'simulated'
        CHECK (status IN ('simulated', 'sent_to_client', 'accepted', 'disputed', 'settled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.travel_trip_cancellations_and_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_trip_cancellations_auth_all" ON public.travel_trip_cancellations_and_credits;
CREATE POLICY "travel_trip_cancellations_auth_all"
    ON public.travel_trip_cancellations_and_credits
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- 4. Lotes de Importação Universal de Clientes/Leads & Crédito de Operadoras no CRM
CREATE TABLE IF NOT EXISTS public.crm_universal_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'spreadsheet_upload'
        CHECK (source_type IN ('spreadsheet_upload', 'infotravel_historical_sync', 'operator_credit_list')),
    file_name TEXT,
    total_rows INT NOT NULL DEFAULT 0,
    imported_rows INT NOT NULL DEFAULT 0,
    recognized_columns TEXT[] NOT NULL DEFAULT '{}',
    unmapped_columns_to_notes TEXT[] NOT NULL DEFAULT '{}',
    summary_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_universal_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_universal_import_batches_auth_all" ON public.crm_universal_import_batches;
CREATE POLICY "crm_universal_import_batches_auth_all"
    ON public.crm_universal_import_batches
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
