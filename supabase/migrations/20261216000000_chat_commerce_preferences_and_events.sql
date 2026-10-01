-- ==============================================================================
-- Migration: 20261216000000_chat_commerce_preferences_and_events.sql
-- Prompt 22: O Chat como Aplicativo: Comércio, Serviços, Agenda, Orçamentos
--
-- Adiciona suporte a preferências de consumo (mercados, lojas, prestadores favoritos)
-- e índices de telemetria para o chat transacional unificado.
-- ==============================================================================

-- 1. Enriquecimento da tabela user_preferences com preferências de comércio
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS preferred_merchants JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS category_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Comentários descritivos nos campos aditivos
COMMENT ON COLUMN public.user_preferences.preferred_merchants IS 
  'Lista ordenada de lojas, mercados, autônomos e prestadores preferidos do usuário por categoria';

COMMENT ON COLUMN public.user_preferences.category_preferences IS 
  'Configurações por categoria (endereço de entrega padrão, janela horária preferida, restrições)';

-- 2. Garantia de índices para performance nas buscas por preferências e histórico do cliente
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- 3. Garantir políticas RLS idempotentes para user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_self_manage'
  ) THEN
    CREATE POLICY "user_preferences_self_manage"
      ON public.user_preferences
      FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
