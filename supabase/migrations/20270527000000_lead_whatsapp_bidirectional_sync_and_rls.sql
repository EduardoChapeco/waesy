-- ============================================================================
-- Migration: Lead <-> WhatsApp Bidirectional Sync, Indexes & Realtime Parity
-- Spec: docs/specs/SPEC-20261116-CRM-LEAD-WHATSAPP-QUICK-ACTIONS-E2E.md
-- ============================================================================

-- 1. Indices compostos para lookup bidirecional Lead <-> Thread WhatsApp
CREATE INDEX IF NOT EXISTS idx_chat_threads_store_lead_id
  ON public.chat_threads (store_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_crm_store_phone
  ON public.leads_crm (store_id, phone)
  WHERE phone IS NOT NULL;

-- 2. Backfill deterministico: promove metadata->>'active_lead_id' valido para chat_threads.lead_id
UPDATE public.chat_threads ct
SET
  lead_id = (ct.metadata ->> 'active_lead_id')::uuid,
  updated_at = COALESCE(ct.updated_at, now())
FROM public.leads_crm lc
WHERE ct.lead_id IS NULL
  AND ct.store_id = lc.store_id
  AND (ct.metadata ->> 'active_lead_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND lc.id = (ct.metadata ->> 'active_lead_id')::uuid;

-- 3. Trigger BEFORE INSERT/UPDATE para manter lead_id e metadata.active_lead_id sempre alinhados
CREATE OR REPLACE FUNCTION public.sync_chat_thread_active_lead_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object('active_lead_id', NEW.lead_id::text);
  ELSIF TG_OP = 'UPDATE' AND OLD.lead_id IS NOT NULL AND NEW.lead_id IS NULL THEN
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || '{"active_lead_id":"none"}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chat_thread_active_lead_metadata ON public.chat_threads;
CREATE TRIGGER trg_sync_chat_thread_active_lead_metadata
  BEFORE INSERT OR UPDATE OF lead_id, metadata ON public.chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_chat_thread_active_lead_metadata();

-- 4. RLS multi-tenant unificada (is_store_staff) e Realtime em public.leads_crm
DROP POLICY IF EXISTS "leads_crm_staff_all" ON public.leads_crm;
CREATE POLICY "leads_crm_staff_all"
  ON public.leads_crm
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

ALTER TABLE public.leads_crm REPLICA IDENTITY FULL;
ALTER TABLE public.customers_crm REPLICA IDENTITY FULL;

DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY['leads_crm', 'customers_crm'];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;
