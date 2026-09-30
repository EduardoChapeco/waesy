-- ==============================================================================
-- MIGRATION: 20261204000000_v140_complete_rls_lockdown_and_role_matrix.sql
-- V140: THE COMPLETE RLS LOCKDOWN, ZERO-TRUST AUDIT & GRANULAR ROLE MATRIX
-- ==============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. BLINDAGEM UNIVERSAL: RLS ATIVO EM TODAS AS TABELAS DO SCHEMA PUBLIC
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_prisma%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABELA handle_history (Histórico de Handles & Anti-Squatting)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'handle_history') THEN
    ALTER TABLE public.handle_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "handle_history_owner_select" ON public.handle_history;
    DROP POLICY IF EXISTS "handle_history_owner_insert" ON public.handle_history;
    DROP POLICY IF EXISTS "handle_history_admin_all" ON public.handle_history;

    CREATE POLICY "handle_history_owner_select" ON public.handle_history
      FOR SELECT TO authenticated
      USING (
        auth.uid() = profile_id
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
      );

    CREATE POLICY "handle_history_owner_insert" ON public.handle_history
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.uid() = profile_id
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
      );

    CREATE POLICY "handle_history_admin_all" ON public.handle_history
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABELAS CANÔNICAS (Marcas, Modelos e Ocupações de Referência Pública)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  canon_table text;
  canon_tables text[] := ARRAY[
    'canonical_device_brands',
    'canonical_device_models',
    'canonical_vehicle_brands',
    'canonical_vehicle_models',
    'canonical_job_occupations'
  ];
BEGIN
  FOREACH canon_table IN ARRAY canon_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = canon_table) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', canon_table);

      EXECUTE format('DROP POLICY IF EXISTS "%I_public_read" ON public.%I;', canon_table, canon_table);
      EXECUTE format('DROP POLICY IF EXISTS "%I_admin_modify" ON public.%I;', canon_table, canon_table);

      -- Leitura irrestrita para anon e authenticated (dados taxonômicos canônicos)
      EXECUTE format('CREATE POLICY "%I_public_read" ON public.%I FOR SELECT TO anon, authenticated USING (true);', canon_table, canon_table);

      -- Modificação estritamente restrita a administradores e service_role
      EXECUTE format('
        CREATE POLICY "%I_admin_modify" ON public.%I
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN (''admin'', ''superadmin'')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN (''admin'', ''superadmin'')
          )
        );
      ', canon_table, canon_table);
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TABELA folders (Pastas de Documentos & Contratos Multi-Tenant)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
    ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "folders_tenant_select" ON public.folders;
    DROP POLICY IF EXISTS "folders_tenant_insert" ON public.folders;
    DROP POLICY IF EXISTS "folders_tenant_update" ON public.folders;
    DROP POLICY IF EXISTS "folders_tenant_delete" ON public.folders;

    CREATE POLICY "folders_tenant_select" ON public.folders
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_members.store_id = folders.store_id
            AND workspace_members.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'platform_admin')
        )
      );

    CREATE POLICY "folders_tenant_insert" ON public.folders
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_members.store_id = folders.store_id
            AND workspace_members.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'platform_admin')
        )
      );

    CREATE POLICY "folders_tenant_update" ON public.folders
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_members.store_id = folders.store_id
            AND workspace_members.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'platform_admin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_members.store_id = folders.store_id
            AND workspace_members.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'platform_admin')
        )
      );

    CREATE POLICY "folders_tenant_delete" ON public.folders
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.workspace_members
          WHERE workspace_members.store_id = folders.store_id
            AND workspace_members.profile_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin', 'platform_admin')
        )
      );
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. BLINDAGEM DE EXECUÇÃO DE RPCS TRANSACTIONAIS (REVOKE PUBLIC / GRANT AUTH)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn_name text;
  sensitive_functions text[] := ARRAY[
    'claim_handle_atomic',
    'record_courier_arrival',
    'calculate_courier_waiting_penalty'
  ];
BEGIN
  FOREACH fn_name IN ARRAY sensitive_functions LOOP
    IF EXISTS (
      SELECT 1 FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = fn_name
    ) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM PUBLIC;', fn_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO authenticated, service_role;', fn_name);
    END IF;
  END LOOP;
END $$;

COMMIT;
