-- Migration: 20270415000000_whatsapp_permissions_groups_overflow_history.sql
-- Description: Permissoes granulares Funcionario <-> Canal WhatsApp, jobs de sincronizacao de historico
--              (mantendo sync_mode = 'new_only' por padrao), diretorio de grupos/membros repetidos e
--              campanhas de transbordo automatico de grupos (Auto-Overflow /g/:slug).

-- 1. Modo de sincronizacao em whatsapp_channel_instances e marcador em chat_threads
ALTER TABLE public.whatsapp_channel_instances
  ADD COLUMN IF NOT EXISTS sync_mode TEXT NOT NULL DEFAULT 'new_only'
  CHECK (sync_mode IN ('new_only', 'manual_full', 'recent_window'));

ALTER TABLE public.chat_threads
  ADD COLUMN IF NOT EXISTS last_history_synced_at TIMESTAMPTZ;

-- 2. Permissoes granulares por Funcionario <-> Instancia WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_instance_member_permissions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  instance_id             UUID NOT NULL REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  profile_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view                BOOLEAN NOT NULL DEFAULT true,
  can_reply               BOOLEAN NOT NULL DEFAULT true,
  can_manage_qr           BOOLEAN NOT NULL DEFAULT false,
  can_manage_groups       BOOLEAN NOT NULL DEFAULT false,
  can_sync_history        BOOLEAN NOT NULL DEFAULT false,
  only_assigned_or_sector BOOLEAN NOT NULL DEFAULT false,
  can_transfer            BOOLEAN NOT NULL DEFAULT true,
  can_close               BOOLEAN NOT NULL DEFAULT true,
  updated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instance_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_inst_member_perm_store_profile
  ON public.whatsapp_instance_member_permissions(store_id, profile_id, instance_id);

ALTER TABLE public.whatsapp_instance_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instance_member_permissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_inst_member_perm_select" ON public.whatsapp_instance_member_permissions;
CREATE POLICY "wa_inst_member_perm_select"
  ON public.whatsapp_instance_member_permissions
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.is_store_staff(store_id)
    OR profile_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "wa_inst_member_perm_manage" ON public.whatsapp_instance_member_permissions;
CREATE POLICY "wa_inst_member_perm_manage"
  ON public.whatsapp_instance_member_permissions
  FOR ALL TO authenticated
  USING (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = whatsapp_instance_member_permissions.store_id
        AND wm.profile_id = (SELECT auth.uid())
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = whatsapp_instance_member_permissions.store_id
        AND wm.profile_id = (SELECT auth.uid())
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "wa_inst_member_perm_service" ON public.whatsapp_instance_member_permissions;
CREATE POLICY "wa_inst_member_perm_service"
  ON public.whatsapp_instance_member_permissions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. Historico explicito de sincronizacao por canal (Submodulo Historico)
CREATE TABLE IF NOT EXISTS public.whatsapp_history_sync_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  instance_id     UUID NOT NULL REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  requested_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sync_mode       TEXT NOT NULL DEFAULT 'manual_full' CHECK (sync_mode IN ('new_only', 'manual_full', 'recent_window')),
  status          TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'skipped')),
  imported_chats  INT NOT NULL DEFAULT 0,
  total_found     INT NOT NULL DEFAULT 0,
  notes           TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_history_sync_jobs_store_inst
  ON public.whatsapp_history_sync_jobs(store_id, instance_id, created_at DESC);

ALTER TABLE public.whatsapp_history_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_history_sync_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_history_sync_jobs_staff_select" ON public.whatsapp_history_sync_jobs;
CREATE POLICY "wa_history_sync_jobs_staff_select"
  ON public.whatsapp_history_sync_jobs
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "wa_history_sync_jobs_service" ON public.whatsapp_history_sync_jobs;
CREATE POLICY "wa_history_sync_jobs_service"
  ON public.whatsapp_history_sync_jobs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Diretorio centralizado de grupos & canais WhatsApp da empresa
CREATE TABLE IF NOT EXISTS public.whatsapp_groups_directory (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  instance_id          UUID NOT NULL REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  group_jid            TEXT NOT NULL,
  kind                 TEXT NOT NULL DEFAULT 'group' CHECK (kind IN ('group', 'channel', 'community')),
  subject              TEXT NOT NULL,
  description          TEXT,
  avatar_url           TEXT,
  invite_code          TEXT,
  invite_url           TEXT,
  member_count         INT NOT NULL DEFAULT 0,
  admin_count          INT NOT NULL DEFAULT 0,
  max_capacity         INT NOT NULL DEFAULT 1024 CHECK (max_capacity > 0 AND max_capacity <= 5000),
  is_announcement_only BOOLEAN NOT NULL DEFAULT false,
  is_archived          BOOLEAN NOT NULL DEFAULT false,
  last_synced_at       TIMESTAMPTZ,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, instance_id, group_jid)
);

