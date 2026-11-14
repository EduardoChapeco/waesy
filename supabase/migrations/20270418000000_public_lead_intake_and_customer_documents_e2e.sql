-- =============================================================================
-- MIGRATION: 20270418000000_public_lead_intake_and_customer_documents_e2e.sql
-- OBJETIVO (M10 E2E):
-- 1. Harmonizar tabela public.customer_documents com o BFF (doc_type, doc_number,
--    issued_at, expires_at, notes, lead_id, traveler_id, traveler_name,
--    storage_bucket, storage_path) e corrigir política RLS multi-tenant.
-- 2. Estender public.leads_crm com campos cadastrais do titular e logística
--    (document, rg, birth_date, emergency_contact_*, accommodation_pref,
--    meal_plan, departure_city) para formulário /m/lead/$leadId.
-- 3. Remover sobrecarga ambígua de submit_public_lead_passengers e alinhar
--    get_public_lead_by_token(_token text) mantendo EXECUTE restrito a service_role.
-- =============================================================================

BEGIN;

-- ─── 1. HARMONIZAÇÃO DE public.customer_documents ─────────────────────────────

ALTER TABLE public.customer_documents
  ADD COLUMN IF NOT EXISTS doc_type text,
  ADD COLUMN IF NOT EXISTS doc_number text,
  ADD COLUMN IF NOT EXISTS issued_at date,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS traveler_id text,
  ADD COLUMN IF NOT EXISTS traveler_name text,
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE public.customer_documents
  ALTER COLUMN title SET DEFAULT 'Documento',
  ALTER COLUMN file_url SET DEFAULT '';

UPDATE public.customer_documents
SET
  doc_type = COALESCE(NULLIF(doc_type, ''), NULLIF(document_type, ''), 'other'),
  title = COALESCE(NULLIF(title, ''), NULLIF(doc_type, ''), NULLIF(document_type, ''), 'Documento')
WHERE doc_type IS NULL OR title IS NULL OR title = '';

CREATE INDEX IF NOT EXISTS idx_customer_documents_lead
  ON public.customer_documents(lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_documents_expiry
  ON public.customer_documents(store_id, expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store staff can manage customer documents" ON public.customer_documents;
CREATE POLICY "Store staff can manage customer documents"
  ON public.customer_documents FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ─── 2. EXTENSÃO DA FICHA DO TITULAR & LOGÍSTICA EM public.leads_crm ─────────

ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS document text,
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS accommodation_pref text,
  ADD COLUMN IF NOT EXISTS meal_plan text,
  ADD COLUMN IF NOT EXISTS departure_city text;

-- ─── 3. DESAMBIGUAÇÃO E ATUALIZAÇÃO DE RPCs DO FORMULÁRIO PÚBLICO ─────────────

DROP FUNCTION IF EXISTS public.submit_public_lead_passengers(uuid, jsonb, boolean, text);

CREATE OR REPLACE FUNCTION public.get_public_lead_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads_crm%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_token_uuid uuid;
  v_settings jsonb;
BEGIN
  IF _token IS NULL OR _token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  v_token_uuid := _token::uuid;
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE magic_token = v_token_uuid OR id = v_token_uuid
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    SELECT l.* INTO v_lead
    FROM public.leads_crm l
    WHERE l.customer_id = v_token_uuid
    ORDER BY l.created_at DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = v_lead.store_id;
  v_settings := COALESCE(v_store.settings, '{}'::jsonb);

  RETURN jsonb_build_object(
    'id', v_lead.id,
    'store_id', v_lead.store_id,
    'customer_id', v_lead.customer_id,
    'title', v_lead.title,
    'full_name', v_lead.full_name,
    'document', v_lead.document,
    'rg', v_lead.rg,
    'birth_date', v_lead.birth_date,
    'destination', v_lead.destination,
    'departure_city', v_lead.departure_city,
    'accommodation_pref', v_lead.accommodation_pref,
    'meal_plan', v_lead.meal_plan,
    'emergency_contact_name', v_lead.emergency_contact_name,
    'emergency_contact_phone', v_lead.emergency_contact_phone,
    'email', v_lead.email,
    'phone', v_lead.phone,
    'travel_start', v_lead.travel_start,
    'travel_end', v_lead.travel_end,
    'pax_count', v_lead.pax_count,
    'pax_adults', v_lead.pax_adults,
    'pax_children', v_lead.pax_children,
    'pax_infants', v_lead.pax_infants,
    'pax_list', v_lead.pax_list,
    'interest_type', v_lead.interest_type,
    'interest_period', v_lead.interest_period,
    'notes', v_lead.notes,
    'lgpd_accepted', v_lead.lgpd_accepted,
    'lgpd_accepted_at', v_lead.lgpd_accepted_at,
    'pcd', v_lead.pcd,
    'reduced_mobility', v_lead.reduced_mobility,
    'autism', v_lead.autism,
    'health_notes', v_lead.health_notes,
    'custom_fields', v_lead.custom_fields,
    'store_name', v_store.name,
    'store_logo', v_store.logo_url,
    'store_whatsapp', COALESCE(v_settings ->> 'whatsapp_phone', v_settings ->> 'whatsapp', v_store.phone)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_lead_by_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_lead_by_token(text) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.submit_public_lead_passengers(uuid, jsonb, boolean, text, boolean, boolean, boolean)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.submit_public_lead_passengers(uuid, jsonb, boolean, text, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.submit_public_lead_passengers(uuid, jsonb, boolean, text, boolean, boolean, boolean) TO service_role;
  END IF;
END;
$$;

COMMIT;
