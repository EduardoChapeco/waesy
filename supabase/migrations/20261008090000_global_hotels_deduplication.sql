-- Banco canônico de hotéis e resorts para deduplicação global.
-- A tabela hotels_bank existente permanece como fonte legada durante a migração.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.global_hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  canonical_slug TEXT NOT NULL UNIQUE,
  normalized_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'Brasil',
  address TEXT,
  stars INTEGER CHECK (stars BETWEEN 1 AND 5),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  verified_by_master BOOLEAN NOT NULL DEFAULT false,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_hotels_normalized_name_trgm
  ON public.global_hotels USING gin (normalized_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_global_hotels_destination
  ON public.global_hotels (country, state, city);
CREATE INDEX IF NOT EXISTS idx_global_hotels_verified
  ON public.global_hotels (verified_by_master) WHERE verified_by_master = true;

ALTER TABLE public.hotels_bank
  ADD COLUMN IF NOT EXISTS global_hotel_id UUID REFERENCES public.global_hotels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hotels_bank_global_hotel_id
  ON public.hotels_bank (global_hotel_id);

CREATE TABLE IF NOT EXISTS public.hotel_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_hotel_id UUID NOT NULL REFERENCES public.global_hotels(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (global_hotel_id, normalized_alias),
  UNIQUE (normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_hotel_aliases_normalized_trgm
  ON public.hotel_aliases USING gin (normalized_alias gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.hotel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_hotel_id UUID NOT NULL REFERENCES public.global_hotels(id) ON DELETE CASCADE,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hotel_rating NUMERIC(2,1) CHECK (hotel_rating BETWEEN 0 AND 5),
  destination_rating NUMERIC(2,1) CHECK (destination_rating BETWEEN 0 AND 5),
  agency_service_rating NUMERIC(2,1) CHECK (agency_service_rating BETWEEN 0 AND 5),
  comment TEXT NOT NULL,
  classifier_status TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (classifier_status IN ('needs_review', 'classified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS global_hotels_public_read ON public.global_hotels;
CREATE POLICY global_hotels_public_read ON public.global_hotels
  FOR SELECT USING (verified_by_master = true);

DROP POLICY IF EXISTS global_hotels_master_write ON public.global_hotels;
CREATE POLICY global_hotels_master_write ON public.global_hotels
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin', 'superadmin')));

DROP POLICY IF EXISTS hotel_aliases_public_read ON public.hotel_aliases;
CREATE POLICY hotel_aliases_public_read ON public.hotel_aliases
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.global_hotels gh
    WHERE gh.id = hotel_aliases.global_hotel_id AND gh.verified_by_master = true
  ));

DROP POLICY IF EXISTS hotel_aliases_master_write ON public.hotel_aliases;
CREATE POLICY hotel_aliases_master_write ON public.hotel_aliases
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin', 'superadmin')));

DROP POLICY IF EXISTS hotel_reviews_public_read ON public.hotel_reviews;
CREATE POLICY hotel_reviews_public_read ON public.hotel_reviews
  FOR SELECT USING (classifier_status = 'classified');

DROP POLICY IF EXISTS hotel_reviews_authenticated_insert ON public.hotel_reviews;
CREATE POLICY hotel_reviews_authenticated_insert ON public.hotel_reviews
  FOR INSERT TO authenticated
  WITH CHECK (author_profile_id = auth.uid());

DROP POLICY IF EXISTS hotel_reviews_master_classify ON public.hotel_reviews;
CREATE POLICY hotel_reviews_master_classify ON public.hotel_reviews
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin', 'superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin', 'superadmin')));

COMMENT ON TABLE public.global_hotels IS 'Registro canônico global de hotéis; nenhum tenant cria duplicatas diretamente.';
COMMENT ON TABLE public.hotel_aliases IS 'Nomes alternativos deduplicados e controlados pelo Admin Master.';
COMMENT ON TABLE public.hotel_reviews IS 'Avaliações separadas por hotel, destino e atendimento da agência.';