CREATE INDEX IF NOT EXISTS idx_wa_groups_directory_store_inst
  ON public.whatsapp_groups_directory(store_id, instance_id, updated_at DESC);

ALTER TABLE public.whatsapp_groups_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_groups_directory FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_groups_dir_staff_select" ON public.whatsapp_groups_directory;
CREATE POLICY "wa_groups_dir_staff_select"
  ON public.whatsapp_groups_directory
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "wa_groups_dir_service" ON public.whatsapp_groups_directory;
CREATE POLICY "wa_groups_dir_service"
  ON public.whatsapp_groups_directory
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 5. Membros por grupo para auditoria e deteccao de membros repetidos entre grupos
CREATE TABLE IF NOT EXISTS public.whatsapp_group_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  group_id         UUID NOT NULL REFERENCES public.whatsapp_groups_directory(id) ON DELETE CASCADE,
  instance_id      UUID NOT NULL REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  participant_jid  TEXT NOT NULL,
  phone_e164       TEXT,
  phone_digits     TEXT,
  display_name     TEXT,
  role             TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'superadmin')),
  is_company_admin BOOLEAN NOT NULL DEFAULT false,
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, participant_jid)
);

CREATE INDEX IF NOT EXISTS idx_wa_group_members_store_phone
  ON public.whatsapp_group_members(store_id, phone_digits, group_id)
  WHERE phone_digits IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wa_group_members_group
  ON public.whatsapp_group_members(group_id, role);

ALTER TABLE public.whatsapp_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_group_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_group_members_staff_select" ON public.whatsapp_group_members;
CREATE POLICY "wa_group_members_staff_select"
  ON public.whatsapp_group_members
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "wa_group_members_service" ON public.whatsapp_group_members;
CREATE POLICY "wa_group_members_service"
  ON public.whatsapp_group_members
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 6. Campanhas de Transbordo Automatico de Grupos (Auto-Overflow /g/:slug)
CREATE TABLE IF NOT EXISTS public.whatsapp_group_campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  instance_id          UUID NOT NULL REFERENCES public.whatsapp_channel_instances(id) ON DELETE CASCADE,
  slug                 TEXT NOT NULL UNIQUE,
  title                TEXT NOT NULL,
  description          TEXT,
  group_name_template  TEXT NOT NULL,
  group_description    TEXT,
  overflow_threshold   INT NOT NULL DEFAULT 950 CHECK (overflow_threshold >= 2 AND overflow_threshold <= 1024),
  max_capacity         INT NOT NULL DEFAULT 1024 CHECK (max_capacity >= 2 AND max_capacity <= 1024),
  next_group_sequence  INT NOT NULL DEFAULT 1 CHECK (next_group_sequence >= 1),
  admin_phones         TEXT[] NOT NULL DEFAULT '{}'::text[],
  lead_form_id         UUID REFERENCES public.lead_forms(id) ON DELETE SET NULL,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  active_group_id      UUID REFERENCES public.whatsapp_groups_directory(id) ON DELETE SET NULL,
  active_invite_url    TEXT,
  total_redirects      BIGINT NOT NULL DEFAULT 0,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_group_campaigns_store_active
  ON public.whatsapp_group_campaigns(store_id, is_active, created_at DESC);

ALTER TABLE public.whatsapp_group_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_group_campaigns FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_group_campaigns_staff_select" ON public.whatsapp_group_campaigns;
CREATE POLICY "wa_group_campaigns_staff_select"
  ON public.whatsapp_group_campaigns
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "wa_group_campaigns_service" ON public.whatsapp_group_campaigns;
CREATE POLICY "wa_group_campaigns_service"
  ON public.whatsapp_group_campaigns
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 7. Pool sequencial de grupos dentro de cada campanha de transbordo
CREATE TABLE IF NOT EXISTS public.whatsapp_group_campaign_pools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  campaign_id     UUID NOT NULL REFERENCES public.whatsapp_group_campaigns(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES public.whatsapp_groups_directory(id) ON DELETE CASCADE,
  sequence_number INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'full', 'archived')),
  invite_url      TEXT,
  joined_count    INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_wa_group_campaign_pools_lookup
  ON public.whatsapp_group_campaign_pools(campaign_id, status, sequence_number DESC);

ALTER TABLE public.whatsapp_group_campaign_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_group_campaign_pools FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_group_pools_staff_select" ON public.whatsapp_group_campaign_pools;
CREATE POLICY "wa_group_pools_staff_select"
  ON public.whatsapp_group_campaign_pools
  FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR public.is_store_staff(store_id));

DROP POLICY IF EXISTS "wa_group_pools_service" ON public.whatsapp_group_campaign_pools;
CREATE POLICY "wa_group_pools_service"
  ON public.whatsapp_group_campaign_pools
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
