-- ======================================================================
-- Migration: 20261030203000_harden_public_ingestion_and_telemetry_rls.sql
-- Hardening de RLS para Ingestão Pública, Telemetria e Pedidos de Mobilidade (SEC-001)
-- Erradica permissões indiscriminadas WITH CHECK (true) para anon em tabelas críticas.
-- ======================================================================

-- 1. MOBILITY_REQUESTS: Restringe criação para cliente autenticado dono do registro
DROP POLICY IF EXISTS "Customers can create requests" ON public.mobility_requests;
CREATE POLICY "Customers can create requests"
  ON public.mobility_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (customer_id = auth.uid() OR customer_id IS NULL)
  );

-- 2. AD_TELEMETRY_EVENTS: Restringe inserção pública arbitrária
DROP POLICY IF EXISTS "ad_telemetry_insert_public" ON public.ad_telemetry_events;
CREATE POLICY "ad_telemetry_insert_service_or_auth"
  ON public.ad_telemetry_events FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    store_id IS NOT NULL
    AND event_type IN ('impression', 'click', 'conversion', 'dismiss')
  );

-- 3. CLASSIFIED_ANALYTICS_EVENTS: Eventos são registrados via RPC segura ou service_role
DROP POLICY IF EXISTS "Allow public insert on classified analytics events" ON public.classified_analytics_events;
CREATE POLICY "classified_analytics_insert_authenticated"
  ON public.classified_analytics_events FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    classified_id IS NOT NULL
    AND event_type IN ('view', 'impression', 'contact_click', 'whatsapp_click', 'phone_reveal', 'share', 'favorite')
  );

-- 4. CREATOR_SHOWCASE_CLICKS: Restringe inserção para chamadas controladas
DROP POLICY IF EXISTS "showcase_clicks_insert_anon" ON public.creator_showcase_clicks;
CREATE POLICY "showcase_clicks_insert_controlled"
  ON public.creator_showcase_clicks FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    creator_profile_id IS NOT NULL
  );

-- 5. TRAVEL_QUOTE_REQUESTS: Restringe inserção direta anônima no banco
DROP POLICY IF EXISTS "Qualquer visitante pode enviar cotação em travel_quote_requests" ON public.travel_quote_requests;
CREATE POLICY "travel_quote_requests_insert_secure"
  ON public.travel_quote_requests FOR INSERT
  TO authenticated, service_role
  WITH CHECK (
    store_id IS NOT NULL
    AND client_name IS NOT NULL
    AND client_contact IS NOT NULL
  );

-- 6. LEADS_CRM: Validação defensiva de leads públicos (status deve ser 'new' e ter contato válido)
DROP POLICY IF EXISTS "leads_crm_insert_public" ON public.leads_crm;
CREATE POLICY "leads_crm_insert_public_hardened"
  ON public.leads_crm FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    store_id IS NOT NULL
    AND (status IS NULL OR status = 'new')
    AND (
      (full_name IS NOT NULL AND length(trim(full_name)) >= 2)
      OR (email IS NOT NULL AND length(trim(email)) >= 5)
      OR (phone IS NOT NULL AND length(trim(phone)) >= 8)
    )
  );
