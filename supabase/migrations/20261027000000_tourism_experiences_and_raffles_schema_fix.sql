-- 20261027000000_tourism_experiences_and_raffles_schema_fix.sql
-- Fixes tourism_experiences missing columns and restrictive check constraints
-- Fixes raffles updated_at column

-- 1. Tourism Experiences: Add missing fields for group tours and excursions
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS departure_city TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS departure_date TIMESTAMPTZ;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS departure_time TEXT DEFAULT '06:00';
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS return_date TIMESTAMPTZ;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS return_time TEXT DEFAULT '20:00';
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS total_seats INTEGER DEFAULT 46;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS seats JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS bus_company_name TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS bus_plate TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS driver_phone TEXT;
ALTER TABLE public.tourism_experiences ADD COLUMN IF NOT EXISTS excluded_items TEXT[] DEFAULT '{}';

-- Remove obsolete NOT NULL constraints from legacy table definition
ALTER TABLE public.tourism_experiences ALTER COLUMN duration DROP NOT NULL;
ALTER TABLE public.tourism_experiences ALTER COLUMN price_display DROP NOT NULL;
ALTER TABLE public.tourism_experiences ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.tourism_experiences ALTER COLUMN provider_name DROP NOT NULL;
ALTER TABLE public.tourism_experiences ALTER COLUMN contact_whatsapp DROP NOT NULL;
ALTER TABLE public.tourism_experiences ALTER COLUMN location DROP NOT NULL;

-- Update constraints for modern categories and statuses
ALTER TABLE public.tourism_experiences DROP CONSTRAINT IF EXISTS tourism_experiences_category_check;
ALTER TABLE public.tourism_experiences DROP CONSTRAINT IF EXISTS tourism_experiences_status_check;

ALTER TABLE public.tourism_experiences ADD CONSTRAINT tourism_experiences_category_check 
  CHECK (category IN ('passeios', 'hospedagens', 'gastronomia_turistica', 'aventura', 'agencias', 'cultura', 'group_tour', 'excursion', 'travel_package', 'resort'));

ALTER TABLE public.tourism_experiences ADD CONSTRAINT tourism_experiences_status_check 
  CHECK (status IN ('active', 'inactive', 'draft', 'open', 'confirmed', 'closed', 'completed', 'cancelled', 'published'));

-- 2. Raffles: Add updated_at column
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
