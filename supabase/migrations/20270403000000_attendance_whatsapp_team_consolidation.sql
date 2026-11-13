-- ============================================================================
-- MIGRATION: 20270403000000_attendance_whatsapp_team_consolidation.sql
-- DESC: Desbloqueia status 'revoked', exclusão segura de canais WhatsApp,
--       proteção contra número duplicado ativo por loja, extensões
--       operacionais/RH de workspace_members e sincronização 1:1 chat_departments.
-- ============================================================================

-- 1. Atualizar constraint CHECK de whatsapp_channel_instances.status para aceitar 'revoked'
DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'whatsapp_channel_instances'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      AND pg_get_constraintdef(c.oid) ILIKE '%degraded%'
  LOOP
    EXECUTE format('ALTER TABLE public.whatsapp_channel_instances DROP CONSTRAINT IF EXISTS %I', v_con.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'whatsapp_channel_instances'
      AND c.conname = 'whatsapp_channel_instances_status_check'
  ) THEN
    ALTER TABLE public.whatsapp_channel_instances
      ADD CONSTRAINT whatsapp_channel_instances_status_check
      CHECK (status IN ('draft', 'pending', 'connected', 'degraded', 'disconnected', 'disabled', 'error', 'revoked'));
  END IF;
END $$;

-- 2. Alterar FK de whatsapp_outbox.channel_instance_id para ON DELETE SET NULL (destrava exclusão definitiva)
DO $$
DECLARE
  v_fk RECORD;
BEGIN
  FOR v_fk IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'whatsapp_outbox'
      AND c.contype = 'f'
      AND c.confrelid = 'public.whatsapp_channel_instances'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.whatsapp_outbox DROP CONSTRAINT IF EXISTS %I', v_fk.conname);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'whatsapp_outbox'
      AND column_name = 'channel_instance_id'
  ) THEN
    ALTER TABLE public.whatsapp_outbox
      ADD CONSTRAINT fk_whatsapp_outbox_channel_instance
      FOREIGN KEY (channel_instance_id)
      REFERENCES public.whatsapp_channel_instances(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Deduplicação segura prévia + índice único parcial impedindo mesmo número ativo em duas instâncias da mesma loja
DO $$
BEGIN
  WITH ranked_duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY store_id, display_phone_number
        ORDER BY is_default DESC, (status = 'connected') DESC, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.whatsapp_channel_instances
    WHERE display_phone_number IS NOT NULL
      AND status IN ('connected', 'pending')
  )
  UPDATE public.whatsapp_channel_instances w
  SET
    status = 'disconnected',
    is_active = false,
    is_default = false,
    last_error_code = 'DUPLICATE_ACTIVE_PHONE',
    last_error_message = 'Canal desconectado automaticamente durante consolidação para evitar duplicidade do mesmo número na loja.',
    updated_at = now()
  FROM ranked_duplicates rd
  WHERE w.id = rd.id
    AND rd.rn > 1;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_active_phone_per_store
  ON public.whatsapp_channel_instances (store_id, display_phone_number)
  WHERE display_phone_number IS NOT NULL AND status IN ('connected', 'pending');

-- 4. Estender public.chat_departments para roteamento, instância preferencial, turno e triagem IA 1:1
ALTER TABLE public.chat_departments
  ADD COLUMN IF NOT EXISTS routing_mode TEXT NOT NULL DEFAULT 'ai_sdr_first',
  ADD COLUMN IF NOT EXISTS whatsapp_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS schedule_start TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS schedule_end TEXT DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS schedule_days TEXT DEFAULT 'Seg a Sex',
  ADD COLUMN IF NOT EXISTS away_message TEXT,
  ADD COLUMN IF NOT EXISTS auto_greeting_message TEXT,
  ADD COLUMN IF NOT EXISTS ai_sdr_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_sdr_skill_prompt TEXT,
  ADD COLUMN IF NOT EXISTS round_robin_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS assigned_agent_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS ai_triage_stages JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'chat_departments'
      AND c.conname = 'chat_departments_routing_mode_check'
  ) THEN
    ALTER TABLE public.chat_departments
      ADD CONSTRAINT chat_departments_routing_mode_check
      CHECK (routing_mode IN ('ai_sdr_first', 'round_robin', 'least_busy', 'manual_queue'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_departments_store_instance
  ON public.chat_departments (store_id, whatsapp_instance_id);

-- Endurecer RLS em chat_departments mantendo leitura por equipe e escrita restrita a gestão da loja
ALTER TABLE public.chat_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_departments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_departments_staff_write" ON public.chat_departments;
DROP POLICY IF EXISTS "chat_departments_manager_write" ON public.chat_departments;
CREATE POLICY "chat_departments_manager_write" ON public.chat_departments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = chat_departments.store_id
        AND wm.profile_id = (SELECT auth.uid())
        AND wm.role IN ('owner', 'admin', 'manager', 'platform_admin', 'master')
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = chat_departments.store_id
        AND s.organization_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = chat_departments.store_id
        AND wm.profile_id = (SELECT auth.uid())
        AND wm.role IN ('owner', 'admin', 'manager', 'platform_admin', 'master')
    )
    OR EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = chat_departments.store_id
        AND s.organization_id = (SELECT auth.uid())
    )
  );

-- 5. Estender public.workspace_members com vínculo operacional de atendimento e campos reais de contrato
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.chat_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_department_slug TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_attendance_agent BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS attendance_presence TEXT NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS max_concurrent_chats INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS can_transfer_chats BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_close_chats BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_manage_whatsapp_qr BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS only_assigned_or_sector BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'partner_law',
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2) DEFAULT 60,
  ADD COLUMN IF NOT EXISTS fee_bearer TEXT DEFAULT 'proportional',
  ADD COLUMN IF NOT EXISTS can_view_unmasked_contacts BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_deduct_supplies BOOLEAN NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'workspace_members'
      AND c.conname = 'workspace_members_attendance_presence_check'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_attendance_presence_check
      CHECK (attendance_presence IN ('online', 'busy', 'away', 'offline'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'workspace_members'
      AND c.conname = 'workspace_members_max_concurrent_chats_check'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_max_concurrent_chats_check
      CHECK (max_concurrent_chats BETWEEN 1 AND 200);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_workspace_members_store_department
  ON public.workspace_members (store_id, department_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_store_whatsapp_instance
  ON public.workspace_members (store_id, whatsapp_instance_id);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members FORCE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.workspace_members.whatsapp_instance_id IS
  'Canal WhatsApp padrão vinculado ao colaborador para disparos e roteamento prioritário.';
COMMENT ON COLUMN public.workspace_members.department_id IS
  'Setor/fila padrão do colaborador vinculado à tabela public.chat_departments.';
