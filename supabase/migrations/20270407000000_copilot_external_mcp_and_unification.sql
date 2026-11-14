-- ============================================================================
-- MIGRATION: Copilot External MCP Servers & Unification Preferences
-- Data: 2026-11-13
-- Descricao:
--   1) Cria public.ai_mcp_servers para suportar multiplos servidores MCP
--      externos por usuario/loja (URL HTTPS, transporte JSON-RPC/SSE/HTTP,
--      credencial criptografada no cofre AES-256-GCM e manifesto tools/list).
--   2) Cria public.user_skill_preferences para persistencia de Skills do
--      Copilot tanto para usuarios civis quanto para operadores de workspace.
--   3) Adiciona indices compostos seguros para consultas de telemetria Analytics.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.touch_copilot_unification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Servidores MCP Externos (Bidirecional Outbound)
CREATE TABLE IF NOT EXISTS public.ai_mcp_servers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id          UUID NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 120),
  slug              TEXT NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,62}$'),
  description       TEXT NULL,
  endpoint_url      TEXT NOT NULL CHECK (endpoint_url ~ '^https://'),
  transport         TEXT NOT NULL DEFAULT 'http_json_rpc'
                      CHECK (transport IN ('http_json_rpc', 'sse', 'streamable_http')),
  auth_type         TEXT NOT NULL DEFAULT 'none'
                      CHECK (auth_type IN ('none', 'bearer', 'api_key_header', 'basic')),
  auth_header_name  TEXT NULL,
  encrypted_secret  TEXT NULL,
  key_hint          TEXT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  tools_manifest    JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_count        INTEGER NOT NULL DEFAULT 0 CHECK (tool_count >= 0),
  health_status     TEXT NOT NULL DEFAULT 'pending'
                      CHECK (health_status IN ('pending', 'healthy', 'degraded', 'error')),
  last_error        TEXT NULL,
  last_synced_at    TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_servers_user_active
  ON public.ai_mcp_servers (user_id, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_mcp_servers_store_active
  ON public.ai_mcp_servers (store_id, is_active)
  WHERE store_id IS NOT NULL;

ALTER TABLE public.ai_mcp_servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_mcp_servers_owner_select" ON public.ai_mcp_servers;
CREATE POLICY "ai_mcp_servers_owner_select"
  ON public.ai_mcp_servers
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "ai_mcp_servers_owner_insert" ON public.ai_mcp_servers;
CREATE POLICY "ai_mcp_servers_owner_insert"
  ON public.ai_mcp_servers
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "ai_mcp_servers_owner_update" ON public.ai_mcp_servers;
CREATE POLICY "ai_mcp_servers_owner_update"
  ON public.ai_mcp_servers
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "ai_mcp_servers_owner_delete" ON public.ai_mcp_servers;
CREATE POLICY "ai_mcp_servers_owner_delete"
  ON public.ai_mcp_servers
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_ai_mcp_servers_updated_at ON public.ai_mcp_servers;
CREATE TRIGGER trg_ai_mcp_servers_updated_at
  BEFORE UPDATE ON public.ai_mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_copilot_unification_updated_at();

-- 2. Preferencias de Skills por Usuario (Complemento Civil + Workspace)
CREATE TABLE IF NOT EXISTS public.user_skill_preferences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_slug    TEXT NOT NULL CHECK (char_length(trim(skill_slug)) BETWEEN 2 AND 100),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  custom_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_skill_preferences_user_active
  ON public.user_skill_preferences (user_id, is_active);

ALTER TABLE public.user_skill_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_skill_preferences_owner_select" ON public.user_skill_preferences;
CREATE POLICY "user_skill_preferences_owner_select"
  ON public.user_skill_preferences
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_skill_preferences_owner_insert" ON public.user_skill_preferences;
CREATE POLICY "user_skill_preferences_owner_insert"
  ON public.user_skill_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_skill_preferences_owner_update" ON public.user_skill_preferences;
CREATE POLICY "user_skill_preferences_owner_update"
  ON public.user_skill_preferences
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_skill_preferences_owner_delete" ON public.user_skill_preferences;
CREATE POLICY "user_skill_preferences_owner_delete"
  ON public.user_skill_preferences
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP TRIGGER IF EXISTS trg_user_skill_preferences_updated_at ON public.user_skill_preferences;
CREATE TRIGGER trg_user_skill_preferences_updated_at
  BEFORE UPDATE ON public.user_skill_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_copilot_unification_updated_at();

-- 3. Indices seguros para consultas reais de Analytics no Copilot (idempotentes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'copilot_executions' AND column_name = 'created_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_copilot_executions_user_created ON public.copilot_executions (user_id, created_at DESC)';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'copilot_executions' AND column_name = 'started_at'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_copilot_executions_user_created ON public.copilot_executions (user_id, started_at DESC)';
  END IF;
END $$;
