-- ==============================================================================
-- MIGRATION: 20270613000000_customers_crm_avatar_and_whatsapp_sync.sql
-- DESCRIPTION: Expansao de Perfil do Cliente (avatar_url) e Sincronizacao Bidirecional WhatsApp/CRM
-- ==============================================================================

BEGIN;

-- 1. Coluna canônica de foto/avatar em customers_crm
ALTER TABLE public.customers_crm
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_crm_avatar_url
  ON public.customers_crm(store_id) WHERE avatar_url IS NOT NULL;

-- 2. Atualização atômica da RPC de deduplicação e vínculo de lead a cliente
CREATE OR REPLACE FUNCTION public.deduplicate_and_link_lead_to_customer(
  p_lead_id uuid,
  p_store_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead RECORD;
  v_customer_id UUID;
  v_existing_lead_count INTEGER;
  v_doc TEXT;
  v_lead_digits TEXT;
  v_suffix8 TEXT;
  v_is_real_email BOOLEAN;
  v_avatar TEXT;
BEGIN
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE id = p_lead_id AND store_id = p_store_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado ou não pertence a este tenant.';
  END IF;

  IF v_lead.customer_id IS NOT NULL THEN
    -- Garante sincronização com chat_threads se existirem
    IF v_lead.phone IS NOT NULL AND btrim(v_lead.phone) <> '' THEN
      v_lead_digits := public.normalize_crm_phone_digits(v_lead.phone);
      v_suffix8 := CASE WHEN length(v_lead_digits) >= 8 THEN right(v_lead_digits, 8) ELSE NULL END;

      UPDATE public.chat_threads
      SET customer_id = v_lead.customer_id, updated_at = now()
      WHERE store_id = p_store_id
        AND customer_id IS NULL
        AND (
          lead_id = p_lead_id
          OR primary_phone_e164 = v_lead.phone
          OR (v_lead_digits IS NOT NULL AND public.normalize_crm_phone_digits(primary_phone_e164) = v_lead_digits)
          OR (v_suffix8 IS NOT NULL AND right(COALESCE(public.normalize_crm_phone_digits(primary_phone_e164), ''), 8) = v_suffix8)
        );
    END IF;

    RETURN v_lead.customer_id;
  END IF;

  v_doc := COALESCE(
    NULLIF(btrim(v_lead.document), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'cpf'), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'document'), '')
  );

  v_avatar := COALESCE(
    NULLIF(btrim(v_lead.custom_fields ->> 'avatar_url'), ''),
    NULLIF(btrim(v_lead.custom_fields ->> 'photo_url'), '')
  );

  -- Busca por Documento/CPF
  IF v_doc IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND document = v_doc
    LIMIT 1;
  END IF;

  v_lead_digits := COALESCE(v_lead.phone_normalized_digits, public.normalize_crm_phone_digits(v_lead.phone));
  v_suffix8 := CASE WHEN v_lead_digits IS NOT NULL AND length(v_lead_digits) >= 8 THEN right(v_lead_digits, 8) ELSE NULL END;

  -- Busca por Telefone / WhatsApp
  IF v_customer_id IS NULL AND v_lead.phone IS NOT NULL AND btrim(v_lead.phone) <> '' THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id
      AND (
        phone = v_lead.phone
        OR (v_lead_digits IS NOT NULL AND public.normalize_crm_phone_digits(phone) = v_lead_digits)
        OR (v_suffix8 IS NOT NULL AND right(COALESCE(public.normalize_crm_phone_digits(phone), ''), 8) = v_suffix8)
      )
    LIMIT 1;
  END IF;

  v_is_real_email :=
    v_lead.email IS NOT NULL
    AND btrim(v_lead.email) <> ''
    AND lower(v_lead.email) NOT LIKE '%@whatsapp.waesy'
    AND lower(v_lead.email) NOT LIKE '%@sem-email.waesy.local';

  -- Busca por E-mail
  IF v_customer_id IS NULL AND v_is_real_email THEN
    SELECT id INTO v_customer_id
    FROM public.customers_crm
    WHERE store_id = p_store_id AND lower(email) = lower(v_lead.email)
    LIMIT 1;
  END IF;

  -- Cria novo cliente se não existir
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers_crm (
      store_id,
      kind,
      full_name,
      name,
      email,
      phone,
      document,
      avatar_url,
      channel,
      tags,
      notes,
      lifetime_lead_count,
      last_commercial_touch_at,
      lgpd_accepted,
      custom_fields
    ) VALUES (
      p_store_id,
      'individual',
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      COALESCE(v_lead.full_name, v_lead.title, 'Cliente'),
      CASE WHEN v_is_real_email THEN v_lead.email ELSE NULL END,
      v_lead.phone,
      v_doc,
      v_avatar,
      COALESCE(v_lead.source, 'kanban'),
      COALESCE(v_lead.tags, ARRAY[]::text[]),
      v_lead.notes,
      1,
      COALESCE(v_lead.created_at, now()),
      COALESCE(v_lead.lgpd_accepted, true),
      COALESCE(v_lead.custom_fields, '{}'::jsonb)
    )
    RETURNING id INTO v_customer_id;
  ELSE
    SELECT COUNT(*) INTO v_existing_lead_count
    FROM public.leads_crm
    WHERE store_id = p_store_id AND customer_id = v_customer_id;

    UPDATE public.customers_crm
    SET
      full_name = COALESCE(NULLIF(btrim(full_name), ''), v_lead.full_name),
      name = COALESCE(NULLIF(btrim(name), ''), v_lead.full_name),
      phone = COALESCE(NULLIF(btrim(phone), ''), v_lead.phone),
      email = COALESCE(NULLIF(btrim(email), ''), CASE WHEN v_is_real_email THEN v_lead.email ELSE NULL END),
      document = COALESCE(NULLIF(btrim(document), ''), v_doc),
      avatar_url = COALESCE(NULLIF(btrim(avatar_url), ''), v_avatar),
      lifetime_lead_count = GREATEST(lifetime_lead_count, v_existing_lead_count + 1),
      last_commercial_touch_at = now(),
      updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  -- Vincula o lead ao cliente
  UPDATE public.leads_crm
  SET customer_id = v_customer_id, updated_at = now()
  WHERE id = p_lead_id AND store_id = p_store_id;

  -- Sincroniza conversas WhatsApp vinculadas
  IF v_lead.phone IS NOT NULL AND btrim(v_lead.phone) <> '' THEN
    UPDATE public.chat_threads
    SET customer_id = v_customer_id, updated_at = now()
    WHERE store_id = p_store_id
      AND (customer_id IS NULL OR customer_id = v_customer_id)
      AND (
        lead_id = p_lead_id
        OR primary_phone_e164 = v_lead.phone
        OR (v_lead_digits IS NOT NULL AND public.normalize_crm_phone_digits(primary_phone_e164) = v_lead_digits)
        OR (v_suffix8 IS NOT NULL AND right(COALESCE(public.normalize_crm_phone_digits(primary_phone_e164), ''), 8) = v_suffix8)
      );
  END IF;

  RETURN v_customer_id;
END;
$$;

COMMIT;
