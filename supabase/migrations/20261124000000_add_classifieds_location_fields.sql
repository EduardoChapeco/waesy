-- Migration: 20261124000000_add_classifieds_location_fields
-- Adds missing location/privacy fields to classifieds table
-- Required by: getSimilarClassifiedsFallback (selects city, location_name)
--              LGPD privacy masking (hide_location, city, state, neighborhood)
--              Contact display override (contact_name)

ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS hide_location BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contact_name TEXT;

COMMENT ON COLUMN public.classifieds.city IS 'Cidade do anúncio (LGPD: pode ser ocultada via hide_location)';
COMMENT ON COLUMN public.classifieds.state IS 'Estado/UF do anúncio';
COMMENT ON COLUMN public.classifieds.neighborhood IS 'Bairro do anúncio (LGPD: ocultado para visitantes se hide_location=true)';
COMMENT ON COLUMN public.classifieds.hide_location IS 'Se true, mascara cidade/bairro/coordenadas exatas para visitantes (LGPD)';
COMMENT ON COLUMN public.classifieds.contact_name IS 'Nome de exibição público do anunciante (override do perfil)';

CREATE INDEX IF NOT EXISTS idx_classifieds_city ON public.classifieds (city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_classifieds_state ON public.classifieds (state) WHERE state IS NOT NULL;
