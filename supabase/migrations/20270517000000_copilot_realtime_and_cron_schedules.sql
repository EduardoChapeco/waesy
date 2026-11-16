-- Migration additive: Habilita Supabase Realtime nas tabelas vivas do Waesy Copilot
-- e indexa filas de agendamento e processamento assincrono para cron workers.

ALTER TABLE public.ai_scheduled_tasks
  ADD COLUMN IF NOT EXISTS last_status TEXT,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS last_output_preview TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_scheduled_tasks_due
  ON public.ai_scheduled_tasks (is_active, next_run_at)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ai_async_jobs_pending
  ON public.ai_async_jobs (status, created_at)
  WHERE status IN ('queued', 'failed_retryable');

DO $$
DECLARE
  con_rec RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ai_connectors'
  ) THEN
    FOR con_rec IN
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'public.ai_connectors'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%provider%'
    LOOP
      EXECUTE format('ALTER TABLE public.ai_connectors DROP CONSTRAINT IF EXISTS %I', con_rec.conname);
    END LOOP;

    ALTER TABLE public.ai_connectors
      ADD CONSTRAINT ai_connectors_provider_check
      CHECK (provider IN ('google', 'microsoft', 'slack', 'notion', 'github', 'vercel', 'email', 'custom'));
  END IF;
END $$;

DO $$
DECLARE
  tbl TEXT;
  target_tables TEXT[] := ARRAY[
    'ai_threads',
    'ai_messages',
    'ai_artifacts',
    'ai_tasks',
    'ai_async_jobs',
    'ai_scheduled_tasks'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH tbl IN ARRAY target_tables LOOP
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = tbl
      ) AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END LOOP;
  END IF;
END $$;
