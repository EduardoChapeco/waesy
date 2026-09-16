-- ==============================================================================
-- MIGRAÇÃO: Colunas faltantes em tourism_experiences (bug de criação de excursão)
-- BFF group-tours.functions.ts inseria destination_city e available_seats
-- que não existiam na tabela → erro PostgREST 400.
-- ==============================================================================

ALTER TABLE public.tourism_experiences
  ADD COLUMN IF NOT EXISTS destination_city TEXT,
  ADD COLUMN IF NOT EXISTS available_seats INTEGER;

UPDATE public.tourism_experiences
SET
  destination_city = COALESCE(destination_city, destination, location),
  available_seats  = COALESCE(available_seats, total_seats)
WHERE destination_city IS NULL OR available_seats IS NULL;

CREATE INDEX IF NOT EXISTS idx_tourism_experiences_destination_city
  ON public.tourism_experiences (destination_city)
  WHERE destination_city IS NOT NULL;
