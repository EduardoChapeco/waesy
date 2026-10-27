-- ============================================================================
-- Migration: 20270125000003_fix_events_public_rls_and_sources.sql
-- Descrição: Desbloqueio da leitura pública da tabela events e adição de fontes de eventos
-- Corrige o erro 42501 (permission denied for function has_workspace_role) em consultas anon
-- ============================================================================

-- 1. Garante permissão de execução na função has_workspace_role
GRANT EXECUTE ON FUNCTION public.has_workspace_role(UUID, TEXT[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_store_staff(UUID) TO anon, authenticated, service_role;

-- 2. Refatora as policies da tabela events para não interceptar SELECT anônimo
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública irrestrita para eventos publicados
DROP POLICY IF EXISTS "events_public_read_published" ON public.events;
CREATE POLICY "events_public_read_published" ON public.events
  FOR SELECT
  USING (status = 'published');

-- Leitura de rascunhos apenas para a equipe da loja
DROP POLICY IF EXISTS "events_staff_read" ON public.events;
CREATE POLICY "events_staff_read" ON public.events
  FOR SELECT
  TO authenticated
  USING (public.is_store_staff(store_id));

-- Escrita restrita a staff autenticado (evita verificação inútil em SELECT anônimo)
DROP POLICY IF EXISTS "events_staff_write" ON public.events;
CREATE POLICY "events_staff_write_insert" ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_workspace_role(store_id, ARRAY['owner', 'admin', 'manager', 'content']));

CREATE POLICY "events_staff_write_update" ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner', 'admin', 'manager', 'content']))
  WITH CHECK (public.has_workspace_role(store_id, ARRAY['owner', 'admin', 'manager', 'content']));

CREATE POLICY "events_staff_write_delete" ON public.events
  FOR DELETE
  TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner', 'admin', 'manager', 'content']));

-- Acesso irrestrito para service_role
DROP POLICY IF EXISTS "events_service_role_all" ON public.events;
CREATE POLICY "events_service_role_all" ON public.events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Injeta fontes reais de agenda cultural de Santa Catarina no catálogo
INSERT INTO public.crawler_sources (name, url, type, category, region, priority, fetch_interval_minutes, config)
VALUES
  (
    'Fundação Cultural de Chapecó — Eventos e Editais',
    'https://chapeco.sc.gov.br/cultura/eventos',
    'news',
    'agenda_cultural',
    'Chapecó/SC',
    9,
    180,
    '{"website_url": "https://chapeco.sc.gov.br", "city": "Chapecó", "state": "SC"}'::jsonb
  ),
  (
    'Sympla Santa Catarina — Feiras, Congressos e Shows',
    'https://www.sympla.com.br/eventos/chapeco-sc',
    'news',
    'agenda_cultural',
    'Chapecó/SC',
    8,
    360,
    '{"website_url": "https://www.sympla.com.br", "city": "Chapecó", "state": "SC"}'::jsonb
  ),
  (
    'Balcão de Empregos Chapecó — Oportunidades Oficiais',
    'https://balcaodeempregos.chapeco.sc.gov.br/vagas',
    'jobs_portal',
    'vagas_locais',
    'Chapecó/SC',
    10,
    120,
    '{"website_url": "https://balcaodeempregos.chapeco.sc.gov.br", "city": "Chapecó", "state": "SC"}'::jsonb
  ),
  (
    'SINE Santa Catarina — Portal de Emprego Regional',
    'https://www.sine.net.br/vagas-empregos-em-chapeco-sc',
    'jobs_portal',
    'vagas_locais',
    'Chapecó/SC',
    9,
    180,
    '{"website_url": "https://www.sine.net.br", "city": "Chapecó", "state": "SC"}'::jsonb
  )
ON CONFLICT (url) DO UPDATE SET
  name = EXCLUDED.name,
  priority = EXCLUDED.priority,
  is_active = true,
  fetch_interval_minutes = EXCLUDED.fetch_interval_minutes;

-- 4. RLS para crawler_sources (desbloqueia leitura pública e acesso irrestrito para service_role)
ALTER TABLE public.crawler_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crawler_sources_service_role" ON public.crawler_sources;
CREATE POLICY "crawler_sources_service_role" ON public.crawler_sources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "crawler_sources_public_read" ON public.crawler_sources;
CREATE POLICY "crawler_sources_public_read" ON public.crawler_sources
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

