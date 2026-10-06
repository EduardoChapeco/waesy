-- ============================================================================
-- WIDER 3.0: ENTERPRISE MEGA ECOSYSTEM EXPANSION (8 MACRO-SYSTEMS)
-- JUS, MINING CRAWLERS, SIMLABS & BRAIN, SPECIALIZED NICHES, TURISMO & BUS,
-- B2B RECURSIVE PANELS (ACCOUNTANT/HR), KYC & REALTIME CHAT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MÓDULO JUS & JURÍDICO (PROCESSOS, DEMANDAS, HONORÁRIOS, EQUIPE)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.mined_lawsuits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_number TEXT NOT NULL,
    process_number_clean TEXT,
    court_code TEXT,
    court_name TEXT,
    class_name TEXT,
    subject_name TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'normal',
    value NUMERIC(15, 2),
    distribution_date TIMESTAMPTZ,
    last_movement_date TIMESTAMPTZ,
    last_movement_text TEXT,
    linked_cpf TEXT,
    linked_cnpj TEXT,
    linked_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    parties JSONB DEFAULT '[]'::jsonb,
    lawyers JSONB DEFAULT '[]'::jsonb,
    secrecy_level TEXT DEFAULT 'public',
    source TEXT DEFAULT 'cnj_crawler',
    source_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_process_num ON public.mined_lawsuits(process_number);
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_cpf ON public.mined_lawsuits(linked_cpf);
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_cnpj ON public.mined_lawsuits(linked_cnpj);
CREATE INDEX IF NOT EXISTS idx_mined_lawsuits_profile ON public.mined_lawsuits(linked_profile_id);

