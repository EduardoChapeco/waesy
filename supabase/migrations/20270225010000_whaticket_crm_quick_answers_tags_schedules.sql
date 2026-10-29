-- ======================================================================
-- Migration: 20270225000000_whaticket_crm_quick_answers_tags_schedules.sql
-- Whaticket CRM Convergence: Respostas Rápidas, Tags/Kanban de Atendimento e Mensagens Agendadas
-- ======================================================================

-- 1. Respostas Rápidas / Macros Customizáveis por Loja
CREATE TABLE IF NOT EXISTS public.store_quick_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  media_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_store_quick_answers_shortcut UNIQUE (store_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_store_quick_answers_store_category
  ON public.store_quick_answers (store_id, category);

CREATE INDEX IF NOT EXISTS idx_store_quick_answers_shortcut
  ON public.store_quick_answers (store_id, shortcut);

-- 2. Etiquetas / Tags de Atendimento
CREATE TABLE IF NOT EXISTS public.chat_thread_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#6366f1',
  is_kanban_column BOOLEAN NOT NULL DEFAULT false,
  kanban_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chat_thread_tags_store_name UNIQUE (store_id, name)
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_tags_store_kanban
  ON public.chat_thread_tags (store_id, is_kanban_column, kanban_order);

-- 3. Atribuição de Tags a Conversas (Pivot)
CREATE TABLE IF NOT EXISTS public.chat_thread_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.chat_thread_tags(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_chat_thread_tag_assignment UNIQUE (thread_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_thread_tag_assignments_thread
  ON public.chat_thread_tag_assignments (thread_id);

CREATE INDEX IF NOT EXISTS idx_chat_thread_tag_assignments_store_tag
  ON public.chat_thread_tag_assignments (store_id, tag_id);

-- 4. Mensagens WhatsApp Agendadas (Follow-up / Lembretes)
CREATE TABLE IF NOT EXISTS public.whatsapp_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  channel_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  recipient_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'cancelled', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_messages_claimable
  ON public.whatsapp_scheduled_messages (status, scheduled_for)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_whatsapp_scheduled_messages_thread
  ON public.whatsapp_scheduled_messages (store_id, thread_id, scheduled_for DESC);

-- RLS: Habilitar e forçar em todas as tabelas
ALTER TABLE public.store_quick_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_quick_answers FORCE ROW LEVEL SECURITY;

ALTER TABLE public.chat_thread_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_tags FORCE ROW LEVEL SECURITY;

ALTER TABLE public.chat_thread_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_tag_assignments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_scheduled_messages FORCE ROW LEVEL SECURITY;

-- Políticas de RLS por Store Tenant
DROP POLICY IF EXISTS store_quick_answers_tenant_isolation ON public.store_quick_answers;
CREATE POLICY store_quick_answers_tenant_isolation ON public.store_quick_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sc
      WHERE sc.store_id = store_quick_answers.store_id
        AND sc.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master')
    )
  );

DROP POLICY IF EXISTS chat_thread_tags_tenant_isolation ON public.chat_thread_tags;
CREATE POLICY chat_thread_tags_tenant_isolation ON public.chat_thread_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sc
      WHERE sc.store_id = chat_thread_tags.store_id
        AND sc.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master')
    )
  );

DROP POLICY IF EXISTS chat_thread_tag_assignments_tenant_isolation ON public.chat_thread_tag_assignments;
CREATE POLICY chat_thread_tag_assignments_tenant_isolation ON public.chat_thread_tag_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sc
      WHERE sc.store_id = chat_thread_tag_assignments.store_id
        AND sc.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master')
    )
  );

DROP POLICY IF EXISTS whatsapp_scheduled_messages_tenant_isolation ON public.whatsapp_scheduled_messages;
CREATE POLICY whatsapp_scheduled_messages_tenant_isolation ON public.whatsapp_scheduled_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members sc
      WHERE sc.store_id = whatsapp_scheduled_messages.store_id
        AND sc.profile_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('platform_admin', 'master')
    )
  );
