-- ==============================================================================
-- Migration: 20270220030000_workspace_user_view_preferences.sql
-- Module: Workspace — Persistência Multi-Tenant de Preferências de Visualização
-- Normativa: SPEC-VIEW-PREFERENCES, AGENTS.md B.4, B.8, B.25, Zero-Trust RLS
-- ==============================================================================

-- 1. Criação da tabela workspace_user_view_preferences
CREATE TABLE IF NOT EXISTS public.workspace_user_view_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (
    module IN ('agenda', 'clientes', 'pedidos', 'tarefas', 'financeiro', 'turismo')
  ),
  view_mode TEXT NOT NULL CHECK (
    view_mode IN ('table', 'kanban', 'cards', 'calendar')
  ),
  column_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_field TEXT,
  sort_direction TEXT CHECK (sort_direction IS NULL OR sort_direction IN ('asc', 'desc')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_user_view_pref UNIQUE (store_id, user_id, module)
);

-- 2. Índices de alta performance para buscas multi-tenant
CREATE INDEX IF NOT EXISTS idx_workspace_user_view_pref_lookup 
  ON public.workspace_user_view_preferences(store_id, user_id, module);

CREATE INDEX IF NOT EXISTS idx_workspace_user_view_pref_store 
  ON public.workspace_user_view_preferences(store_id);

CREATE INDEX IF NOT EXISTS idx_workspace_user_view_pref_user 
  ON public.workspace_user_view_preferences(user_id);

-- 3. Trigger para atualização automática de updated_at
DROP TRIGGER IF EXISTS trg_workspace_user_view_preferences_updated_at 
  ON public.workspace_user_view_preferences;

CREATE TRIGGER trg_workspace_user_view_preferences_updated_at
  BEFORE UPDATE ON public.workspace_user_view_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Habilitação de RLS e Bloqueio Deny-by-Default
ALTER TABLE public.workspace_user_view_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_user_view_preferences FROM anon;
REVOKE ALL ON public.workspace_user_view_preferences FROM public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_user_view_preferences TO authenticated;
GRANT ALL ON public.workspace_user_view_preferences TO service_role;

-- 5. Políticas de Isolamento Multi-Tenant via store_members / workspace_members
DROP POLICY IF EXISTS "workspace_user_view_pref_select" ON public.workspace_user_view_preferences;
CREATE POLICY "workspace_user_view_pref_select"
  ON public.workspace_user_view_preferences
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = workspace_user_view_preferences.store_id
          AND sm.profile_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = workspace_user_view_preferences.store_id
          AND wm.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "workspace_user_view_pref_insert" ON public.workspace_user_view_preferences;
CREATE POLICY "workspace_user_view_pref_insert"
  ON public.workspace_user_view_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = workspace_user_view_preferences.store_id
          AND sm.profile_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = workspace_user_view_preferences.store_id
          AND wm.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "workspace_user_view_pref_update" ON public.workspace_user_view_preferences;
CREATE POLICY "workspace_user_view_pref_update"
  ON public.workspace_user_view_preferences
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = workspace_user_view_preferences.store_id
          AND sm.profile_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = workspace_user_view_preferences.store_id
          AND wm.profile_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = workspace_user_view_preferences.store_id
          AND sm.profile_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = workspace_user_view_preferences.store_id
          AND wm.profile_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "workspace_user_view_pref_delete" ON public.workspace_user_view_preferences;
CREATE POLICY "workspace_user_view_pref_delete"
  ON public.workspace_user_view_preferences
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.store_members sm
        WHERE sm.store_id = workspace_user_view_preferences.store_id
          AND sm.profile_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.store_id = workspace_user_view_preferences.store_id
          AND wm.profile_id = auth.uid()
      )
    )
  );
