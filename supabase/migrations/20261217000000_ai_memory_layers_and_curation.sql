-- ==============================================================================
-- Migration: 20261217000000_ai_memory_layers_and_curation.sql
-- Prompt 24: Memória, Perfil do Cliente e Curadoria
--
-- Implementa as 5 camadas de memória de IA (session, user, brand, niche, product),
-- conteúdo curado com fluxo de revisão, e configurações de tom de voz da marca.
-- ==============================================================================

-- 1. Tabela: ai_memory_layers (5 Camadas de Memória com RLS Soberano)
CREATE TABLE IF NOT EXISTS public.ai_memory_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_type VARCHAR(32) NOT NULL CHECK (layer_type IN ('session', 'user', 'brand', 'niche', 'product')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  session_id TEXT,
  niche VARCHAR(64),
  product_id UUID,
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  context_source TEXT NOT NULL, -- Ex: 'conversa', 'acao_compra', 'brand_kit', 'pesquisa'
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.850,
  is_sensitive BOOLEAN NOT NULL DEFAULT false,
  consent_granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Regra Dura: Memória sem dono é proibida (exceto se camada setorial/niche global)
  CONSTRAINT chk_ai_memory_owner CHECK (
    owner_user_id IS NOT NULL OR 
    owner_store_id IS NOT NULL OR 
    session_id IS NOT NULL OR 
    layer_type = 'niche'
  )
);

CREATE INDEX IF NOT EXISTS idx_ai_memory_user ON public.ai_memory_layers(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_memory_store ON public.ai_memory_layers(owner_store_id) WHERE owner_store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_memory_session ON public.ai_memory_layers(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_memory_layer ON public.ai_memory_layers(layer_type, memory_key);

-- 2. Tabela: ai_curated_content (Curadoria com Estados: Propor -> Revisar -> Aprovar -> Versionar)
CREATE TABLE IF NOT EXISTS public.ai_curated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'under_review', 'approved', 'unpublished')),
  version INT NOT NULL DEFAULT 1,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_curated_store ON public.ai_curated_content(store_id, status);

-- 3. Tabela: ai_brand_voice_settings (Tom de Voz e Persona Declarativa da Loja)
CREATE TABLE IF NOT EXISTS public.ai_brand_voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  persona_name TEXT NOT NULL DEFAULT 'Especialista Waesy',
  formality VARCHAR(32) NOT NULL DEFAULT 'consultative' CHECK (formality IN ('casual', 'consultative', 'formal', 'technical')),
  verbosity VARCHAR(32) NOT NULL DEFAULT 'concise' CHECK (verbosity IN ('concise', 'balanced', 'detailed')),
  approved_examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Habilitação de RLS em todas as novas tabelas
ALTER TABLE public.ai_memory_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_curated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_brand_voice_settings ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para ai_memory_layers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_memory_layers' AND policyname = 'ai_memory_user_self'
  ) THEN
    CREATE POLICY "ai_memory_user_self"
      ON public.ai_memory_layers
      FOR ALL
      USING (owner_user_id = auth.uid())
      WITH CHECK (owner_user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_curated_content' AND policyname = 'ai_curated_store_staff'
  ) THEN
    CREATE POLICY "ai_curated_store_staff"
      ON public.ai_curated_content
      FOR ALL
      USING (
        public.is_store_staff(store_id)
      )
      WITH CHECK (
        public.is_store_staff(store_id)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_brand_voice_settings' AND policyname = 'ai_brand_voice_store_staff'
  ) THEN
    CREATE POLICY "ai_brand_voice_store_staff"
      ON public.ai_brand_voice_settings
      FOR ALL
      USING (
        public.is_store_staff(store_id)
      )
      WITH CHECK (
        public.is_store_staff(store_id)
      );
  END IF;
END $$;
