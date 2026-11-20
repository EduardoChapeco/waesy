-- ============================================================================
-- MIGRATION: 20270621000000_infotravel_rls_force_ttl_and_canonical_vouchers.sql
-- DESCRIÇÃO: Hardening de Segurança Zero-Trust / FORCE RLS em 22 Tabelas,
--            Expurgo Automático TTL contra Estouro de Disco Nano,
--            Reconciliação Canônica de Vouchers e Deprecação de Outbox
-- NORMAS: AGENTS.md (B.1 a B.36), SPEC-INFOTRAVEL-API-ZERO-TRUST-2026-11-20
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. FORCE ROW LEVEL SECURITY NAS 22 TABELAS CRÍTICAS
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  t TEXT;
  target_tables TEXT[] := ARRAY[
    'integration_credentials',
    'travel_operator_integrations',
    'integration_connector_events',
    'travel_quote_sessions',
    'quote_provider_executions',
    'travel_offer_snapshots',
    'travel_price_observations',
    'travel_proposals',
    'proposal_web_pages',
    'travel_proposal_acceptances',
    'tourism_trips',
    'trip_passengers',
    'travel_sales',
    'travel_vouchers',
    'tourism_vouchers',
    'contracts',
    'leads_crm',
    'chat_threads',
    'chat_messages',
    'ai_scheduled_tasks',
    'store_pwa_configs',
    'products',
    'tourism_experiences'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', t);
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. POLÍTICAS RLS ESTRITAS DE ISOLAMENTO MULTI-TENANT
-- ----------------------------------------------------------------------------

-- integration_credentials: isolamento total por store_id
DROP POLICY IF EXISTS "integration_credentials_store_isolation" ON public.integration_credentials;
CREATE POLICY "integration_credentials_store_isolation"
  ON public.integration_credentials
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  )
  WITH CHECK (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  );

-- travel_operator_integrations: isolamento total por store_id
DROP POLICY IF EXISTS "travel_operator_integrations_store_isolation" ON public.travel_operator_integrations;
CREATE POLICY "travel_operator_integrations_store_isolation"
  ON public.travel_operator_integrations
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  )
  WITH CHECK (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  );

-- integration_connector_events: isolamento total por store_id
DROP POLICY IF EXISTS "integration_connector_events_store_isolation" ON public.integration_connector_events;
CREATE POLICY "integration_connector_events_store_isolation"
  ON public.integration_connector_events
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  )
  WITH CHECK (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  );

-- travel_vouchers: isolamento por store_id
DROP POLICY IF EXISTS "travel_vouchers_store_isolation" ON public.travel_vouchers;
CREATE POLICY "travel_vouchers_store_isolation"
  ON public.travel_vouchers
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  )
  WITH CHECK (
    public.is_store_staff(store_id) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('master', 'platform_admin'))
  );

-- ----------------------------------------------------------------------------
-- 3. EXPURGO AUTOMÁTICO TTL CONTRA ESTOURO DE DISCO SUPABASE NANO
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.purge_expired_travel_snapshots_and_telemetry()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_snapshots_purged INT := 0;
  v_executions_purged INT := 0;
  v_events_purged INT := 0;
  v_observations_purged INT := 0;
