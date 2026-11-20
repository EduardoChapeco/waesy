-- ==============================================================================
-- MIGRAÇÃO: FUNDAÇÃO CANÔNICA DE TURISMO, VEÍCULOS & GRUPOS TERRESTRES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    vehicle_type TEXT NOT NULL DEFAULT 'bus' CHECK (vehicle_type IN ('bus', 'van', 'plane', 'microbus')),
    total_capacity INTEGER NOT NULL DEFAULT 46,
    rows INTEGER NOT NULL DEFAULT 12,
    cols INTEGER NOT NULL DEFAULT 5,
    is_double_decker BOOLEAN NOT NULL DEFAULT false,
    deck1_label TEXT NOT NULL DEFAULT 'Piso Principal',
    deck2_label TEXT DEFAULT 'Piso Superior',
    seat_map JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tourism_experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    vehicle_layout_id UUID REFERENCES public.vehicle_layouts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'group_tour',
    location TEXT,
    destination TEXT,
    departure_city TEXT,
    departure_date TIMESTAMPTZ,
    departure_time TEXT DEFAULT '06:00',
    return_date TIMESTAMPTZ,
    return_time TEXT DEFAULT '20:00',
    duration TEXT,
    price_display TEXT,
    price_cents BIGINT NOT NULL DEFAULT 0,
    total_seats INTEGER NOT NULL DEFAULT 46,
    seats JSONB DEFAULT '[]'::jsonb,
    rooms JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    cover_image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    provider_name TEXT,
    provider_logo_url TEXT,
    contact_whatsapp TEXT,
    rating NUMERIC(3,2) DEFAULT 5.0,
    included_items TEXT[] DEFAULT '{}',
    excluded_items TEXT[] DEFAULT '{}',
    what_to_bring TEXT[] DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'open',
    bus_company_name TEXT,
    bus_plate TEXT,
    driver_name TEXT,
    driver_phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.group_tour_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tour_id UUID NOT NULL REFERENCES public.tourism_experiences(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('transport', 'hotel', 'insurance', 'tickets', 'guide', 'food', 'other')),
    description TEXT NOT NULL,
    cost_cents INTEGER NOT NULL DEFAULT 0,
    is_fixed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tourism_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_tour_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members manage store vehicle layouts" ON public.vehicle_layouts;
CREATE POLICY "Workspace members manage store vehicle layouts"
    ON public.vehicle_layouts
    FOR ALL
    TO authenticated
    USING (
        is_store_staff(store_id)
        OR created_by_profile_id = auth.uid()
    );

DROP POLICY IF EXISTS "Public read vehicle layouts for bookings" ON public.vehicle_layouts;
CREATE POLICY "Public read vehicle layouts for bookings"
    ON public.vehicle_layouts
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Workspace members manage tourism experiences" ON public.tourism_experiences;
CREATE POLICY "Workspace members manage tourism experiences"
    ON public.tourism_experiences
    FOR ALL
    TO authenticated
    USING (
        is_store_staff(store_id)
        OR author_profile_id = auth.uid()
    );

DROP POLICY IF EXISTS "Public read active tourism experiences" ON public.tourism_experiences;
CREATE POLICY "Public read active tourism experiences"
    ON public.tourism_experiences
    FOR SELECT
    USING (status IN ('open', 'published', 'active', 'confirmed'));

DROP POLICY IF EXISTS "Workspace members manage group tour costs" ON public.group_tour_costs;
CREATE POLICY "Workspace members manage group tour costs"
    ON public.group_tour_costs
    FOR ALL
    TO authenticated
    USING (
        tour_id IN (
            SELECT id FROM public.tourism_experiences WHERE is_store_staff(store_id)
        )
    );

CREATE INDEX IF NOT EXISTS idx_vehicle_layouts_store ON public.vehicle_layouts(store_id);
CREATE INDEX IF NOT EXISTS idx_tourism_experiences_store ON public.tourism_experiences(store_id, category);
CREATE INDEX IF NOT EXISTS idx_tourism_experiences_date ON public.tourism_experiences(departure_date);
CREATE INDEX IF NOT EXISTS idx_group_tour_costs_tour ON public.group_tour_costs(tour_id);
