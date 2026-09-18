-- ============================================================================
-- Migration: Consórcio de Imprensa, Rede Display de Patrocinadores & Link Mágico
-- ============================================================================

-- 1. EXTENSÃO DA TABELA DE PATROCINADORES (sponsors)
ALTER TABLE public.sponsors ADD COLUMN IF NOT EXISTS magic_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.sponsors ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.sponsors ADD COLUMN IF NOT EXISTS sponsor_store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;
ALTER TABLE public.sponsors ADD COLUMN IF NOT EXISTS sponsor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Garante que todo patrocinador existente possua um magic_token único
UPDATE public.sponsors SET magic_token = gen_random_uuid() WHERE magic_token IS NULL;

-- Índice único para busca instantânea por Link Mágico
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsors_magic_token ON public.sponsors(magic_token);
CREATE INDEX IF NOT EXISTS idx_sponsors_sponsor_store ON public.sponsors(sponsor_store_id);

-- 2. EXTENSÃO DA TABELA DE LOJAS (stores) PARA CONSÓRCIO DE IMPRENSA
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_press_consortium BOOLEAN DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS press_accreditation_status TEXT DEFAULT 'unaccredited' 
  CHECK (press_accreditation_status IN ('unaccredited', 'pending', 'approved', 'revoked'));
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS press_approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_stores_press_consortium ON public.stores(is_press_consortium, press_accreditation_status);

-- 3. POLÍTICA RLS PARA LINK MÁGICO PÚBLICO DE RESULTADOS DO PATROCINADOR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sponsors' AND policyname = 'sponsors_magic_token_public_read'
  ) THEN
    CREATE POLICY "sponsors_magic_token_public_read" ON public.sponsors
      FOR SELECT USING (magic_token IS NOT NULL);
  END IF;
END $$;