BEGIN
  -- 1. Expurgar snapshots de ofertas com mais de 7 dias
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_offer_snapshots') THEN
    DELETE FROM public.travel_offer_snapshots
    WHERE expires_at < (now() - interval '7 days')
       OR quoted_at < (now() - interval '14 days');
    GET DIAGNOSTICS v_snapshots_purged = ROW_COUNT;
  END IF;

  -- 2. Expurgar execuções de provedores com mais de 14 dias
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_provider_executions') THEN
    DELETE FROM public.quote_provider_executions
    WHERE request_started_at < (now() - interval '14 days');
    GET DIAGNOSTICS v_executions_purged = ROW_COUNT;
  END IF;

  -- 3. Expurgar telemetria de conectores com mais de 30 dias
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_connector_events') THEN
    DELETE FROM public.integration_connector_events
    WHERE created_at < (now() - interval '30 days');
    GET DIAGNOSTICS v_events_purged = ROW_COUNT;
  END IF;

  -- 4. Expurgar histórico denso de preços de rotas com mais de 60 dias
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travel_price_observations') THEN
    DELETE FROM public.travel_price_observations
    WHERE observed_at < (now() - interval '60 days');
    GET DIAGNOSTICS v_observations_purged = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'snapshots_purged', v_snapshots_purged,
    'executions_purged', v_executions_purged,
    'events_purged', v_events_purged,
    'observations_purged', v_observations_purged,
    'executed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.purge_expired_travel_snapshots_and_telemetry() IS
  'Purga periódica de telemetria e snapshots volumosos para proteção de cota de disco Supabase Free Nano.';

-- ----------------------------------------------------------------------------
-- 4. RECONCILIAÇÃO BIDIRECIONAL: travel_vouchers <-> tourism_vouchers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_travel_voucher_to_tourism_vouchers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_public_token TEXT;
BEGIN
  -- Só espelha quando a viagem existe (FK de tourism_vouchers.trip_id -> tourism_trips.id)
  IF NEW.trip_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.tourism_trips tt WHERE tt.id = NEW.trip_id) THEN
    -- Token estável e determinístico por voucher (evita duplicar linhas a cada UPDATE)
    v_public_token := coalesce(NEW.qr_code_hash, encode(sha256(convert_to(NEW.id::text, 'UTF8')), 'hex'));
    
    -- Garante que existe registro compatível em tourism_vouchers para o app do cliente
    INSERT INTO public.tourism_vouchers (
      trip_id,
      store_id,
      public_token,
      voucher_code,
      voucher_type,
      template,
      passengers,
      flights,
      hotels,
      transfers
    )
    VALUES (
      NEW.trip_id,
      NEW.store_id,
      v_public_token,
      NEW.voucher_number,
      CASE
        WHEN NEW.voucher_type IN ('flight', 'hotel', 'transfer', 'tour') THEN NEW.voucher_type
        ELSE 'general'
      END,
      'a4-boarding',
      jsonb_build_array(jsonb_build_object('name', NEW.passenger_name, 'document', NEW.passenger_document)),
      CASE WHEN NEW.flight_data IS NOT NULL AND NEW.flight_data != '{}'::jsonb THEN jsonb_build_array(NEW.flight_data) ELSE '[]'::jsonb END,
      CASE WHEN NEW.hotel_data IS NOT NULL AND NEW.hotel_data != '{}'::jsonb THEN jsonb_build_array(NEW.hotel_data) ELSE '[]'::jsonb END,
      CASE WHEN NEW.transfer_data IS NOT NULL AND NEW.transfer_data != '{}'::jsonb THEN jsonb_build_array(NEW.transfer_data) ELSE '[]'::jsonb END
    )
    ON CONFLICT (public_token) DO UPDATE SET
      voucher_code = EXCLUDED.voucher_code,
      flights = EXCLUDED.flights,
      hotels = EXCLUDED.hotels,
      transfers = EXCLUDED.transfers,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_travel_voucher_to_tourism ON public.travel_vouchers;
CREATE TRIGGER trg_sync_travel_voucher_to_tourism
  AFTER INSERT OR UPDATE ON public.travel_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_travel_voucher_to_tourism_vouchers();

-- ----------------------------------------------------------------------------
-- 5. DEPRECATION NOTATION: whatsapp_outbox_queue
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.whatsapp_outbox_queue') IS NOT NULL THEN
    COMMENT ON TABLE public.whatsapp_outbox_queue IS
      '@deprecated: As automações WhatsApp utilizam despacho síncrono via Edge Functions e Webhooks Meta/Evolution com idempotência em chat_messages.';
  END IF;
END $$;

COMMIT;