CREATE TABLE IF NOT EXISTS public.lawsuit_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lawsuit_id UUID NOT NULL REFERENCES public.mined_lawsuits(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    movement_date TIMESTAMPTZ NOT NULL,
    movement_type TEXT,
    judge_name TEXT,
    location TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lawsuit_movements_lawsuit_id ON public.lawsuit_movements(lawsuit_id);

CREATE TABLE IF NOT EXISTS public.jus_demands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    legal_area TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_value_cents BIGINT,
    urgency TEXT DEFAULT 'normal',
    city TEXT,
    state TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'open', -- open, proposals_received, in_progress, finished, cancelled
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jus_demands_profile ON public.jus_demands(profile_id);
CREATE INDEX IF NOT EXISTS idx_jus_demands_area_city ON public.jus_demands(legal_area, city);

CREATE TABLE IF NOT EXISTS public.jus_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID NOT NULL REFERENCES public.jus_demands(id) ON DELETE CASCADE,
    lawyer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    fee_type TEXT DEFAULT 'fixed', -- fixed, success_percentage, hybrid
    fixed_value_cents BIGINT DEFAULT 0,
    success_percentage NUMERIC(5, 2) DEFAULT 0,
    proposal_details TEXT NOT NULL,
    estimated_deadline_days INT DEFAULT 30,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jus_proposals_demand ON public.jus_proposals(demand_id);
CREATE INDEX IF NOT EXISTS idx_jus_proposals_lawyer ON public.jus_proposals(lawyer_profile_id);

CREATE TABLE IF NOT EXISTS public.jus_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demand_id UUID REFERENCES public.jus_demands(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES public.jus_proposals(id) ON DELETE SET NULL,
    client_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    lawyer_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    contract_number TEXT NOT NULL,
    terms_content TEXT NOT NULL,
    power_of_attorney_signed BOOLEAN DEFAULT false,
    power_of_attorney_url TEXT,
    total_value_cents BIGINT DEFAULT 0,
    status TEXT DEFAULT 'active', -- draft, active, completed, terminated
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jus_lawyer_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'associate', -- partner, senior, associate, paralegal, intern
    oab_number TEXT,
    oab_state TEXT,
    specializations JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- 2. MINING HUB, CRAWLERS & FEEDS RSS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crawl_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    domain TEXT NOT NULL,
    priority INT DEFAULT 5,
    entity_type TEXT DEFAULT 'news',
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    depth INT DEFAULT 0,
    parent_url TEXT,
    discovered_via TEXT DEFAULT 'manual',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    extracted_data JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_queue_status_sched ON public.crawl_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_crawl_queue_domain ON public.crawl_queue(domain);

CREATE TABLE IF NOT EXISTS public.rss_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    feed_url TEXT NOT NULL UNIQUE,
    website_url TEXT,
    category TEXT DEFAULT 'general',
    entity_type TEXT DEFAULT 'news',
    region TEXT DEFAULT 'Chapecó/SC',
    is_active BOOLEAN DEFAULT true,
    last_fetched_at TIMESTAMPTZ,
    items_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scraper_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain_pattern TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL DEFAULT 'news',
    selectors JSONB DEFAULT '{}'::jsonb,
    requires_javascript BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    success_count INT DEFAULT 0,
    fail_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.domain_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    robots_txt TEXT,
    robots_allows_crawl BOOLEAN DEFAULT true,
    crawl_delay_seconds INT DEFAULT 2,
    max_requests_per_day INT DEFAULT 1000,
    requests_today INT DEFAULT 0,
    total_requests INT DEFAULT 0,
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    last_request_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crawl_seeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    seed_url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    entity_type TEXT DEFAULT 'news',
    category TEXT DEFAULT 'general',
    region TEXT DEFAULT 'Chapecó/SC',
    is_active BOOLEAN DEFAULT true,
    priority INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. SIMLABS & AI BRAIN MASTER
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.simlab_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    archetype TEXT NOT NULL,
    age_range TEXT DEFAULT '25-34',
    income_level TEXT DEFAULT 'B',
    neighborhood TEXT DEFAULT 'Centro',
    habits JSONB DEFAULT '[]'::jsonb,
    price_sensitivity TEXT DEFAULT 'medium',
    tech_literacy TEXT DEFAULT 'high',
    prompt_persona TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simlab_research_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    target_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    target_category_slug TEXT,
    simulated_personas_count INT DEFAULT 10,
    hypotheses JSONB DEFAULT '[]'::jsonb,
    execution_results JSONB DEFAULT '[]'::jsonb,
    summary_insight TEXT,
    status TEXT DEFAULT 'completed', -- draft, running, completed, archived
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_brain_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT DEFAULT 'google',
    default_model TEXT DEFAULT 'gemini-1.5-pro',
    temperature NUMERIC(3, 2) DEFAULT 0.7,
    max_tokens INT DEFAULT 4096,
    system_prompt TEXT,
    fallback_provider TEXT DEFAULT 'anthropic',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_name TEXT NOT NULL,
    role_description TEXT NOT NULL,
    system_instruction TEXT NOT NULL,
    automated_frequency TEXT DEFAULT 'manual',
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMPTZ,
    run_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4. CMS & NICHOS HIPER-ESPECIALIZADOS (VEÍCULOS, IMÓVEIS, OS)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ad_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classified_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE UNIQUE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    fipe_code TEXT,
    year_fab INT,
    year_model INT,
    mileage INT DEFAULT 0,
    fuel_type TEXT DEFAULT 'flex',
    transmission TEXT DEFAULT 'automatic',
    plate_end TEXT,
    color TEXT,
    is_armored BOOLEAN DEFAULT false,
    inspection_approved BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classified_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE UNIQUE,
    property_type TEXT NOT NULL DEFAULT 'apartment',
    area_sqm NUMERIC(10, 2),
    bedrooms INT DEFAULT 1,
    suites INT DEFAULT 0,
    bathrooms INT DEFAULT 1,
    parking_spaces INT DEFAULT 1,
    iptu_cents BIGINT DEFAULT 0,
    condo_fee_cents BIGINT DEFAULT 0,
    accepts_pets BOOLEAN DEFAULT true,
    is_furnished BOOLEAN DEFAULT false,
    virtual_tour_url TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.ad_properties(id) ON DELETE CASCADE,
    applicant_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    monthly_income_cents BIGINT NOT NULL,
    occupation TEXT NOT NULL,
    guarantor_type TEXT DEFAULT 'deposit',
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'submitted', -- submitted, under_review, approved, rejected
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    client_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    equipment_name TEXT NOT NULL,
    serial_number TEXT,
    reported_issue TEXT NOT NULL,
    technical_diagnosis TEXT,
    parts_used JSONB DEFAULT '[]'::jsonb,
    labor_cost_cents BIGINT DEFAULT 0,
    parts_cost_cents BIGINT DEFAULT 0,
    total_cost_cents BIGINT DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, waiting_approval, in_repair, ready_for_pickup, delivered, cancelled
    client_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_orders_store ON public.service_orders(store_id);

-- ----------------------------------------------------------------------------
-- 5. TURISMO, EXCURSÕES, ASSENTOS DE ÔNIBUS & INGRESSOS QR CODE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trip_bus_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bus_type TEXT DEFAULT 'single_deck_46',
    total_seats INT NOT NULL DEFAULT 46,
    floors_count INT DEFAULT 1,
    seat_matrix JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_seat_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES public.tourism_experiences(id) ON DELETE CASCADE,
    bus_layout_id UUID REFERENCES public.trip_bus_layouts(id) ON DELETE SET NULL,
    seat_number INT NOT NULL,
    passenger_name TEXT NOT NULL,
    passenger_doc TEXT NOT NULL,
    passenger_phone TEXT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'confirmed', -- reserved, confirmed, boarded, cancelled
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_reservations_experience ON public.trip_seat_reservations(experience_id);

CREATE TABLE IF NOT EXISTS public.trip_rooming_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experience_id UUID NOT NULL REFERENCES public.tourism_experiences(id) ON DELETE CASCADE,
    hotel_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_type TEXT DEFAULT 'double_twin',
    guests JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_ticket_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    batch_name TEXT NOT NULL,
    price_cents BIGINT NOT NULL DEFAULT 0,
    quantity_available INT NOT NULL DEFAULT 100,
    quantity_sold INT DEFAULT 0,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    ticket_batch_id UUID REFERENCES public.event_ticket_batches(id) ON DELETE SET NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    attendee_name TEXT NOT NULL,
    attendee_doc TEXT NOT NULL,
    qr_code_hash TEXT NOT NULL UNIQUE,
    is_checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    checked_in_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_checkins_hash ON public.event_checkins(qr_code_hash);

-- ----------------------------------------------------------------------------
-- 6. B2B & PAINÉIS RECURSIVOS (CONTADOR & RH)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_accountant_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    accountant_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    accountant_email TEXT NOT NULL,
    accountant_crc TEXT,
    permissions JSONB DEFAULT '{"view_dre": true, "view_invoices": true, "view_settlement": true, "download_xml": true}'::jsonb,
    status TEXT DEFAULT 'active', -- invited, active, suspended, revoked
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accountant_store ON public.store_accountant_access(store_id);
CREATE INDEX IF NOT EXISTS idx_accountant_profile ON public.store_accountant_access(accountant_profile_id);

CREATE TABLE IF NOT EXISTS public.store_hr_delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    agency_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"screen_candidates": true, "schedule_interviews": true, "rank_resumes": true}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. VERIFICAÇÃO KYC & SELOS OFICIAIS MULTI-NÍVEL
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL DEFAULT 'individual', -- individual, lawyer, accountant, doctor, driver, company
    registration_number TEXT,
    registration_state TEXT,
    document_front_url TEXT,
    document_back_url TEXT,
    selfie_url TEXT,
    proof_of_address_url TEXT,
    company_contract_url TEXT,
    status TEXT DEFAULT 'under_review', -- pending_submission, under_review, verified, rejected
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    badge_granted TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_profile ON public.kyc_verifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON public.kyc_verifications(status);

-- ----------------------------------------------------------------------------
-- 8. EXTENSÃO DO CHAT EXISTENTE
-- ----------------------------------------------------------------------------

ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'customer_store';
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS last_message_text TEXT;
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- Conversas inbound de canais externos podem ter apenas guest_name no primeiro
-- evento; não devem inventar um e-mail técnico para satisfazer a constraint.
ALTER TABLE public.chat_threads DROP CONSTRAINT IF EXISTS customer_or_guest;
ALTER TABLE public.chat_threads
  ADD CONSTRAINT customer_or_guest CHECK (
    customer_id IS NOT NULL OR guest_email IS NOT NULL OR guest_name IS NOT NULL
  );

ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- ----------------------------------------------------------------------------
-- RLS POLICIES (DENY-BY-DEFAULT & ROBUST TENANCY)
-- ----------------------------------------------------------------------------

ALTER TABLE public.mined_lawsuits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawsuit_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jus_demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jus_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jus_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jus_lawyer_teams ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.crawl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rss_feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_seeds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.simlab_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simlab_research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_brain_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_squads ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trip_bus_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_seat_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_rooming_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.store_accountant_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_hr_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

-- Public reads for discovery / marketplace
CREATE POLICY "mined_lawsuits_public_read" ON public.mined_lawsuits FOR SELECT USING (true);
CREATE POLICY "lawsuit_movements_public_read" ON public.lawsuit_movements FOR SELECT USING (true);
CREATE POLICY "jus_demands_public_read" ON public.jus_demands FOR SELECT USING (true);
CREATE POLICY "rss_feeds_public_read" ON public.rss_feeds FOR SELECT USING (true);
CREATE POLICY "simlab_personas_public_read" ON public.simlab_personas FOR SELECT USING (true);
CREATE POLICY "ad_vehicles_public_read" ON public.ad_vehicles FOR SELECT USING (true);
CREATE POLICY "ad_properties_public_read" ON public.ad_properties FOR SELECT USING (true);
CREATE POLICY "trip_bus_layouts_public_read" ON public.trip_bus_layouts FOR SELECT USING (true);
CREATE POLICY "trip_seat_reservations_public_read" ON public.trip_seat_reservations FOR SELECT USING (true);
CREATE POLICY "event_ticket_batches_public_read" ON public.event_ticket_batches FOR SELECT USING (true);

-- Authenticated creation / mutations
CREATE POLICY "jus_demands_user_mutate" ON public.jus_demands FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "jus_proposals_lawyer_mutate" ON public.jus_proposals FOR ALL USING (auth.uid() = lawyer_profile_id);
CREATE POLICY "jus_contracts_parties_read" ON public.jus_contracts FOR SELECT USING (auth.uid() = client_profile_id OR auth.uid() = lawyer_profile_id);
CREATE POLICY "kyc_verifications_user_mutate" ON public.kyc_verifications FOR ALL USING (auth.uid() = profile_id);

-- Workspace members policies
CREATE POLICY "service_orders_store_members" ON public.service_orders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = service_orders.store_id AND wm.profile_id = auth.uid())
);

