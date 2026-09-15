-- =========================================================================
-- WAESY PLATFORM MIGRATION: 20261028000000_core_forensic_parity_and_gap_resolution.sql
-- Description: Paridade forense de schemas de dados reais (Stores, Invoices, Classifieds, Tourism, Raffles)
-- =========================================================================

-- 1. STORES: Coluna dedicada banner_url sincronizada com settings
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS banner_url text;

UPDATE public.stores 
SET banner_url = COALESCE(settings->>'cover_url', settings->>'banner_url') 
WHERE banner_url IS NULL AND (settings ? 'cover_url' OR settings ? 'banner_url');

-- 2. PLATFORM_INVOICES: receipt_url para comprovante de pagamento e notas
ALTER TABLE public.platform_invoices 
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS notes text;

-- 3. CLASSIFIEDS: Colunas de indexação de nicho e doação solidária
ALTER TABLE public.classifieds 
ADD COLUMN IF NOT EXISTS niche_category text,
ADD COLUMN IF NOT EXISTS is_free_donation boolean DEFAULT false;

UPDATE public.classifieds 
SET niche_category = attributes->>'niche_category' 
WHERE niche_category IS NULL AND attributes ? 'niche_category';

UPDATE public.classifieds 
SET is_free_donation = COALESCE((attributes->>'is_free_donation')::boolean, price_cents = 0) 
WHERE is_free_donation IS NULL;

-- 4. TOURISM_EXPERIENCES: Colunas canônicas para assentos disponíveis e cidade de destino
ALTER TABLE public.tourism_experiences 
ADD COLUMN IF NOT EXISTS available_seats integer,
ADD COLUMN IF NOT EXISTS destination_city text;

UPDATE public.tourism_experiences 
SET destination_city = destination 
WHERE destination_city IS NULL AND destination IS NOT NULL;

UPDATE public.tourism_experiences 
SET available_seats = total_seats 
WHERE available_seats IS NULL AND total_seats IS NOT NULL;

-- 5. RAFFLES: Entropia criptográfica e semente de auditoria
ALTER TABLE public.raffles 
ADD COLUMN IF NOT EXISTS draw_seed text,
ADD COLUMN IF NOT EXISTS entropy_hash text;

-- Notificação para PostgREST
NOTIFY pgrst, 'reload schema';
