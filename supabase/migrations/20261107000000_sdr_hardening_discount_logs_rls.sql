-- Migration: SDR Hardening, Max Discount, Messages Log & Delivery Type
-- Adds missing columns for the AI SDR agent and classified form improvements.

BEGIN;

-- 1. Adicionar max_discount_pct e delivery_type à tabela classifieds
ALTER TABLE public.classifieds
  ADD COLUMN IF NOT EXISTS max_discount_pct NUMERIC(5,2) DEFAULT 0 CHECK (max_discount_pct >= 0 AND max_discount_pct <= 100),
  ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'local_pickup', 'local_delivery', 'national_shipping', 'both'));

-- Índice para filtros de delivery_type
CREATE INDEX IF NOT EXISTS idx_classifieds_delivery_type ON public.classifieds(delivery_type);

-- 2. Adicionar messages_log à tabela sdr_chat_sessions (log completo de conversa)
ALTER TABLE public.sdr_chat_sessions
  ADD COLUMN IF NOT EXISTS messages_log JSONB DEFAULT '[]'::jsonb;

-- 3. Garantir que updated_at existe na sdr_chat_sessions
ALTER TABLE public.sdr_chat_sessions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Recria trigger caso não exista
DROP TRIGGER IF EXISTS trg_sdr_chat_sessions_updated_at ON public.sdr_chat_sessions;
CREATE TRIGGER trg_sdr_chat_sessions_updated_at
  BEFORE UPDATE ON public.sdr_chat_sessions
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 4. Índice no messages_log para queries JSON (gin)
CREATE INDEX IF NOT EXISTS idx_sdr_chat_sessions_messages_log ON public.sdr_chat_sessions USING gin(messages_log);

-- 5. Política para service_role inserir/atualizar sdr_chat_sessions (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sdr_chat_sessions' 
    AND policyname = 'Service role anon can insert chat sessions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Service role anon can insert chat sessions"
      ON public.sdr_chat_sessions
      FOR INSERT
      TO anon
      WITH CHECK (true)
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sdr_chat_sessions' 
    AND policyname = 'Service role anon can update chat sessions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Service role anon can update chat sessions"
      ON public.sdr_chat_sessions
      FOR UPDATE
      TO anon
      USING (true)
    $policy$;
  END IF;
END $$;

-- 6. Garantir que a RLS de leitura pública de classifieds existe
-- (anon pode ler anúncios ativos)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'classifieds' 
    AND policyname = 'Public can read active classifieds'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public can read active classifieds"
      ON public.classifieds
      FOR SELECT
      TO anon, authenticated
      USING (status IN ('active', 'published', 'reserved') OR author_profile_id = auth.uid())
    $policy$;
  END IF;
END $$;

COMMIT;
