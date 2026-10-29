-- ==============================================================================
-- INTRANET CORPORATIVA REALTIME (ESTILO SLACK) — TABELAS & POLÍTICAS RLS
-- ==============================================================================

-- 1. Canais e Setores Internos
CREATE TABLE IF NOT EXISTS public.intranet_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  department text NOT NULL DEFAULT 'Geral',
  scope text NOT NULL DEFAULT 'public' CHECK (scope IN ('public', 'private', 'direct')),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Mensagens da Intranet
CREATE TABLE IF NOT EXISTS public.intranet_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.intranet_channels(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_role text,
  content text NOT NULL,
  milestone_id uuid,
  artifact_type text,
  artifact_payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3. Marcos Operacionais da Linha do Tempo
CREATE TABLE IF NOT EXISTS public.intranet_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.intranet_channels(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  label text NOT NULL,
  time_label text,
  done boolean DEFAULT false,
  detail text,
  created_at timestamptz DEFAULT now()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_intranet_channels_store ON public.intranet_channels(store_id, department);
CREATE INDEX IF NOT EXISTS idx_intranet_messages_channel ON public.intranet_messages(channel_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_intranet_milestones_channel ON public.intranet_milestones(channel_id, created_at ASC);

-- RLS Habilitação
ALTER TABLE public.intranet_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intranet_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intranet_milestones ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para intranet_channels
DROP POLICY IF EXISTS "intranet_channels_member_select" ON public.intranet_channels;
CREATE POLICY "intranet_channels_member_select" ON public.intranet_channels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = intranet_channels.store_id
        AND sm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = intranet_channels.store_id
        AND s.owner_profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "intranet_channels_member_insert" ON public.intranet_channels;
CREATE POLICY "intranet_channels_member_insert" ON public.intranet_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = intranet_channels.store_id
        AND sm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = intranet_channels.store_id
        AND s.owner_profile_id = (SELECT auth.uid())
    )
  );

-- Políticas de RLS para intranet_messages
DROP POLICY IF EXISTS "intranet_messages_member_select" ON public.intranet_messages;
CREATE POLICY "intranet_messages_member_select" ON public.intranet_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = intranet_messages.store_id
        AND sm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = intranet_messages.store_id
        AND s.owner_profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "intranet_messages_member_insert" ON public.intranet_messages;
CREATE POLICY "intranet_messages_member_insert" ON public.intranet_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = intranet_messages.store_id
        AND sm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = intranet_messages.store_id
        AND s.owner_profile_id = (SELECT auth.uid())
    )
  );

-- Políticas de RLS para intranet_milestones
DROP POLICY IF EXISTS "intranet_milestones_member_all" ON public.intranet_milestones;
CREATE POLICY "intranet_milestones_member_all" ON public.intranet_milestones
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sm
      WHERE sm.store_id = intranet_milestones.store_id
        AND sm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = intranet_milestones.store_id
        AND s.owner_profile_id = (SELECT auth.uid())
    )
  );
