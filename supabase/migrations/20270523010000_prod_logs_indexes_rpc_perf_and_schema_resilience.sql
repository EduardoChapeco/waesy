-- ============================================================================
-- Migration: 20270523000000_prod_logs_indexes_rpc_perf_and_schema_resilience.sql
-- Description: Production log forensic remediation (2026-11-18):
--   1. Composite & partial indexes on chat_messages (thread_id, created_at DESC)
--      to eliminate statement timeouts on inbox previews & latest public messages.
--   2. Composite dedup index on classified_analytics_events
--      (classified_id, event_type, session_hash, created_at DESC) to eliminate
--      record_classified_event 500/504 sequential scans.
--   3. Lookup indexes on whatsapp_channel_instances & stores.is_platform_root.
--   4. Harden search_path = public, extensions on functions invoking digest().
--   5. Additive column/index resilience on whatsapp_groups_directory.
--   6. Normalize legacy whatsapp_channel_instances.sync_mode values.
--   7. Throttle runaway 1-minute dispatch_whatsapp_sync_cron pg_cron job to */5.
-- ============================================================================

BEGIN;

-- 1. Composite & partial indexes for chat_messages inbox queries (equality first, sort last)
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created_desc
  ON public.chat_messages (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_public_created_desc
  ON public.chat_messages (thread_id, created_at DESC)
  WHERE message_type IS NULL OR message_type NOT IN ('internal_note', 'system_event');

-- 2. Composite dedup index for record_classified_event (5-minute session window)
DO $$
BEGIN
  IF to_regclass('public.classified_analytics_events') IS NOT NULL THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_classified_analytics_events_dedup
        ON public.classified_analytics_events (classified_id, event_type, session_hash, created_at DESC)
    ';
  END IF;
END $$;

-- 3. Hot-path indexes on whatsapp_channel_instances & stores root lookup
DO $$
BEGIN
  IF to_regclass('public.whatsapp_channel_instances') IS NOT NULL THEN
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_wa_instances_provider_key_updated
        ON public.whatsapp_channel_instances (provider, instance_key, updated_at DESC)
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_wa_instances_provider_ext_updated
        ON public.whatsapp_channel_instances (provider, external_instance_id, updated_at DESC)
        WHERE external_instance_id IS NOT NULL
    ';
  END IF;

  IF to_regclass('public.stores') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'stores' AND column_name = 'is_platform_root'
    ) THEN
      EXECUTE '
        CREATE INDEX IF NOT EXISTS idx_stores_is_platform_root_true
          ON public.stores (id)
          WHERE is_platform_root = true
      ';
    END IF;
  END IF;
END $$;

-- 4. Ensure pgcrypto digest() resolves reliably inside SECURITY DEFINER / search_path-pinned functions
DO $$
DECLARE
  v_fn RECORD;
BEGIN
  FOR v_fn IN
    SELECT
      p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.prosrc ~* '\bdigest\s*\('
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM unnest(p.proconfig) cfg
          WHERE cfg ILIKE 'search_path=%extensions%'
        )
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions, pg_temp', v_fn.sig);
  END LOOP;
END $$;

-- 5. Additive resilience on whatsapp_groups_directory for legacy upsert payloads
DO $$
BEGIN
  IF to_regclass('public.whatsapp_groups_directory') IS NOT NULL THEN
    ALTER TABLE public.whatsapp_groups_directory
      ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

    -- Only add unique index on (instance_id, group_jid) when no cross-store duplicate exists
    IF NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_groups_directory
      GROUP BY instance_id, group_jid
      HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_groups_directory_instance_group_jid
        ON public.whatsapp_groups_directory (instance_id, group_jid);
    END IF;
  END IF;
END $$;

-- 6. Normalize any legacy sync_mode on whatsapp_channel_instances before history sync jobs
DO $$
BEGIN
  IF to_regclass('public.whatsapp_channel_instances') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'whatsapp_channel_instances' AND column_name = 'sync_mode'
     ) THEN
    UPDATE public.whatsapp_channel_instances
    SET sync_mode = CASE
      WHEN sync_mode IN ('new_only', 'manual_full', 'recent_window') THEN sync_mode
      WHEN lower(COALESCE(sync_mode, '')) IN ('full', 'full_history', 'all', 'retroactive') THEN 'manual_full'
      WHEN lower(COALESCE(sync_mode, '')) IN ('recent', 'window') THEN 'recent_window'
      ELSE 'new_only'
    END
    WHERE sync_mode IS NULL OR sync_mode NOT IN ('new_only', 'manual_full', 'recent_window');
  END IF;
END $$;

-- 7. Throttle 1-minute dispatch_whatsapp_sync_cron pg_cron schedules to every 5 minutes to prevent pool saturation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND to_regclass('cron.job') IS NOT NULL THEN
    UPDATE cron.job
    SET schedule = '*/5 * * * *'
    WHERE command ILIKE '%dispatch_whatsapp_sync_cron%'
      AND schedule IN ('* * * * *', '*/1 * * * *');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping pg_cron throttle adjustment: %', SQLERRM;
END $$;

COMMIT;