CREATE POLICY "trip_bus_layouts_store_members" ON public.trip_bus_layouts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = trip_bus_layouts.store_id AND wm.profile_id = auth.uid())
);

CREATE POLICY "accountant_access_parties" ON public.store_accountant_access FOR ALL USING (
    auth.uid() = accountant_profile_id OR 
    EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = store_accountant_access.store_id AND wm.profile_id = auth.uid())
);

-- Admin Master bypass for all tables
CREATE POLICY "admin_master_all_access_jus_demands" ON public.jus_demands FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'master', 'platform_admin'))
);
CREATE POLICY "admin_master_all_access_crawl_queue" ON public.crawl_queue FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'master', 'platform_admin'))
);
CREATE POLICY "admin_master_all_access_kyc" ON public.kyc_verifications FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'master', 'platform_admin'))
);

-- ----------------------------------------------------------------------------
-- SEEDS INICIAIS DE RECURSOS E FEEDS
-- ----------------------------------------------------------------------------

INSERT INTO public.rss_feeds (name, feed_url, category, entity_type, region)
VALUES 
('G1 Chapecó & Oeste Catarinense', 'https://g1.globo.com/rss/sc/santa-catarina/chapeco-regiao.xml', 'noticias', 'news', 'Chapecó/SC'),
('Prefeitura Municipal de Chapecó', 'https://chapeco.sc.gov.br/feed', 'institucional', 'news', 'Chapecó/SC'),
('Diário Oficial dos Municípios (DOM/SC)', 'https://www.diariomunicipal.sc.gov.br/rss', 'juridico', 'news', 'Santa Catarina')
ON CONFLICT (feed_url) DO NOTHING;

