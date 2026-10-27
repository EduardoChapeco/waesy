-- ============================================================================
-- WAESY EDITORIAL SOCIAL AUTOMATION, INSTAGRAM SCHEDULER & PAYWALL
-- Agendamento automatizado para Instagram Feed/Stories, lâmina final fixa,
-- fluxo de redação (em apuração/apurado/publicado) e monetização por membros.
-- ============================================================================

-- 1. EVOLUÇÃO DE public.news_articles (Estágio Editorial & Assinantes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'editorial_stage'
  ) THEN
    ALTER TABLE public.news_articles 
      ADD COLUMN editorial_stage TEXT NOT NULL DEFAULT 'publicado' 
      CHECK (editorial_stage IN ('em_apuracao', 'apurado', 'publicado', 'oculto'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'is_members_only'
  ) THEN
    ALTER TABLE public.news_articles 
      ADD COLUMN is_members_only BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'news_articles' AND column_name = 'source_credibility'
  ) THEN
    ALTER TABLE public.news_articles 
      ADD COLUMN source_credibility TEXT DEFAULT 'Oficial / Verificado';
  END IF;
END $$;

-- 2. TABELA DE AGENDAMENTOS E VEICULAÇÕES SOCIAIS EDITORIAIS
CREATE TABLE IF NOT EXISTS public.editorial_social_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  article_id UUID REFERENCES public.news_articles(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('instagram_feed', 'instagram_stories', 'whatsapp_channel', 'multi_channel')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  caption_text TEXT,
  rendered_assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_post_mode TEXT NOT NULL DEFAULT 'manual' CHECK (auto_post_mode IN ('manual', 'daily_scheduled', 'immediate')),
  fixed_ending_slide_url TEXT,
  layout_variant TEXT DEFAULT 'classic_card',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries de fila e histórico de publicações
CREATE INDEX IF NOT EXISTS idx_editorial_social_store_status 
  ON public.editorial_social_schedules(store_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_editorial_social_article 
  ON public.editorial_social_schedules(article_id);

-- 3. TABELA DE CONFIGURAÇÕES DE AUTOMAÇÃO SOCIAL DO PORTAL
CREATE TABLE IF NOT EXISTS public.editorial_social_settings (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  instagram_account_handle TEXT,
  auto_publish_stories_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_publish_feed_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_stories_time TEXT DEFAULT '08:00',
  fixed_ending_slide_url TEXT,
  random_layouts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. POLÍTICAS RLS COM ISOLAMENTO MULTI-TENANT ESTRITO
ALTER TABLE public.editorial_social_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_social_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store members can manage their social schedules" ON public.editorial_social_schedules;
CREATE POLICY "Store members can manage their social schedules"
  ON public.editorial_social_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = editorial_social_schedules.store_id
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = editorial_social_schedules.store_id
        AND sm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store members can manage their social settings" ON public.editorial_social_settings;
CREATE POLICY "Store members can manage their social settings"
  ON public.editorial_social_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = editorial_social_settings.store_id
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = editorial_social_settings.store_id
        AND sm.user_id = auth.uid()
    )
  );
