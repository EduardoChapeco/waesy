-- 20270228000000_canonical_corporate_travelers_and_trips.sql
-- Declaração canônica de corporate_travelers e travel_trips para garantir contrato BFF e RLS Zero-Trust

CREATE TABLE IF NOT EXISTS public.corporate_travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.corporate_travel_accounts(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    phone TEXT,
    magic_token TEXT,
    magic_token_expires_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.travel_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID,
    company_id UUID REFERENCES public.corporate_travel_accounts(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.travel_projects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    destination TEXT,
    start_date DATE,
    end_date DATE,
    estimated_budget_cents BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_corporate_travelers_company_id ON public.corporate_travelers(company_id);
CREATE INDEX IF NOT EXISTS idx_corporate_travelers_magic_token ON public.corporate_travelers(magic_token) WHERE magic_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_travel_trips_agency_id ON public.travel_trips(agency_id);
CREATE INDEX IF NOT EXISTS idx_travel_trips_company_id ON public.travel_trips(company_id);

-- RLS Habilitado
ALTER TABLE public.corporate_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_trips ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para corporate_travelers
CREATE POLICY "corporate_travelers_select_policy"
    ON public.corporate_travelers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.corporate_travel_members m
            WHERE m.account_id = corporate_travelers.company_id
              AND m.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.profile_id = auth.uid()
              AND sm.role IN ('owner', 'admin', 'collaborator')
        )
    );

CREATE POLICY "corporate_travelers_all_staff_policy"
    ON public.corporate_travelers
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.profile_id = auth.uid()
              AND sm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.profile_id = auth.uid()
              AND sm.role IN ('owner', 'admin')
        )
    );

-- Políticas de RLS para travel_trips
CREATE POLICY "travel_trips_select_policy"
    ON public.travel_trips
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.profile_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.corporate_travel_members m
            WHERE m.account_id = travel_trips.company_id
              AND m.profile_id = auth.uid()
        )
    );

CREATE POLICY "travel_trips_all_staff_policy"
    ON public.travel_trips
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.profile_id = auth.uid()
              AND sm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.profile_id = auth.uid()
              AND sm.role IN ('owner', 'admin')
        )
    );
