-- ==============================================================================
-- MIGRATION: 20270220000000_events_crud_lifecycle_and_civilian_portal.sql
-- Invariantes AGENTS.md B.1 a B.45 | GAP-01 & GAP-02 & Microfases 1.1 e 1.2
-- Adiciona suporte a soft delete, arquivamento, visibilidade, stories 9:16
-- e posse de eventos por usuários civis (pessoa física sem loja).
-- ==============================================================================

-- 1. Colunas de Ciclo de Vida e Stories em events
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS story_media_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS story_media_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS story_auto_open boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Tenant opcional para eventos de pessoa física / criador civil
ALTER TABLE public.events ALTER COLUMN store_id DROP NOT NULL;

-- Invariante de integridade: todo evento deve pertencer a uma loja OU a um autor civil
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_owner_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_owner_check CHECK (store_id IS NOT NULL OR author_profile_id IS NOT NULL);

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_events_author_profile ON public.events (author_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_active_store ON public.events (store_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events (visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_events_archived ON public.events (archived_at) WHERE deleted_at IS NULL;

-- 4. RLS para Eventos Civis
DROP POLICY IF EXISTS "events_civilian_read_own" ON public.events;
CREATE POLICY "events_civilian_read_own" ON public.events
  FOR SELECT TO authenticated
  USING (author_profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "events_civilian_write_own" ON public.events;
CREATE POLICY "events_civilian_write_own" ON public.events
  FOR ALL TO authenticated
  USING (author_profile_id = (SELECT auth.uid()))
  WITH CHECK (author_profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "events_public_read_published" ON public.events;
CREATE POLICY "events_public_read_published" ON public.events
  FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

DROP POLICY IF EXISTS "events_select_public" ON public.events;
CREATE POLICY "events_select_public" ON public.events
  FOR SELECT
  USING (deleted_at IS NULL);

-- 5. RLS para Lotes de Ingressos de Criadores Civis
DROP POLICY IF EXISTS "ticket_lots_civilian_all" ON public.ticket_lots;
CREATE POLICY "ticket_lots_civilian_all" ON public.ticket_lots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_lots.event_id AND e.author_profile_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_lots.event_id AND e.author_profile_id = (SELECT auth.uid())
  ));