INSERT INTO public.simlab_personas (name, archetype, age_range, income_level, neighborhood, habits, prompt_persona)
VALUES 
('Dona Maria (Compradora Cautelosa)', 'Dona de Casa Tradicional', '45-55', 'C', 'Efapi', '["compras de supermercado à vista", "pesquisa de ofertas", "prefere entrega agendada"]'::jsonb, 'Você é Maria, 52 anos, moradora do bairro Efapi em Chapecó. Valoriza economia, clareza no frete e atendimento via WhatsApp.'),
('Lucas (Universitário & Notívago)', 'Jovem Tecnológico', '18-24', 'D', 'Universitário', '["delivery noturno", "pagamento via Pix instantâneo", "compra de cursos e tecnologia"]'::jsonb, 'Você é Lucas, estudante da UFFS. Quer rapidez, praticidade no mobile e ofertas relâmpago de lanches e eletrônicos.'),
('Dr. Roberto (Empresário & Profissional)', 'Investidor Local', '35-45', 'A', 'Centro', '["contratação de serviços jurídicos", "viagens de negócios", "gastronomia premium"]'::jsonb, 'Você é Roberto, empresário no Centro. Exige pontualidade, nota fiscal imediata e profissionais verificados com OAB/CRC.')
ON CONFLICT DO NOTHING;
